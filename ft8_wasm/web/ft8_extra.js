// Free text character table
const FT8_CHAR_TABLE_FULL = " 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ+-./?";

// Costas array for sync
const COSTAS_ARRAY = [3, 1, 4, 0, 6, 5, 2];

// CRC polynomial
const CRC_POLYNOMIAL = 0x2757;  // 14-bit CRC polynomial without the leading 1

// Parity check matrix (kFTX_LDPC_Nm)
const LDPC_MATRIX = [
    [ 4, 31, 59, 91, 92, 96, 153 ],
    [ 5, 32, 60, 93, 115, 146, 0 ],
    [ 6, 24, 61, 94, 122, 151, 0 ],
    [ 7, 33, 62, 95, 96, 143, 0 ],
    [ 8, 25, 63, 83, 93, 96, 148 ],
    [ 6, 32, 64, 97, 126, 138, 0 ],
    [ 5, 34, 65, 78, 98, 107, 154 ],
    [ 9, 35, 66, 99, 139, 146, 0 ],
    [ 10, 36, 67, 100, 107, 126, 0 ],
    [ 11, 37, 67, 87, 101, 139, 158 ],
    [ 12, 38, 68, 102, 105, 155, 0 ],
    [ 13, 39, 69, 103, 149, 162, 0 ],
    [ 8, 40, 70, 82, 104, 114, 145 ],
    [ 14, 41, 71, 88, 102, 123, 156 ],
    [ 15, 42, 59, 106, 123, 159, 0 ],
    [ 1, 33, 72, 106, 107, 157, 0 ],
    [ 16, 43, 73, 108, 141, 160, 0 ],
    [ 17, 37, 74, 81, 109, 131, 154 ],
    [ 11, 44, 75, 110, 121, 166, 0 ],
    [ 45, 55, 64, 111, 130, 161, 173 ],
    [ 8, 46, 71, 112, 119, 166, 0 ],
    [ 18, 36, 76, 89, 113, 114, 143 ],
    [ 19, 38, 77, 104, 116, 163, 0 ],
    [ 20, 47, 70, 92, 138, 165, 0 ],
    [ 2, 48, 74, 113, 128, 160, 0 ],
    [ 21, 45, 78, 83, 117, 121, 151 ],
    [ 22, 47, 58, 118, 127, 164, 0 ],
    [ 16, 39, 62, 112, 134, 158, 0 ],
    [ 23, 43, 79, 120, 131, 145, 0 ],
    [ 19, 35, 59, 73, 110, 125, 161 ],
    [ 20, 36, 63, 94, 136, 161, 0 ],
    [ 14, 31, 79, 98, 132, 164, 0 ],
    [ 3, 44, 80, 124, 127, 169, 0 ],
    [ 19, 46, 81, 117, 135, 167, 0 ],
    [ 7, 49, 58, 90, 100, 105, 168 ],
    [ 12, 50, 61, 118, 119, 144, 0 ],
    [ 13, 51, 64, 114, 118, 157, 0 ],
    [ 24, 52, 76, 129, 148, 149, 0 ],
    [ 25, 53, 69, 90, 101, 130, 156 ],
    [ 20, 46, 65, 80, 120, 140, 170 ],
    [ 21, 54, 77, 100, 140, 171, 0 ],
    [ 35, 82, 133, 142, 171, 174, 0 ],
    [ 14, 30, 83, 113, 125, 170, 0 ],
    [ 4, 29, 68, 120, 134, 173, 0 ],
    [ 1, 4, 52, 57, 86, 136, 152 ],
    [ 26, 51, 56, 91, 122, 137, 168 ],
    [ 52, 84, 110, 115, 145, 168, 0 ],
    [ 7, 50, 81, 99, 132, 173, 0 ],
    [ 23, 55, 67, 95, 172, 174, 0 ],
    [ 26, 41, 77, 109, 141, 148, 0 ],
    [ 2, 27, 41, 61, 62, 115, 133 ],
    [ 27, 40, 56, 124, 125, 126, 0 ],
    [ 18, 49, 55, 124, 141, 167, 0 ],
    [ 6, 33, 85, 108, 116, 156, 0 ],
    [ 28, 48, 70, 85, 105, 129, 158 ],
    [ 9, 54, 63, 131, 147, 155, 0 ],
    [ 22, 53, 68, 109, 121, 174, 0 ],
    [ 3, 13, 48, 78, 95, 123, 0 ],
    [ 31, 69, 133, 150, 155, 169, 0 ],
    [ 12, 43, 66, 89, 97, 135, 159 ],
    [ 5, 39, 75, 102, 136, 167, 0 ],
    [ 2, 54, 86, 101, 135, 164, 0 ],
    [ 15, 56, 87, 108, 119, 171, 0 ],
    [ 10, 44, 82, 91, 111, 144, 149 ],
    [ 23, 34, 71, 94, 127, 153, 0 ],
    [ 11, 49, 88, 92, 142, 157, 0 ],
    [ 29, 34, 87, 97, 147, 162, 0 ],
    [ 30, 50, 60, 86, 137, 142, 162 ],
    [ 10, 53, 66, 84, 112, 128, 165 ],
    [ 22, 57, 85, 93, 140, 159, 0 ],
    [ 28, 32, 72, 103, 132, 166, 0 ],
    [ 28, 29, 84, 88, 117, 143, 150 ],
    [ 1, 26, 45, 80, 128, 147, 0 ],
    [ 17, 27, 89, 103, 116, 153, 0 ],
    [ 51, 57, 98, 163, 165, 172, 0 ],
    [ 21, 37, 73, 138, 152, 169, 0 ],
    [ 16, 47, 76, 130, 137, 154, 0 ],
    [ 3, 24, 30, 72, 104, 139, 0 ],
    [ 9, 40, 90, 106, 134, 151, 0 ],
    [ 15, 58, 60, 74, 111, 150, 163 ],
    [ 18, 42, 79, 144, 146, 152, 0 ],
    [ 25, 38, 65, 99, 122, 160, 0 ],
    [ 17, 42, 75, 129, 170, 172, 0 ]
];

