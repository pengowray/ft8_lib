class TribbleComponent extends Component {
    constructor(index, container) {
        super(index, container);
        this.messageContainer = null;    }

    create() {
        this.messageContainer = document.createElement('div');
        this.messageContainer.className = 'ft8-message-container';
        this.container.appendChild(this.messageContainer);    }
    
    messageUpdate() { 
        //const output = this.container;
        //output.innerHTML = "";

        this.messageContainer.innerHTML = '';

        if (!this.message || !this.message.packedData) return;
        
        const message = this.message;

        // old: //function updateOutput(result, inputType, originalInput) {

        //console.log(packedData);
        const packedData = message.packedData;

        const syncCheckResult = message.getSyncCheck();
        const crcCheckResult = message.getCRCCheck();
        const parityCheckResult = message.getParityCheck();

        const symbols = message.symbolsText;
        const bits = symbolsToBitsStr(symbols);
        const packed = packedToHexStrSp(packedData);

        const messageType = message.ft8MessageType; // e.g. "0.0" or "3"
        const messageInfo = getFT8MessageTypeName(messageType); // 

        this.createMessageStructure(symbols, bits, packed);
        this.addMessageAnnotations();    }

        createMessageStructure(symbols, bits, packed) {
            const sections = [
                { type: 'sync', length: 7 },
                { type: 'data', length: 29 },
                { type: 'sync', length: 7 },
                { type: 'data', length: 29 },
                { type: 'sync', length: 7 }
            ];
    
            let bitIndex = 0;
            let symbolIndex = 0;
            let packedIndex = 0;
    
            sections.forEach((section, sectionIndex) => {
                const sectionDiv = document.createElement('div');
                sectionDiv.className = `ft8-section ${section.type}-section`;
    
                for (let i = 0; i < section.length; i++) {
                    const groupDiv = document.createElement('div');
                    groupDiv.className = 'ft8-group';
    
                    if (section.type === 'sync') {
                        const symbolDiv = this.createSymbolElement(symbols[symbolIndex], symbolIndex);
                        groupDiv.appendChild(symbolDiv);
                        symbolIndex++;
                    } else {
                        const tribbleDiv = this.createTribbleElement(bits.substr(bitIndex, 3), symbolIndex);
                        groupDiv.appendChild(tribbleDiv);
    
                        if (bitIndex >= 21 && bitIndex < 98 && (bitIndex - 21) % 4 === 0) {
                            const nibbleDiv = this.createNibbleElement(packed[packedIndex], packedIndex);
                            groupDiv.appendChild(nibbleDiv);
                            packedIndex++;
                        }
    
                        bitIndex += 3;
                        symbolIndex++;
                    }
    
                    sectionDiv.appendChild(groupDiv);
                }
    
                this.messageContainer.appendChild(sectionDiv);
            });
        }
    
        createSymbolElement(symbol, index) {
            const symbolDiv = document.createElement('div');
            symbolDiv.className = 'ft8-symbol sync-symbol';
            symbolDiv.textContent = symbol;
            symbolDiv.dataset.index = index;
            return symbolDiv;
        }
    
        createTribbleElement(tribbleBits, symbolIndex) {
            const tribbleDiv = document.createElement('div');
            tribbleDiv.className = 'ft8-tribble';
            
            const symbolDiv = document.createElement('div');
            symbolDiv.className = 'ft8-symbol';
            symbolDiv.textContent = this.message.symbolsText[symbolIndex];
            symbolDiv.dataset.index = symbolIndex;
            tribbleDiv.appendChild(symbolDiv);
    
            const bitsDiv = document.createElement('div');
            bitsDiv.className = 'ft8-bits';
            tribbleBits.padEnd(3, '0').split('').forEach((bit, index) => {
                const bitDiv = document.createElement('div');
                bitDiv.className = `ft8-bit ${bit === '1' ? 'bit-one' : 'bit-zero'}`;
                bitDiv.textContent = bit;
                bitDiv.dataset.index = symbolIndex * 3 + index;
                bitsDiv.appendChild(bitDiv);
            });
            tribbleDiv.appendChild(bitsDiv);
    
            return tribbleDiv;
        }
    
        createNibbleElement(nibble, index) {
            const nibbleDiv = document.createElement('div');
            nibbleDiv.className = 'ft8-nibble';
            nibbleDiv.textContent = nibble;
            nibbleDiv.dataset.index = index;
            return nibbleDiv;
        }
    
        addMessageAnnotations() {
            // Add annotations for different message parts (i3, n3, etc.)
            // This will depend on the specific FT8 message structure
            // You'll need to implement this based on your message format
        }
    
        highlightCurrentTribble() {
            this.clearHighlights();
            const symbolElement = this.messageContainer.querySelector(`.ft8-symbol[data-index="${this.currentTribble}"]`);
            if (symbolElement) symbolElement.classList.add('highlighted');
        }
    
        clearHighlights() {
            this.messageContainer.querySelectorAll('.highlighted').forEach(el => el.classList.remove('highlighted'));
        }

        onPlay() {
        this.currentTribble = 0;
        this.highlightCurrentTribble();
    }

    onStop() {
        this.clearHighlights();
    }

    frameUpdate() {
        if (this.message && this.message.isPlaying) {
            const timing = this.message.getTiming();
            if (timing && timing.currentSymbolIndex !== this.currentTribble) {
                this.currentTribble = timing.currentSymbolIndex;
                this.highlightCurrentTribble();
            }
        }
    }
    
    initialUpdate() {
    }

    frameUpdate() {
    }

}

