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
        const bitsNoCosta = symbolsToBitsStrNoCosta(message.symbolsText);
        return {
            inputText: message.inputText,
            inputType: message.inputType,
            messageType: {
                type: message.ft8MessageType,
                info: getFT8MessageTypeName(message.ft8MessageType)
            },
            decoded: this.prepareDecodedInfo(),
            symbols: message.symbolsText,
            packed: packedToHexStrSp(message.packedData),
            messageBits: bitsNoCosta.slice(0, 77),
            crcBits: bitsNoCosta.slice(77, 91),
            parityBits: bitsNoCosta.slice(91),
            checks: this.prepareChecks(),
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
            { name: "Parity check", ...this.message.getParityCheck() },
            //this.prepareDecodedInfo()
        ];
    }

    prepareDecodedInfo() {
        const decodeResult = this.message.reDecodedResult;
        const decodeTest1 = { name: "decode", ...decodeResult };
        if (!decodeResult.success) {
            //return { error: true, result: 'error', message: `${decodeResult.errorCode}: ${decodeResult.errorMessage}` };
            return [ decodeTest1 ];
        }

        const decoded = decodeResult.decodedText;
        const originalInput = this.message.inputText;
        const inputType = this.message.inputType;
        

        const decodeTest2 = {
            name: 'input match',
            result: 'neutral',
            resultText: 'unchecked',
        };
        
        if (inputType === 'message') {
            decodeTest2.result = 'ok';

            if (normalizeMessage(decoded) !== normalizeMessage(originalInput)) {
                decodeTest2.resultInfo = "Decoded message does not appear to match input.";
                decodeTest2.result = 'warning';
                resultText = 'might not match input';
                if (normalizeBracketedFreeText(originalInput).toUpperCase().startsWith(decoded.toUpperCase())) {
                    decodeTest2.resultInfo = "Original message appears to be truncated.";
                    decodeTest2.resultText = 'input truncated';
                }
            } else  {
                decodeTest2.resultText = 'ok'
            }
            return [ decodeTest1, decodeTest2 ];

        } else if (inputType === 'free text') {
            decodeTest2.result = 'ok';

            if (decoded.toUpperCase() !== normalizeBracketedFreeText(originalInput).toUpperCase()) {
                decodeTest2.resultInfo = "Decoded message does not appear to match free text input.";
                decodeTest2.result = 'warning';
                decodeTest2.resultText = 'might not match input';
                if (normalizeBracketedFreeText(originalInput).toUpperCase().startsWith(decoded.toUpperCase())) {
                    decodeTest2.resultInfo = "Original message has been truncated to fit 13 character limit of free text.";
                    decodeTest2.resultText = 'input truncated';
                }
            } else {
                decodeTest2.resultText = 'ok'
            }
            return [ decodeTest1, decodeTest2 ];
        }

        // show neutral test 2?
        //return [ decodeTest1, decodeTest2 ]; 

        // or just decodeTest1 
        return [ decodeTest1 ]; 

    }

    prepareTests() {
        if (!this.message.expectedResults) return null;

        const expected = this.message.expectedResults;
        const tests = [];
        let renderedRows = '';

        if (expected.type) {
            const expectedType = expected.type.endsWith('.') ? expected.type.slice(0, -1) : expected.type;
            const match = (expectedType === this.message.ft8MessageType);
            const test = {
                name: "Message type",
                result: expectedType === this.message.ft8MessageType ? 'ok' : 'error',
                resultText: expectedType === this.message.ft8MessageType ? 'Matched test' : 'Did not match test',
                expected: expectedType,
                actual: this.message.ft8MessageType
            };
            tests.push(test);
            if (!match) {
                renderedRows += this.renderRowData(`${test.name} (test expected)`, test.expected);
                renderedRows += this.renderRowData(`${test.name} (decoded)`, test.actual);
            }
        }

        const expectedMessage = expected.decoded ?? expected.message;
        if (expectedMessage) {
            const match = (expectedMessage.trim() === this.message.reDecodedResult.decodedText.trim());
            const test = {
                name: "Decoded",
                result: (expected.error ? (match ? 'warning' : 'warning') : (match ? 'ok' : 'error')),
                resultText: (expected.error ? (match ? 'Matched test*' : 'Did not match test*') : (match ? 'Matched test' : 'Did not match test')),
                expected: expectedMessage,
                actual: this.message.reDecodedResult.decodedText,
                note: expected.error ? "Error or truncated result expected" : null
            };
            tests.push(test);
            if (!match) {
                renderedRows += this.renderRowData(`${test.name} (test expected)`, test.expected);
                renderedRows += this.renderRowData(`${test.name} (decoded)`, test.actual);
            }
        }

        if (expected.symbols) {
            const expectedSymbols = expected.symbols.replace(/\s/g, '');
            const match = (expectedSymbols === this.message.symbolsText);
            const test = {
                name: "Symbols",
                result: match ? 'ok' : 'error',
                resultText: match ? 'Matched test' : 'Did not match test',
                expected: expectedSymbols,
                actual: this.message.symbolsText
            };
            tests.push(test);
            if (!match) {
                renderedRows += this.renderRowData(`${test.name} (test expected)`, test.expected);
                renderedRows += this.renderRowData(`${test.name} (decoded)`, test.actual);
            } 
        }

        return {tests, renderedRows};
    }

    renderOutput(data) {
        const outputBox = document.createElement('div');
        outputBox.className = 'output-box';
        outputBox.innerHTML = `
            <h2>${data.messageType.info} (${data.messageType.type})</h2>
            <div class="output-content">
                ${this.renderRowData('Input text', data.inputText)}
                ${this.renderRowText('Input type', data.inputType)}

                ${this.renderSubheading('Encoding')}

                ${this.renderChecks('Checks', data.checks)}
                ${this.renderRowData('Message type', `(${data.messageType.type}) ${data.messageType.info}`)}
                ${this.renderRowData('Symbols', symbolsPretty(data.symbols), true)}
                ${this.renderRowData('Packed', data.packed)}
                ${this.renderRowData('Message (77 bits)', data.messageBits)}
                ${this.renderRowData('CRC (14 bits)', data.crcBits)}
                ${this.renderRowData('LDPC (83 bits)', data.parityBits)}

                ${this.renderSubheading('Decoding')}
                ${this.renderChecks('Decode check', data.decoded )}
                ${this.renderRowData('Input text', data.inputText )}
                ${this.renderRowData('Decoded text', data.decoded[0].decodedText ?? '' )}
                ${!data.decoded[0].success ? this.renderRowData('Decode error', data.decoded[0].errorMessage) : ''}

                ${(data.explanation || data.encodeError) ? this.renderSubheading('More info') : ''}
                ${data.explanation ? this.renderRowText('Explanation', data.explanation) : ''}
                ${data.encodeError ? this.renderRowData('Free text reason', data.encodeError) : ''}

                ${data.tests && data.tests.tests ? this.renderSubheading('Special test input') : ''}
                ${data.tests && data.tests.tests ? this.renderChecks('Tests', data.tests.tests) : ''}
                ${data.tests && data.tests.renderedRows ? data.tests.renderedRows : ''}

            </div>
        `;
//to only show when not message type:
//${data.inputType !== 'message' ? this.renderRow('Input type', data.inputType) : ''}

//to use other renderer:
//                ${data.tests ? this.renderTests(data.tests) : ''}

// old decode renderer: (now part of checks)
//${this.renderDecodedInfo(data.decoded)}

//todo: fix full text: "Fallback to free text reason"

        this.container.innerHTML = '';
        this.container.appendChild(outputBox);
    }

    renderSubheading(text) {
        return `
            <div class="output-row full-width">
                <h3 class="output-subheading">${text}</h3>
            </div>
        `;
    }

    renderRowData(label, value, fullWidth = false) {
        return `
            <div class="output-row ${fullWidth ? 'full-width' : ''}">
                <div class="output-label">${label}</div>
                <div class="output-value">${escapeHTML(value)}</div>
            </div>
        `;
    }

    renderRowText(label, value, fullWidth = false) {
        return `
            <div class="output-row plain-text ${fullWidth ? 'full-width' : ''}">
                <div class="output-label">${label}</div>
                <div class="output-value">${escapeHTML(value)}</div>
            </div>
        `;
    }

    renderChecks(label, checks) {
        const getIcon = (result) => {
            switch (result.toLowerCase()) {
                case 'ok': return '✅';
                case 'error': return  '❌';
                case 'warning': return '⚠';
                case 'neutral': return '✅'; //'➖';
                case 'disabled': return ''; // '⚪';
                default: return '';
            }
        };
    
        const checksHtml = checks.map(check => `
            <span class="check-result check-${check.result.toLowerCase()}">
                <span class="check-icon">${getIcon(check.result)}</span>
                ${check.name}: ${check.resultText ?? check.result}
            </span>
        `).join('');
    
        return `
            <div class="output-row full-width">
                <div class="output-label">${label}</div>
                <div class="output-value checks">
                    ${checksHtml}
                </div>
            </div>
        `;
    }
        
    renderDecodedInfo(decodedInfo) {
        if (decodedInfo.error) {
            return this.renderRowData('Error Decoding', decodedInfo.message);
        }

        let content = `Decoded: ${decodedInfo.decoded}`;
        if (decodedInfo.warning) {
            content += `<br>⚠ Decode warning: ${decodedInfo.warning}`;
        }

        return this.renderRowData('Decoded', content);
    }

    renderTests(tests) {
        //meh, use renderChecks instead
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

function escapeHTML(text) {
    const map = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#039;'
    };

    return text.replace(/[<>&"']/g, function(match) {
        return map[match];
    });
}
