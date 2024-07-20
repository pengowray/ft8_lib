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
void synth_gfsk_custom(const uint8_t* symbols, int n_sym, float f0, const float* custom_tones, float symbol_bt, float symbol_period, int signal_rate, float* signal, float* dphi_out, int* metadata_length, char** metadata_json)
{
    int n_spsym = (int)(0.5f + signal_rate * symbol_period);
    int n_ramp = n_spsym / 8;
    int n_total = calculate_num_samples(n_sym, symbol_period, signal_rate);
    int n_wave = n_sym * n_spsym;
    float hmod = 1.0f;
    float tone_spacing = custom_tones ? (custom_tones[1] - custom_tones[0]) : FT8_TONE_SPACING;
    float dphi_peak = 2 * M_PI * hmod / n_spsym;

    float* extended_signal = (float*)malloc(n_total * sizeof(float));
    float* dphi = (float*)malloc((n_total + 2 * n_spsym) * sizeof(float));

    // Calculate absolute frequencies
    float frequencies[FT8_TONE_COUNT];
    float min_freq = custom_tones ? custom_tones[0] : f0;
    float max_freq = custom_tones ? custom_tones[0] : f0;
    for (int i = 0; i < FT8_TONE_COUNT; i++) {
        if (custom_tones) {
            frequencies[i] = custom_tones[i];
        } else {
            frequencies[i] = f0 + i * FT8_TONE_SPACING;
        }
        if (frequencies[i] < min_freq) min_freq = frequencies[i];
        if (frequencies[i] > max_freq) max_freq = frequencies[i];
    }

    // Initialize dphi with base frequency
    for (int i = 0; i < n_total + 2 * n_spsym; ++i)
    {
        dphi[i] = 2 * M_PI * f0 / signal_rate;
    }

    float* pulse = (float*)malloc(3 * n_spsym * sizeof(float));
    gfsk_pulse(n_spsym, symbol_bt, pulse);

    // Apply frequency changes for each symbol
    if (custom_tones) {
        for (int i = 0; i < n_sym; ++i)
        {
            int ib = i * n_spsym + n_ramp;
            float symbol_freq = custom_tones ? custom_tones[symbols[i]] : (f0 + symbols[i] * tone_spacing);
            float symbol_dphi = 2 * M_PI * (symbol_freq - f0) / signal_rate;

            for (int j = 0; j < 3 * n_spsym; ++j)
            {
                dphi[j + ib] += symbol_dphi * pulse[j];
            }
        }
    } else {
        for (int i = 0; i < n_sym; ++i)
        {
            int ib = i * n_spsym + n_ramp;
            for (int j = 0; j < 3 * n_spsym; ++j)
            {
                dphi[j + ib] += dphi_peak * symbols[i] * pulse[j];
            }
        }
    }    
    // Apply ramps at the beginning and end
    for (int j = 0; j < 2 * n_spsym; ++j)
    {
        dphi[j] += dphi_peak * pulse[j + n_spsym] * symbols[0];
        dphi[j + n_total - 2 * n_spsym] += dphi_peak * pulse[j] * symbols[n_sym - 1];
    }

    // Generate the signal
    float phi = 0;
    for (int k = 0; k < n_total; ++k)
    {
        extended_signal[k] = sinf(phi);
        phi = fmodf(phi + dphi[k], 2 * M_PI);
    }

    // Apply envelope shaping
    for (int i = 0; i < n_ramp; ++i)
    {
        float env = (1 - cosf(2 * M_PI * i / (2 * n_ramp))) / 2;
        extended_signal[i] *= env;
        extended_signal[n_total - 1 - i] *= env;
    }

    memcpy(signal, extended_signal, n_total * sizeof(float));

    if (dphi_out != NULL)
    {
        memcpy(dphi_out, dphi + n_ramp, n_total * sizeof(float));
    }

    // Generate metadata JSON
    if (metadata_json != NULL && metadata_length != NULL)
    {
        // Convert symbols to a string of digits
        char* symbols_str = (char*)malloc(n_sym + 1);
        for (int i = 0; i < n_sym; i++) {
            symbols_str[i] = '0' + symbols[i];
        }
        symbols_str[n_sym] = '\0';

        char* json = (char*)malloc(2048 + n_sym);  // Increased size to accommodate symbols string
        int len = snprintf(json, 2048 + n_sym,
            "{"
            "\"sample_rate\": %d,"
            "\"symbol_count\": %d,"
            "\"symbol_period\": %.6f,"
            "\"symbol_bt\": %.6f,"
            "\"base_frequency\": %.1f,"
            "\"min_frequency\": %.1f,"
            "\"max_frequency\": %.1f,"
            "\"custom_tones\": [%.1f, %.1f, %.1f, %.1f, %.1f, %.1f, %.1f, %.1f],"
            "\"first_symbol_start\": %d,"
            "\"last_symbol_end\": %d,"
            "\"ramp_length\": %d,"
            "\"total_samples\": %d,"
            "\"symbols\": \"%s\""
            "}",
            signal_rate, n_sym, symbol_period, symbol_bt, f0,
            min_freq, max_freq,
            frequencies[0], frequencies[1], frequencies[2], frequencies[3],
            frequencies[4], frequencies[5], frequencies[6], frequencies[7],
            n_ramp, n_total - n_ramp, n_ramp, n_total,
            symbols_str
        );
        *metadata_json = json;
        *metadata_length = len;

        free(symbols_str);
    }

    free(extended_signal);
    free(dphi);
    free(pulse);
}

// Function with original signature that calculates default FT8 frequencies
EMSCRIPTEN_KEEPALIVE
void synth_gfsk(const uint8_t* symbols, int n_sym, float f0, float symbol_bt, float symbol_period, int signal_rate, float* signal, float* dphi_out, int* metadata_length, char** metadata_json)
{
    synth_gfsk_custom(symbols, n_sym, f0, NULL, symbol_bt, symbol_period, signal_rate, signal, dphi_out, metadata_length, metadata_json);
}
