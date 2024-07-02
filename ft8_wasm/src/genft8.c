#include "genft8.h"
#include <math.h>
#include <stdlib.h>
#include <string.h> // For memcpy
#include <stdio.h> // For snprintf
#include "ft8/constants.h"

#define GFSK_CONST_K 5.336446f
#define FT8_SYMBOL_BT 2.0f
#define FT8_TONE_SPACING 6.25f

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

void synth_gfsk(const uint8_t* symbols, int n_sym, float f0, float symbol_bt, float symbol_period, int signal_rate, float* signal, float* dphi_out, int* metadata_length, char** metadata_json)
{

    int n_spsym = (int)(0.5f + signal_rate * symbol_period);
    int n_ramp = n_spsym / 8;
    int n_total = calculate_num_samples(n_sym, symbol_period, signal_rate);
    int n_wave = n_sym * n_spsym;
    float hmod = 1.0f;
    float dphi_peak = 2 * M_PI * hmod / n_spsym;

    float* extended_signal = (float*)malloc(n_total * sizeof(float));
    float* dphi = (float*)malloc((n_total + 2 * n_spsym) * sizeof(float));

    for (int i = 0; i < n_total + 2 * n_spsym; ++i)
    {
        dphi[i] = 2 * M_PI * f0 / signal_rate;
    }

    float* pulse = (float*)malloc(3 * n_spsym * sizeof(float));
    gfsk_pulse(n_spsym, symbol_bt, pulse);

    for (int i = 0; i < n_sym; ++i)
    {
        int ib = i * n_spsym + n_ramp;
        for (int j = 0; j < 3 * n_spsym; ++j)
        {
            dphi[j + ib] += dphi_peak * symbols[i] * pulse[j];
        }
    }

    for (int j = 0; j < 2 * n_spsym; ++j)
    {
        dphi[j] += dphi_peak * pulse[j + n_spsym] * symbols[0];
        dphi[j + n_total - 2 * n_spsym] += dphi_peak * pulse[j] * symbols[n_sym - 1];
    }

    float phi = 0;
    for (int k = 0; k < n_total; ++k)
    {
        extended_signal[k] = sinf(phi);
        phi = fmodf(phi + dphi[k], 2 * M_PI);
    }

    // Apply envelope shaping to the first and last symbols
    for (int i = 0; i < n_ramp; ++i)
    {
        float env = (1 - cosf(2 * M_PI * i / (2 * n_ramp))) / 2;
        extended_signal[i] *= env;
        extended_signal[n_total - 1 - i] *= env;
    }

    // Copy the extended signal to the output signal
    memcpy(signal, extended_signal, n_total * sizeof(float));

    // Export dphi if requested, trimming it to match the signal output
    if (dphi_out != NULL)
    {
        memcpy(dphi_out, dphi + n_ramp, n_total * sizeof(float));
        //memcpy(dphi_out, dphi, n_total * sizeof(float)); // TODO: in future have option to export whole signal
    }

    // Generate metadata JSON
    if (metadata_json != NULL && metadata_length != NULL)
    {
        char* json = (char*)malloc(1024); // Adjust size as needed
        int len = snprintf(json, 1024,
            "{"
            "\"sample_rate\": %d,"
            "\"symbol_count\": %d,"
            "\"symbol_period\": %.6f,"
            "\"symbol_bt\": %.6f,"
            "\"base_frequency\": %.1f,"
            "\"tone_spacing\": %.2f,"
            "\"first_symbol_start\": %d,"
            "\"last_symbol_end\": %d,"
            "\"ramp_length\": %d,"
            "\"total_samples\": %d"
            "}",
            signal_rate, n_sym, symbol_period, symbol_bt, f0, FT8_TONE_SPACING,
            n_ramp, n_total - n_ramp, n_ramp, n_total
        );
        *metadata_json = json;
        *metadata_length = len;
    }

    free(extended_signal);
    free(dphi);
    free(pulse);
}
