import createMshvFT8Module from './mshv_ft8.js';

class MSHVFT8 {
  constructor() {
    this.modulePromise = createMshvFT8Module().then(module => {
      this.module = module;
      this.initFT8 = this.module.cwrap('init_ft8', null, []);
      this.createInstance = this.module.cwrap('create_packunpack77_instance', 'number', ['boolean']);
      this.destroyInstance = this.module.cwrap('destroy_packunpack77_instance', null, ['number']);
      this.packFT8Message = this.module.cwrap('pack_ft8_message_safe', 'number', ['string', 'number']);
      this.unpackFT8Message = this.module.cwrap('unpack_ft8_message', 'number', ['string', 'number']);
      this.saveHashCall = this.module.cwrap('save_hash_call', null, ['string', 'number']);
      this.initFT8();
    });
  }

  async waitForModule() {
    await this.modulePromise;
  }

  async createPackUnpackInstance(forUnpacking = true) {
    await this.waitForModule();
    return this.createInstance(forUnpacking);
  }

  async destroyPackUnpackInstance(instanceIndex) {
    await this.waitForModule();
    this.destroyInstance(instanceIndex);
  }

  async packMessage(message, instanceIndex = 0) {
    await this.waitForModule();
    const resultPtr = this.packFT8Message(message, instanceIndex);
    const result = this.module.getValue(resultPtr, 'i32');
    const messagePtr = resultPtr + 4;
    const packedMessage = this.module.UTF8ToString(messagePtr);
    return { errorCode: result, message: packedMessage };
  }

  async unpackMessage(packedMessage, instanceIndex = 1) {
    await this.waitForModule();
    const resultPtr = this.unpackFT8Message(packedMessage, instanceIndex);
    const result = this.module.getValue(resultPtr, 'i32');
    const messagePtr = resultPtr + 4;
    const unpackedMessage = this.module.UTF8ToString(messagePtr);
    return { errorCode: result, message: unpackedMessage };
  }

  async saveHash(call, instanceIndex = 1) {
    await this.waitForModule();
    this.saveHashCall(call, instanceIndex);
  }
}

export default MSHVFT8;