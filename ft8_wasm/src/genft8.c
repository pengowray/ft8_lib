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
    int n_total = n_start_delay + (n_sym * n_spsym) + n_end_extension;
    float tone_spacing = custom_tones ? (custom_tones[1] - custom_tones[0]) : FT8_TONE_SPACING;

    float frequencies[FT8_TONE_COUNT]; // = custom_tones or generated
    for (int i = 0; i < FT8_TONE_COUNT; i++) {
        //TODO: option to start at f0_given or not
        //float freq = custom_tones ? custom_tones[i] : (f0_given + i * FT8_TONE_SPACING);
        float freq = custom_tones ? custom_tones[i] : (f0_given + (i+1) * FT8_TONE_SPACING);
        frequencies[i] = freq;
    }

    float min_freq = frequencies[0];
    float max_freq = frequencies[FT8_TONE_COUNT - 1];
    for (int i = 0; i < FT8_TONE_COUNT; i++) {
        float freq = frequencies[i];
        if (freq < min_freq) min_freq = freq;
        if (freq > max_freq) max_freq = freq;
    }

    float dphi_per_frequency[FT8_TONE_COUNT];
    float f0 = f0_given;
    //float f0 = min_freq;
    //float f0 = min_freq - FT8_TONE_SPACING;
    float f0_dphi = 2 * M_PI * f0 / signal_rate; // base/default phase delta
    float hmod = 1.0f;
    float dphi_peak = 2 * M_PI * hmod / n_spsym;

    for (int i = 0; i < FT8_TONE_COUNT; i++) {
        float freq = frequencies[i];
        //dphi_per_frequency[i] = 2 * M_PI * (f0_dphi - f0) / signal_rate;
        dphi_per_frequency[i] = 2 * M_PI * freq / signal_rate;
    }

    float firstTone = frequencies[0];
    for (int i; i < n_sym; i++) {
        char symbol = symbols[i];
        if (symbol != '-') {
            firstTone = frequencies[symbol - '0'];
            break;
        }
    }

    float* pulse = (float*)malloc(3 * n_spsym * sizeof(float));
    gfsk_pulse(n_spsym, symbol_bt, pulse);

    float phi = 0;
    float tone = firstTone;
    for (int k = 0; k < n_total; ++k) {
        int symbol_index = (k - n_start_delay) / n_spsym;
        int sample_in_symbol = (k - n_start_delay) % n_spsym;
        
        float signal_level = 1;
        //float dphi = 2 * M_PI * f0 / signal_rate;
        float dphi = 0;
        float dfreq = 0;

        if (k >= n_start_delay && k < (n_total - n_end_extension)) {
            
            char curr_symbol = symbols[symbol_index];
            //char prev_symbol_tone = (symbol_index > 0) ? symbols[symbol_index - 1] : curr_symbol;
            //char next_symbol_tone = (symbol_index < n_sym - 1) ? symbols[symbol_index + 1] : curr_symbol;
            char prev_symbol = (symbol_index > 0) ? symbols[symbol_index - 1] : '-';
            char next_symbol = (symbol_index < n_sym - 1) ? symbols[symbol_index + 1] : '-';

            if (curr_symbol == '-') {
                signal_level = 0;
                dphi = f0_dphi; //TODO: use previous tone / switch to next tone half way
            } else {
                //fallback if no tones
                float base_dphi = curr_symbol == '-' ? f0_dphi : dphi_per_frequency[curr_symbol - '0'];

                // actually dphi (not tone frequency)
                float prev_tone = prev_symbol == '-' ? base_dphi : dphi_per_frequency[prev_symbol - '0'];
                float curr_tone = curr_symbol == '-' ? base_dphi : dphi_per_frequency[curr_symbol - '0'];
                float next_tone = next_symbol == '-' ? base_dphi : dphi_per_frequency[next_symbol - '0'];

                // impulse responses at current sample
                float prev_level = (prev_symbol == '-') ? 0 : pulse[sample_in_symbol];
                float curr_level = (curr_symbol == '-') ? 0 : pulse[sample_in_symbol + n_spsym];
                float next_level = (next_symbol == '-') ? 0 : pulse[sample_in_symbol + n_spsym * 2];

                float total_level = prev_level + curr_level + next_level;
                if (total_level == 0) {
                    // no tone
                    signal_level = 0;
                    dphi = base_dphi;
                } else {
                    //weighted average?
                    signal_level = 1;
                    //signal_level = curr_level; // test
                    dphi = ((prev_level * prev_tone) + (curr_level * curr_tone) + (next_level * next_tone)) / total_level;
                    //dphi *= dphi_peak;
                }

                float envelope = 1.0f;
                if (curr_symbol == '-') {
                    envelope = 0;
                } else if (prev_symbol == '-' && sample_in_symbol < n_ramp) {
                    envelope = (1 - cosf(M_PI * sample_in_symbol / n_ramp)) / 2;
                } else if (next_symbol == '-' && sample_in_symbol >= (n_spsym - n_ramp)) {
                    envelope = (1 - cosf(M_PI * (n_spsym - sample_in_symbol - 1) / n_ramp)) / 2;
                }
                signal_level *= envelope;
            }
        }

        //float dphi = 2 * M_PI * f0 / signal_rate

        phi = fmodf(phi + dphi, 2 * M_PI);
        signal[k] = sinf(phi) * signal_level;

        if (dphi_out) {
            dphi_out[k] = dphi;
            //dphi_out[k] = signal_level; // for testing TODO: make separate output
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