// Number of rows in each parity check (kFTX_LDPC_Num_rows)
const LDPC_NUM_ROWS = [
    7, 6, 6, 6, 7, 6, 7, 6, 6, 7, 6, 6, 7, 7, 6, 6,
    6, 7, 6, 7, 6, 7, 6, 6, 6, 7, 6, 6, 6, 7, 6, 6,
    6, 6, 7, 6, 6, 6, 7, 7, 6, 6, 6, 6, 7, 7, 6, 6,
    6, 6, 7, 6, 6, 6, 7, 6, 6, 6, 6, 7, 6, 6, 6, 7,
    6, 6, 6, 7, 7, 6, 6, 7, 6, 6, 6, 6, 6, 6, 6, 7,
    6, 6, 6
];

// Gray code map (FTx bits -> channel symbols)
//const uint8_t kFT8_Gray_map[8] = { 0, 1, 3, 2, 5, 6, 4, 7 };

const GRAY_MAP = [0, 1, 3, 2, 5, 6, 4, 7];
const GRAY_INV = [0, 1, 3, 2, 6, 4, 5, 7];
const GRAY_OFF = [0, 1, 2, 3, 4, 5, 6, 7];
function symbolsToBitsStr(symbols) {
    return symbols.split('').map(s => GRAY_INV[parseInt(s)].toString(2).padStart(3, '0')).join('');
}

function symbolsToBitsStrNoCosta(symbols) {
   var symbolsWithoutCostas = symbols.slice(7, 36) + symbols.slice(43, 72);
   return symbolsWithoutCostas.split('').map(s => GRAY_INV[parseInt(s)].toString(2).padStart(3, '0')).join('');
}

function checkSync(symbols) {
    const syncPositions = [0, 36, 72];
    let errors = [];
    
    for (let i = 0; i < syncPositions.length; i++) {
        for (let j = 0; j < COSTAS_ARRAY.length; j++) {
            if (parseInt(symbols[syncPositions[i] + j]) !== COSTAS_ARRAY[j]) {
                errors.push(syncPositions[i] + j);
            }
        }
    }
    
    return {
        result: errors.length === 0 ? 'OK' : 'FAILED',
        errors: errors // list of bad symbols
    };
}

