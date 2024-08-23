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
void synth_gfsk_custom 
        (const char* symbols, float f0_given, const float* custom_tones, float symbol_bt, 
        float symbol_period, int signal_rate, int n_start_delay, int n_end_extension, 
        float* signal, float* dphi_out, float* levels_out, int* metadata_length, char** metadata_json)
{
    int n_sym = strlen(symbols);
    int n_spsym = (int)(0.5f + signal_rate * symbol_period);

    //symbol_bt = 2.0f; // force for debug

    //int n_half_left = n_spsym / 2;
    //int n_half_right = n_spsym - n_half_left;
    int n_ramp = n_spsym / 8;
    int n_total = n_start_delay + (n_sym * n_spsym) + n_end_extension;
    float tone_spacing = custom_tones ? (custom_tones[1] - custom_tones[0]) : FT8_TONE_SPACING;

    float frequencies[FT8_TONE_COUNT];
    for (int i = 0; i < FT8_TONE_COUNT; i++) {
        //TODO: option to start at f0_given or at 1st tone spacing
        //note: custom_tones are actually frequencies
        
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

    //float dphi_per_frequency[FT8_TONE_COUNT];
    //float f0 = f0_given;
    //float f0 = min_freq;
    float f0 = min_freq - FT8_TONE_SPACING;
    //float f0_dphi = 2 * M_PI * f0 / signal_rate; // base/default phase delta
    float hmod = 1.0f;
    float dphi_peak = 2 * M_PI * hmod / n_spsym;

    float freqd[FT8_TONE_COUNT];
    for (int i = 0; i < FT8_TONE_COUNT; i++) {
        freqd[i] = frequencies[i] - f0;
    }

    // freqd of first non-empty symbol
    float firstFreqd = freqd[0];
    for (int i; i < n_sym; i++) {
        char symbol = symbols[i];
        if (symbol != '-') {
            firstFreqd = freqd[symbol - '0'];
            break;
        }
    }

    float* pulse = (float*)malloc(3 * n_spsym * sizeof(float));
    gfsk_pulse(n_spsym, symbol_bt, pulse);

    float phi = 0; // rename: phase (?)
    float lastFreqd = firstFreqd;

    for (int k = 0; k < n_total; ++k) {
        int symbol_index = (k - n_start_delay) / n_spsym;
        int sample_in_symbol = (k - n_start_delay) % n_spsym;
        
        float signal_level = 1;
        float total_level = 0;
        float freqd_out;

        char curr_symbol = (k >= n_start_delay && k < (n_total - n_end_extension)) ? symbols[symbol_index] : '-';
        char prev_symbol = (symbol_index > 0) ? symbols[symbol_index - 1] : '-';
        char next_symbol = (symbol_index < n_sym - 1) ? symbols[symbol_index + 1] : '-';

        float curr_freqd = curr_symbol == '-' ? 
            (next_symbol == '-' ? lastFreqd : freqd[next_symbol - '0'] )
            : freqd[curr_symbol - '0'];

        float prev_freqd = prev_symbol == '-' ? curr_freqd : freqd[prev_symbol - '0'];
        float next_freqd = next_symbol == '-' ? curr_freqd : freqd[next_symbol - '0'];

        // impulse responses at current sample (todo: optimize)
        //float prev_level = (prev_symbol == '-') ? 0 : pulse[sample_in_symbol + n_spsym * 2];
        //float curr_level = (curr_symbol == '-') ? 0 : pulse[sample_in_symbol + n_spsym];
        //float next_level = (next_symbol == '-') ? 0 : pulse[sample_in_symbol];
        float prev_level = pulse[sample_in_symbol + n_spsym * 2]; // is finishing
        float curr_level = pulse[sample_in_symbol + n_spsym];
        float next_level = pulse[sample_in_symbol]; // is starting

        //total_level = prev_level + curr_level + next_level; // 0.9999992847442627 to 1.0000007152557373

        //signal_level = total_level; 
        signal_level = 1;

        freqd_out = (prev_level * prev_freqd) + (curr_level * curr_freqd) + (next_level * next_freqd);
        //freqd_out = curr_level; // test

        float envelope = 1.0f;

        if (curr_symbol == '-') {
            envelope = 0;
        } else if (prev_symbol == '-' && sample_in_symbol < n_ramp) {
            envelope = (1 - cosf(M_PI * sample_in_symbol / n_ramp)) / 2;
        } else if (next_symbol == '-' && sample_in_symbol >= (n_spsym - n_ramp)) {
            envelope = (1 - cosf(M_PI * (n_spsym - sample_in_symbol - 1) / n_ramp)) / 2;
        }
        signal_level *= envelope;

        ///////////// apply signal

        float dphi = 2 * M_PI * (f0 + freqd_out) / signal_rate;
        //float dphi = (2 * M_PI / signal_rate) * (f0 + freqd_out);

        phi = fmodf(phi + dphi, 2 * M_PI);
        signal[k] = sinf(phi) * signal_level;

        if (dphi_out) {
            dphi_out[k] = dphi;
        }

        if (levels_out) {
            levels_out[k] = signal_level;
            //levels_out[k] = inst_freq;
            //levels_out[k] = total_level;

            // debug: raw pulse
            //levels_out[k] = pulse[((k - n_start_delay) % n_spsym * 3)]; // whole
            //levels_out[k] = pulse[((k - n_start_delay) % n_spsym)]; // first third
            //levels_out[k] = pulse[((k - n_start_delay) % n_spsym) + n_spsym]; // middle
            //levels_out[k] = pulse[((k - n_start_delay) % n_spsym) + n_half_left]; // ramp up
            
            //divide at symbol boundaries (glitchy)
            //levels_out[k] = symbol_index % 2;


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