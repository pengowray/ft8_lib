class PianoRollComponent extends Component {
    create() {
        //this.pianoRollDiv = pianoRollDiv; // document.container.getElementById('piano-roll');
        //window.addEventListener('resize', this.handleResize);

        this.pianoRollInterval = null;

        this.pianoRollDiv = this.container;
    }
    
    messageUpdate() {    

        //const pianoRollDiv = document.getElementById('piano-roll');
        const pianoRollDiv = this.container;

        pianoRollDiv.innerHTML = '';
        this.positionLine = document.createElement('div');
        this.positionLine.id = 'position-line';
        this.positionLine.style.display = 'none'; // Initially hidden
        pianoRollDiv.appendChild(this.positionLine);

        if (this.message == null || this.message.symbols == null) return;

        const symbols = Array.from(this.message.symbolsText);
        pianoRollDiv.style.gridTemplateColumns = `repeat(${symbols.length}, 1fr)`;

        symbols.forEach((symbol, index) => {
            if (symbol === '-') return;
            const symbolDiv = document.createElement('div');
            symbolDiv.style.backgroundColor = this.getSymbolBackgroundColor(index);
            symbolDiv.style.gridRow = `${8 - symbol} / span 1`;
            symbolDiv.style.gridColumn = `${index + 1} / span 1`;
            symbolDiv.dataset.index = index;
            symbolDiv.dataset.symbol = symbol;
            pianoRollDiv.appendChild(symbolDiv);
        });

    }

    getSymbolBackgroundColor(index) {
        if (this.isCostasSymbol(index)) {
            return 'var(--costas-bg)';
        } else {
            return 'var(--data-bg)';
        }
    }

    isCostasSymbol(index) {
        const costasIndices = [0, 1, 2, 3, 4, 5, 6, 36, 37, 38, 39, 40, 41, 42, 72, 73, 74, 75, 76, 77, 78];
        return costasIndices.includes(index);
    }

    onPlaying() {
        // Show position line
        //const positionLine = document.getElementById('position-line');
        const positionLine = this.positionLine;
        positionLine.style.display = 'block';
        positionLine.style.backgroundColor = 'var(--position-line-color)'; //document.body.classList.contains('dark-mode') ? 'white' : 'red';

        this.pianoRollInterval = setInterval(() => {
            const currentTime = this.message.audioContext.currentTime - this.message.startTime;
            this.highlightCurrentSymbol(currentTime);
            
            //todo: move to a separate component
            //drawWaveform(currentTime);

            /*
            if (currentTime >= this.message.audioBuffer.duration) {
                clearInterval(this.pianoRollInterval);
                resetAudioState(msg);
            }
                */

        }, 50); // Update every 50ms
    }

    onStop() {
        clearInterval(this.pianoRollInterval);

        // Clear all highlights
        if (this.pianoRollDiv) {
            const symbols = this.pianoRollDiv.children;
            for (let i = 0; i < symbols.length; i++) {
                symbols[i].style.backgroundColor = this.getSymbolBackgroundColor(i);
            }
        }

        // Hide position line
        //const positionLine = document.getElementById('position-line');
        if (this.positionLine) {
            this.positionLine.style.display = 'none';
        }
        
    }

    
    highlightCurrentSymbol(currentTime) {
        const msg = this.message; //messageManager.getCurrentMessage();
        if (!msg || !msg.audioBuffer) return;

        const symbolDuration = msg.audioBuffer.duration / 79; // 79 symbols in FT8
        currentSymbolIndex = Math.floor(currentTime / symbolDuration);
        
        const pianoRollDiv = this.pianoRollDiv; //document.getElementById('piano-roll');
        const symbols = pianoRollDiv.children;
        const positionLine = document.getElementById('position-line');
        
        for (let i = 0; i < symbols.length; i++) {
            //if (i === currentSymbolIndex) {
            const v = symbols[i].dataset.index;
            if (v === currentSymbolIndex) {
                symbols[i].style.backgroundColor = this.getHighlightColor(symbols[i].dataset.symbol);
            } else {
                symbols[i].style.backgroundColor = this.getSymbolBackgroundColor(i);
            }
        }

        // Update position line
        const progress = currentTime / msg.audioBuffer.duration;
        this.positionLine.style.left = `${progress * 100}%`;
    }

    getHighlightColor(symbol) {
        const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#ff6b6b', '#ff6b6b'];
        return colors[symbol];
    }

    initialUpdate() {
    }

    handleResize() {
    }

    frameUpdate(currentTime = 0) {

    }

}

