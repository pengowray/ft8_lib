// Streaming FT8/FT4 receiver for the browser.
//
// JavaScript feeds audio one block (one symbol period, e.g. 1920 samples at 12 kHz for FT8)
// at a time, can read each new waterfall row for display, and calls rxft8_decode() near the
// end of the slot. Results carry the raw 77-bit payload; text unpacking is left to JavaScript
// (FT8 Player uses its WSJT-X packjt77 port), so callsign hashes behave as in WSJT-X.
//
// The candidate search and de-duplication mirror demo/decode_ft8.c, so for the same audio
// the results match that program's output, in the same order.

#include <stdlib.h>
#include <string.h>
#include <stddef.h>
#include <assert.h>
#include <stdbool.h>

#include "ft8/decode.h"
#include "ft8/message.h"
#include "common/monitor.h"

#define EMSCRIPTEN_KEEPALIVE __attribute__((used))

#define RXFT8_MAX_DECODED 50

typedef struct
{
    monitor_t mon;
    float* input; // block_size samples, written by JavaScript before each rxft8_feed()
} rxft8_t;

/// One decoded message. Layout is read from JavaScript with a DataView, so keep it fixed.
typedef struct
{
    uint8_t payload[10];   // offset 0: 77 bits, MSB first, zero-padded to 80 bits
    int16_t score;         // offset 10: sync score from the candidate search
    float time_sec;        // offset 12: start time of the signal from the start of the audio fed in
    float freq_hz;         // offset 16: frequency of the lowest tone
    int16_t time_offset;   // offset 20: candidate position, in blocks
    int16_t freq_offset;   // offset 22: candidate position, in FFT bins above min_bin
    uint8_t time_sub;      // offset 24
    uint8_t freq_sub;      // offset 25
    int16_t ldpc_errors;   // offset 26: always 0 for a successful decode; kept for diagnostics
} rxft8_result_t;

static_assert(sizeof(rxft8_result_t) == 28, "rxft8_result_t layout changed");
static_assert(offsetof(rxft8_result_t, time_sec) == 12, "rxft8_result_t layout changed");
static_assert(offsetof(rxft8_result_t, ldpc_errors) == 26, "rxft8_result_t layout changed");

EMSCRIPTEN_KEEPALIVE
rxft8_t* rxft8_create(int sample_rate, float f_min, float f_max, int time_osr, int freq_osr, int is_ft4)
{
    rxft8_t* me = (rxft8_t*)calloc(1, sizeof(rxft8_t));
    if (me == NULL)
        return NULL;
    monitor_config_t cfg = {
        .f_min = f_min,
        .f_max = f_max,
        .sample_rate = sample_rate,
        .time_osr = time_osr,
        .freq_osr = freq_osr,
        .protocol = is_ft4 ? FTX_PROTOCOL_FT4 : FTX_PROTOCOL_FT8
    };
    monitor_init(&me->mon, &cfg);
    me->input = (float*)calloc(me->mon.block_size, sizeof(float));
    return me;
}

EMSCRIPTEN_KEEPALIVE
void rxft8_free(rxft8_t* me)
{
    if (me == NULL)
        return;
    monitor_free(&me->mon);
    free(me->input);
    free(me);
}

/// Clears the waterfall for the next slot. The FFT history (last analysis frame) is kept.
EMSCRIPTEN_KEEPALIVE
void rxft8_reset(rxft8_t* me) { monitor_reset(&me->mon); }

EMSCRIPTEN_KEEPALIVE
int rxft8_block_size(const rxft8_t* me) { return me->mon.block_size; }

EMSCRIPTEN_KEEPALIVE
float* rxft8_input(rxft8_t* me) { return me->input; }

/// Processes the block in rxft8_input(). Returns the number of blocks stored so far
/// (it stops growing at rxft8_max_blocks()).
EMSCRIPTEN_KEEPALIVE
int rxft8_feed(rxft8_t* me)
{
    monitor_process(&me->mon, me->input);
    return me->mon.wf.num_blocks;
}

EMSCRIPTEN_KEEPALIVE
int rxft8_num_blocks(const rxft8_t* me) { return me->mon.wf.num_blocks; }

EMSCRIPTEN_KEEPALIVE
int rxft8_max_blocks(const rxft8_t* me) { return me->mon.wf.max_blocks; }

