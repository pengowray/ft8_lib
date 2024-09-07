#!/bin/bash

# Set the root directory of the project
ROOT_DIR="$(pwd)/.."
WASM_DIR="$ROOT_DIR/wasm"
BUILD_DIR="$WASM_DIR/build"

# Create build directory if it doesn't exist
mkdir -p "$BUILD_DIR"

# Run CMake
cd "$BUILD_DIR"
emcmake cmake ..

# Build the project
emmake make

echo "Build process completed. Check ./wasm/web/ft8lib/ for output files."