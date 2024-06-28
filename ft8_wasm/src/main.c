#include <emscripten.h>
#include "ft8/encode.h"
#include "ft8/decode.h"
#include "ft8/message.h"
#include "common/wave.h"

#define EMSCRIPTEN_KEEPALIVE __attribute__((used))

EMSCRIPTEN_KEEPALIVE
char* encodeFT8(const char* message) {
    // Implementation of encodeFT8 function
    // This is a placeholder and needs to be implemented
    return "Encoded message";
}

EMSCRIPTEN_KEEPALIVE
char* decodeFT8(const float* audio, int num_samples) {
    // Implementation of decodeFT8 function
    // This is a placeholder and needs to be implemented
    return "Decoded message";
}
