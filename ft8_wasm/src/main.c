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
#define FTX_PAYLOAD_LENGTH_HEXSTR 40 // safe amount of space to expect a string of ~20 hex characters; compare FTX_PAYLOAD_LENGTH_BYTES = 10

#define EMSCRIPTEN_KEEPALIVE __attribute__((used))

typedef struct {
    uint8_t* packed_data;
    int packed_size;
    uint8_t* symbols;
    int symbol_count;
    float* audio;
    int audio_samples;
    float* dphi;
    char* decoded_text;
    char* metadata;
    int metadata_length;
} FT8Result;

#include "ft8/constants.h"

void symbols_to_packed(const uint8_t* symbols, uint8_t* packed) {
    memset(packed, 0, FTX_PAYLOAD_LENGTH_BYTES);
    int bit_idx = 0;

    for (int i = 0; i < FT8_NN; i++) {
        if (i < 7 || (i >= 36 && i < 43) || (i >= 72 && i < 79)) {
            continue; // Skip Costas symbols
        }

        uint8_t symbol = symbols[i];
        uint8_t gray_mapped = 0;
        for (int j = 0; j < 8; j++) {
            if (kFT8_Gray_map[j] == symbol) {
                gray_mapped = j;
                break;
            }
        }

        for (int j = 2; j >= 0; j--) {
            if (bit_idx < FTX_LDPC_K) {
                if (gray_mapped & (1 << j)) {
                    packed[bit_idx / 8] |= (1 << (7 - (bit_idx % 8)));
                }
                bit_idx++;
            }
        }
    }
}

typedef struct {
    char* decoded_text;
    int error_code;
    char* error_message;
} FT8DecodeResult;

EMSCRIPTEN_KEEPALIVE
FT8DecodeResult* decodeFT8PackedData(const uint8_t* packed_data, int packed_size) {
    FT8DecodeResult* result = (FT8DecodeResult*)malloc(sizeof(FT8DecodeResult));
    if (!result) {
        return NULL; // Memory allocation failed
    }
    
    result->decoded_text = (char*)malloc(FTX_MAX_MESSAGE_LENGTH);
    if (!result->decoded_text) {
        free(result);
        return NULL; // Memory allocation failed
    }
    
    if (packed_size != FTX_PAYLOAD_LENGTH_BYTES) {
        result->error_code = -2; // Custom error code for invalid size
        result->error_message = strdup("Invalid packed data size");
        result->decoded_text[0] = '\0';
        return result;
    }
    
    ftx_message_t message;
    memcpy(message.payload, packed_data, packed_size);
    
    //ftx_message_rc_t rc = ftx_message_decode(&message, &hash_if, result->decoded_text);
    ftx_message_rc_t rc = ftx_message_decode(&message, NULL, result->decoded_text);
    
    result->error_code = rc;
    if (rc != FTX_MESSAGE_RC_OK) {
        const char* error_text;
        switch (rc) {
            case FTX_MESSAGE_RC_ERROR_CALLSIGN1:
                error_text = "Invalid first callsign";
                break;
            case FTX_MESSAGE_RC_ERROR_CALLSIGN2:
                error_text = "Invalid second callsign";
                break;
            case FTX_MESSAGE_RC_ERROR_SUFFIX:
                error_text = "Invalid callsign suffix";
                break;
            case FTX_MESSAGE_RC_ERROR_GRID:
                error_text = "Invalid grid locator";
                break;
            case FTX_MESSAGE_RC_ERROR_TYPE:
                error_text = "Unsupported message type";
                break;
            default:
                error_text = "Unknown decoding error";
        }
        result->error_message = strdup(error_text);
        result->decoded_text[0] = '\0';
    } else {
        result->error_message = NULL;
    }
    
    return result;
}

EMSCRIPTEN_KEEPALIVE
void freeFT8DecodeResult(FT8DecodeResult* result) {
    if (result) {
        free(result->decoded_text);
        free(result->error_message);
        free(result);
    }
}

