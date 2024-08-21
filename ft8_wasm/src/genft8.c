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
    return (n_sym * n_spsym);
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

//void synth_gfsk_custom(const char* symbols, float f0_given, const float* custom_tones, float symbol_bt, float symbol_period, int signal_rate, float* signal, float* dphi_out, int* metadata_length, char** metadata_json)
//{
//    synth_gfsk_custom(symbols, f0_given, custom_tones, symbol_bt, symbol_period, signal_rate, 0, 0, signal, dphi_out, metadata_length, metadata_json);
//}

EMSCRIPTEN_KEEPALIVE
void synth_gfsk_custom(const char* symbols, float f0_given, const float* custom_tones, float symbol_bt, float symbol_period, int signal_rate, int n_start_delay, int n_end_extension, float* signal, float* dphi_out, int* metadata_length, char** metadata_json)
{
    int n_sym = strlen(symbols);
    int n_spsym = (int)(0.5f + signal_rate * symbol_period);
    int n_ramp = n_spsym / 8;
    int n_total = n_start_delay + (n_sym * n_spsym) + n_end_extension; // should match calculate_num_samples() + start + end
    float tone_spacing = custom_tones ? (custom_tones[1] - custom_tones[0]) : FT8_TONE_SPACING;

    float frequencies[FT8_TONE_COUNT];
    float dphi_per_frequency[FT8_TONE_COUNT];
    float f0 = f0_given;
    float min_freq = custom_tones ? custom_tones[0] : f0;
    float max_freq = custom_tones ? custom_tones[FT8_TONE_COUNT - 1] : f0 + (FT8_TONE_COUNT - 1) * FT8_TONE_SPACING;

    for (int i = 0; i < FT8_TONE_COUNT; i++) {
        frequencies[i] = custom_tones ? custom_tones[i] : (f0 + i * FT8_TONE_SPACING);
        dphi_per_frequency[i] = 2 * M_PI * (frequencies[i] - f0) / signal_rate;
    }

    float* pulse = (float*)malloc(3 * n_spsym * sizeof(float));
    gfsk_pulse(n_spsym, symbol_bt, pulse);

    float phi = 0;
    for (int k = 0; k < n_total; ++k) {
        int symbol_index = (k - n_start_delay) / n_spsym;
        int sample_in_symbol = (k - n_start_delay) % n_spsym;
        
        float signal_level = 0;
        float dphi = 2 * M_PI * f0 / signal_rate;

        if (k >= n_start_delay && k < (n_total - n_end_extension)) {
            char current_symbol = symbols[symbol_index];
            char prev_symbol = (symbol_index > 0) ? symbols[symbol_index - 1] : current_symbol;
            char next_symbol = (symbol_index < n_sym - 1) ? symbols[symbol_index + 1] : current_symbol;

            if (current_symbol != '-') {
                int tone_index = current_symbol - '0';
                dphi += dphi_per_frequency[tone_index];

                for (int j = -1; j <= 1; ++j) {
                    int pulse_index = sample_in_symbol + (j + 1) * n_spsym;
                    if (pulse_index >= 0 && pulse_index < 3 * n_spsym) {
                        char symbol_to_use;
                        if (j == -1 && sample_in_symbol < n_ramp) {
                            symbol_to_use = current_symbol;
                        } else if (j == 1 && sample_in_symbol >= (n_spsym - n_ramp)) {
                            symbol_to_use = current_symbol;
                        } else {
                            symbol_to_use = (j == -1) ? prev_symbol : (j == 1) ? next_symbol : current_symbol;
                        }
                        
                        if (symbol_to_use != '-') {
                            int adj_tone_index = symbol_to_use - '0';
                            signal_level += (dphi_per_frequency[adj_tone_index] - dphi_per_frequency[tone_index]) * pulse[pulse_index];
                        }
                    }
                }

                float envelope = 1.0f;
                if (sample_in_symbol < n_ramp) {
                    envelope = (1 - cosf(M_PI * sample_in_symbol / n_ramp)) / 2;
                } else if (sample_in_symbol >= (n_spsym - n_ramp)) {
                    envelope = (1 - cosf(M_PI * (n_spsym - sample_in_symbol - 1) / n_ramp)) / 2;
                }
                signal_level *= envelope;
            }
        }

        signal[k] = sinf(phi) * signal_level;
        phi = fmodf(phi + dphi, 2 * M_PI);
        if (dphi_out) {
            dphi_out[k] = dphi;
        }
    }

    // Generate metadata JSON
    if (metadata_json != NULL && metadata_length != NULL) {
        char* json = (char*)malloc(2048);
        int len = snprintf(json, 2048,
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
            "\"total_samples\": %d"
            "}",
            signal_rate, n_sym, symbol_period, symbol_bt, f0,
            min_freq, max_freq,
            frequencies[0], frequencies[1], frequencies[2], frequencies[3],
            frequencies[4], frequencies[5], frequencies[6], frequencies[7],
            n_start_delay, n_total - n_end_extension, n_ramp, n_total
        );
        *metadata_json = json;
        *metadata_length = len;
    }

    free(pulse);
}
