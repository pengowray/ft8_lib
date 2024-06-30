#include <emscripten.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <math.h>
#include "ft8/encode.h"
#include "ft8/message.h"
#include "ft8/constants.h"
#include "genft8.h"
#include "decft8.h"
//#include "ft8/pack.h"

#define EMSCRIPTEN_KEEPALIVE __attribute__((used))
char* allocate_string(const char* str) {
    char* result = (char*)malloc(strlen(str) + 1);
    strcpy(result, str);
    return result;
}

#define FT8_FREQ_BASE_DEFAULT 1000.0f
#define FT8_TONE_SPACING 6.25f
#define GFSK_CONST_K 5.336446f
#define FT8_SYMBOL_BT 2.0f

#define EMSCRIPTEN_KEEPALIVE __attribute__((used))

typedef struct {
    uint8_t* packed_data;
    int packed_size;
    uint8_t* symbols;
    int symbol_count;
    float* audio;
    int audio_samples;
    char* decoded_text;
} FT8Result;

void symbols_to_packed(const uint8_t* symbols, uint8_t* packed) {
    int packed_bit = 0;
    for (int i = 0; i < FT8_NN; i++) {
        if (i < 7 || (i >= 36 && i < 43) || (i >= 72 && i < 79)) {
            continue; // Skip Costas symbols
        }
        for (int j = 2; j >= 0; j--) {
            if (packed_bit < FTX_LDPC_K) {
                if (symbols[i] & (1 << j)) {
                    packed[packed_bit / 8] |= (0x80 >> (packed_bit % 8));
                }
                packed_bit++;
            }
        }
    }
}

EMSCRIPTEN_KEEPALIVE
FT8Result* processSymbols(const char* symbolString, float base_freq) {
    FT8Result* result = (FT8Result*)malloc(sizeof(FT8Result));

    // Convert symbol string to uint8_t array
    result->symbols = (uint8_t*)malloc(FT8_NN);
    result->symbol_count = FT8_NN;
    for (int i = 0; i < FT8_NN; i++) {
        result->symbols[i] = symbolString[i] - '0';
    }

    // Generate audio
    const int sample_rate = 12000;
    result->audio_samples = (int)(FT8_SYMBOL_PERIOD * FT8_NN * sample_rate);
    result->audio = (float*)malloc(result->audio_samples * sizeof(float));

    synth_gfsk(result->symbols, FT8_NN, base_freq, FT8_SYMBOL_BT, FT8_SYMBOL_PERIOD, sample_rate, result->audio);

    // Decode symbols to packed data
    result->packed_data = (uint8_t*)malloc(FTX_PAYLOAD_LENGTH_BYTES);
    result->packed_size = FTX_PAYLOAD_LENGTH_BYTES;
    // You need to implement this function to convert symbols to packed data
    symbols_to_packed(result->symbols, result->packed_data);

    // Decode packed data to text
    result->decoded_text = (char*)malloc(FTX_MAX_MESSAGE_LENGTH);
    ftx_message_t msg;
    memcpy(msg.payload, result->packed_data, FTX_PAYLOAD_LENGTH_BYTES);
    ftx_message_decode(&msg, NULL, result->decoded_text);

    return result;
}

EMSCRIPTEN_KEEPALIVE
char* decodeFT8Symbols(const uint8_t* symbols, int symbol_count) {
    char* decoded_text = (char*)malloc(FTX_MAX_MESSAGE_LENGTH);
    if (decoded_text && decft8_decode_symbols(symbols, symbol_count, decoded_text, FTX_MAX_MESSAGE_LENGTH)) {
        return decoded_text;
    }
    free(decoded_text);
    return strdup("Decoding failed");
}

EMSCRIPTEN_KEEPALIVE
char* decodeFT8PackedData(const uint8_t* packed_data, int packed_size) {
    char* decoded_text = (char*)malloc(FTX_MAX_MESSAGE_LENGTH);
    if (decoded_text && decft8_decode_packed(packed_data, packed_size, decoded_text, FTX_MAX_MESSAGE_LENGTH)) {
        return decoded_text;
    }
    free(decoded_text);
    return NULL;
}

