/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

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
    sodium.base64_variants.ORIGINAL,
  );

  const messageFingerprint = `Identity Test (Fingerprint): ${fingerprint}`;
  const messageSerialization = `Identity Test (Serialization): ${encodedSerializedIdentity}`;

  console.info(`${messageFingerprint}\r\n${messageSerialization}`);
})();
