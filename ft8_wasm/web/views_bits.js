class TribbleComponent extends Component {
    constructor(index, container) {
        super(index, container);
        this.bitsContainer = null;
        this.currentTribble = 0;
    }

    create() {
        this.bitsContainer = document.createElement('div');
        this.bitsContainer.className = 'bits-container';
        this.container.appendChild(this.bitsContainer);
    }
    
    messageUpdate() { 
        //const output = this.container;
        //output.innerHTML = "";

        this.bitsContainer.innerHTML = '';
        
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

        let rowDiv = document.createElement('div');
        rowDiv.className = 'bits-row';
        
        bits.split('').forEach((bit, index) => {
            if (index % 29 === 0 && index !== 0) {
                this.bitsContainer.appendChild(rowDiv);
                rowDiv = document.createElement('div');
                rowDiv.className = 'bits-row';
            }

            if (index % 3 === 0) {
                const tribbleDiv = this.createTribbleElement(bits.substr(index, 3), symbols[index / 3], index);
                rowDiv.appendChild(tribbleDiv);
            }
        });

        this.bitsContainer.appendChild(rowDiv);
    }

    createTribbleElement(tribbleBits, symbol, index) {
        const tribbleDiv = document.createElement('div');
        tribbleDiv.className = 'tribble';
        
        const symbolLabel = document.createElement('div');
        symbolLabel.className = 'symbol-label';
        symbolLabel.textContent = symbol || '0';
        tribbleDiv.appendChild(symbolLabel);

        const bitsDiv = document.createElement('div');
        bitsDiv.className = 'bits';
        tribbleBits.split('').forEach((bit, bitIndex) => {
            const bitDiv = document.createElement('div');
            bitDiv.className = `bit ${bit === '1' ? 'bit-one' : 'bit-zero'}`;
            bitDiv.textContent = bit;
            bitDiv.dataset.index = index + bitIndex;
            bitsDiv.appendChild(bitDiv);
        });
        tribbleDiv.appendChild(bitsDiv);

        if (index >= 21 && index < 98 && index % 4 === 0) {
            const nibbleLabel = document.createElement('div');
            nibbleLabel.className = 'nibble-label';
            const nibbleBits = tribbleBits + (index + 3 < 98 ? tribbleBits[0] : '0');
            nibbleLabel.textContent = parseInt(nibbleBits, 2).toString(16).toUpperCase();
            tribbleDiv.appendChild(nibbleLabel);
        }

        return tribbleDiv;
    }

    highlightCurrentTribble() {
        this.clearHighlights();
        const tribble = this.bitsContainer.querySelector(`.tribble:nth-child(${this.currentTribble + 1})`);
        if (tribble) tribble.classList.add('highlighted');
    }

    clearHighlights() {
        this.bitsContainer.querySelectorAll('.tribble.highlighted').forEach(el => el.classList.remove('highlighted'));
    }

    addDataLabels() {
        // Add labels for different data fields (i3, n3, etc.)
        // This will depend on the specific FT8 message structure
    }

    getBitsFromPackedData(packedData) {
        // Convert packed data to array of individual bits
        return packedData.flatMap(byte => 
            byte.toString(2).padStart(8, '0').split('')
        ).slice(0, 77); // FT8 uses 77 bits
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

