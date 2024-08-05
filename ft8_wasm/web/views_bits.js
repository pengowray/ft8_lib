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

            const bitDiv = this.createBitElement(bit, index);
            rowDiv.appendChild(bitDiv);

            if ((index + 1) % 3 === 0) {
                const tribbleLabel = this.createTribbleLabel(Math.floor(index / 3));
                rowDiv.appendChild(tribbleLabel);
            }
        });

        this.bitsContainer.appendChild(rowDiv);
        this.addDataLabels();
    }

    createBitElement(bit, index) {
        const bitDiv = document.createElement('div');
        bitDiv.className = `bit ${bit === '1' ? 'bit-one' : 'bit-zero'}`;
        bitDiv.textContent = bit;
        bitDiv.dataset.index = index;
        return bitDiv;
    }

    createTribbleLabel(tribbleIndex) {
        const label = document.createElement('div');
        label.className = 'tribble-label';
        label.textContent = tribbleIndex % 8;
        return label;
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

    highlightCurrentTribble() {
        this.clearHighlights();
        const startIndex = this.currentTribble * 3;
        for (let i = startIndex; i < startIndex + 3; i++) {
            const bitElement = this.bitsContainer.querySelector(`.bit[data-index="${i}"]`);
            if (bitElement) bitElement.classList.add('highlighted');
        }
    }

    clearHighlights() {
        this.bitsContainer.querySelectorAll('.bit.highlighted').forEach(el => 
            el.classList.remove('highlighted')
        );
    }

    initialUpdate() {
    }

    frameUpdate() {
    }

}

