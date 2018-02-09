(async () => {
  const Proteus = require('@wireapp/proteus');
  const _sodium = require('libsodium-wrappers-sumo');

  await _sodium.ready;
  sodium = _sodium;

  const identity = await Proteus.keys.IdentityKeyPair.new();
  const fingerprint = identity.public_key.fingerprint();
  const serializedIdentity = identity.serialise();
  const encodedSerializedIdentity = sodium.to_base64(new Uint8Array(serializedIdentity));

  const messageFingerprint = `Identity Test (Fingerprint): ${fingerprint}`;
  const messageSerialization = `Identity Test (Serialization): ${encodedSerializedIdentity}`;

  console.log(`${messageFingerprint}\r\n${messageSerialization}`);
})();
