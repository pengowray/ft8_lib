import { FT8Message } from './ft8_msg.js';
import { grayBitsToSymbols, encodeFT8FreeText, packedDataTo80Bits, getFT8MessageType, normalizeMessage, normalizeMessageAndHashes, normalizeBracketedFreeText, checkSync, checkCRC, checkParity, repairErrorsOnce, symbolsToBitsStrNoCosta  } from "./ft8_extra.js";
import * as extra from "./ft8_extra.js";
import * as hashmgr from "./ft8_hashmgr.js";
import FT8LIB from "./ft8_ft8lib.js";
import MSHVFT8 from "./mshv_ft8_wrap.js";

//example:
/*

// format: 'ft8/77b', ''ft8/text', 'ft8/text'
// generic formats: 'bits', 'text', 'symbols', 'ft8/bits', 'ft8/text', 'ft8/symbols'
// engine: 'ft8_lib', 'mshv', 'ft8play'
// engineVersion: 'MSHV 245'
// error: means error creating ft8_msg; NOT error validating msg, but that should also be indicated on the tab
// todo: processing (flags): 'rpad', 'ucase', 'normalize' (e.g. removed spaces), 'flip bits', 'grits', 'truncate text', 'remove zero padding' ...
//      'hash(es) not expanded'
// todo: assumptions (interpretation): 'hash1 match' (assumed not a collision), 'is ft8',
// todo: merge identical tabs (when engines give same output)
// todo: { meh: true } less interesting tabs, e.g. grits or flip bits when more basic results are available or when not valid result
// todo: future formats: 'wspr', 'js8', 'hash', 'spp'

let tabs = {
    '0.0': null, 
    '0.5': null, // { message: 'A00FA', format: 'ft8/77b', title: 'Telemetry', isValid: true, error: null, bits: '10111...' }
    'ft8lib': null,
    'msvh': null,
    'ft8play': null,
    '_selected': '0.0'
};
*/


