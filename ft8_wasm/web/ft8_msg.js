import { grayBitsToSymbols, encodeFT8FreeText, packedDataTo80Bits, getFT8MessageType, normalizeMessage, normalizeMessageAndHashes, normalizeBracketedFreeText, checkSync, checkCRC, checkParity, repairErrorsOnce, symbolsToBitsStrNoCosta  } from "./ft8_extra.js";
import * as extra from "./ft8_extra.js";
import * as hashmgr from "./ft8_hashmgr.js";
import FT8LIB from "./ft8_ft8lib.js";
import MSHVFT8 from "./mshv_ft8_wrap.js";

const ft8lib = new FT8LIB();
const mshvft8 = new MSHVFT8();

class FT8Message extends EventTarget {
    /**
     * 
     * @param {string} inputText 
     */
    constructor(inputText) {
      super();

      this.inputText = inputText;
      this.inputType = null; // can be manual set, otherwise auto-detected
      this.expectedResults = null; // if running test against known input. 

      // results of encoding
      this.encodeError = null;
      this.encodeError_ft8lib = null;
      //this.encodedData = null;
      this.symbolsText = null;
      this.packedData = null;
      this.bits = null; // string of 77 bits

      this.reDecodedResult = null;
      this.mshvDecoded = null;

      // cached checks
      this.SyncCheck = null;
      this.CRCCheck = null;
      this.ParityCheck = null; // LDPC

      // overrides of defaults
      this.baseFrequency = null; // 1000
      this.sampleRate = null; // 12000
      this.toneSpacing = null; // 6.25
      this.customToneFrequencies = null;
      this.symbolBT = null; // 2.0
      this.symbolPeriod = null; // 0.160
      //this.numOfSymbols = null; // 79 (todo)

      this.audioSamples = null;
      this.dphiSamples = null;
      this.levelsSamples = null;

      // for playing
      this.isPlaying = false; // == (audioSource != null)
      this.playStartTime = null;

      // all should be null when not queuing
      this.queuingStartedAt = null; // if playing is queued for next 15s
      this.queuingUntil == null; // when to start playing
      this.queueInterval = null; // check if ready to play

      this.audioContext = null;
      this.audioBuffer = null;
      this.channelData = null;
      this.audioSource = null; // only not null while playing

      // ViewManager for reporting audio stop/start/queued/etc
      this.viewManager = null;

      if (hashmgr && hashmgr.mshvft8 == null) {
          hashmgr.setMshvft8(mshvft8);
      }
      
      //this.hashes = hashmgr.hashes;

      // setup Event Listeners
      //this.dispatchEvent(new Event('queue'));
      //this.dispatchEvent(new Event('play'));
      //this.dispatchEvent(new Event('pause'));
      //this.audioSource.onended = () => this.dispatchEvent(new Event('stop'));

      //usage example:
      //msg.addEventListener('play', () => console.log('Audio started playing'));
    }
    
    getSyncCheck() {
        if (this.SyncCheck == null) this.SyncCheck = checkSync(this.symbolsText);
        return this.SyncCheck;
    }
    getCRCCheck() {
        if (this.CRCCheck == null) this.CRCCheck = checkCRC(this.symbolsText);
        return this.CRCCheck;
    }
    getParityCheck() { // LDPC check
        if (this.ParityCheck == null) this.ParityCheck = checkParity(this.symbolsText);
        return this.ParityCheck;
    }
    getParityRepairedCodeword() {
        // returns null if nothing to repair
        const parityCheck = this.getParityCheck();
        if (parityCheck == null || parityCheck.success) return null;
        const repaired = extra.repairErrorsOnce(symbolsToBitsStrNoCosta(this.symbolsText), parityCheck);
        return repaired;
    }

