class TribbleComponent extends Component {
    constructor(index, container) {
        super(index, container);
        this.gridContainer = null;
        this.currentSymbol = 0;
    }

    create() {
        this.gridContainer = document.createElement('div');
        this.gridContainer.className = 'bits-grid-container';
        this.container.appendChild(this.gridContainer);

        // Add toggle buttons for different parts
        this.createToggleButtons();
    }

    createToggleButtons() {
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'toggle-container';
        
        const parts = ['Symbols', 'Bits', 'Packed Data'];
        parts.forEach(part => {
            const button = document.createElement('button');
            button.textContent = `Toggle ${part}`;
            button.onclick = () => this.togglePart(part.toLowerCase().replace(' ', '-'));
            toggleContainer.appendChild(button);
        });

        this.container.insertBefore(toggleContainer, this.gridContainer);
    }
    togglePart(part) {
        const elements = this.gridContainer.querySelectorAll(`.${part}`);
        elements.forEach(el => {
            el.style.display = el.style.display === 'none' ? '' : 'none';
        });
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
        const gridTemplate = [];
        let bitIndex = 0;
        let packedIndex = 0;

        symbols.split('').forEach((symbol, index) => {
            if (index % 29 === 0 && index !== 0) {
                gridTemplate.push('break');
            }

            gridTemplate.push('symbol');
            gridTemplate.push('bit', 'bit', 'bit');

            if (bitIndex >= 21 && bitIndex < 98) {
                if (bitIndex % 8 === 5) {
                    gridTemplate.push('packed');
                }
            }

            bitIndex += 3;
        });

        this.gridContainer.style.gridTemplateColumns = gridTemplate.map(item => 
            item === 'break' ? '100%' : 
            item === 'symbol' ? '3ch' :
            item === 'packed' ? '2ch' : '1ch'
        ).join(' ');

        let rowIndex = 0;
        gridTemplate.forEach((item, index) => {
            if (item === 'break') {
                const breakDiv = document.createElement('div');
                breakDiv.style.gridColumn = '1 / -1';
                breakDiv.style.height = '1em';
                this.gridContainer.appendChild(breakDiv);
                rowIndex++;
                return;
            }

            const itemDiv = document.createElement('div');
            itemDiv.className = item;
            itemDiv.style.gridRow = rowIndex + 1;
            itemDiv.style.gridColumn = index + 1;

            if (item === 'symbol') {
                itemDiv.textContent = symbols[Math.floor(index / 4)];
                itemDiv.classList.add(this.isCostasSymbol(Math.floor(index / 4)) ? 'costas' : 'data');
            } else if (item === 'bit') {
                const bitIndex = Math.floor(index / 4) * 3 + (index % 4) - 1;
                itemDiv.textContent = bits[bitIndex] || '0';
                itemDiv.classList.add(bits[bitIndex] === '1' ? 'bit-one' : 'bit-zero');
            } else if (item === 'packed') {
                itemDiv.textContent = packed[packedIndex++];
            }

            this.gridContainer.appendChild(itemDiv);
        });
    }

    addAnnotations() {
        // Example annotations (you'll need to adjust these based on your actual message structure)
        this.addAnnotation('i3', 0, 3);
        this.addAnnotation('n3', 3, 6);
        // Add more annotations as needed
    }

    addAnnotation(label, start, end) {
        const startElement = this.gridContainer.children[start * 4 + 1];
        const endElement = this.gridContainer.children[end * 4];
        
        const annotation = document.createElement('div');
        annotation.className = 'annotation';
        annotation.textContent = label;
        annotation.style.gridColumnStart = startElement.style.gridColumnStart;
        annotation.style.gridColumnEnd = `span ${(end - start) * 4}`;
        annotation.style.gridRow = parseInt(startElement.style.gridRow) - 1;
        
        this.gridContainer.appendChild(annotation);
    }

    isCostasSymbol(index) {
        const costasIndices = [0, 1, 2, 3, 4, 5, 6, 36, 37, 38, 39, 40, 41, 42, 72, 73, 74, 75, 76, 77, 78];
        return costasIndices.includes(index);
    }

    highlightCurrentSymbol() {
        this.clearHighlights();
        const symbolElements = this.gridContainer.querySelectorAll('.symbol');
        const currentSymbolElement = symbolElements[this.currentSymbol];
        if (currentSymbolElement) {
            currentSymbolElement.classList.add('highlighted');
            const bitElements = this.gridContainer.querySelectorAll('.bit');
            for (let i = this.currentSymbol * 3; i < this.currentSymbol * 3 + 3; i++) {
                if (bitElements[i]) bitElements[i].classList.add('highlighted');
            }
        }
    }

    clearHighlights() {
        this.gridContainer.querySelectorAll('.highlighted').forEach(el => el.classList.remove('highlighted'));
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

