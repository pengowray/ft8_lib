class FT8Message {
    constructor(inputText) {
      this.inputText = inputText;
      this.inputType = null;
      this.encodeError = null;
      this.encodeError_ft8lib = null;
      //this.encodedData = null;
      this.symbolsText = null;
      this.packedData = null;

      this.reDecodedResult = null;

      this.audioBuffer = null;
      this.dphiBuffer = null;
      this.metadata = null;

      this.baseFrequency = null; // 1000
      this.sampleRate = null; // 12000
      this.toneSpacing = null; // 6.25
      this.customToneFrequencies = null;
      this.symbolBT = null; // 2.0
      this.symbolPeriod = null; // 0.160
      
    }
    detectInputType() {
        this.inputType = doDetectInputType(this.inputText);
        return this.inputType;
    }

    encode() {

        let input = this.inputText;
        const inputType = this.inputType ?? this.detectInputType();

        //let packedData, symbolsText;

        switch (inputType) {
            case 'free text':
                input = normalizeBracketedFreeText(input);
                this.packedData = encodeFT8FreeText(input);
                console.log("free text packed data", this.packedData);
                break;
            case 'symbols':
                input = normalizeSymbols(input);
                this.symbolsText = input;
                break;
            case 'packed':
                input = normalizePackedData(input);
                this.packedData = new Uint8Array(input.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
                break;
            case 'telemetry':
                input = normalizeTelemetry(input);
                let result = encodeFT8Telemetry(input);
                if (result.error) {
                    this.encodeError = result.error;
                    return;
                }
                this.packedData = new Uint8Array(result.result.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
                break;
            case '77 bits':
                this.packedData = new Uint8Array(binaryToHex(normalizeBinary(input)).match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
                break;
            case '77 bits + CRC':
                this.symbolsText = binary91ToSymbols(normalizeBinary(input));
                break;
            case '77 bits + CRC + LDPC':
                this.symbolsText = binary174ToSymbols(normalizeBinary(input));
                break;
            case 'symbols (as binary)':
                this.symbolsText = binary195ToSymbols(normalizeBinary(input));
                break;
            default:
                input = normalizeMessage(input);
                const packingResult = messageToPackedData(input);

                if (packingResult.success) {
                    console.log("Packed data:", packingResult);
                    this.packedData = packingResult.data;
                } else {
                    this.encodeError_ft8lib = `Encoding failed (code ${packingResult.errorCode}): ${packingResult.errorMessage}`;
                    console.log("falling back to free text because error: ", this.encodeError_ft8lib);
                    //this.encodeError = this.encodeError_ft8lib;

                    // attempt free text
                    input = normalizeBracketedFreeText(input); // in case there's brackets
                    this.packedData = encodeFT8FreeText(input);

                    //TODO: try to encode as free text
                }
                break;
        }

        if (this.symbolsText == null && this.packedData != null) {
            this.symbolsText = packedDataToSymbols(this.packedData);
        } else if (this.packedData == null && this.symbolsText != null) {
            console.log("empty packed data, generating from symbols");
            this.packedData = symbolsToPackedData(this.symbolsText);
        }

        if (this.symbolsText == null) {
            this.encodeError = "Failed to generate symbols";
            return;
        }

        if (this.packedData == null) {
            this.encodeError = "Failed to generate packed data";
            return;
        }
                
        this.reDecodedResult = decodeFT8PackedData(this.packedData, this.packedData.length);
    }

    setAudioOptions(sampleRate, baseFrequency, customToneFrequencies = null) {
        this.sampleRate = sampleRate;
        this.baseFrequency = baseFrequency;
        this.customToneFrequencies = customToneFrequencies;
    }

    /*
    updates this.audioBuffer, this.dphiBuffer, this.metadata
    */
    generateAudio() {
        // was generateAudioFromSymbols(symbols, options = {}) 
        const options = {
            baseFrequency: this.baseFrequency ?? 1000,
            sampleRate: this.sampleRate ?? 12000,
            toneSpacing: this.toneSpacing ?? 6.25,
            customToneFrequencies: this.customToneFrequencies ?? null,
            symbolBT: this.symbolBT ?? 2.0,
            symbolPeriod: this.symbolPeriod ?? 0.160
        };

        const symbolsArray = symbolsToArray(this.symbolsText); // .split('').map(Number)
        console.log("symbols", this.symbolsText, symbolsArray);
        console.log("options", options);

        const numSymbols = symbolsArray.length; // 79
        
        // Allocate memory for symbols
        const symbolsPtr = Module._malloc(numSymbols);
        Module.HEAPU8.set(symbolsArray, symbolsPtr);

        // Calculate number of samples
        let numSamples = Module._calculate_num_samples(numSymbols, options.symbolPeriod, options.sampleRate);

        // Allocate memory for audio and dphi
        const audioPtr = Module._malloc(numSamples * 4);
        const dphiPtr = Module._malloc(numSamples * 4);

        // Allocate memory for metadata
        const metadataLengthPtr = Module._malloc(4);
        const metadataJsonPtrPtr = Module._malloc(4);
        const FT8_TONE_COUNT = 8;

        let result;
        //options.customToneFrequencies = null; // test

        if (options.customToneFrequencies != null) {
            // Use custom tone frequencies
            const toneOffsetsPtr = Module._malloc(FT8_TONE_COUNT * 4);
            const toneOffsets = new Float32Array(Module.HEAPF32.buffer, toneOffsetsPtr, FT8_TONE_COUNT);
            for (let i = 0; i < FT8_TONE_COUNT; i++) {
                toneOffsets[i] = options.customToneFrequencies[i]; // - baseFrequency;
            }

            console.log("params: ", symbolsPtr, numSymbols, options.baseFrequency, toneOffsetsPtr,
                options.symbolBT, options.symbolPeriod, options.sampleRate,
                audioPtr, dphiPtr, metadataLengthPtr, metadataJsonPtrPtr);
    
    
            result = Module._synth_gfsk_custom(
                symbolsPtr, numSymbols, options.baseFrequency, toneOffsetsPtr,
                options.symbolBT, options.symbolPeriod, options.sampleRate,
                audioPtr, dphiPtr, metadataLengthPtr, metadataJsonPtrPtr
            );

            Module._free(toneOffsetsPtr);
        } else {
            // Use default FT8 frequencies
            result = Module._synth_gfsk(
                symbolsPtr, numSymbols, options.baseFrequency,
                options.symbolBT, options.symbolPeriod, options.sampleRate,
                audioPtr, dphiPtr, metadataLengthPtr, metadataJsonPtrPtr
            );
        }

        const audio = new Float32Array(Module.HEAPF32.buffer, audioPtr, numSamples);
        const dphi = new Float32Array(Module.HEAPF32.buffer, dphiPtr, numSamples);
        this.audioBuffer = Array.from(audio);
        this.dphiBuffer = Array.from(dphi);

        const metadataLength = Module.HEAP32[metadataLengthPtr / 4];
        const metadataJsonPtr = Module.HEAP32[metadataJsonPtrPtr / 4];
        const metadataStr = Module.UTF8ToString(metadataJsonPtr, metadataLength);
        //console.log(metadataStr);

        try {
            this.metadata = JSON.parse(metadataStr);
        } catch {
            error = "(internal error) Failed to parse metadata: '" + metadataStr + "'";
            console.error(error);
        } finally {
        
            // Free allocated memory
            Module._free(symbolsPtr);
            Module._free(audioPtr);
            Module._free(dphiPtr);
            Module._free(metadataLengthPtr);
            Module._free(metadataJsonPtrPtr);
            Module._free(metadataJsonPtr);
        }
    }

  }
  
  class MessageManager {
    constructor() {
      this.messages = [];
      this.currentMessageIndex = -1;
    }
  
    createMessage(inputText) {
      const message = new FT8Message(inputText);
      this.messages.push(message);
      this.currentMessageIndex = this.messages.length - 1;
      return message;
    }
  
    getCurrentMessage() {
        if (this.currentMessageIndex === -1) {
            return null;
        } else {
            return this.messages[this.currentMessageIndex];
        }
    }
  }
  
  function detectTelemetry(str) {
    //exactly 18 hex digits, or start with T:
    //note: first digit must be 0-8 if 18 digits. (not checked here)
    const trimmed = str.trim().toUpperCase();
    return (/^([0-9A-Fa-f][\s\-\:]?){18}$/.test(trimmed)) 
//                || (/^[Tt](ELEMETRY)?:\s0*([0-9A-Fa-f][\s\-\:]?){1,18}$/.test(trimmed))
          || (/^[Tt](ELEMETRY)?\s*:/.test(trimmed))
          || (/\#T(ELEMETRY)?$/.test(trimmed))
}

function detectFreeTextBrackets(str) {
    const trimmed = str.trim();
    return (trimmed.startsWith('<') && trimmed.endsWith('>'));
}

function normalizeMessage(message) {
    return message.trim().toUpperCase().replace(/\s+/g, ' ');
}

function normalizeBracketedFreeText(input) {
    return input.trim().replace(/^<|>$/g, '');
}

function normalizeSymbols(input) {
    // numbers only
    return input.replace(/[-\s]/g, '');
}

function normalizeBinary(input) {
    // 0 and 1 only
    return input.replace(/[-\s]/g, '');
}

function normalizePackedData(input) {
    //return input.replace(/[-\s]/g, '').toUpperCase();
    return input.replace(/[-\s]/g, '').toLowerCase();
}

function normalizeTelemetry(str) {
    //exactly 18 hex digits, or start with T:
    //note: first digit must be 0-8 if 18 digits. (not checked here)
    
    let trimmed = str.trim();
    trimmed = trimmed.toUpperCase()
        .replace(/^[Tt](ELEMETRY)?:\s*/g, '') // remove initial "T:" or telemetry:
        .replace(/\#T(ELEMETRY)?\s*$/g, '') // remove "#TELEMETRY "
        .replace(/[ \-\:]/g, '') // remove any space - :
        .replace(/^[0]*/g, ''); // initial 0's
    return trimmed;
}

function doDetectInputType(inputOriginal) {
    const input = inputOriginal.trim();

    if (detectFreeTextBrackets(input)) {
        return 'free text'; // TODO: explicit free text vs assumed free text
    }

    if (/^[0-7]{79}$/.test(normalizeSymbols(input))) {
        return 'symbols';
    }

    // Check if input is hex string (packed data); pairs of hex must be together.
    if (/^\s*([0-9A-Fa-f]{2}[-\s]?){10}\s*$/.test(input)) {
        return 'packed';
    }

    if (detectTelemetry(input)) {
        return 'telemetry';
    }

    const normBinary = normalizeBinary(input);
    if (/^[0-1]+$/.test(normBinary)) {
        if (normBinary.length === 77) {
        return '77 bits'; // Source-encoded message, 77 bits
        } else if (normBinary.length === 91) { // 77 + 14 bits
        return '77 bits + CRC';
        } else if (normBinary.length === 174) { // 77 + 14 + 83 bits
        return '77 bits + CRC + LDPC'
        } else if (normBinary.length === 77 + 14 + 83 + 21) { // costas as binary
        return 'symbols (as binary)'
        }
    } 

    // Otherwise, assume it's a message (or 'free text' if ft8_lib fails to encode it)
    return 'message';
}

