'use strict';

const Proteus = require('../src/proteus');
const sodium = require('libsodium-wrappers-sumo');

const identity = Proteus.keys.IdentityKeyPair.new();
const fingerprint = identity.public_key.fingerprint();
const serializedIdentity = identity.serialise();
const encodedSerializedIdentity = sodium.to_base64(new Uint8Array(serializedIdentity));

const messageFingerprint = `Identity Test (Fingerprint): ${fingerprint}`;
const messageSerialization = `Identity Test (Serialization): ${encodedSerializedIdentity}`;

console.log(`${messageFingerprint}\r\n${messageSerialization}`);
