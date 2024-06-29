#ifndef GENFT8_H
#define GENFT8_H

#include <stdint.h>
#include <math.h>

void gfsk_pulse(int n_spsym, float symbol_bt, float* pulse);
void synth_gfsk(const uint8_t* symbols, int n_sym, float f0, float symbol_bt, float symbol_period, int signal_rate, float* signal);

#endif // GENFT8_H
