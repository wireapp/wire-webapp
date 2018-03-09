#!/usr/bin/env node

const Proteus = require('@wireapp/proteus');
const {Cryptobox} = require('@wireapp/cryptobox');
const {MemoryEngine} = require('@wireapp/store-engine');

const sessionWithAlice = 'session-with-alice';
const sessionWithBob = 'session-with-bob';

const getTimeInSeconds = timer => {
  const [seconds, nanoseconds] = process.hrtime(timer);
  const NANOSECONDS_IN_SECOND = 1e9;
  const digits = 3;
  return (seconds + nanoseconds / NANOSECONDS_IN_SECOND).toFixed(digits);
};

/** Creates a Cryptobox with an initialized store. */
async function createCryptobox(storeName, amountOfPreKeys = 1) {
  const engine = new MemoryEngine();
  await engine.init(storeName);
  return new Cryptobox(engine, amountOfPreKeys);
}

/** Creates participants and establishes sessions between them. */
async function initialSetup() {
  const alice = await createCryptobox('alice', 1);
  await alice.create();

  const bob = await createCryptobox('bob', 1);
  await bob.create();

  const bobBundle = Proteus.keys.PreKeyBundle.new(
    bob.identity.public_key,
    await bob.store.load_prekey(Proteus.keys.PreKey.MAX_PREKEY_ID)
  );

  const cipherMessage = await alice.encrypt(sessionWithBob, 'Hello', bobBundle.serialise());
  await bob.decrypt(sessionWithAlice, cipherMessage);

  return {alice, bob};
}

/** Runs the test scenario and measures times. */
async function runBenchmark({alice, bob}, messageCount) {
  const numbers = Array(messageCount)
    .fill(null)
    .map((value, key) => key + 1);

  // Encryption
  process.stdout.write(`Measuring encryption time for ${numbers.length} messages ... `);
  const encryptionTimer = process.hrtime();
  const encryptedMessages = await Promise.all(
    numbers.map(
      async value => await alice.encrypt(sessionWithBob, `This is a long message with number ${value.toString()}`)
    )
  );
  const elapsedTimeEncryption = getTimeInSeconds(encryptionTimer);
  process.stdout.write('Done.\n');

  console.log(`Execution time: ${elapsedTimeEncryption} seconds.\n`);

  // Decryption
  process.stdout.write(`Measuring decryption time for ${numbers.length} messages ... `);
  const decryptionTimer = process.hrtime();
  await Promise.all(
    encryptedMessages.map(async encryptedMessage => await bob.decrypt(sessionWithAlice, encryptedMessage))
  );
  const elapsedTimeDecryption = getTimeInSeconds(decryptionTimer);
  process.stdout.write('Done.\n');

  console.log(`Execution time: ${elapsedTimeDecryption} seconds.`);
}

(async () => {
  try {
    console.log('Running benchmark ... \n');
    const amountOfMessages = 3000;
    await runBenchmark(await initialSetup(), amountOfMessages);
  } catch (error) {
    console.error(error.message, error);
  }
})();