    getTiming() {
        const isPlaying = this.isPlaying;
        const audioCurrentTime = (this.audioContext) ? this.audioContext.currentTime : null;
        //const startTime = this.playStartTime;
        const startTime = this.playStartTime ?? 0;
        const currentTime =  audioCurrentTime - startTime;
        //const currentTime =  audioCurrentTime;
        const duration = this.audioBuffer ? this.audioBuffer.duration : null;

        let remainingTime = duration - currentTime;
        if (remainingTime < 0) remainingTime = 0;

        let progress = currentTime / duration * 100;
        if (progress < 0) progress = 0;
        if (progress > 100) progress = 100;

        //TODO: use metadata to get audio start/end/symbol durations
        let symbolDuration = 0.160; // default
        if (this.audioBuffer != null && this.audioBuffer.duration) symbolDuration = this.audioBuffer.duration / 79; // 79 symbols in FT8
        const currentSymbolIndex = Math.floor(currentTime / symbolDuration);
        //const currentSymbolIndex = Math.floor(audioCurrentTime / symbolDuration);
        
        return { isPlaying, audioCurrentTime, startTime,  currentTime, duration, remainingTime, progress, currentSymbolIndex };
    }

    detectInputType() {
        this.inputType = doDetectInputType(this.inputText);
        return this.inputType;
    }

    globalInputNormalization(input) {
        // any input types we shouldn't normalize in all the ways?
        // TODO: normalize unicode numbers / strip diacritics / etc
        return input.trim().toUpperCase().replace(/\s+/g, ' ').replace('Ø', '0');
    }

