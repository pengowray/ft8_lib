class OutputComponent extends Component {
    create() {
    }
    
    messageUpdate() {
        if (this.message == null) {
            this.container.innerHTML = "";
            return;
        }

        const outputData = this.prepareOutputData();
        this.renderOutput(outputData);
    }

    prepareOutputData() {
        const message = this.message;
        return {
            inputText: message.inputText,
            inputType: message.inputType,
            messageType: {
                type: message.ft8MessageType,
                info: getFT8MessageTypeName(message.ft8MessageType)
            },
            symbols: message.symbolsText,
            packed: packedToHexStrSp(message.packedData),
            messageBits: symbolsToBitsStrNoCosta(message.symbolsText).slice(0, 77),
            checks: this.prepareChecks(),
            decoded: this.prepareDecodedInfo(),
            explanation: this.message.reDecodedResult.success ? 
                explainFT8Message(this.message.reDecodedResult.decodedText, this.message.ft8MessageType) : 
                null,
            encodeError: message.encodeError_ft8lib,
            tests: this.prepareTests()
        };
    }

    prepareChecks() {
        return [
            { name: "Sync check", ...this.message.getSyncCheck() },
            { name: "CRC check", ...this.message.getCRCCheck() },
            { name: "Parity check", ...this.message.getParityCheck() }
        ];
    }

    prepareDecodedInfo() {
        const result = this.message.reDecodedResult;
        if (!result.success) {
            return { error: true, message: `${result.errorCode}: ${result.errorMessage}` };
        }

        const decoded = result.decodedText;
        const originalInput = this.message.inputText;
        const inputType = this.message.inputType;

        let warning = null;
        if (inputType === 'message' && normalizeMessage(decoded) !== normalizeMessage(originalInput)) {
            warning = "Decoded message does not appear to match input.";
            if (normalizeBracketedFreeText(originalInput).toUpperCase().startsWith(decoded.toUpperCase())) {
                warning = "Original message appears to be truncated.";
            }
        } else if (inputType === 'free text' && decoded.toUpperCase() !== normalizeBracketedFreeText(originalInput).toUpperCase()) {
            warning = "Decoded message does not appear to match free text input.";
            if (normalizeBracketedFreeText(originalInput).toUpperCase().startsWith(decoded.toUpperCase())) {
                warning = "Original message has been truncated to fit 13 character limit of free text.";
            }
        }

        return { decoded, warning };
    }

    prepareTests() {
        if (!this.message.expectedResults) return null;

        const expected = this.message.expectedResults;
        const tests = [];

        if (expected.type) {
            const expectedType = expected.type.endsWith('.') ? expected.type.slice(0, -1) : expected.type;
            tests.push({
                name: "Message type",
                result: expectedType === this.message.ft8MessageType ? "OK" : "FAILED",
                expected: expectedType,
                actual: this.message.ft8MessageType
            });
        }

        const expectedMessage = expected.decoded ?? expected.message;
        if (expectedMessage) {
            tests.push({
                name: "Decoded",
                result: expectedMessage.trim() === this.message.reDecodedResult.decodedText.trim() ? "OK" : "FAILED",
                expected: expectedMessage,
                actual: this.message.reDecodedResult.decodedText,
                note: expected.error ? "Expected error or truncated result" : null
            });
        }

        if (expected.symbols) {
            const expectedSymbols = expected.symbols.replace(/\s/g, '');
            tests.push({
                name: "Symbols",
                result: expectedSymbols === this.message.symbolsText ? "OK" : "FAILED",
                expected: expectedSymbols,
                actual: this.message.symbolsText
            });
        }

        return tests;
    }

    renderOutput(data) {
        const outputBox = document.createElement('div');
        outputBox.className = 'output-box';
        outputBox.innerHTML = `
            <h2>${data.messageType.info} (${data.messageType.type})</h2>
            <div class="output-content">
                ${this.renderRow('Input text', data.inputText)}
                ${data.inputType !== 'message' ? this.renderRow('Input type', data.inputType) : ''}
                ${this.renderRow('Symbols', symbolsPretty(data.symbols), true)}
                ${this.renderRow('Packed', data.packed)}
                ${this.renderRow('Message (77 bits)', data.messageBits)}
                ${this.renderChecks(data.checks)}
                ${this.renderDecodedInfo(data.decoded)}
                ${data.explanation ? this.renderRow('Explanation', data.explanation) : ''}
                ${data.encodeError ? this.renderRow('Fallback to free text reason', data.encodeError) : ''}
                ${data.tests ? this.renderTests(data.tests) : ''}
            </div>
        `;

        this.container.innerHTML = '';
        this.container.appendChild(outputBox);
    }

    renderRow(label, value, fullWidth = false) {
        return `
            <div class="output-row ${fullWidth ? 'full-width' : ''}">
                <div class="output-label">${label}:</div>
                <div class="output-value">${value}</div>
            </div>
        `;
    }

    renderChecks(checks) {
        const checksHtml = checks.map(check => `
            <span class="check-result check-${check.result.toLowerCase()}">
                ${check.name}: ${check.result}
                ${check.errors ? ` Unexpected symbol position(s): ${check.errors.join(', ')}` : ''}
                ${check.crc ? ` Expected: ${check.crc}, Actual: ${check.received}` : ''}
            </span>
        `).join('');

        return `
            <div class="output-row full-width">
                <div class="output-label">Checks:</div>
                <div class="output-value checks">
                    ${checksHtml}
                </div>
            </div>
        `;
    }

    renderDecodedInfo(decodedInfo) {
        if (decodedInfo.error) {
            return this.renderRow('Error Decoding', decodedInfo.message);
        }

        let content = `Decoded: ${decodedInfo.decoded}`;
        if (decodedInfo.warning) {
            content += `<br>⚠ Decode warning: ${decodedInfo.warning}`;
        }

        return this.renderRow('Decoded', content);
    }

    renderTests(tests) {
        const testsHtml = tests.map(test => `
            <div>
                ${test.result === "OK" ? "✅" : "❌"} ${test.name}: 
                ${test.result === "OK" ? "OK" : `Expected: "${test.expected}", Actual: "${test.actual}"`}
                ${test.note ? ` (${test.note})` : ''}
            </div>
        `).join('');

        return `
            <div class="output-row full-width">
                <div class="output-label">Tests:</div>
                <div class="output-value">${testsHtml}</div>
            </div>
        `;
    }

    onPlaying() {}
    onStop() {}
    initialUpdate() {}
    frameUpdate() {}
}