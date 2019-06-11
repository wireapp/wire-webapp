const cryptobox = require('@wireapp/cryptobox');
const {MemoryEngine} = require('@wireapp/store-engine');
const logdown = require('logdown');

const logger = logdown('@wireapp/cryptobox/Demo', {
  alignOutput: true,
});
logger.state.isEnabled = true;
logger.log(`Testing Cryptobox v${cryptobox.Cryptobox.VERSION}`);

(async () => {
  try {
    const MIN_AMOUNT_PREKEYS = 5;
    const engine = new MemoryEngine();
    await engine.init('cache');

    const box = new cryptobox.Cryptobox(engine, MIN_AMOUNT_PREKEYS);

    await box.create();

    const fingerprint = box.identity.public_key.fingerprint();
    logger.log(`Public Fingerprint: ${fingerprint}`);
    process.exit(0);
  } catch (error) {
    logger.log(`Self test broken: ${error.message} (${error.stack})`);
    process.exit(1);
  }
})();
