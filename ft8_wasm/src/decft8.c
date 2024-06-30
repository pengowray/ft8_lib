#include "decft8.h"
#include "ft8/encode.h"
#include "ft8/decode.h"
#include "ft8/message.h"
#include <string.h>
#include <stdio.h> // for debugging only

// Simplified hash interface (you may need to implement this properly)
static ftx_callsign_hash_interface_t hash_if = {
    .lookup_hash = NULL,
    .save_hash = NULL
};

bool decft8_decode_symbols(const uint8_t* symbols, int symbol_count, char* decoded_text, int max_text_length)
{
    if (symbol_count != FT8_NN) {
        printf("Error: Invalid symbol count. Expected %d, got %d\n", FT8_NN, symbol_count);
        return false;
    }

    ftx_message_t message;
    message.hash = 0;  // Don't need the hash for decoding

    // Convert symbols to payload
    uint8_t codeword[FTX_LDPC_N_BYTES] = {0};
    int codeword_bit_idx = 0;

    for (int i = 0; i < FT8_NN; ++i) {
        if ((i >= 0 && i < 7) || (i >= 36 && i < 43) || (i >= 72 && i < 79)) {
            // Skip Costas symbols
            continue;
        }
        
        uint8_t bits3 = 0;
        for (int j = 0; j < 8; ++j) {
            if (kFT8_Gray_map[j] == symbols[i]) {
                bits3 = j;
                break;
            }
        }
        
        for (int j = 2; j >= 0; --j) {
            if (codeword_bit_idx < FTX_LDPC_N) {
                if (bits3 & (1 << j)) {
                    codeword[codeword_bit_idx / 8] |= (0x80 >> (codeword_bit_idx % 8));
                }
                codeword_bit_idx++;
            }
        }
    }

    // Extract payload from codeword (first 91 bits)
    uint8_t payload[FTX_PAYLOAD_LENGTH_BYTES];
    for (int i = 0; i < FTX_PAYLOAD_LENGTH_BYTES; ++i) {
        payload[i] = codeword[i];
    }
    if (FTX_PAYLOAD_LENGTH_BYTES * 8 > FTX_LDPC_K) {
        payload[FTX_PAYLOAD_LENGTH_BYTES - 1] &= (0xFF << (FTX_PAYLOAD_LENGTH_BYTES * 8 - FTX_LDPC_K));
    }

    // Print the payload for debugging
    printf("Decoded payload: ");
    for (int i = 0; i < FTX_PAYLOAD_LENGTH_BYTES; i++) {
        printf("%02x ", payload[i]);
    }
    printf("\n");

    // Copy the payload to the message
    memcpy(message.payload, payload, FTX_PAYLOAD_LENGTH_BYTES);

    // Decode the message
    ftx_message_rc_t rc = ftx_message_decode(&message, NULL, decoded_text);

    if (rc != FTX_MESSAGE_RC_OK) {
        printf("Error: Message decoding failed with code %d\n", rc);
        return false;
    }

    return true;
}


bool decft8_decode_packed(const uint8_t* packed_data, int packed_size, char* decoded_text, int max_text_length)
{
    if (packed_size != FTX_PAYLOAD_LENGTH_BYTES) {
        return false;
    }

    ftx_message_t message;
    memcpy(message.payload, packed_data, packed_size);

    // Decode the message
    ftx_message_rc_t rc = ftx_message_decode(&message, &hash_if, decoded_text);

    return (rc == FTX_MESSAGE_RC_OK);
}
