#!/usr/bin/env node

const Proteus = require('@wireapp/proteus');
const {Cryptobox} = require('@wireapp/cryptobox');
const {MemoryEngine} = require('@wireapp/store-engine');

const getTimeInSeconds = timer => {
  const [seconds, nanoseconds] = process.hrtime(timer);
  const NANOSECONDS_IN_SECOND = 1e9;
  const digits = 3;
  return (seconds + nanoseconds / NANOSECONDS_IN_SECOND).toFixed(digits);
};

function createSessionId(receiver) {
  return `session-with-${receiver.identity.public_key.fingerprint()}`;
}

function numbersInArray(count) {
  return Array(count)
    .fill(null)
    .map((value, key) => ++key);
}

// Creates a Cryptobox with an initialized store.
async function createCryptobox(storeName, amountOfPreKeys = 1) {
  const engine = new MemoryEngine();
  await engine.init(storeName);
  return new Cryptobox(engine, amountOfPreKeys);
}

// Creates participants and establishes sessions between them.
async function initialSetup() {
  const alice = await createCryptobox('alice', 1);
  await alice.create();

  const bob = await createCryptobox('bob', 1);
  await bob.create();

  const bobBundle = Proteus.keys.PreKeyBundle.new(
    bob.identity.public_key,
    await bob.store.load_prekey(Proteus.keys.PreKey.MAX_PREKEY_ID),
  );

  const cipherMessage = await alice.encrypt(createSessionId(bob), 'Hello', bobBundle.serialise());
  await bob.decrypt(createSessionId(alice), cipherMessage);

  return {alice, bob};
}

// Runs the test scenario and measures times.
async function encryptBeforeDecrypt({alice, bob}, messageCount) {
  const numbers = numbersInArray(messageCount);

  // Encryption
  process.stdout.write(`Measuring encryption time for "${messageCount}" messages ... `);
  let startTime = process.hrtime();
  const encryptedMessages = await Promise.all(
    numbers.map(value => alice.encrypt(createSessionId(bob), `This is a long message with number ${value.toString()}`)),
  );
  let stopTime = getTimeInSeconds(startTime);
  process.stdout.write('Done.\n');

  console.info(`Execution time: ${stopTime} seconds.\n`);

  // Decryption
  process.stdout.write(`Measuring decryption time for "${messageCount}" messages ... `);
  startTime = process.hrtime();
  await Promise.all(
    encryptedMessages.map(async encryptedMessage => await bob.decrypt(createSessionId(alice), encryptedMessage)),
  );
  stopTime = getTimeInSeconds(startTime);
  process.stdout.write('Done.\n');

  console.info(`Execution time: ${stopTime} seconds.\n`);
}

async function pingPong({alice, bob}, messageCount) {
  const numbers = numbersInArray(messageCount);

  function toggleActors([a, b]) {
    return [b, a];
  }

  let actors = toggleActors([alice, bob]);

  process.stdout.write(
    `Measuring encryption with immediate decryption (ping/pong) for "${messageCount}" messages ... `,
  );
  const startTime = process.hrtime();

  for (const number of numbers) {
    const sender = actors[0];
    const receiver = actors[1];

    const encrypted = await sender.encrypt(createSessionId(receiver), `Message "${number}"`);
    await receiver.decrypt(createSessionId(sender), encrypted);

    actors = toggleActors(actors);
  }

  const stopTime = getTimeInSeconds(startTime);
  process.stdout.write('Done.\n');

  console.info(`Execution time: ${stopTime} seconds.\n`);
}

async function pingPongWithMultipleSessions(messageCount) {
  const numbers = numbersInArray(messageCount);

  const alice = await createCryptobox('alice', 1);
  await alice.create();

  const aliceBundle = Proteus.keys.PreKeyBundle.new(
    alice.identity.public_key,
    await alice.store.load_prekey(Proteus.keys.PreKey.MAX_PREKEY_ID),
  );

  process.stdout.write(`Measuring time for creating "${messageCount}" cryptoboxes ... `);
  let startTime = process.hrtime();

  const cryptoboxes = await Promise.all(
    numbers.map(async number => {
      const cryptobox = await createCryptobox(`cryptobox-${number}`, 1);
      await cryptobox.create();
      return cryptobox;
    }),
  );

  let stopTime = getTimeInSeconds(startTime);
  process.stdout.write('Done.\n');
  console.info(`Execution time: ${stopTime} seconds.\n`);

  process.stdout.write(
    `Measuring time for encrypting "${messageCount}" messages with "${messageCount}" cryptoboxes ... `,
  );
  startTime = process.hrtime();

  const encryptions = await Promise.all(
    cryptoboxes.map(cryptobox => cryptobox.encrypt(createSessionId(alice), 'Hello', aliceBundle.serialise())),
  );

  stopTime = getTimeInSeconds(startTime);
  process.stdout.write('Done.\n');
  console.info(`Execution time: ${stopTime} seconds.\n`);

  process.stdout.write(`Measuring time for decrypting "${messageCount}" messages in "${messageCount}" sessions ... `);
  startTime = process.hrtime();

  await Promise.all(encryptions.map((encrypted, index) => alice.decrypt(`session-${index}`, encrypted)));

  stopTime = getTimeInSeconds(startTime);
  process.stdout.write('Done.\n');
  console.info(`Execution time: ${stopTime} seconds.\n`);
}

(async () => {
  try {
    console.info('Running benchmark(s) ... \n');
    const amountOfMessages = 3000;
    await encryptBeforeDecrypt(await initialSetup(), amountOfMessages);
    await pingPong(await initialSetup(), amountOfMessages);
    await pingPongWithMultipleSessions(amountOfMessages);
  } catch (error) {
    console.error(error.message, error);
  }
})();
