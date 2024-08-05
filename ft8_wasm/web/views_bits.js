class TribbleComponent extends Component {
    constructor(index, container) {
        super(index, container);
        this.bitsContainer = null;
        this.symbolsContainer = null;
        this.nibblesContainer = null;
        this.currentTribble = 0;
    }

    create() {
        this.nibblesContainer = document.createElement('div');
        this.nibblesContainer.className = 'nibbles-container';
        this.symbolsContainer = document.createElement('div');
        this.symbolsContainer.className = 'symbols-container';
        this.bitsContainer = document.createElement('div');
        this.bitsContainer.className = 'bits-container';
        
        this.container.appendChild(this.nibblesContainer);
        this.container.appendChild(this.symbolsContainer);
        this.container.appendChild(this.bitsContainer);
    }
    
    messageUpdate() { 
        //const output = this.container;
        //output.innerHTML = "";

        this.nibblesContainer.innerHTML = '';
        this.symbolsContainer.innerHTML = '';
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
        let symbolRowDiv = document.createElement('div');
        symbolRowDiv.className = 'symbols-row';
        let nibbleRowDiv = document.createElement('div');
        nibbleRowDiv.className = 'nibbles-row';

        bits.split('').forEach((bit, index) => {
            if (index % 29 === 0 && index !== 0) {
                this.bitsContainer.appendChild(rowDiv);
                this.symbolsContainer.appendChild(symbolRowDiv);
                this.nibblesContainer.appendChild(nibbleRowDiv);
                rowDiv = document.createElement('div');
                rowDiv.className = 'bits-row';
                symbolRowDiv = document.createElement('div');
                symbolRowDiv.className = 'symbols-row';
                nibbleRowDiv = document.createElement('div');
                nibbleRowDiv.className = 'nibbles-row';
            }

            const bitDiv = this.createBitElement(bit, index);
            rowDiv.appendChild(bitDiv);

            if (index % 3 === 0) {
                const symbolLabel = this.createSymbolLabel(symbols[index / 3], index / 3);
                symbolRowDiv.appendChild(symbolLabel);
            }

            if (index >= 21 && index < 98 && (index - 21) % 4 === 0) {
                const nibbleLabel = this.createNibbleLabel(bits.substr(index, 4), (index - 21) / 4);
                nibbleRowDiv.appendChild(nibbleLabel);
            }
        });

        this.bitsContainer.appendChild(rowDiv);
        this.symbolsContainer.appendChild(symbolRowDiv);
        this.nibblesContainer.appendChild(nibbleRowDiv);
    }

    createBitElement(bit, index) {
        const bitDiv = document.createElement('div');
        bitDiv.className = `bit ${bit === '1' ? 'bit-one' : 'bit-zero'}`;
        bitDiv.textContent = bit;
        bitDiv.dataset.index = index;
        return bitDiv;
    }

    createSymbolLabel(symbol, index) {
        const label = document.createElement('div');
        label.className = 'symbol-label';
        label.textContent = symbol || '0';
        label.dataset.index = index;
        return label;
    }

    createNibbleLabel(nibbleBits, index) {
        const label = document.createElement('div');
        label.className = 'nibble-label';
        label.textContent = parseInt(nibbleBits.padEnd(4, '0'), 2).toString(16).toUpperCase();
        label.dataset.index = index;
        return label;
    }

    highlightCurrentTribble() {
        this.clearHighlights();
        const startIndex = this.currentTribble * 3;
        for (let i = startIndex; i < startIndex + 3; i++) {
            const bitElement = this.bitsContainer.querySelector(`.bit[data-index="${i}"]`);
            if (bitElement) bitElement.classList.add('highlighted');
        }
        const symbolElement = this.symbolsContainer.querySelector(`.symbol-label[data-index="${this.currentTribble}"]`);
        if (symbolElement) symbolElement.classList.add('highlighted');
    }

    clearHighlights() {
        this.bitsContainer.querySelectorAll('.bit.highlighted').forEach(el => el.classList.remove('highlighted'));
        this.symbolsContainer.querySelectorAll('.symbol-label.highlighted').forEach(el => el.classList.remove('highlighted'));
    }

    createTribbleLabel(tribbleIndex) {
        const label = document.createElement('div');
        label.className = 'tribble-label';
        label.textContent = tribbleIndex % 8;
        return label;
    }

    createTribbleElement(tribbleBits, symbolIndex) {
        const tribbleDiv = document.createElement('div');
        tribbleDiv.className = 'tribble';
        
        const symbolLabel = document.createElement('div');
        symbolLabel.className = 'symbol-label';
        symbolLabel.textContent = this.message.symbolsText[symbolIndex];
        tribbleDiv.appendChild(symbolLabel);

        const bitsDiv = document.createElement('div');
        bitsDiv.className = 'bits';
        tribbleBits.split('').forEach((bit, index) => {
            const bitDiv = document.createElement('div');
            bitDiv.className = `bit ${bit === '1' ? 'bit-one' : 'bit-zero'}`;
            bitDiv.textContent = bit;
            bitDiv.dataset.index = symbolIndex * 3 + index;
            bitsDiv.appendChild(bitDiv);
        });

        tribbleDiv.appendChild(bitsDiv);

        return tribbleDiv;
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

