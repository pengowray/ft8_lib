class OutputComponent extends Component {
    create() {
    }
    
    messageUpdate() {    
        //const pianoRollDiv = document.getElementById('piano-roll');

        const output = this.container;
        output.innerHTML = "";

        if (this.message == null) return;

        const message = this.message;

        // old: //function updateOutput(result, inputType, originalInput) {

        //console.log(packedData);
        const packedData = message.packedData;
        const symbolsText = message.symbolsText;
        const originalInput = message.inputText;
        const inputType = message.inputType;
        const messageType = message.ft8MessageType;
        const messageInfo = getFT8MessageTypeName(messageType);

        console.log('symbolsText', symbolsText);

        debugPrintMessageDetails(symbolsText);

        const syncCheckResult = message.getSyncCheck();
        const crcCheckResult = message.getCRCCheck();
        const parityCheckResult = message.getParityCheck();

        output.innerHTML = '';

        if (message.inputText != null) {
            output.innerHTML += `Input text: `;
            output.appendChild(document.createTextNode(message.inputText));
            output.innerHTML += '<br>';
        }

        if (inputType !== 'message') {
            output.innerHTML += `Input type: ${message.inputType}<br>`;
        }
        output.innerHTML += `Message Type: ${messageInfo} (${messageType})<br>`;
        output.innerHTML += '<hr>';

        //output.innerHTML += `Symbols: ${message.symbolsText}<br>`;
        output.innerHTML += `Symbols:<br>${symbolsPretty(message.symbolsText)}<br>`;

        output.innerHTML += `Packed:<br>${packedToHexStrSp(packedData)}<br>`;

        output.innerHTML += `Message (77 bits):<br>${(symbolsToBitsStrNoCosta(message.symbolsText).slice(0, 77))}<br>`;
        output.innerHTML += '<hr>';

        // sync check (costas)
        const syncSpan = document.createElement('span');
        syncSpan.textContent = `Sync check: ${syncCheckResult.result}`;
        if (syncCheckResult.result !== 'OK' ) {
            syncSpan.style.color = 'red';
            syncSpan.textContent += '. Unexpected symbol position(s): ' + syncCheckResult.errors.join(', ');
            console.log('Sync', syncCheckResult);
        }
        output.appendChild(syncSpan);
        output.innerHTML += "<br>";

        // CRC (14-bits)
        const crcSpan = document.createElement('span');
        crcSpan.textContent = `CRC check: ${crcCheckResult.result}`; // "OK" or "FAILED"
        if (crcCheckResult.result !== 'OK' ) {
            crcSpan.style.color = 'red';
            crcSpan.textContent += `. Expected: ${crcCheckResult.crc}, Actual: ${crcCheckResult.received}`; //TODO: only make wrong bits red 
            //console.log('CRC', crcCheckResult);
        }
        output.appendChild(crcSpan);
        output.innerHTML += "<br>";

        // Parity (LDPC)
        const paritySpan = document.createElement('span');
        paritySpan.textContent = `Parity check: ${parityCheckResult.result}`;
        if (parityCheckResult.result !== 'OK' ) {
            paritySpan.style.color = 'red';
            console.log('Parity', parityCheckResult);

        }
        output.appendChild(paritySpan);

        output.innerHTML += '<br>'
        output.innerHTML += '<hr>';

        // re-decoded
        const decodedSpan = document.createElement('span');
        let noMatchWarning;
        if (message.reDecodedResult.success) {
            //const decoded = result.decoded_result.decodedText
            const decoded = message.reDecodedResult.decodedText;
            decodedSpan.textContent = `Decoded: ${decoded}`;
            if (inputType === 'message' && normalizeMessage(decoded) !== normalizeMessage(originalInput)) {
                decodedSpan.className = 'warning';
                noMatchWarning = "Decoded message does not appear to match input.";
                if (normalizeBracketedFreeText(originalInput).toUpperCase().startsWith(decoded.toUpperCase())) {
                    noMatchWarning = "Original message appears to be truncated.";
                }
            } else if (inputType === 'free text' && decoded.toUpperCase() !== normalizeBracketedFreeText(originalInput).toUpperCase()) {
                decodedSpan.className = 'warning';
                noMatchWarning = "Decoded message does not appear to match free text input.";
                if (normalizeBracketedFreeText(originalInput).toUpperCase().startsWith(decoded.toUpperCase())) {
                    noMatchWarning = "Original message has been truncated to fit 13 character limit of free text.";
                }
            }
            if (noMatchWarning != null) {
                decodedSpan.innerHTML += `<br>⚠ Decode warning: ${noMatchWarning}`;
            }
        } else {
            decodedSpan.style.color = 'red';
            decodedSpan.textContent = `Error Decoding: ${message.reDecodedResult.errorCode}: ${message.reDecodedResult.errorMessage}`;
        }
        output.appendChild(decodedSpan);

        if (message.reDecodedResult.success) {
            // e.g. "Station W9XYZ is acknowledging receipt of a message from K1ABC and sending a signal report of -17 dB"
            output.innerHTML += `<br>Explanation: ${explainFT8Message(message.reDecodedResult.decodedText, messageType)}<br>`;
        }

        if (message.encodeError_ft8lib) {
            console.log('FT8Lib error', message.encodeError_ft8lib);
            output.innerHTML += `<span title="Tried using FT8_Lib to encode input but got this error, so as a fallback treated input as free text">Fallback to free text reason: ${message.encodeError_ft8lib}</span><br>`;
        }

        /*=== Tests (expected vs actual) ===*/

        if (message.expectedResults) {
            output.innerHTML += `<hr>Tests (comparison to known results): `;
            const expected = message.expectedResults;
            console.log('expectedResults', expected);
            let expectedType = expected.type;
            if (expectedType) {
                if (expectedType.endsWith('.')) expectedType = expectedType.slice(0, -1);
                if (expectedType === message.ft8MessageType) {
                    output.innerHTML += `<br> ✅ Message type: OK (match; ${expectedType})`;
                } else {
                    output.innerHTML += `<br> ❌ Message type: Expected: ${expectedType}, Decoded: ${message.ft8MessageType}`;
                }
            }

            // check .decoded exists
            const expectedMessage = expected.decoded ?? expected.message;
            const actualMessage = message.reDecodedResult.decodedText;

            if (expectedMessage) {
                if (expectedMessage.trim() === actualMessage.trim()) {
                    
                    if (expected.error) {
                        output.innerHTML += `<br> ✅ Decoded: OK* (expected error or truncated result)`;
                    } else {
                        output.innerHTML += `<br> ✅ Decoded: OK (match)`;
                    }
                } else {
                    output.innerHTML += `<br> ❌ Decoded: Expected: `;
                    // escape <>'s
                    output.appendChild(document.createTextNode(`"${expectedMessage}", Decoded: "${actualMessage}"`));
                }
            }

            let expectedSymbols = expected.symbols;
            const actualSymbols = message.symbolsText;
            if (expectedSymbols) {
                expectedSymbols = expectedSymbols.replace(/\s/g, '');
                if (expectedSymbols === actualSymbols) {
                    output.innerHTML += `<br> ✅ Symbols: OK (match)`;
                } else {
                    output.innerHTML += `<br> ❌ Symbols: Expected: "${expectedSymbols}", Decoded: "${actualSymbols}"`;
                }
            }
        }
    }


    onPlaying() {
    }

    onStop() {
    }

    initialUpdate() {
    }

    frameUpdate() {
    }

}