EMSCRIPTEN_KEEPALIVE
FT8Result* encodeFT8(const char* message, float base_freq) {
    ftx_message_t msg;
    ftx_message_rc_t rc = ftx_message_encode(&msg, NULL, message);
    if (rc != FTX_MESSAGE_RC_OK) {
        return NULL;
    }

    FT8Result* result = (FT8Result*)malloc(sizeof(FT8Result));

    // Pack the message
    result->packed_data = (uint8_t*)malloc(FTX_PAYLOAD_LENGTH_BYTES);
    memcpy(result->packed_data, msg.payload, FTX_PAYLOAD_LENGTH_BYTES);
    result->packed_size = FTX_PAYLOAD_LENGTH_BYTES;

    // Generate tones
    result->symbols = (uint8_t*)malloc(FT8_NN);
    ft8_encode(msg.payload, result->symbols);
    result->symbol_count = FT8_NN;

    // Generate audio
    const int sample_rate = 12000;
    result->audio_samples = (int)(FT8_SYMBOL_PERIOD * FT8_NN * sample_rate);
    result->audio = (float*)malloc(result->audio_samples * sizeof(float));

    synth_gfsk(result->symbols, FT8_NN, base_freq, FT8_SYMBOL_BT, FT8_SYMBOL_PERIOD, sample_rate, result->audio);

    // Decode the symbols back to text
    char* decoded_text = decodeFT8Symbols(result->symbols, result->symbol_count);
    if (decoded_text) {
        result->decoded_text = decoded_text;
    } else {
        result->decoded_text = strdup("Decoding failed");  // Allocate new memory with a message
    }

    return result;
}

EMSCRIPTEN_KEEPALIVE
void freeFT8Result(FT8Result* result) {
    if (result) {
        free(result->packed_data);
        free(result->symbols);
        free(result->audio);
        free(result->decoded_text);
        free(result);
    }
}

EMSCRIPTEN_KEEPALIVE
char* encodeFT8_packed(const char* message) {
    // Encode the message
    ftx_message_t msg;
    ftx_message_rc_t rc = ftx_message_encode(&msg, NULL, message);
    if (rc != FTX_MESSAGE_RC_OK) {
        return allocate_string("Error: Invalid message format");
    }

    // Generate FT8 tones
    uint8_t tones[FT8_NN];
    ft8_encode(msg.payload, tones);

    // Convert packed bytes and tones to a string
    char result[512];  // Adjust size as needed
    int pos = 0;
    pos += sprintf(result + pos, "Packed bytes: ");
    for (int i = 0; i < FTX_PAYLOAD_LENGTH_BYTES; i++) {
        pos += sprintf(result + pos, "%02X ", msg.payload[i]);
    }
    pos += sprintf(result + pos, "\nTones: ");
    for (int i = 0; i < FT8_NN; i++) {
        pos += sprintf(result + pos, "%d ", tones[i]);
    }

    return allocate_string(result);
}

EMSCRIPTEN_KEEPALIVE
float* encodeFT8_audio(const char* message, float base_freq, int* num_samples) {
    // Encode the message
    ftx_message_t msg;
    ftx_message_rc_t rc = ftx_message_encode(&msg, NULL, message);
    if (rc != FTX_MESSAGE_RC_OK) {
        *num_samples = 0;
        return NULL;
    }

    // Generate FT8 tones
    uint8_t tones[FT8_NN];
    ft8_encode(msg.payload, tones);

    // Generate audio samples
    const int sample_rate = 12000;
    const float symbol_rate = 6.25f;
    const int samples_per_symbol = (int)(sample_rate / symbol_rate);
    *num_samples = FT8_NN * samples_per_symbol;
    float* audio = (float*)malloc(*num_samples * sizeof(float));

    for (int i = 0; i < FT8_NN; i++) {
        float frequency = base_freq + tones[i] * FT8_TONE_SPACING;
        for (int j = 0; j < samples_per_symbol; j++) {
            int sample_index = i * samples_per_symbol + j;
            float t = (float)sample_index / sample_rate;
            audio[sample_index] = sinf(2 * M_PI * frequency * t);
        }
    }

    return audio;
}

EMSCRIPTEN_KEEPALIVE
char* decodeFT8(const float* audio, int num_samples) {
    // This is a stub implementation
    return allocate_string("Decoding not implemented yet");
}


