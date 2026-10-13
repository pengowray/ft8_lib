cmake_minimum_required(VERSION 3.10)
project(ft8_wasm)

set(CMAKE_C_STANDARD 11)

# Include directories
include_directories(
    ${CMAKE_SOURCE_DIR}/include
    ${CMAKE_SOURCE_DIR}/..
)

# Add source files
add_executable(ft8_wasm
    src/main.c
    src/genft8.c
    src/decft8.c
    src/rxft8.c
    ../ft8/constants.c
    ../ft8/crc.c
    ../ft8/decode.c
    ../ft8/encode.c
    ../ft8/ldpc.c
    ../ft8/message.c
    ../ft8/text.c
    ../common/wave.c
    ../common/monitor.c
    ../fft/kiss_fft.c
    ../fft/kiss_fftr.c
)

set_target_properties(ft8_wasm PROPERTIES LINK_FLAGS "\
    -s WASM=1 \
    -s EXPORTED_FUNCTIONS=['_malloc','_free','_freeFT8Result','_decodeFT8PackedData','_decodeFT8PackedDataFields','_freeFT8DecodeResult','_synth_gfsk_custom','_encodeFT8Message','_freeFT8EncodeResult','_encodeFT8MessageToSymbols','_packedToSymbols','_symbolsToAudio','_calculate_num_samples','_rxft8_create','_rxft8_free','_rxft8_reset','_rxft8_block_size','_rxft8_input','_rxft8_feed','_rxft8_num_blocks','_rxft8_max_blocks','_rxft8_num_bins','_rxft8_min_bin','_rxft8_symbol_period','_rxft8_waterfall_row','_rxft8_decode'] \
    -s EXPORTED_RUNTIME_METHODS=['ccall','cwrap','getValue','UTF8ToString','HEAP8','HEAPU8','HEAP32','HEAPF32'] \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s EXPORT_ES6=1 \
    -s MODULARIZE=1 \
    -O3 \
")

# Add a custom command to copy the resulting .js and .wasm files
add_custom_command(TARGET ft8_wasm POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_SOURCE_DIR}/web/ft8lib
    COMMAND ${CMAKE_COMMAND} -E copy
        ${CMAKE_CURRENT_BINARY_DIR}/ft8_wasm.js
        ${CMAKE_CURRENT_BINARY_DIR}/ft8_wasm.wasm
        ${CMAKE_SOURCE_DIR}/web/ft8lib
)