#!/bin/bash

# Set the root directory of the project
ROOT_DIR="$(pwd)/ft8_wasm"
BUILD_DIR="$ROOT_DIR/build"

# Create build directory if it doesn't exist
mkdir -p "$BUILD_DIR"

# Create CMakeLists.txt
cat > "$ROOT_DIR/CMakeLists.txt" << EOL
cmake_minimum_required(VERSION 3.10)
project(ft8_wasm)

set(CMAKE_C_STANDARD 11)

# Include directories
include_directories(
    \${CMAKE_SOURCE_DIR}/include
    \${CMAKE_SOURCE_DIR}/..
)

# Add source files
add_executable(ft8_wasm
    src/main.c
    ../ft8/constants.c
    ../ft8/crc.c
    ../ft8/decode.c
    ../ft8/encode.c
    ../ft8/ldpc.c
    ../ft8/message.c
    ../ft8/text.c
    ../common/wave.c
    ../fft/kiss_fft.c
    ../fft/kiss_fftr.c
)

# Set Emscripten link flags
set_target_properties(ft8_wasm PROPERTIES LINK_FLAGS "-s WASM=1 -s EXPORTED_FUNCTIONS='[\"_malloc\", \"_free\", \"_encodeFT8\", \"_decodeFT8\"]' -s EXPORTED_RUNTIME_METHODS='[\"ccall\", \"cwrap\"]' -s ALLOW_MEMORY_GROWTH=1")

# Add a custom command to copy the resulting .js and .wasm files
add_custom_command(TARGET ft8_wasm POST_BUILD
    COMMAND \${CMAKE_COMMAND} -E copy
        \${CMAKE_CURRENT_BINARY_DIR}/ft8_wasm.js
        \${CMAKE_CURRENT_BINARY_DIR}/ft8_wasm.wasm
        \${CMAKE_SOURCE_DIR}/..
)
EOL

# Create main.c if it doesn't exist
if [ ! -f "$ROOT_DIR/src/main.c" ]; then
    cat > "$ROOT_DIR/src/main.c" << EOL
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
EOL
fi

# Run CMake
cd "$BUILD_DIR"
emcmake cmake ..

# Build the project
emmake make

echo "Build process completed. Check the parent directory for output files."
