#include <emscripten.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <math.h>
#include "ft8/encode.h"
#include "ft8/message.h"
#include "ft8/constants.h"
//#include "ft8/pack.h"

#define FT8_FREQ_BASE_DEFAULT 1000.0f
#define FT8_TONE_SPACING 6.25f

#define EMSCRIPTEN_KEEPALIVE __attribute__((used))

float FT8_FREQ_BASE = FT8_FREQ_BASE_DEFAULT; 

// Helper function to allocate memory for strings
char* allocate_string(const char* str) {
    char* result = (char*)malloc(strlen(str) + 1);
    strcpy(result, str);
    return result;
}

EMSCRIPTEN_KEEPALIVE
void setBaseFrequency(float freq) {
    FT8_FREQ_BASE = freq;
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
float* encodeFT8_audio(const char* message, int* num_samples) {
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
        float frequency = FT8_FREQ_BASE + tones[i] * FT8_TONE_SPACING;
        for (int j = 0; j < samples_per_symbol; j++) {
            int sample_index = i * samples_per_symbol + j;
            float t = (float)sample_index / sample_rate;
            audio[sample_index] = sinf(2 * M_PI * frequency * t);
        }
    }

    return audio;
}

EMSCRIPTEN_KEEPALIVE
char* encodeFT8_full(const char* message) {
    // Get packed bytes and tones
    char* packed_result = encodeFT8_packed(message);
    
    // Get audio samples
    int num_samples;
    float* audio = encodeFT8_audio(message, &num_samples);
    
    // Combine results
    char* full_result = (char*)malloc(strlen(packed_result) + 256);  // Adjust size as needed
    sprintf(full_result, "%s\nNum audio samples: %d\nBase frequency: %.1f", packed_result, num_samples, FT8_FREQ_BASE);
    
    free(packed_result);
    
    // Return the pointer to the audio samples
    *(float**)((void*)full_result + strlen(full_result) + 1) = audio;
    
    return full_result;
}

EMSCRIPTEN_KEEPALIVE
char* encodeFT8_full_old(const char* message) {
    // Get packed bytes and tones
    char* packed_result = encodeFT8_packed(message);
    
    // Get audio samples
    int num_samples;
    float* audio = encodeFT8_audio(message, &num_samples);
    
    // Combine results
    char* full_result = (char*)malloc(strlen(packed_result) + 256 + num_samples * 10);  // Adjust size as needed
    strcpy(full_result, packed_result);
    strcat(full_result, "\nAudio samples: ");
    
    for (int i = 0; i < num_samples && i < 100; i++) {  // Limit to first 100 samples
        char sample_str[32];
        sprintf(sample_str, "%.4f ", audio[i]);
        strcat(full_result, sample_str);
    }
    
    if (num_samples > 100) {
        strcat(full_result, "...");
    }
    
    free(packed_result);
    free(audio);
    
    return full_result;
}

EMSCRIPTEN_KEEPALIVE
char* encodeFT8(const char* message) {
    return encodeFT8_full(message);
}

EMSCRIPTEN_KEEPALIVE
char* decodeFT8(const float* audio, int num_samples) {
    // This is a stub implementation
    return allocate_string("Decoding not implemented yet");
}