/// Number of frequency bins per waterfall row (one bin per tone spacing, e.g. 6.25 Hz).
EMSCRIPTEN_KEEPALIVE
int rxft8_num_bins(const rxft8_t* me) { return me->mon.wf.num_bins; }

/// FFT bin index of the first waterfall bin: its frequency is min_bin / symbol_period Hz.
EMSCRIPTEN_KEEPALIVE
int rxft8_min_bin(const rxft8_t* me) { return me->mon.min_bin; }

EMSCRIPTEN_KEEPALIVE
float rxft8_symbol_period(const rxft8_t* me) { return me->mon.symbol_period; }

/// Pointer to num_bins magnitudes for one block and sub-position: value v means (v / 2 - 120) dB.
EMSCRIPTEN_KEEPALIVE
const uint8_t* rxft8_waterfall_row(const rxft8_t* me, int block, int time_sub, int freq_sub)
{
    const ftx_waterfall_t* wf = &me->mon.wf;
    if (block < 0 || block >= wf->num_blocks || time_sub < 0 || time_sub >= wf->time_osr || freq_sub < 0 || freq_sub >= wf->freq_osr)
        return NULL;
    return (const uint8_t*)&wf->mag[block * wf->block_stride + (time_sub * wf->freq_osr + freq_sub) * wf->num_bins];
}

/// Finds and decodes candidates in the audio fed since the last reset.
/// Writes up to max_out unique messages to out and returns how many.
EMSCRIPTEN_KEEPALIVE
int rxft8_decode(const rxft8_t* me, int max_candidates, int min_score, int ldpc_iterations, rxft8_result_t* out, int max_out)
{
    const monitor_t* mon = &me->mon;
    const ftx_waterfall_t* wf = &mon->wf;

    ftx_candidate_t* candidate_list = (ftx_candidate_t*)malloc(sizeof(ftx_candidate_t) * max_candidates);
    if (candidate_list == NULL)
        return 0;
    int num_candidates = ftx_find_candidates(wf, max_candidates, candidate_list, min_score);

    // De-duplicate by payload, as demo/decode_ft8.c does.
    ftx_message_t decoded[RXFT8_MAX_DECODED];
    ftx_message_t* decoded_hashtable[RXFT8_MAX_DECODED];
    for (int i = 0; i < RXFT8_MAX_DECODED; ++i)
        decoded_hashtable[i] = NULL;

    int num_out = 0;
    int num_decoded = 0;
    for (int idx = 0; idx < num_candidates && num_out < max_out && num_decoded < RXFT8_MAX_DECODED; ++idx)
    {
        const ftx_candidate_t* cand = &candidate_list[idx];

        ftx_message_t message;
        ftx_decode_status_t status;
        if (!ftx_decode_candidate(wf, cand, ldpc_iterations, &message, &status))
            continue;

        int idx_hash = message.hash % RXFT8_MAX_DECODED;
        bool found_empty_slot = false;
        bool found_duplicate = false;
        do
        {
            if (decoded_hashtable[idx_hash] == NULL)
                found_empty_slot = true;
            else if ((decoded_hashtable[idx_hash]->hash == message.hash) && (0 == memcmp(decoded_hashtable[idx_hash]->payload, message.payload, sizeof(message.payload))))
                found_duplicate = true;
            else
                idx_hash = (idx_hash + 1) % RXFT8_MAX_DECODED;
        } while (!found_empty_slot && !found_duplicate);

        if (!found_empty_slot)
            continue;

        memcpy(&decoded[idx_hash], &message, sizeof(message));
        decoded_hashtable[idx_hash] = &decoded[idx_hash];
        ++num_decoded;

        rxft8_result_t* r = &out[num_out++];
        memset(r, 0, sizeof(*r));
        memcpy(r->payload, message.payload, sizeof(r->payload));
        r->score = cand->score;
        r->freq_hz = (mon->min_bin + cand->freq_offset + (float)cand->freq_sub / wf->freq_osr) / mon->symbol_period;
        r->time_sec = (cand->time_offset + (float)cand->time_sub / wf->time_osr) * mon->symbol_period;
        r->time_offset = cand->time_offset;
        r->freq_offset = cand->freq_offset;
        r->time_sub = cand->time_sub;
        r->freq_sub = cand->freq_sub;
        r->ldpc_errors = (int16_t)status.ldpc_errors;
    }

    free(candidate_list);
    return num_out;
}