function printMessageDetails(symbols) {
    console.log("default");
    let bitString = symbolsToBitsStrNoCosta(symbols);

    console.log("Source-encoded message, 77 bits:\n"
     + bitString.slice(0, 77) + "\n\n"

     + "14-bit CRC: \n" 
     + bitString.slice(77, 91) + "\n\n"

     + "83 Parity bits\n"
     + bitString.slice(91)  + "\n\n"

     + "Channel symbols (79 tones):\n"
     + "  Sync               Data               Sync               Data               Sync\n"
     + `${symbols.slice(0, 7)} ${symbols.slice(7, 36)} ${symbols.slice(36, 43)} ${symbols.slice(43, 72)} ${symbols.slice(72)}\n`);
}

function checkCRC(symbols) {
    let bitString = symbolsToBitsStrNoCosta(symbols);
    let message = bitString.slice(0, 77).padEnd(82, '0').split('').map(Number);
    let receivedCRC = parseInt(bitString.slice(77, 91), 2);  // CRC is right after the 77-bit message
    
    let crc = 0;
    for (let i = 0; i < 82; i++) {
        crc ^= (message[i] << 13);
        for (let j = 0; j < 14; j++) {
            let topBit = (crc & 0x2000) !== 0;
            crc = (crc << 1) & 0x3FFF;
            if (topBit) {
                crc ^= CRC_POLYNOMIAL;
            }
        }
    }
    
    return {
        crc: crc.toString(2).padStart(14, '0'),
        received: receivedCRC.toString(2).padStart(14, '0'),
        result: crc === receivedCRC ? 'OK' : 'FAILED'
    };
}

function checkParity(symbols) {
    let bits = symbolsToBitsStrNoCosta(symbols).slice(0, 174).split('').map(Number);  // We need all 174 bits
    
    let failedParityBits = new Set();
    let failedMessageBits = new Set();
    
    // Check parity equations
    for (let i = 0; i < LDPC_MATRIX.length; i++) {
        let sum = 0;
        for (let j = 0; j < LDPC_NUM_ROWS[i]; j++) {
            let bitIndex = LDPC_MATRIX[i][j] - 1;  // Adjust for 0-based indexing
            if (bitIndex >= 0 && bitIndex < 174) {
                //sum ^= bits[bitIndex] === '0' ? 0 : 1;
                sum ^= bits[bitIndex];
            }
        }
        if (sum !== 0) {
            failedParityBits.add(i);
            for (let j = 0; j < LDPC_NUM_ROWS[i]; j++) {
                let bitIndex = LDPC_MATRIX[i][j] - 1;
                if (bitIndex >= 0 && bitIndex < 91) {  // Only include message bits
                    failedMessageBits.add(bitIndex);
                }
            }
        }
    }
    
    console.log('parity debug', bits);
    return {
        result: failedParityBits.size === 0 ? 'OK' : 'FAILED',
        failedParityCount: failedParityBits.size,
        failedMessageCount: failedMessageBits.size,
        failedParityErrors: Array.from(failedParityBits),
        failedMessageErrors: Array.from(failedMessageBits)
    };
}

////////////////////

// not used / tested
function decodeFT8FreeText(payload) {
    if (!(payload instanceof Uint8Array) || payload.length !== 10) {
        throw new Error("Invalid payload: must be a Uint8Array of length 10");
    }

    // Extract the 71 bits of free text data
    let n71 = BigInt(0);
    for (let i = 0; i < 9; i++) {
        n71 = (n71 << BigInt(8)) | BigInt(payload[i]);
    }

    // Decode the text
    let text = "";
    for (let i = 0; i < 13; i++) {
        let index = Number(n71 % BigInt(42));
        text = FT8_CHAR_TABLE_FULL[index] + text;
        n71 = n71 / BigInt(42);
    }

    // Trim trailing spaces
    text = text.trimEnd();

    return text;
}

