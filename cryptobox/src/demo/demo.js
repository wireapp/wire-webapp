const cryptobox = require('../../dist/commonjs/');
const Logdown = require('logdown');

const logger = new Logdown({alignOutput: true, prefix: 'Demo'});
logger.log(`Testing Cryptobox v${cryptobox.Cryptobox.prototype.VERSION}`);

const MIN_AMOUNT_PREKEYS = 5;
const store = new cryptobox.store.Cache();
const box = new cryptobox.Cryptobox(store, MIN_AMOUNT_PREKEYS);

box
  .create()
  .then(() => {
    const fingerprint = box.identity.public_key.fingerprint();
    console.log(`Public Fingerprint: ${fingerprint}`);
    process.exit(0);
  })
  .catch(error => {
    console.log(`Self test broken: ${error.message} (${error.stack})`);
    process.exit(1);
  });
