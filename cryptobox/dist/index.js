const cryptobox = require('./commonjs/wire-webapp-cryptobox');
const Logdown = require('logdown');

const logger = new Logdown({prefix: 'Demo', alignOutput: true});
logger.log(`Testing Cryptobox v${cryptobox.Cryptobox.prototype.VERSION}`);

const store = new cryptobox.store.Cache();
const box = new cryptobox.Cryptobox(store, 5);

box.create()
  .then(() => {
    const fingerprint = box.identity.public_key.fingerprint();
    console.log(`Public Fingerprint: ${fingerprint}`);
    process.exit(0);
  })
  .catch((error) => {
    console.log(`Self test broken: ${error.message} (${error.stack})`);
    process.exit(1);
  });