void freeFT8Result(FT8Result* result) {
    if (result) {
        free(result->packed_data);
        free(result->symbols);
        free(result->audio);
        free(result->dphi);
        free(result->decoded_text);
        free(result->metadata);
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

// unused (delete?)
EMSCRIPTEN_KEEPALIVE
float* encodeFT8_audio(const char* message, float base_freq, int* num_samples, int sample_rate) {
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
    const float symbol_rate = 6.25f;
    const int samples_per_symbol = (int)(sample_rate / symbol_rate);

    *num_samples = calculate_num_samples(FT8_NN, FT8_SYMBOL_PERIOD, sample_rate);
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

typedef struct {
    uint8_t* data;
    int size;
    int error_code;
    char* error_message;
} FT8EncodeResult;

EMSCRIPTEN_KEEPALIVE
FT8EncodeResult* encodeFT8Message(const char* message) {
    FT8EncodeResult* result = (FT8EncodeResult*)malloc(sizeof(FT8EncodeResult));
    if (!result) {
        return NULL; // Memory allocation failed
    }
    
    ftx_message_t msg;
    ftx_message_rc_t rc = ftx_message_encode(&msg, NULL, message);
    
    result->error_code = rc;
    if (rc != FTX_MESSAGE_RC_OK) {
        result->data = NULL;
        result->size = 0;
        
        const char* error_text;
        switch (rc) {
            case FTX_MESSAGE_RC_ERROR_CALLSIGN1:
                error_text = "Invalid first callsign";
                break;
            case FTX_MESSAGE_RC_ERROR_CALLSIGN2:
                error_text = "Invalid second callsign";
                break;
            case FTX_MESSAGE_RC_ERROR_SUFFIX:
                error_text = "Invalid callsign suffix";
                break;
            case FTX_MESSAGE_RC_ERROR_GRID:
                error_text = "Invalid grid locator";
                break;
            case FTX_MESSAGE_RC_ERROR_TYPE:
                error_text = "Unsupported message type";
                break;
            default:
                error_text = "Unknown error";
        }
        result->error_message = strdup(error_text);
    } else {
        result->data = (uint8_t*)malloc(FTX_PAYLOAD_LENGTH_BYTES);
        if (!result->data) {
            result->error_code = -1;
            result->size = 0;
            result->error_message = strdup("Memory allocation failed");
        } else {
            memcpy(result->data, msg.payload, FTX_PAYLOAD_LENGTH_BYTES);
            result->size = FTX_PAYLOAD_LENGTH_BYTES;
            result->error_message = NULL;
        }
    }
    
    return result;
}

EMSCRIPTEN_KEEPALIVE
void freeFT8EncodeResult(FT8EncodeResult* result) {
    if (result) {
        free(result->data);
        free(result->error_message);
        free(result);
    }
}

EMSCRIPTEN_KEEPALIVE
uint8_t* encodeFT8MessageToSymbols(const char* message, int* packed_size) {
    ftx_message_t msg;
    ftx_message_rc_t rc = ftx_message_encode(&msg, NULL, message);
    if (rc != FTX_MESSAGE_RC_OK) {
        return NULL;
    }
    
    uint8_t* packed_data = (uint8_t*)malloc(FTX_PAYLOAD_LENGTH_BYTES);
    memcpy(packed_data, msg.payload, FTX_PAYLOAD_LENGTH_BYTES);
    *packed_size = FTX_PAYLOAD_LENGTH_BYTES;
    
    uint8_t* symbols = (uint8_t*)malloc(FT8_NN);
    ft8_encode(packed_data, symbols);
    return symbols;
}

EMSCRIPTEN_KEEPALIVE
uint8_t* packedToSymbols(const uint8_t* packed_data) {
    uint8_t* symbols = (uint8_t*)malloc(FT8_NN);
    ft8_encode(packed_data, symbols);
    return symbols;
}

EMSCRIPTEN_KEEPALIVE
FT8Result* symbolsToAudio(const char* symbols, float base_freq, int sample_rate) {

    FT8Result* result = (FT8Result*)malloc(sizeof(FT8Result));
    
    int count = strlen(symbols);

    //result->symbols = (uint8_t*)malloc(count);
    //memcpy(result->symbols, symbols, count);
    //result->symbol_count = count;

    result->audio_samples = calculate_num_samples(count, FT8_SYMBOL_PERIOD, sample_rate);
    result->audio = (float*)malloc(result->audio_samples * sizeof(float));
    result->dphi = (float*)malloc(result->audio_samples * sizeof(float));

    synth_gfsk_custom(symbols, base_freq, 0, FT8_SYMBOL_BT, FT8_SYMBOL_PERIOD, sample_rate, 0, 0, 
               result->audio, result->dphi, &result->metadata_length, &result->metadata);

    return result;
}

EMSCRIPTEN_KEEPALIVE
char* decodeFT8(const float* audio, int num_samples) {
    // This is a stub implementation
    return allocate_string("Decoding not implemented yet");
}