// Example usage
//const payload = new Uint8Array([0x17, 0x6C, 0x5D, 0xB8, 0x73, 0x7F, 0x8A, 0x49, 0x30, 0x00]);
//console.log(decodeFT8FreeText(payload));

function encodeFT8FreeText(message) {
  const MAX_LEN = 13;
  // Ensure the message is no longer than 13 characters
  message = message.slice(0, MAX_LEN).toUpperCase();
  
  // Pad the message to 13 characters with spaces
  message = message.padStart(MAX_LEN, ' ');

  // Initialize the result as a BigInt
  let result = 0n;
  
  // Encode each character
  for (let i = 0; i < MAX_LEN; i++) {
    const charIndex = FT8_CHAR_TABLE_FULL.indexOf(message[i]);
    result = result * 42n + BigInt(charIndex);
  }
  
  // Convert to 71-bit binary string
  let binaryString = result.toString(2).padStart(71, '0');

  // message type 0.0 (6 bits) + 3 bits padding to get to 80
  binaryString = binaryString + '000000000';

  // Convert binary string to Uint8Array
  const output = new Uint8Array(10);
  for (let i = 0; i < 10; i++) {
    output[i] = parseInt(binaryString.slice(i * 8, (i + 1) * 8), 2);
  }
  
  return output;
}

// Encode 71-bit telemetry data
function encodeFT8Telemetry(telemetryHex) {
  // Ensure the input is a valid 18-character hex string
  if (!/^[0-9A-Fa-f]{1,18}$/.test(telemetryHex)) {
    return { "error": "Error: Telemetry data must be a 1 to 18 character hex string" };
  }

  // Convert hex to binary string
  let binaryString = hexToBinary(telemetryHex).replace(/^0*/g, '');

  // Add message type 0.5 (000101 in binary)
  binaryString = binaryString.padStart(71, '0') + '101000' // slice(-71)

  // Check if the binary string starts with 1 (exceeding 71 bits)
  if (binaryString[0] === '1' || binaryString.length > 77) {
    return { "error": "Error: First digit of 18-character hex string telemetry data must fall in the range 0 to 7." };
  }

  //console.log('telemetry', binaryString);
  // Convert binary string back to hex string
  return { "result": binaryToHex(binaryString) };
}

// Decode 71-bit telemetry data (untested; done by ft8_lib already)
function decodeFT8Telemetry(payload) {
  if (!(payload instanceof Uint8Array) || payload.length !== 10) {
    throw new Error("Invalid payload: must be a Uint8Array of length 10");
  }

  // Extract the binary string
  let binaryString = '';
  for (let i = 0; i < 10; i++) {
    binaryString += payload[i].toString(2).padStart(8, '0');
  }

  // Remove the last 6 bits (message type)
  binaryString = binaryString.slice(0, -6);

  // Convert binary to hex
  const telemetryHex = binaryToHex(binaryString);

  return telemetryHex;
}


function packedToHexStr(packedData) {
    return `${Array.from(packedData).map(b => b.toString(16).padStart(2, '0')).join('')}`;
}

function packedToHexStrSp(packedData) {
    return `${Array.from(packedData).map(b => b.toString(16).padStart(2, '0')).join(' ')}`;
}

function binaryToHex(binaryStr) {
    // Pad the binary string to ensure its length is a multiple of 4
    let paddedBinaryStr = binaryStr.padEnd(Math.ceil(binaryStr.length / 4) * 4, '0');
    
    let hexString = '';
    for (let i = 0; i < paddedBinaryStr.length; i += 4) {
        let fourBits = paddedBinaryStr.slice(i, i + 4);
        let hexDigit = parseInt(fourBits, 2).toString(16);
        hexString += hexDigit;
    }
    
    return hexString;
}


// Helper function to convert hex string to binary string
function hexToBinary(hex) {
  return hex.split('').map(char => 
    parseInt(char, 16).toString(2).padStart(4, '0')
  ).join('');
}

// Helper function to convert binary string to hex string
function binaryToHex_V2(binary) {
  return binary.match(/.{1,8}/g).map(byte => 
    parseInt(byte, 2).toString(16).padStart(2, '0')
  ).join('');
}



