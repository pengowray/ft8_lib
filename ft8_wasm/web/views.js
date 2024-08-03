class ViewManager {
    constructor() {
        this.messageManager = new MessageManager();
        this.views = new Views(this.messageManager);
        this.playingMessages = new Set();
        this.queuedMessages = new Set();
    }

    registerComponent(component) {
        this.views.registerComponent(component);
        component.setCurrentIndex(this.messageManager.currentMessageIndex);
    }

    addMessage(message) {
        const index = this.messageManager.addMessage(message);
        message.viewManager = this;

        //this.messageManager.switchToMessage(index);
        return index;
    }


    addMessageAndSwitch(message) {
        const index = this.addMessage(message)
        this.switchToMessageIndex(index);
        return index;
    }

    onPlay(message) {
        this.playingMessages.add(message);
        this.queuedMessages.delete(message);
        const index = this.messageManager.getMessageIndex(message);
        this.views.getComponents(index).forEach((component) => {
            component.onPlay();
        });
    }

    onStop(message) {
        this.playingMessages.delete(message);
        this.queuedMessages.delete(message);
        const index = this.messageManager.getMessageIndex(message);
        this.views.getComponents(index).forEach((component) => {
            component.onStop();
        });
    }

    onQueue(message) {
        this.playingMessages.delete(message);
        this.queuedMessages.add(message);
        const index = this.messageManager.getMessageIndex(message);
        this.views.getComponents(index).forEach((component) => {
            component.onQueue();
        });
    }

    switchToMessageIndex(index) {
        this.messageManager.switchToMessageIndex(index);
        const message = this.messageManager.getMessage(index);

        this.views.getComponents(index).forEach((component) => {
            component.loadMessage(message);
        });

        if (message.isPlaying) {
            // pass
        } else {
            this.views.getComponents(index).forEach((component) => {
                component.stopped();
            });
        }

        return message;
    }

    playCurrentMessageAudio() {
        const index = this.messageManager.getCurrentMessageIndex();
        this.playAudioIndex(index);
    }

    stopAllAudio() {
        this.playingMessages.forEach((message) => {
            message.resetAudioState();
        });
        //TODO: stop queued messages
        //this.playingMessages.clear();
        //this.queuedMessages.clear();
    }

    playAudioIndex(index) {
        const message = this.messageManager.getMessage(index);
        if (message) {
            message.playAudio();

            this.views.getComponents(index).forEach((component) => {
                component.playAudio();
            });
        }
    }

    frameUpdate(currentTime) {
        this.views.frameUpdate(currentTime);
    }
}

class MessageManager {
    constructor() {
        this.messages = [];
        this.currentMessageIndex = -1;
    }

    /**
     * @param {FT8Message} message
     * @returns {number} index
     */
    addMessage(message) {
        //const message = new FT8Message(inputText);
        this.messages.push(message);
        const index = this.messages.length - 1;
        //this.currentMessageIndex = index;
        return index;
    }

    /**
     * @returns {FT8Message}
     */
    getCurrentMessage() {
        if (this.currentMessageIndex === -1) {
            return null;
        } else {
            return this.messages[this.currentMessageIndex];
        }
    }

    getMessageIndex(message) {
        return this.messages.indexOf(message);
    }

    /**
     * @param {number} index - index of message or -1 for current message
     * @returns {FT8Message}
     */
    getMessage(index) {
        if (index === -1) {
            return this.getCurrentMessage();
        } else {
            return this.messages[index];
        }
    }

    getMessages() {
        // {1: message, ... }
        // get all non-null messages, with their index
        let result = {};
        for (let i = 0; i < this.messages.length; i++) {
            if (this.messages[i] != null) {
                result[i] = this.messages[i];
            }
        }
        return result;
    }

    getMessageList() {
        return this.messages.filter(message => message != null);
    }

    /**
     * @param {number} index
     * @returns {FT8Message}
     */
    switchToMessageIndex(index) {
        if (index >= 0 && index < this.messages.length) {
            this.currentMessageIndex = index;
            return this.getCurrentMessage();
        }
        return null;
    }

    deleteMessage(index) {
        if (index >= 0 && index < this.messages.length) {
            this.messages[index] = null;
            return true;
        }
        return false;
    }
}

class Views {
    constructor(messageManager) {
        this.messageManager = messageManager;
        this.components = [];
    }

    registerComponent(component) {
        this.components.push(component);
        component.create();
        component.loadMessage(this.messageManager.getMessage(component.index));
    }

    getComponents(messageIndex) {
        const currentIndex = this.messageManager.currentMessageIndex;
        return this.components.filter((component) =>
            component !== null &&
            component.index === messageIndex
            || (messageIndex === -1 && component.index === currentIndex)
            || (component.index === -1 && messageIndex === currentIndex)
        );
    }

    frameUpdate(currentTime) {
        this.components.forEach((component) => {
            if (component.updateOn === 'frame') {
                component.frameUpdate();
            }
        });
    }
}

class Component {
    constructor(index, container) {
        this.index = index;
        this.container = container;
        this.element = null;
        this.message = null;
        this.updateOn = null; // 'symbol', 'frame', 'message'
    }

    create() {
        // To be implemented by subclasses
    }

    loadMessage() {
        this.message = this.messageManager.getMessage(this.index);
        this.messageUpdate(message);
    }

    loadMessage(message) {
        // called after creation or when message data changes
        this.message = message;
        this.messageUpdate(message);
    }

    stopped() {
    }

    messageUpdate(message) {
    }
    frameUpdate(currentTime) {
    }
    symbolUpdate(symbolIndex) {
    }

    onPlay(message) {
    }
    onStop(message) {
    }
    onQueue(message) {
    }  

    setVisible(visible) {
        if (this.element) {
            this.element.style.display = visible ? 'block' : 'none';
        }
    }

    dispose() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}