export function globalInputNormalization(input) {
    // any input types we shouldn't normalize in all the ways?
    // 'Größe Straße' -> 'GROSSE STRASSE'
    // '“Café ① ² × ³ Olé”' -> '"CAFE 1 2 X 3 OLE"'

    const specialCharMapping = {
        'Ø': '0', // Slashed zero
        '×': 'X',
        '—': '-', // Em dash
        '–': '-', // En dash
        "“": '"', '”': '"', '„': '"', '‘': "'", '’': "'", 
        '…': '...'
      };

    return input.trim()
        .normalize('NFKD')
        .replace(/\p{Mark}/gu, '') // remove diacritics
        .toUpperCase()
        .replace(/\s+/g, ' ') // double spaces
        .replace(/[Ø×—–“”„‘`’…]/g, match => specialCharMapping[match] || match);
}


function initMessage(message, normalizedInput, inputType) { // was: encode()
    const input = normalizedInput;
    
    switch (inputType) {
        case 'free':
        case 'free text':
            const freetextBits = extra.encodeFT8FreeText(input);
            message.initBits(freetextBits);
            return;
        case '79 symbols':
            message.initSymbolsText(input);
            return;
        case '58 symbols':
            const symbolsText = extra.symbols58ToSymbols79(input);
            message.initSymbolsText(symbolsText);
            return;
        case 'packed':
            //const normalInput = normalizePackedData(input);
            //const packed = new Uint8Array(input.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
            const packed = extra.hexToPacked(input);
            message.initPackedData(packed);
            return;
        case 'telemetry':
            let result = extra.encodeFT8Telemetry(input);
            if (result.error) {
                //this.encodeError = result.error;
                throw new Error(result.error);
                return;
            }
            //this.packedData = new Uint8Array(result.result.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
            message.initPackedData(extra.hexToPacked(result.result));
            return;
        case '77 bits':
            //this.packedData = extra.bitsToPacked(input);
            message.initBits(input);
            return;
        case '80 bits':
        case '82 bits':
            const zeroPadding = bitStr.slice(77);
            if (zeroPadding != '000' && zeroPadding != '00000') {
                throw new Error(`Invalid ${inputType} message: not zero extended. Expected 77 bits + 3 or 5 zeros; Found: ${bitStr}`);
            }
            message.initBits(bitStr.slice(0, 77));
            return;
        case '91 bits':
            message.initSymbolsText(extra.binary91ToSymbols(input));
            return;
        case '174 bits':
            message.initSymbolsText(extra.binary174ToSymbols(input));
            return;
        case '237 bits': // symbols (as normal binary, including sync)
            message.initSymbolsText(extra.binary237ToSymbols(input));
            return;
        case '237 grits': // symbols (as graycode bits, including sync)
            message.initSymbolsText(extra.grayBitsToSymbols(input));
            return;
        case 'default/mshv':
            message.initMessage(input, 'mshv');
            /*
            const mshvPackingResult = mshvft8.packMessage(input);
            if (mshvPackingResult.errorCode !== 0) {
                throw new Error(`MSHV encoding failed; Code ${mshvPackingResult.errorCode}): ${mshvPackingResult.message}`);
            } else if (mshvPackingResult.message == null || mshvPackingResult.message == '') {
                throw new Error(`MSHV encoding failed; No message returned`);
            }
            message.initBits(mshvPackingResult.message);
            */
            return;
        case 'default/ft8lib':
            message.initMessage(input, 'ft8lib');
            //const packingResult = ft8lib.messageToPackedData(input);
            //if (packingResult.errorCode !== 0) throw new Error(`lib_ft8 encoding failed; Code ${packingResult.errorCode}): ${packingResult.errorMessage}`);
            //message.initPackedData(packingResult.data);
            return;
        default:
            throw new Error(`Unhandled input type: ${inputType}`);
    }
}

/////////////////////////////////
/*
    
*/

export function detectTelemetry(str) {
    //exactly 18 hex digits, or start with T:
    //note: first digit must be 0-8 if 18 digits. (not checked here)
    const trimmed = str.trim().toUpperCase();
    return (/^([0-9A-Fa-f][\s\-\:\,]?){18}$/.test(trimmed)) 
          || (/^[T](ELEMETRY)?\s*:/.test(trimmed))
          || (/\#T(ELEMETRY)?$/.test(trimmed));
}

export function detectPossibleTelemetry(str) {
    //hex digits (ignoring length)
    return (/^([0-9A-Fa-f][-\s\:\,]?)+$/.test(str));
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
        .replace(/^[T](ELEMETRY)?:\s*/g, '') // remove initial "T:" or telemetry:
        .replace(/\#T(ELEMETRY)?\s*$/g, '') // remove "#TELEMETRY "
        .replace(/[-\s\:\,]/g, '') // remove any space - : ,
        .replace(/^[0]*/g, ''); // initial 0's
    return trimmed;
}

export function inputToTabs(inputOriginal, expectedResults = null) {
    
    const input = globalInputNormalization(inputOriginal);

    hashmgr.addHashesFromInput(input); //note: will be ignored if only numbers
    if (expectedResults) {
        if (expectedResults?.decoded) hashmgr.addHashesFromInput(expectedResults.decoded);
        if (expectedResults?.message) hashmgr.addHashesFromInput(expectedResults.message);
    }

    const tabs = [];
    const info = {};

    if (input != inputOriginal) info.normalized = true;

    const inputTypes = detectInputTypes(input);

    // grits check
    // TODO: put this somewhere else
    if ('237 bits' in inputTypes) {
        const normBinary = normalizeBinary(input);
        //const normBinary = '010001110000101100011';
        const grayCosta    = '011001100000110101010';
        if (normBinary.startsWith(grayCosta) || normBinary.endsWith(grayCosta) || normBinary.slice(108, 129) == grayCosta) {
            inputTypes['237 grits'] = 20;
        }
    }

    // Sort inputTypes by weight (high to low)
    const sortedTypes = Object.entries(inputTypes)
    .sort((a, b) => b[1] - a[1])
    .map(([type]) => type);

    for (const type of sortedTypes) {
        if (inputTypes[type] > 0) {
            //const weight = inputTypes[type];
            const tab = { input: input, inputType: type };

            let message = null;
            try {
                const normalizedInput = normalizeType(input, type);
                message = new FT8Message(input)
                message.inputType = type;
                message.normalizedInput = normalizedInput;
                message.expectedResults = expectedResults;
                initMessage(message, normalizedInput, type);

                tabs.push(message);

            } catch (error) {
                if (message !== null) {
                    message.encodeError = error.message;
                    console.log(`Error encoding message: ${error.message}`);
                    console.trace(error);
                    //show error somewhere even if failed
                    tabs.push(message);
                }
            }
        }
    }

    tabs.forEach(message => {
        message.tabs = tabs;
    });

    return tabs;
}

export function normalizeType(input, type) {
    // note: input is already had globalInputNormalization()
    switch (type) {
        case 'free':
        case 'free text':
            return normalizeBracketedFreeText(input);
        case '79 symbols':
        case '58 symbols':
            return normalizeSymbols(input);
        case 'packed':
            return normalizePackedData(input);
        case 'telemetry':
            return normalizeTelemetry(input);
        case '77 bits':
        case '80 bits':
        case '82 bits':
        case '91 bits':
        case '174 bits':
        case '237 bits':
        case '237 grits':
            return normalizeBinary(input);
        case 'default':
        case 'default/mshv':
        case 'default/ft8lib':
        case 'default/ft8play':
            return extra.normalizeMessage(input);
        default:
            return input;
    }
}

// was: detectInput / doDetectInputType
export function detectInputTypes(normalizedInput) {
    const input = normalizedInput;

    //TODO: return normalized forms per type?
    //TODO: check for "protcol" in input, e.g. "ft8/msg:" etc

    const inputTypes = {}; // { 'type': weight, 'type2': weight, ... }
    
    if (detectFreeTextBrackets(input)) {
        inputTypes['free text'] = 30; // 'free text'
    } else {
        inputTypes['free text'] = 5; // fallback free text
    }

    // ordinary message (todo: checks?)
    inputTypes['default/mshv'] = 9; 
    //inputTypes['default/ft8play'] = 8; // TODO
    inputTypes['default/ft8lib'] = 7;

    if (/^[0-7]{79}$/.test(normalizeSymbols(input))) {
        //TODO: warn if all 0 or 1
        inputTypes['79 symbols'] = 25;
    }

    if (/^[0-7]{58}$/.test(normalizeSymbols(input))) {
        inputTypes['58 symbols'] = 25;
    }

    // Check if input is hex string (packed data); pairs of hex must be together.
    if (/^\s*([0-9A-Fa-f]{2}[-\s\,\:]?){10}\s*$/.test(input)) {
        inputTypes['packed'] = 25;
    }

    if (detectTelemetry(input)) {
        inputTypes['telemetry'] = 30;
    } else if (detectPossibleTelemetry(input)) {
        // only hex digits of any length
        // will also match many other types (bits, symbols, packed hex)
        inputTypes['telemetry'] = 15;
    }

    const normBinary = normalizeBinary(input);
    if (/^[0-1]+$/.test(normBinary)) {
        const len = normBinary.length;
        if ([77, 80, 82, 91, 174, 237].includes(len)) {
            inputTypes[`${len} bits`] = 20; // '77 bits' to '237 bits'
        }  else {
            //todo: add 'Unrecognized binary length' type or show the warning somewhere
            info.warn = `Unrecognized binary string length: ${len} bits`;
        }
    }

    return inputTypes;
}