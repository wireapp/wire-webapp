const bazinga64 = require('bazinga64');
const Proteus = require('@wireapp/proteus');
const StoreHelper = require('./StoreHelper');
const {Cryptobox} = require('@wireapp/cryptobox');

module.exports = {
  createEncodedCipherText: async (receiver, preKey, text) => {
    const senderEngine = await StoreHelper.createMemoryEngine();
    const sender = new Cryptobox(senderEngine, 1);
    await sender.create();

    const sessionId = `from-${sender.identity.public_key.fingerprint()}-to-${preKey.key_pair.public_key.fingerprint()}`;

    const alicePublicKey = receiver.public_key;
    const publicPreKeyBundle = Proteus.keys.PreKeyBundle.new(alicePublicKey, preKey);
    const encryptedPreKeyMessage = await sender.encrypt(sessionId, text, publicPreKeyBundle.serialise());
    return bazinga64.Encoder.toBase64(encryptedPreKeyMessage).asString;
  },
  getPlainText: async (cryptographyService, encodedPreKeyMessage, sessionId = `temp-${Date.now()}`) => {
    const decodedMessageBuffer = await cryptographyService.decrypt(sessionId, encodedPreKeyMessage);
    if (decodedMessageBuffer) {
      return Buffer.from(decodedMessageBuffer).toString('utf8');
    }
  },
};
