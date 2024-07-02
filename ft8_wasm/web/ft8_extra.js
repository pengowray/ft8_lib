// Constants
const FT8_CHAR_TABLE_FULL = " 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ+-./?";

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
    // Uppercase the message and trim it to 13 characters max
    message = message.toUpperCase().trim().slice(0, 13);
    
    // Pad the message with spaces to 13 characters
    message = message.padEnd(13, ' ');

    // Encode the message
    let n71 = BigInt(0);
    for (let i = 0; i < 13; i++) {
        let charIndex = FT8_CHAR_TABLE_FULL.indexOf(message[i]);
        if (charIndex === -1) {
            throw new Error(`Invalid character in message: ${message[i]}`);
        }
        n71 = n71 * BigInt(42) + BigInt(charIndex);
    }

    // Convert to 10-byte Uint8Array
    let payload = new Uint8Array(10);
    for (let i = 8; i >= 0; i--) {
        payload[i] = Number(n71 & BigInt(0xFF));
        n71 = n71 >> BigInt(8);
    }
    
    // Set the last 6 bits to 0 (message type for free text)
    payload[9] = 0;

    return payload;
}

// Example usage
/*
try {
    const message = "Hello World!";
    const encodedPayload = encodeFT8FreeText(message);
    console.log("Encoded payload:", encodedPayload);

    // Decode it back to verify
    const decodedMessage = decodeFT8FreeText(encodedPayload);
    console.log("Decoded message:", decodedMessage);
} catch (error) {
    console.error("Error:", error.message);
}
*/

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

