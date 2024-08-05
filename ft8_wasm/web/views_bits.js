class TribbleComponent extends Component {
    constructor(index, container) {
        super(index, container);
        this.gridContainer = null;
        this.currentSymbol = 0;
        this.rows = [ 'packed', 'symbols', 'bits', 'annotations'];
        this.interval = null;
    }

    create() {
        this.gridContainer = document.createElement('div');
        this.gridContainer.className = 'bits-grid-container';
        this.container.appendChild(this.gridContainer);

        //this.createToggleButtons();
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
        const packed = packedToHexStrSp(packedData);

        const messageType = message.ft8MessageType; // e.g. "0.0" or "3"
        const messageInfo = getFT8MessageTypeName(messageType); // 

        this.createGrid(symbols, bits, packed);
        this.addAnnotations();
    }

    createGrid(symbols, bits, packed) {
        const totalColumns = symbols.length * 3;  // Each symbol corresponds to 3 bits
        this.gridContainer.style.gridTemplateColumns = `repeat(${totalColumns}, 1fr)`;
        
        this.rows.forEach((rowType) => {
            const rowElement = document.createElement('div');
            rowElement.className = `${rowType}-row`;
            rowElement.style.display = 'contents';

            if (rowType === 'bits') {
                for (let i = 0; i < bits.length; i++) {
                    rowElement.appendChild(this.createBitElement(bits[i], i));
                }
            } else if (rowType === 'symbols') {
                symbols.split('').forEach((symbol, index) => {
                    rowElement.appendChild(this.createSymbolElement(symbol, index));
                });
            } else if (rowType === 'packed') {
                // Add spacer for sync bits
                const spacer = document.createElement('div');
                spacer.style.gridColumn = '1 / 22';
                rowElement.appendChild(spacer);

                packed.split(' ').forEach((byte, index) => {
                    rowElement.appendChild(this.createPackedElement(byte, index));
                });
            }

            this.gridContainer.appendChild(rowElement);
        });
    }

    createBitElement(bit, index) {
        const bitElement = document.createElement('div');
        bitElement.className = `bit ${bit === '1' ? 'bit-one' : 'bit-zero'}`;
        bitElement.textContent = bit;
        bitElement.dataset.index = index;
        bitElement.style.gridColumn = index + 1;
        return bitElement;
    }

    createSymbolElement(symbol, index) {
        const symbolElement = document.createElement('div');
        symbolElement.className = `symbol ${this.isCostasSymbol(index) ? 'costas' : 'data'}`;
        symbolElement.textContent = symbol;
        symbolElement.dataset.index = index;
        symbolElement.style.gridColumn = `${index * 3 + 1} / span 3`;
        return symbolElement;
    }

    createPackedElement(packedByte, index) {
        let bitspan = (index === 9) ? 5 : 8; // last byte is 5 bits (77 bits total)
        const packedElement = document.createElement('div');
        packedElement.className = 'packed';
        packedElement.textContent = packedByte;
        packedElement.dataset.index = index;
        packedElement.style.gridColumn = `${index * 8 + 22} / span ${bitspan}`;
        return packedElement;
    }

    addAnnotations() {
        const annotationsRow = document.createElement('div');
        annotationsRow.className = 'annotations-row';
        annotationsRow.style.display = 'contents';
        
        // Example annotations (adjust as needed for your message structure)
        this.addAnnotation(annotationsRow, 'sync', 0, 21);
        this.addAnnotation(annotationsRow, 'payload', 21, 77);
        this.addAnnotation(annotationsRow, 'crc', 98, 10);
        this.addAnnotation(annotationsRow, 'sync', 108, 21);
        this.addAnnotation(annotationsRow, 'crc', 129, 4);
        this.addAnnotation(annotationsRow, 'parity', 133, 83);
        this.addAnnotation(annotationsRow, 'sync', 216, 21);

        this.addAnnotation(annotationsRow, 'n3', 92, 3);
        this.addAnnotation(annotationsRow, 'i3', 95, 3);
        // Add more annotations as needed

        this.gridContainer.appendChild(annotationsRow);
    }

    addAnnotation(row, label, start, len) {
        const annotation = document.createElement('div');
        annotation.className = 'annotation';
        annotation.textContent = label;
        annotation.style.gridColumn = `${start + 1} / span ${len}`;
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
        console.log('currentSymbolElement', currentSymbolElement);
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
        this.highlightCurrentSymbol();

        this.interval = setInterval(() => {
            this.frameUpdate();
        }, 50); // Update every 50ms

    }

    onStop() {
        if (this.interval) clearInterval(this.interval);
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


}