#!/bin/bash

# Set the root directory of the project
ROOT_DIR="$(pwd)"
FT8_WASM_DIR="$ROOT_DIR/ft8_wasm"
BUILD_DIR="$FT8_WASM_DIR/build"

# Create build directory if it doesn't exist
mkdir -p "$BUILD_DIR"

# Run CMake
cd "$BUILD_DIR"
emcmake cmake ..

# Build the project
emmake make

echo "Build process completed. Check ./ft8_wasm/web/ for output files."