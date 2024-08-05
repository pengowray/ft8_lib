class TribbleComponent extends Component {
    create() {
    }
    
    messageUpdate() {    
        const output = this.container;
        output.innerHTML = "";

        if (this.message == null) return;

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

        
    }

    onPlaying() {
    }

    onStop() {
    }

    initialUpdate() {
    }

    frameUpdate() {
    }

}

