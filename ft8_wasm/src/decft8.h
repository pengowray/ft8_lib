#ifndef DECFT8_H
#define DECFT8_H

#include <stdint.h>
#include <stdbool.h>
#include "ft8/message.h"
#include "ft8/decode.h"

// Function to decode FT8 symbols
bool decft8_decode_symbols(const uint8_t* symbols, int symbol_count, char* decoded_text, int max_text_length);

// Function to decode FT8 packed data
bool decft8_decode_packed(const uint8_t* packed_data, int packed_size, char* decoded_text, int max_text_length);

#endif // DECFT8_H
