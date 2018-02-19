const _sodium = require('libsodium-wrappers-sumo');

(async () => {
  await _sodium.ready;
  const sodium = _sodium;

  const Proteus = require('@wireapp/proteus');

  const identity = await Proteus.keys.IdentityKeyPair.new();
  const fingerprint = identity.public_key.fingerprint();
  const serializedIdentity = identity.serialise();
  const encodedSerializedIdentity = sodium.to_base64(
    new Uint8Array(serializedIdentity),
    sodium.base64_variants.ORIGINAL
  );

  const messageFingerprint = `Identity Test (Fingerprint): ${fingerprint}`;
  const messageSerialization = `Identity Test (Serialization): ${encodedSerializedIdentity}`;

  console.log(`${messageFingerprint}\r\n${messageSerialization}`);
})();
