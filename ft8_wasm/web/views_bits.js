class TribbleComponent extends Component {
    constructor(index, container) {
        super(index, container);
        this.gridContainer = null;
        this.currentSymbol = 0;
        this.rows = ['bits', 'symbols', 'packed', 'annotations'];
    }

    create() {
        this.gridContainer = document.createElement('div');
        this.gridContainer.className = 'bits-grid-container';
        this.container.appendChild(this.gridContainer);

        this.createToggleButtons();
    }

    createToggleButtons() {
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'toggle-container';
        
        this.rows.forEach(row => {
            const button = document.createElement('button');
            button.textContent = `Toggle ${row}`;
            button.onclick = () => this.toggleRow(row);
            toggleContainer.appendChild(button);
        });

        this.container.insertBefore(toggleContainer, this.gridContainer);
    }

    toggleRow(row) {
        const rowElement = this.gridContainer.querySelector(`.${row}-row`);
        if (rowElement) {
            rowElement.style.display = rowElement.style.display === 'none' ? '' : 'none';
        }
    }

    messageUpdate() { 
        //const output = this.container;
        //output.innerHTML = "";

        this.gridContainer.innerHTML = '';

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
        const packed = packedToHexStr(packedData);

        const messageType = message.ft8MessageType; // e.g. "0.0" or "3"
        const messageInfo = getFT8MessageTypeName(messageType); // 

        this.createGrid(symbols, bits, packed);
        this.addAnnotations();
    }

    createGrid(symbols, bits, packed) {
        const totalColumns = symbols.length * 3;  // Each symbol corresponds to 3 bits
        this.gridContainer.style.gridTemplateColumns = `repeat(${totalColumns}, 1fr)`;
        
        this.rows.forEach((rowType, rowIndex) => {
            const rowElement = document.createElement('div');
            rowElement.className = `${rowType}-row`;
            rowElement.style.gridRow = rowIndex + 1;
            rowElement.style.gridColumn = `1 / span ${totalColumns}`;
            rowElement.style.display = 'grid';
            rowElement.style.gridTemplateColumns = `repeat(${totalColumns}, 1fr)`;

            if (rowType === 'bits') {
                for (let i = 0; i < bits.length; i++) {
                    const bitElement = this.createBitElement(bits[i], i);
                    rowElement.appendChild(bitElement);
                }
            } else if (rowType === 'symbols') {
                symbols.split('').forEach((symbol, index) => {
                    const symbolElement = this.createSymbolElement(symbol, index);
                    symbolElement.style.gridColumn = `${index * 3 + 1} / span 3`;
                    rowElement.appendChild(symbolElement);
                });
            } else if (rowType === 'packed') {
                for (let i = 0; i < packed.length; i++) {
                    const packedElement = this.createPackedElement(packed[i], i);
                    packedElement.style.gridColumn = `${i * 8 + 22} / span 8`;  // Start from bit 22 (after sync)
                    rowElement.appendChild(packedElement);
                }
            }

            this.gridContainer.appendChild(rowElement);
        });
    }
    createBitElement(bit, index) {
        const bitElement = document.createElement('div');
        bitElement.className = `bit ${bit === '1' ? 'bit-one' : 'bit-zero'}`;
        bitElement.textContent = bit;
        bitElement.dataset.index = index;
        return bitElement;
    }

    createSymbolElement(symbol, index) {
        const symbolElement = document.createElement('div');
        symbolElement.className = `symbol ${this.isCostasSymbol(index) ? 'costas' : 'data'}`;
        symbolElement.textContent = symbol;
        symbolElement.dataset.index = index;
        return symbolElement;
    }

    createPackedElement(packedByte, index) {
        const packedElement = document.createElement('div');
        packedElement.className = 'packed';
        packedElement.textContent = packedByte;
        packedElement.dataset.index = index;
        return packedElement;
    }

    addAnnotations() {
        const annotationsRow = this.gridContainer.querySelector('.annotations-row');
        // Example annotations (adjust as needed for your message structure)
        this.addAnnotation(annotationsRow, 'i3', 0, 3);
        this.addAnnotation(annotationsRow, 'n3', 3, 6);
        // Add more annotations as needed
    }

    addAnnotation(row, label, start, end) {
        const annotation = document.createElement('div');
        annotation.className = 'annotation';
        annotation.textContent = label;
        annotation.style.gridColumn = `${start * 3 + 1} / span ${(end - start) * 3}`;
        row.appendChild(annotation);
    }

    isCostasSymbol(index) {
        const costasIndices = [0, 1, 2, 3, 4, 5, 6, 36, 37, 38, 39, 40, 41, 42, 72, 73, 74, 75, 76, 77, 78];
        return costasIndices.includes(index);
    }

    highlightCurrentSymbol() {
        this.clearHighlights();
        const symbolsRow = this.gridContainer.querySelector('.symbols-row');
        const bitsRow = this.gridContainer.querySelector('.bits-row');
        
        const currentSymbolElement = symbolsRow.children[this.currentSymbol];
        if (currentSymbolElement) {
            currentSymbolElement.classList.add('highlighted');
            for (let i = this.currentSymbol * 3; i < this.currentSymbol * 3 + 3; i++) {
                if (bitsRow.children[i]) bitsRow.children[i].classList.add('highlighted');
            }
        }
    }

    clearHighlights() {
        this.gridContainer.querySelectorAll('.highlighted').forEach(el => el.classList.remove('highlighted'));
    }
        
    onPlay() {
        this.currentSymbol = 0;
        this.highlightCurrentTribble();
    }

    onStop() {
        this.clearHighlights();
    }

    frameUpdate() {
        if (this.message && this.message.isPlaying) {
            const timing = this.message.getTiming();
            if (timing && timing.currentSymbolIndex !== this.currentSymbol) {
                this.currentSymbol = timing.currentSymbolIndex;
                this.highlightCurrentSymbol();
            }
        }
    }
        
    initialUpdate() {
    }

    frameUpdate() {
    }

}

