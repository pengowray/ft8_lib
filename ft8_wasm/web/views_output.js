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

        console.log('symbolsText', symbolsText);

        debugPrintMessageDetails(symbolsText);

        const syncCheckResult = message.getSyncCheck();
        const crcCheckResult = message.getCRCCheck();
        const parityCheckResult = message.getParityCheck();

        output.innerHTML = '';
        if (inputType !== 'message') {
            output.innerHTML += `Input type: ${message.inputType}<br>`;
        }
        //output.innerHTML += `Symbols: ${message.symbolsText}<br>`;
        output.innerHTML += `Symbols:<br>${symbolsPretty(message.symbolsText)}<br>`;

        output.innerHTML += `Packed:<br>${packedToHexStrSp(packedData)}<br>`;

        output.innerHTML += `Message (77 bits):<br>${(symbolsToBitsStrNoCosta(message.symbolsText).slice(0, 77))}<br>`;

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

        const messageType = message.ft8MessageType;
        const messageInfo = getFT8MessageTypeName(messageType);

        output.innerHTML += `<br>Message Type: ${messageInfo} (${messageType})`;
        if (message.reDecodedResult.success) {
            output.innerHTML += `<br>Explanation: ${this.explainFT8Message(message.reDecodedResult.decodedText, messageType)}<br>`;
        }

        if (message.encodeError_ft8lib) {
            console.log('FT8Lib error', message.encodeError_ft8lib);
            output.innerHTML += `Fallback to free text reason: ${message.encodeError_ft8lib}<br>`;
        }

    }

    FT8MessageTypeInfo() { 
        //packedData : Uint8Array(10)
        if (this.message == null || this.message.packedData == null) {
            return null;
        }

        const packedData = this.message.packedData;

        if (!packedData || packedData.length == 1 ) {
            return { messageType: "None", type: "-" };
        } else if ( packedData.length < 10) { 
            return { messageType: "Unknown", type: "-" };
        }

        const bytes = packedData;

        const i3 = (bytes[9] >> 3) & 0x07;

        switch (i3) {
            case 0:
                const n3 = ((bytes[9] >> 6) & 0x03) | ((bytes[8] << 2) & 0x04); // bit[72] to bit[74] of end-padded 77-bit payload
                switch (n3) {
                    case 0: return { type: "0.0", messageType: "Free text message" };
                    case 1: return { type: "0.1", messageType: "DXpedition mode" };
                    case 2: return { type: "0.2", messageType: "Unknown / Reserved" }; // EU VHF Contest ?
                    case 3: return { type: "0.3", messageType: "Field Day" };
                    case 4: return { type: "0.4", messageType: "Field Day" };
                    case 5: return { type: "0.5", messageType: "Telemetry" };
                    case 6: return { type: "0.6", messageType: "Unknown / Reserved" }; // Contesting ?
                    case 7: return { type: "0.7", messageType: "Unknown / Reserved" }; // Reserved for future use ?
                }
                break;
            case 1: return { type: "1", messageType: "Standard message" };
            case 2: return { type: "2", messageType: "EU VHF" };
            case 3: return { type: "3", messageType: "ARRL RTTY Roundup" }; // ARRL RTTY Roundup exchange ?
            case 4: return { type: "4", messageType: "Non-standard callsign" };
            case 5: return { type: "5", messageType: "EU VHF with 6-digit grid locator" }; // EU VHF contest with 6-digit grid locator ?
            case 6: return { type: "6", messageType: "Unknown / Reserved" };
            case 7: return { type: "7", messageType: "Unknown / Reserved" };
            default: return { type: `${i3}`, messageType: "Unknown" };
        }

        return { messageType: "Unknown", type: "-" };
    }

    explainFT8Message(message, msgType) {
        if (message === "Decoding failed") {
            return '';
        }

        let typeExplanation = "";

        const parts = message.trim().split(/\s+/);
        let explanation = '';
        console.log(parts);

        function isSimpleCallsign(call) {
            return /^[A-Z0-9]{1,6}$/.test(call);
        }
        function isValidCallsign(call) {
            // at least one letter, one number, 3 to 15 characters, optional slash but not as first or last character
            return /[A-Z]/.test(call) && /[0-9]/.test(call) && /^[A-Z0-9][A-Z0-9\/]{1,13}[A-Z0-9]$/.test(call);
        }

        function isGridLocator(grid) {
            return /^[A-R]{2}[0-9]{2}([a-x]{2})?$/.test(grid);
        }

        function isReport(report) {
            return /^[+-]?\d{2}$/.test(report);
        }

        if (parts.length === 2 && parts[0] === 'CQ') {
            if (isValidCallsign(parts[1])) {
                explanation = `This is a general call (CQ) message. Station ${parts[1]} is calling CQ, looking for any station to respond.`;
            } else {
                explanation = `This is an unrecognized CQ message.`;
            }
        } else if (parts.length === 3 && parts[0] === 'CQ') {
            if (isValidCallsign(parts[1]) && isGridLocator(parts[2])) {
                explanation = `This is a general call (CQ) message with location. Station ${parts[1]} is calling CQ from grid square ${parts[2]}, looking for any station to respond.`;
            } else if (/^[A-Z]{2}$/.test(parts[1]) && isValidCallsign(parts[2])) {
                explanation = `This is a directed CQ message. Station ${parts[2]} is calling CQ, specifically looking for stations in the ${parts[1]} region to respond.`;
            } else {
                explanation = `This is an unrecognized CQ message.`;
            }
        } else if (parts.length === 3 && isValidCallsign(parts[0]) && isValidCallsign(parts[1])) {
            if (isReport(parts[2])) {
                explanation = `This is a signal report message. Station ${parts[0]} is sending a signal report of ${parts[2]} dB to station ${parts[1]}.`;
                if (parts[2] === '73') { 
                    explanation += ' 73 is also shorthand for <i>best regards</i>.'
                }
            } else if (parts[2] === 'RRR') {
                explanation = `This is an acknowledgment message. Station ${parts[0]} is confirming receipt of information from station ${parts[1]}.`;
            } else if (parts[2] === 'RR73') {
                explanation = `This is a combined acknowledgment and goodbye message. Station ${parts[0]} is confirming receipt and saying <i>best regards</i> to station ${parts[1]}.`;
            } else if (parts[2] === '73') {
                explanation = `This is a goodbye message. Station ${parts[0]} is saying goodbye to station ${parts[1]} with "73" (best regards).`;
            } else if (isGridLocator(parts[2])) {
                explanation = `Station ${parts[0]} is sending its grid locator ${parts[2]} to station ${parts[1]}.`;
            } else if (parts[2].startsWith('R')) {
                explanation = `Station ${parts[0]} is acknowledging receipt of a message from ${parts[1]} and sending a signal report of ${parts[2].slice(1)} dB.`;
            } else {
                explanation = `This is a message from ${parts[0]} to ${parts[1]}, but the content "${parts[2]}" is not recognized.`;
            }
        } else if (parts.length === 4 && isValidCallsign(parts[0]) && isValidCallsign(parts[1])) {
            if (parts[2] === 'R' && isReport(parts[3])) {
                explanation = `This is a signal report acknowledgment. Station ${parts[0]} is confirming receipt of a previous message and sending a signal report of ${parts[3]} dB to station ${parts[1]}.`;
            } else {
                explanation = `This is a message from ${parts[0]} to ${parts[1]}, but the content "${parts[2]} ${parts[3]}" is not recognized.`;
            }
        } else if (msgType === '0.0') { // || message.startsWith('<') && message.endsWith('>')) {
            explanation = `This is a free-text message: "${message}".`; // Free-text messages in FT8 are limited to 13 characters.
            if (message.length == 13) {
                explanation += ' The message is the maximum length of 13 characters.';
            }
        } else if (msgType === '0.5') {
            explanation = `This is a telemetry message containing hexadecimal digits: ${message.replace(/^0*/g, '')}. The specific meaning depends on the implementation.`;
        } else if (/^[0-9A-F]{4,18}$/.test(message) && /[A-F]/.test(message)) { // all hex digits with at least one A-F 
            explanation = `This message is made up of hexadecimal digits, but it is not of the telemetry message type.`;
        } else {
            explanation = '';
            //explanation = `This appears to be a custom or non-standard message: "${message}". It doesn't match common FT8 message formats.`;
        }

        return typeExplanation + explanation;
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

