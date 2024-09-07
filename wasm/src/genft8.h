#ifndef GENFT8_H
#define GENFT8_H

#include <stdint.h>
#include <math.h>

#define FT8_TONE_COUNT 8

void gfsk_pulse(int n_spsym, float symbol_bt, float* pulse);
//void synth_gfsk(const uint8_t* symbols, int n_sym, float f0, float symbol_bt, float symbol_period, int signal_rate, float* signal, float* dphi_out, int* metadata_length, char** metadata_json);
void synth_gfsk_custom(const char* symbols, float f0_given, const float* custom_tones, float symbol_bt, float symbol_period, int signal_rate, int n_start_delay, int n_end_extension, float* signal, float* dphi_out, float* levels_out, int* metadata_length, char** metadata_json);
int calculate_num_samples(int n_sym, float symbol_period, int signal_rate);

#endif // GENFT8_H
