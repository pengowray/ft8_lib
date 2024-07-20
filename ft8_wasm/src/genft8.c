#include "genft8.h"
#include <math.h>
#include <stdlib.h>
#include <string.h> // For memcpy
#include <stdio.h> // For snprintf
#include "ft8/constants.h"
#include <emscripten.h>

#define GFSK_CONST_K 5.336446f
#define FT8_SYMBOL_BT 2.0f
#define FT8_TONE_SPACING 6.25f
#define FT8_TONE_COUNT 8

int calculate_num_samples(int n_sym, float symbol_period, int signal_rate)
{
    int n_spsym = (int)(0.5f + signal_rate * symbol_period);
    int n_ramp = n_spsym / 8;
    return (n_sym * n_spsym) + (2 * n_ramp);
}

void gfsk_pulse(int n_spsym, float symbol_bt, float* pulse)
{
    for (int i = 0; i < 3 * n_spsym; ++i)
    {
        float t = i / (float)n_spsym - 1.5f;
        float arg1 = GFSK_CONST_K * symbol_bt * (t + 0.5f);
        float arg2 = GFSK_CONST_K * symbol_bt * (t - 0.5f);
        pulse[i] = (erff(arg1) - erff(arg2)) / 2;
    }
}

EMSCRIPTEN_KEEPALIVE
void synth_gfsk_custom(const uint8_t* symbols, int n_sym, float f0, const float* tone_offsets, float symbol_bt, float symbol_period, int signal_rate, float* signal, float* dphi_out, int* metadata_length, char** metadata_json)
{
    int n_spsym = (int)(0.5f + signal_rate * symbol_period);
    int n_ramp = n_spsym / 8;
    int n_total = calculate_num_samples(n_sym, symbol_period, signal_rate);
    int n_wave = n_sym * n_spsym;
    float hmod = 1.0f;

    float* extended_signal = (float*)malloc(n_total * sizeof(float));
    float* dphi = (float*)malloc((n_total + 2 * n_spsym) * sizeof(float));

    // Calculate absolute frequencies
    float frequencies[FT8_TONE_COUNT];
    float min_freq = f0 + tone_offsets[0];
    float max_freq = f0 + tone_offsets[0];
    for (int i = 0; i < FT8_TONE_COUNT; i++) {
        frequencies[i] = f0 + tone_offsets[i];
        if (frequencies[i] < min_freq) min_freq = frequencies[i];
        if (frequencies[i] > max_freq) max_freq = frequencies[i];
    }

    // Initialize dphi with base frequency
    for (int i = 0; i < n_total + 2 * n_spsym; ++i) {
        dphi[i] = 2 * M_PI * f0 / signal_rate;
    }

    float* pulse = (float*)malloc(3 * n_spsym * sizeof(float));
    gfsk_pulse(n_spsym, symbol_bt, pulse);

    for (int i = 0; i < n_sym; ++i) {
        int ib = i * n_spsym + n_ramp;
        float dphi_peak = 2 * M_PI * (frequencies[symbols[i]] - f0) / signal_rate;
        for (int j = 0; j < 3 * n_spsym; ++j) {
            dphi[j + ib] += dphi_peak * pulse[j];
        }
    }

    // Apply ramps at the beginning and end
    for (int j = 0; j < 2 * n_spsym; ++j) {
        dphi[j] += 2 * M_PI * (frequencies[symbols[0]] - f0) / signal_rate * pulse[j + n_spsym];
        dphi[j + n_total - 2 * n_spsym] += 2 * M_PI * (frequencies[symbols[n_sym - 1]] - f0) / signal_rate * pulse[j];
    }

    float phi = 0;
    for (int k = 0; k < n_total; ++k) {
        extended_signal[k] = sinf(phi);
        phi = fmodf(phi + dphi[k], 2 * M_PI);
    }

    // Apply envelope shaping
    for (int i = 0; i < n_ramp; ++i) {
        float env = (1 - cosf(2 * M_PI * i / (2 * n_ramp))) / 2;
        extended_signal[i] *= env;
        extended_signal[n_total - 1 - i] *= env;
    }

    memcpy(signal, extended_signal, n_total * sizeof(float));

    if (dphi_out != NULL) {
        //todo: option to export whole dphi
        memcpy(dphi_out, dphi + n_ramp, n_total * sizeof(float));
    }

    // Generate metadata JSON
    if (metadata_json != NULL && metadata_length != NULL) {
        char* json = (char*)malloc(2048); // Increased size for additional data
        int len = snprintf(json, 2048,
            "{"
            "\"sample_rate\": %d,"
            "\"symbol_count\": %d,"
            "\"symbol_period\": %.6f,"
            "\"symbol_bt\": %.6f,"
            "\"base_frequency\": %.1f,"
            "\"min_frequency\": %.1f,"
            "\"max_frequency\": %.1f,"
            "\"tone_offsets\": [%.1f, %.1f, %.1f, %.1f, %.1f, %.1f, %.1f, %.1f],"
            "\"first_symbol_start\": %d,"
            "\"last_symbol_end\": %d,"
            "\"ramp_length\": %d,"
            "\"total_samples\": %d"
            "}",
            signal_rate, n_sym, symbol_period, symbol_bt, f0, min_freq, max_freq,
            tone_offsets[0], tone_offsets[1], tone_offsets[2], tone_offsets[3],
            tone_offsets[4], tone_offsets[5], tone_offsets[6], tone_offsets[7],
            n_ramp, n_total - n_ramp, n_ramp, n_total
        );
        *metadata_json = json;
        *metadata_length = len;
    }

    free(extended_signal);
    free(dphi);
    free(pulse);
}

// Function with original signature that calculates default FT8 frequencies
EMSCRIPTEN_KEEPALIVE
void synth_gfsk(const uint8_t* symbols, int n_sym, float f0, float symbol_bt, float symbol_period, int signal_rate, float* signal, float* dphi_out, int* metadata_length, char** metadata_json)
{
    float tone_offsets[FT8_TONE_COUNT];
    for (int i = 0; i < FT8_TONE_COUNT; i++) {
        tone_offsets[i] = i * FT8_TONE_SPACING;
    }
    synth_gfsk_custom(symbols, n_sym, f0, tone_offsets, symbol_bt, symbol_period, signal_rate, signal, dphi_out, metadata_length, metadata_json);
}