    encode() {

        let input = this.inputText;
        input = this.globalInputNormalization(input);
        const inputType = this.inputType ?? this.detectInputType();

        //let packedData, symbolsText;

        switch (inputType) {
            case 'free text':
                input = normalizeBracketedFreeText(input);
                this.packedData = extra.encodeFT8FreeText(input);
                break;
            case '79 symbols':
                input = normalizeSymbols(input);
                this.symbolsText = input;
                break;
            case '58 symbols':
                input = normalizeSymbols(input);
                this.symbolsText = extra.symbols58ToSymbols79(input);
                break;
            case 'packed':
                input = normalizePackedData(input);
                this.packedData = new Uint8Array(input.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
                break;
            case 'telemetry':
                input = normalizeTelemetry(input);
                let result = extra.encodeFT8Telemetry(input);
                if (result.error) {
                    this.encodeError = result.error;
                    throw new Error(result.error);
                }
                this.packedData = new Uint8Array(result.result.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
                break;
            case '77 bits':
                input = normalizePackedData(input);
                this.packedData = extra.bitsToPacked(input);
                break;
            case '80 bits':
            case '82 bits':
                const bitStr = normalizeBinary(input);
                const zeroPadding = bitStr.slice(77);
                if (zeroPadding != '000' && zeroPadding != '00000') {
                    this.encodeError = `Invalid ${inputType} message: not zero extended. Expected 77 bits + 3 or 5 zeros; Found: ${bitStr}`;
                    throw new Error(this.encodeError);
                }
                this.packedData = extra.bitsToPacked(bitStr.slice(0, 77));
                break;
            case '91 bits':
                this.symbolsText = extra.binary91ToSymbols(normalizeBinary(input));
                break;
            case '174 bits':
                this.symbolsText = extra.binary174ToSymbols(normalizeBinary(input));
                break;
            case '237 bits': // symbols (as normal binary, including sync)
                this.symbolsText = extra.binary237ToSymbols(normalizeBinary(input));
                break;
            case '237 grits': // symbols (as graycode bits, including sync)
                this.symbolsText = extra.grayBitsToSymbols(normalizeBinary(input));
                break;
            case 'default':
            default:
                input = extra.normalizeMessage(input);
                hashmgr.addHashesFromInput(this.inputText);

                const packingResult = ft8lib.messageToPackedData(input);
                const mshvPackingResult = mshvft8.packMessage(input);

                if (mshvPackingResult.errorCode == 0 && mshvPackingResult.message) {
                    //todo: try catch
                    this.bits = mshvPackingResult.message;
                    this.packedData = extra.bitsToPacked(mshvPackingResult.message);
                    console.log("mshv bits", this.bits);

                } else if (packingResult.success) {
                    this.packedData = packingResult.data;
                    
                } else {
                    this.encodeError_ft8lib = `Encoding failed (code ${packingResult.errorCode}): ${packingResult.errorMessage}`;
                    console.log("falling back to free text because error: ", this.encodeError_ft8lib);
                    //this.encodeError = this.encodeError_ft8lib;

                    // attempt free text fallback
                    input = normalizeBracketedFreeText(input); // in case there's brackets
                    this.packedData = encodeFT8FreeText(input);

                    if (this.packedData == null) {
                        this.encodeError = "Failed to encode as free text";
                        throw new Error(this.encodeError);
                    }
                }
                break;
        }

        if (this.symbolsText == null && this.packedData != null) {
            this.symbolsText = ft8lib.packedDataToSymbolsArray(this.packedData);

        } else if (this.packedData == null && this.symbolsText != null) {
            //console.log("empty packed data, generating from symbols");
            this.packedData = extra.symbolsToPackedData(this.symbolsText);
        }

        if (this.symbolsText == null) {
            this.encodeError = "Failed to generate symbols";
            throw new Error(this.encodeError);
        }

        if (this.packedData == null) {
            this.encodeError = "Failed to generate packed data";
            throw new Error(this.encodeError);
        }
    
        if (this.packedData) {
            var packedBits = extra.packedDataTo80Bits(this.packedData);
            const zeroPadding = packedBits.slice(77);
            this.bits = packedBits.slice(0, 77);
            if (zeroPadding != '000') {
                this.encodeError = `Packed data not zero padded (Expected 77 bits + 3 zeros), Got: ${packedBits}`;
                throw new Error(this.encodeError);
            }
        }

        this.ft8MessageType = extra.getFT8MessageType(this.packedData);
        this.reDecodedResult = ft8lib.decodeFT8FromPackedData(this.packedData, this.packedData.length);
        this.mshvDecodedResult = mshvft8.unpackMessage(this.bits).message;
        if (this.mshvDecodedResult != null && this.mshvDecodedResult.errorCode == 0) {
            //TODO XXX fix me
            this.reDecodedResult = {success: true, resultText: this.mshvDecodedResult.message, result: this.mshvDecodedResult.message, decodedText: this.mshvDecodedResult.message };
        }
        
        console.log("mshvDecoded", this.mshvDecoded);

        if (this.expectedResults) {
            if (this.expectedResults?.decoded) hashmgr.addHashesFromInput(this.expectedResults.decoded);
            if (this.expectedResults?.message) hashmgr.addHashesFromInput(this.expectedResults.message);
        }

    }

    setAudioOptions(sampleRate, baseFrequency, customToneFrequencies = null) {
        this.sampleRate = sampleRate;
        this.baseFrequency = baseFrequency;
        this.customToneFrequencies = customToneFrequencies;
    }

    
    clearAudioData() {
        this.audioSamples = null;
        this.dphiSamples = null;
        this.levelsSamples = null;
        //this.metadata = null;
        this.audioBuffer = null;
        this.channelData = null;
        //this.audioContext = null; // reuse? stop audio first?
        this.audioSource = null;
    }

    clearAllCached() {
        this.SyncCheck = null;
        this.CRCCheck = null;
        this.ParityCheck = null;
        this.clearAudioData();
        //TODO: clear everything generated by encode() except maybe symbols and packedData
    }

    readyAudio() {
        if (this.audioSamples == null) {
            this.generateAudio();
        }
    }

    readyAudioAndBuffer() {
        this.readyAudio();

        if (this.audioSamples == null || this.audioSamples.length == 0) {
            // failed to generate audio
            return;
        }

        //aka setupAudioPlayback()

        const sampleRate = this.getSampleRate(); // message.getOptions().sampleRate;
        //const metadata = message.metadata;

        //this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: sampleRate });
        this.audioContext = this.audioContext || new window.AudioContext({ sampleRate: sampleRate });
        this.audioBuffer = this.audioBuffer || this.audioContext.createBuffer(1, this.audioSamples.length, sampleRate);
        if (this.channelData == null) {
            this.channelData = this.audioBuffer.getChannelData(0);
            this.channelData.set(this.audioSamples);
        }
    }

    queueTimeRemaining() {
        if (!this.queuingStartedAt || !this.queuingUntil) return null;
        const seconds = (this.queuingUntil - new Date().getTime()) / 1000;
        return seconds < 0 ? 0 : seconds;
    }

    queueAudio() {
        if (this.isPlaying) return false; // already playing
        if (this.queuingStartedAt) return false; // already queued

        this.readyAudioAndBuffer();

        if (!this.audioContext) {
            console.error("No audio context");
            return false;
        }

        this.queuingStartedAt = Date.now();
        const now = new Date().getSeconds();
        const latency = (this.audioContext?.outputLatency ?? 0);
        const secondsUntilNext15 = 15 - ((now + latency) % 15);
        //const displaySecondsUntilNext15 = 15 - (now % 15);
        let nextCycleTime = new Date().getTime() + secondsUntilNext15 * 1000;
        this.queuingUntil = nextCycleTime;

        this.queueInterval = setInterval(() => {
            const currentTime = new Date().getTime();
            if (!this.queueInterval || !this.queuingUntil || this.isPlaying) {
                clearInterval(this.queueInterval);
                return;
            }
            if (currentTime >= this.queuingUntil) {
                clearInterval(this.queueInterval);
                this.playAudio();
            }
        }, 90); // Check every 90ms
    
        if (this.viewManager) this.viewManager.onQueue(this);
        this.dispatchEvent(new Event('queue'));
    }

    playAudio() {
        //if (this.audioSource) { return; /* already playing */ }
        if (this.isPlaying) return false;

        if (this.queuingStartedAt) {
            this.queuingStartedAt = null;
            this.queuingUntil = null;
        }

        this.readyAudioAndBuffer();
        if (!this.audioBuffer) return false;
        
        const msg = this;
        msg.isPlaying = true;

        this.audioContext.resume().then(() => {
            console.log("Audio context resumed");
            msg.audioSource = msg.audioContext.createBufferSource();
            msg.audioSource.buffer = msg.audioBuffer;
            msg.audioSource.connect(msg.audioContext.destination);
            msg.audioSource.start();
            
            msg.audioSource.onended = () => this.resetAudioState();
            if (this.viewManager) this.viewManager.onPlay(this);

            msg.playStartTime = msg.audioContext.currentTime;
        });
        //if (this.viewManager) this.viewManager.onPlay(this);
        return true;
    }
    
    resetAudioState() {
        console.log("resetAudioState (stopping)");
        this.isPlaying = false;
        this.playStartTime = null;

        if (this.audioSource) this.audioSource.onended = null;
        if (this.audioSource) this.audioSource.stop();
        //this.clearAudioAndBuffer();
        this.queuingStartedAt = null;
        this.queuingUntil = null;

        if (this.viewManager) this.viewManager.onStop(this);
        this.dispatchEvent(new Event('stop'));
    }

    getSampleRate() {
        return this.sampleRate ?? 12000;
    }
    getBaseFrequency() {
        return this.baseFrequency ?? 1000;
    }
    getOptions() {
        //TODO: cache this
        return {
            baseFrequency: this.getBaseFrequency(),
            sampleRate: this.getSampleRate(),
            toneSpacing: this.toneSpacing ?? 6.25,
            customToneFrequencies: this.customToneFrequencies ?? null,
            symbolBT: this.symbolBT ?? 2.0,
            symbolPeriod: this.symbolPeriod ?? 0.160
        };
    }

    /*
    updates this.audioSamples, this.dphiSamples, this.metadata
    */
    generateAudio() {
        const options = this.getOptions();
        if (this.symbolsText == null) return;
    
        const numSymbols = this.symbolsText.length;
        
        // Allocate memory for symbols string
        //const symbolsPtr = Module.stringToUTF8(this.symbolsText);
        const symbolsPtr = ft8lib.module._malloc(numSymbols + 1); // +1 for null terminator
        for (let i = 0; i < numSymbols; i++) {
            ft8lib.module.HEAP8[symbolsPtr + i] = this.symbolsText.charCodeAt(i);
        }
        ft8lib.module.HEAP8[symbolsPtr + numSymbols] = 0; // Null terminator

        // Calculate number of samples
        let numSamples = ft8lib.module._calculate_num_samples(numSymbols, options.symbolPeriod, options.sampleRate);
    
        // Allocate memory for audio and dphi
        const audioPtr = ft8lib.module._malloc(numSamples * 4);
        const dphiPtr = ft8lib.module._malloc(numSamples * 4);
        const levelsPtr = ft8lib.module._malloc(numSamples * 4);

        // Allocate memory for metadata
        const metadataLengthPtr = ft8lib.module._malloc(4);
        const metadataJsonPtrPtr = ft8lib.module._malloc(4);
        const FT8_TONE_COUNT = 8;
    
        let result;
        const n_start_delay = 0;  // Set to 0 for now
        const n_end_extension = 0;  // Set to 0 for now
    
        if (options.customToneFrequencies != null) {
            // Use custom tone frequencies
            const toneOffsetsPtr = ft8lib.module._malloc(FT8_TONE_COUNT * 4);
            const toneOffsets = new Float32Array(ft8lib.module.HEAPF32.buffer, toneOffsetsPtr, FT8_TONE_COUNT);
            for (let i = 0; i < FT8_TONE_COUNT; i++) {
                toneOffsets[i] = options.customToneFrequencies[i];
            }
    
            result = ft8lib.module._synth_gfsk_custom(
                symbolsPtr, options.baseFrequency, toneOffsetsPtr,
                options.symbolBT, options.symbolPeriod, options.sampleRate,
                n_start_delay, n_end_extension,
                audioPtr, dphiPtr, levelsPtr, metadataLengthPtr, metadataJsonPtrPtr
            );
    
            ft8lib.module._free(toneOffsetsPtr);
        } else {
            // Use default FT8 frequencies
            result = ft8lib.module._synth_gfsk_custom(
                symbolsPtr, options.baseFrequency, 0, // Pass 0 for custom_tones when using default
                options.symbolBT, options.symbolPeriod, options.sampleRate,
                n_start_delay, n_end_extension,
                audioPtr, dphiPtr, levelsPtr, metadataLengthPtr, metadataJsonPtrPtr
            );
        }
    
        const audio = new Float32Array(ft8lib.module.HEAPF32.buffer, audioPtr, numSamples);
        const dphi = new Float32Array(ft8lib.module.HEAPF32.buffer, dphiPtr, numSamples);
        const levels = new Float32Array(ft8lib.module.HEAPF32.buffer, levelsPtr, numSamples);
        this.audioSamples = Array.from(audio);
    
        const dphiArray = Array.from(dphi);
        this.dphiSamples = scaleToRange(dphiArray, 190, 10);

        const levelsArray = Array.from(levels);
        this.levelsSamples = scaleToRange(levelsArray, 195, 5);

        const metadataLength = ft8lib.module.HEAP32[metadataLengthPtr / 4];
        const metadataJsonPtr = ft8lib.module.HEAP32[metadataJsonPtrPtr / 4];
        const metadataStr = ft8lib.module.UTF8ToString(metadataJsonPtr, metadataLength);
    
        try {
            this.metadata = JSON.parse(metadataStr);
        } catch {
            error = "(internal error) Failed to parse metadata: '" + metadataStr + "'";
            console.error(error);
        } finally {
            // Free allocated memory
            ft8lib.module._free(symbolsPtr);
            ft8lib.module._free(audioPtr);
            ft8lib.module._free(dphiPtr);
            ft8lib.module._free(levelsPtr);
            ft8lib.module._free(metadataLengthPtr);
            ft8lib.module._free(metadataJsonPtrPtr);
            ft8lib.module._free(metadataJsonPtr);
        }
    }
}

function detectTelemetry(str) {
    //exactly 18 hex digits, or start with T:
    //note: first digit must be 0-8 if 18 digits. (not checked here)
    const trimmed = str.trim().toUpperCase();
    return (/^([0-9A-Fa-f][\s\-\:\,]?){18}$/.test(trimmed)) 
//                || (/^[Tt](ELEMETRY)?:\s0*([0-9A-Fa-f][\s\-\:]?){1,18}$/.test(trimmed))
          || (/^[Tt](ELEMETRY)?\s*:/.test(trimmed))
          || (/\#T(ELEMETRY)?$/.test(trimmed))
}

function detectFreeTextBrackets(str) {
    // brackets or quotes
    const trimmed = str.trim();
    return (trimmed.startsWith('<') && trimmed.endsWith('>') && !trimmed.slice(1, trimmed.length-1).includes('<'))  
        || (trimmed.startsWith('"') && trimmed.endsWith('"'));
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
    return input.replace(/[\s\-\:\,]/g, '').toLowerCase();
}

function normalizeTelemetry(str) {
    //exactly 18 hex digits, or start with T:
    //note: first digit must be 0-8 if 18 digits. (not checked here)
    
    let trimmed = str.trim();
    trimmed = trimmed.toUpperCase()
        .replace(/^[Tt](ELEMETRY)?:\s*/g, '') // remove initial "T:" or telemetry:
        .replace(/\#T(ELEMETRY)?\s*$/g, '') // remove "#TELEMETRY "
        .replace(/[\s\-\:\,]/g, '') // remove any space - : ,
        .replace(/^[0]*/g, ''); // initial 0's
    return trimmed;
}

function doDetectInputType(inputOriginal) {
    const input = inputOriginal.trim();

    if (detectFreeTextBrackets(input)) {
        return 'free text'; // TODO: explicit free text vs assumed free text
    }

    if (/^[0-7]{79}$/.test(normalizeSymbols(input))) {
        return '79 symbols';
    }

    if (/^[0-7]{58}$/.test(normalizeSymbols(input))) {
        return '58 symbols';
    }

    // Check if input is hex string (packed data); pairs of hex must be together.
    if (/^\s*([0-9A-Fa-f]{2}[-\s\,\:]?){10}\s*$/.test(input)) {
        return 'packed';
    }

    if (detectTelemetry(input)) {
        return 'telemetry';
    }

    const normBinary = normalizeBinary(input);
    if (/^[0-1]+$/.test(normBinary)) {
        if (normBinary.length === 77) {
            return '77 bits'; // Source-encoded message, 77 bits
        } else if (normBinary.length === 80) { // 77 bits + 3 bits zero padding
            return '80 bits'; 
        } else if (normBinary.length === 82) { // 77 bits + 5 bits zero padding (as used as input to CRC)
            return '82 bits'; 
        } else if (normBinary.length === 91) { // 77 + 14 bits
            return '91 bits';
        } else if (normBinary.length === 174) { // 77 + 14 + 83 bits
            return '174 bits'
        } else if (normBinary.length === 237) { // 77 + 14 + 83 + 21*3
            //const normBinary = '010001110000101100011';
            const grayCosta = "011001100000110101010";
            if (normBinary.startsWith(grayCosta) || normBinary.endsWith(grayCosta) || normBinary.slice(108, 129) == grayCosta) {
                return '237 grits';
            }
            return '237 bits'
        } else {
            //TODO: warning
        }
    } 

    // Otherwise, assume it's a message (or 'free text' if ft8_lib fails to encode it)
    return 'default';
}

/**
 * @param {Array} numbers - array of numbers to scale
 * @param {number} newMin - new minimum value of the scaled range
 * @param {number} newMax - new maximum value of the scaled range
 * @returns {Array} - The array of numbers scaled to the new range
 */
function scaleToRange(numbers, newMin, newMax) {
    const { min: originalMin, max: originalMax } = findMinAndMax(numbers);
    //console.log("min/max:", originalMin, originalMax);
    const scale = (newMax - newMin) / (originalMax - originalMin);
    
    return numbers.map(num => (num - originalMin) * scale + newMin);
}

function findMinAndMax(numbers) {
    let min = Infinity;
    let max = -Infinity;
    
    for (const num of numbers) {
        if (num < min) min = num;
        if (num > max) max = num;
    }
    
    return { min, max };
}


export { 
    // needed
    FT8Message,

    // sure why not (maybe move some normalize to ft8_extra.js)
    normalizeMessage, normalizeMessageAndHashes, normalizeBracketedFreeText,

    // meh (probably internal)
    normalizeSymbols, normalizeBinary, normalizePackedData, normalizeTelemetry, doDetectInputType, scaleToRange, findMinAndMax
};
