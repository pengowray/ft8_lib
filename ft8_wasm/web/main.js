const exampleMessages = [
    "CQ K1ABC FN42",
    "K1ABC W9XYZ -15",
    "W9XYZ K1ABC R-17",
    "K1ABC W9XYZ RRR",
    "W9XYZ K1ABC 73",
    "<TNX BOB 73 GL>"
];



function initializeUI() {
    //let currentTime = 0;

    let countdownInterval = null;
    
    const viewManager = new ViewManager();
    const messageManager = viewManager.messageManager;
    
    //const messageManager = new MessageManager(); // from ft8_msg.js
    //window.messageManager = new MessageManager();

    const encodeButton = document.getElementById('encode-button');
    const decodeButton = document.getElementById('decode-button'); // not used (yet)
    const messageInput = document.getElementById('message-input');
    const baseFreqInput = document.getElementById('base-freq-input');
    const audioInput = document.getElementById('audio-input');
    const encodeOutput = document.getElementById('output');
    const output = document.getElementById('output');
    const errorOutput = document.getElementById('error-output');
    //const decodeOutput = document.getElementById('decode-output');

    const toggleSettingsButton = document.getElementById('toggle-settings');
    const audioSettings = document.getElementById('audio-settings');
    const sampleRateSelect = document.getElementById('sample-rate-select');

    const audioControls = document.getElementById('audio-controls');
    const playAudioButton = document.getElementById('play-audio');
    const playAudioTimedButton = document.getElementById('play-audio-timed');
    const stopAudioButton = document.getElementById('stop-audio');
    const downloadAudioButton = document.getElementById('download-audio');
    const countdownDiv = document.getElementById('countdown');
    const themeToggle = document.getElementById('theme-toggle');
    const exampleMessagesDiv = document.getElementById('example-messages');
    const pianoRollDiv = document.getElementById('piano-roll');
    const audioVisualization = document.getElementById('audio-visualization');
    const tribbleViz = document.getElementById('tribble-visualization');
    const testSelect = document.getElementById('test-select');

    viewManager.registerComponent(new VizComponent(-1, audioVisualization));
    viewManager.registerComponent(new PianoRollComponent(-1, pianoRollDiv));
    viewManager.registerComponent(new OutputComponent(-1, output));
    viewManager.registerComponent(new TribbleComponent(-1, tribbleViz));

    const initializeTestInputs = () => {;
        testInputs.forEach((test, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = test.name || test.value;
            testSelect.appendChild(option);
        });

        testSelect.addEventListener('change', (event) => {
            const selectedIndex = event.target.value;
            if (selectedIndex !== "") {
                const selectedTest = testInputs[selectedIndex];
                messageInput.value = selectedTest.value;
                doEncode();
            }
        });
    }
    //initializeTestInputs();

    const initializeTestInputs_ft8code = () => {;
        testInputs_ft8code.forEach((test, index) => {
            const option = document.createElement('option');
            option.value = `msg ${index}`;
            option.textContent = `(${test.type}) ${test.message}`;
            testSelect.appendChild(option);

            const option2 = document.createElement('option');
            option2.value = `symbols ${index}`;
            option2.textContent = `(${test.type}) ${test.message} (symbols)`;
            testSelect.appendChild(option2);
        });

        testSelect.addEventListener('change', (event) => {
            const selected = event.target.value.split(' ');
            selectedType = selected[0];
            selectedIndex = parseInt(selected[1]);
            if (selectedIndex !== "") {
                const selectedTest = testInputs_ft8code[selectedIndex];
                if (selectedType === 'msg') {
                    messageInput.value = selectedTest.message;
                    const expectedResults = selectedTest;
                    doEncode(expectedResults);
                } else if (selectedType === 'symbols') {
                    messageInput.value = selectedTest.symbols;
                    const expectedResults = {...selectedTest, ...{symbols:null}}; // { messageType: selectedTest.type, text: selectedTest.message, decoded: selectedTest.decoded ?? null, error: selectedTest.error  ?? null };
                    doEncode(expectedResults);
                }
            }
        });
    }
    initializeTestInputs_ft8code();

    const parseFreq = (note) => {
        return parseNote(note) || parseFloat(note) || 500;
    }

    const parseNote = (note) => {
      const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      //const flatToSharp = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };
      const flatToSharp = { 'DB': 'C#', 'EB': 'D#', 'GB': 'F#', 'AB': 'G#', 'BB': 'A#' };          
      // Validate input

      if (typeof note !== 'string') return NaN;
      note = note.toUpperCase();
      
      // Convert flat notation to sharp notation if necessary
      //let normalizedNote = note.replace(/([A-G])b(\d?)$/, (_, noteLetter, octave) => 
      //  (flatToSharp[noteLetter + 'b'] || noteLetter + 'b') + octave
      //);
      let normalizedNote = note.replace(/([A-G])B(\d?)$/, (_, noteLetter, octave) => 
        (flatToSharp[noteLetter + 'B'] || noteLetter + 'B') + octave
      );
      
      const octave = parseInt(normalizedNote.slice(-1)) || 4;
      const noteWithoutOctave = normalizedNote.replace(/\d+$/, '');
      const keyNumber = notes.indexOf(noteWithoutOctave);
      
      if (keyNumber === -1) return NaN;
      
      const a4 = 440;
      return a4 * Math.pow(2, (octave - 4) + (keyNumber - 9) / 12);
    };

    function detectNoteNotation(input) {
      // Regular expression to match note notation
      //const notePattern = /^([A-G](#|b)?)(\d)?$/;
      const notePattern = /^([A-G](#|B)?)(\d)?$/;
      const match = input.toUpperCase().match(notePattern);
      
      if (match) {
        const [, note, accidental, octave] = match;
        return {
          isValid: true,
          note: note,
          accidental: accidental || null,
          octave: octave ? parseInt(octave) : null
        };
      } else {
        return { isValid: false };
      }
    }

    function parseFrequencyInput(input) {
        input = input.trim();
        
        // easter eggs
        if (input === "-73") {
            input = "440 (E4 G4 C5 D5 E5 F5 G5 A5)"; // C major / mario3
        } else if (input === "-1") {
            input = "440 (C4 D4 D#4 F4 G4 A#4 C5 G5)"; // C minor / underworld
        }

        // Default base frequency if not provided
        let baseFreq = 500;

        // Try to parse base frequency
        //const baseFreqMatch = input.match(/^(\d+(\.\d+)?)/);
        const baseFreqMatch = input.match(/^\s*(\S*)[\s\(]?/);
        if (baseFreqMatch) {
            baseFreq = parseFreq(baseFreqMatch[1]) || baseFreq;
        }

        // Check for offsets in brackets
        const offsetsMatch = input.match(/\((.*?)\)/);
        
        // If no offsets provided, use default FT8 spacing
        if (!offsetsMatch) {
            return defaultTonesFT8(baseFreq); 
        }

        //todo: perhaps treat customTones as offsets if start with +
        //todo: most verbose, json based notation
        const customTonesStr = offsetsMatch[1].trim();
        const customTonesTokens = customTonesStr.split(/\s+/);
        let customTones = [];

        customTones = customTonesTokens.map(token => parseNote(token) || parseFloat(token) || NaN); 

        // Fill in missing offsets
        if (customTones.length === 1) {
            //const step = offsets[0] / 7;
            let step = customTones[0] - baseFreq;
            if (step == 0) step = 6.25;
            customTones = Array.from({length: 8}, (_, i) => baseFreq + i * step);
        } else if (customTones.length < 8) {
            while (customTones.length < 8) {
                const step = customTones[customTones.length - 1] - customTones[customTones.length - 2];
                customTones.push(customTones[customTones.length - 1] + step);
            }
        } else if (customTones.length > 8) {
            //todo: show error to user
            console.log("Too many custom tones.");
            //return defaultTonesFT8(baseFreq); 
            return { baseHz: baseFreq, customTones: customTones.slice(0, 7) };
        }
        return { baseHz: baseFreq, customTones: customTones };
    }

    function defaultTonesFT8(baseHz) {
        const offsets = [0, 6.25, 12.5, 18.75, 25, 31.25, 37.5, 43.75];
        return { baseHz: baseHz, customTones: offsets.map( offset => baseHz + offset) };
    }

    function stopAudio() {
        //todo: do via ViaController
        //const msg = messageManager.getCurrentMessage();
        //msg?.resetAudioState();
        viewManager.stopAllAudio();

        updateButtonState(false);
    }

    function resetAudioState(msg) {
        msg.resetAudioState();

        updateButtonState(false);
    }

    function playAudio() {
        //const msg = messageManager.getCurrentMessage();
        //msg.playAudio();
        viewManager.playAudioIndex(-1);

        //todo: move everything below to viz components

        updateButtonState(true);

    }

    function updateButtonState(isPlaying) {
        playAudioButton.disabled = isPlaying;
        playAudioTimedButton.disabled = isPlaying;
        stopAudioButton.disabled = !isPlaying;
        //downloadAudioButton.disabled = isPlaying;
    }

    function playAudioTimed() {
        const msg = messageManager.getCurrentMessage();
        msg.readyAudioAndBuffer();

        if (msg != null && msg.audioSamples != null && !msg.audioSource) {
            const now = new Date().getSeconds();
            const latency = (msg.audioContext?.outputLatency ?? 0);
            const secondsUntilNext15 = 15 - ((now + latency) % 15);
            //const displaySecondsUntilNext15 = 15 - (now % 15);
            let totalSecondsTilNext = secondsUntilNext15;
            let nextCycleTime = new Date().getTime() + totalSecondsTilNext * 1000;

            updateButtonState(true);
            countdownDiv.style.display = 'block';

            function updateCountdown() {
                const timeRemaining = (nextCycleTime - new Date().getTime()) / 1000;

                //const minutes = Math.floor(timeRemaining / 60);
                const seconds = timeRemaining % 60;
                countdownDiv.textContent = `Playing in ${seconds.toFixed(1).toString().padStart(2, '0')}`;
                
                if (timeRemaining <= 0) {
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                    countdownDiv.style.display = 'none';
                    playAudio();
                }
                //totalSeconds--;
            }

            updateCountdown(); // Call immediately to show correct time
            countdownInterval = setInterval(updateCountdown, 12); // 12ms update interval
        }
    }

    playAudioButton.addEventListener('click', playAudio);
    playAudioTimedButton.addEventListener('click', playAudioTimed);
    stopAudioButton.addEventListener('click', stopAudio);
    downloadAudioButton.addEventListener('click', downloadAudio);

    function downloadAudio() {
        const msg = messageManager.getCurrentMessage();
        msg.readyAudio();

        if (msg == null) return;

        if (msg.audioSamples == null) return;

        const wavData = audioBufferToWav(msg);
        const blob = new Blob([wavData], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const baseFreq = msg.getBaseFrequency();
        const message = messageInput.value.replace(/\s+/g, '_');
        a.download = `FT8-${Math.round(baseFreq)}Hz_${msg}.wav`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
    }

    /**
     * 
     * @param {FT8Message} msg 
     * @returns 
     */
    function audioBufferToWav(msg) {
        if (msg == null || msg.audioSamples == null) return null;

        //TODO: don't require AudioBuffer, so can just use readyAudio(); 
        msg.readyAudioAndBuffer();
        //msg.readyAudio(); 

        if (msg.audioSamples == null || msg.audioBuffer == null) return null;

        const buffer = msg.audioBuffer;

        //const numChannels = 1; 
        const numChannels = buffer.numberOfChannels;
        //const sampleRate = msg.getSampleRate(); // buffer.sampleRate;
        const sampleRate = buffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;

        let byteRate = sampleRate * numChannels * bitDepth / 8;
        let blockAlign = numChannels * bitDepth / 8;
        //let dataSize = msg.audioSamples.length * numChannels * bitDepth / 8;
        let dataSize = buffer.length * numChannels * bitDepth / 8;

        let headerSize = 44;
        let totalSize = headerSize + dataSize;

        let arrayBuffer = new ArrayBuffer(totalSize);
        let view = new DataView(arrayBuffer);

        // RIFF chunk descriptor
        writeString(view, 0, 'RIFF');
        view.setUint32(4, totalSize - 8, true);
        writeString(view, 8, 'WAVE');

        // FMT sub-chunk
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true); // subchunk1size (16 for PCM)
        view.setUint16(20, format, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);

        // Data sub-chunk
        writeString(view, 36, 'data');
        view.setUint32(40, dataSize, true);

        // Write the PCM samples
        let offset = 44;
        for (let i = 0; i < buffer.length; i++) {
            for (let channel = 0; channel < numChannels; channel++) {
                let sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
                sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                view.setInt16(offset, sample, true);
                offset += 2;
            }
        }

        return arrayBuffer;
    }

    function writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    messageInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            encodeButton.click();
        }
    });


    encodeButton.addEventListener('click', () => {
        doEncode();
    });

    function doEncode(testData = null) {
        try {
            handleEncode(testData);
         
        } catch (error) {
            //output.innerHTML = "Error: " + error.message;
            errorOutput.innerHTML = "Error: " + error;
            console.error("handle encode error", error);
        }
    }
    
    function handleEncode(testData = null) {
        let inputText = messageInput.value;
        const message = new FT8Message(inputText); //messageManager.createMessage(inputText);
        message.expectedResults = testData;

        message.encode();
        if (message.error != null) {
            errorOutput.textContent = "Error: " + message.error;
            return;
        } else {
            errorOutput.textContent = "";
        }
        // gather audio options
        const freqData = parseFrequencyInput(baseFreqInput.value);
        if (!freqData) {
            errorOutput.innerHTML = "Invalid frequency input";
            return;
        }
        console.log(`freq: ${freqData.baseHz} (${freqData.customTones.join(' ')})`);
        const sampleRate = parseInt(sampleRateSelect.value);
        message.setAudioOptions(sampleRate, freqData.baseHz, freqData.customTones);

        //const { audio, dphi, metadata } = generateAudioFromSymbols(symbolsArray, baseFrequency, sampleRate);
        //const audioResult = generateAudioFromSymbols(symbolsArray, options);
        message.generateAudio();

        const index = viewManager.addMessage(message);
        viewManager.switchToMessageIndex(index);

        if (message.audioSamples.length > 0) {
            //setupAudioPlayback(message);

        } else {
            console.error("No audio data generated");
            if (errorOutput != null && errorOutput.innerHTML != null && errorOutput.innerHTML.length > 0) {
                errorOutput.innerHTML += "<br>";
            } else {
                errorOutput.innerHTML = "";
            }
            errorOutput.innerHTML += "No audio data generated";
            audioControls.style.display = 'none';
        }
    }


    /**
     * 
     * @param {FT8Message} message 
     */
    function setupAudioPlayback(message) {
        //was:     function setupAudioPlayback(audioSamples, dphiSamples, sampleRate, metadata) {

        audioControls.style.display = 'block';
        updateButtonState(false);
        countdownDiv.style.display = 'none';
    }

    exampleMessages.forEach(message => {
        const button = document.createElement('button');
        button.textContent = message;
        button.addEventListener('click', () => {
            messageInput.value = message;
            doEncode();
        });
        exampleMessagesDiv.appendChild(button);
    });


    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const positionLine = document.getElementById('position-line');
        if (positionLine) {
            positionLine.style.backgroundColor = document.body.classList.contains('dark-mode') ? 'white' : 'red';
        }
    });

    toggleSettingsButton.addEventListener('click', () => {
        audioSettings.classList.toggle('hidden');
        toggleSettingsButton.textContent = audioSettings.classList.contains('hidden') 
            ? 'Audio Settings ▼' 
            : 'Audio Settings ▲';
    });

    // Populate sample rate dropdown
    const sampleRates = [8000, 11025, 12000, 16000, 22050, 24000, 44100, 48000];
    sampleRates.forEach(rate => {
        const option = document.createElement('option');
        option.value = rate;
        option.textContent = `${rate} Hz`;
        if (rate === 12000) option.selected = true;
        sampleRateSelect.appendChild(option);
    });

    const toggleVisualizationButton = document.getElementById('toggle-visualization');
    const VisualizationCaption = document.getElementById('visualization-caption');

    //TODO XXX
    //toggleVisualizationButton.addEventListener('click', toggleVisualization);

}

/*
if (typeof Module !== 'undefined') {
    Module.onRuntimeInitialized = initializeUI;
} else {
    document.addEventListener('DOMContentLoaded', initializeUI);
}
*/