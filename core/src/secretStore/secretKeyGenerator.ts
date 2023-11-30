/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {Decoder, Encoder} from 'bazinga64';

import {createCustomEncryptedStore, createEncryptedStore} from './encryptedStore';

import {SecretCrypto} from '../messagingProtocols/mls/types';

const isBase64 = /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/;

export class CorruptedKeyError extends Error {}

export type GeneratedKey = {
  key: Uint8Array;
  deleteKey: () => Promise<void>;
};

/**
 * Will generate (or retrieve) a secret key from the database.
 */
export async function generateSecretKey({
  keyId,
  keySize = 16,
  dbName,
  systemCrypto: baseCrypto,
}: {
  /** the ID of the key to generate (if the ID already exists, then the generated key will be returned) */
  keyId: string;
  /** size of the key to generate */
  keySize?: number;
  /** name of the database that will hold the secrets */
  dbName: string;
  /** custom crypto primitives to use to encrypt the secret keys */
  systemCrypto?: SecretCrypto;
}): Promise<GeneratedKey> {
  const systemCrypto = baseCrypto
    ? {
        encrypt: (value: Uint8Array) => {
          if (baseCrypto.version === 1) {
            const strValue = Encoder.toBase64(value).asString;
            return baseCrypto.encrypt(strValue);
          }
          // In previous versions of the systemCrypto (prior to February 2023), encrypt took a uint8Array
          return baseCrypto.encrypt(value);
        },

        decrypt: async (value: Uint8Array) => {
          if (typeof baseCrypto.version === 'undefined') {
            // In previous versions of the systemCrypto (prior to February 2023), the decrypt function returned a Uint8Array
            return baseCrypto.decrypt(value);
          }
          const decrypted = await baseCrypto.decrypt(value);
          if (isBase64.test(decrypted)) {
            return Decoder.fromBase64(decrypted).asBytes;
          }
          // Between June 2022 and October 2022, the systemCrypto returned a string encoded in UTF-8
          const encoder = new TextEncoder();

          return encoder.encode(decrypted);
        },
      }
    : undefined;

  const secretsDb = systemCrypto
    ? await createCustomEncryptedStore(dbName, systemCrypto)
    : await createEncryptedStore(dbName);

  try {
    let key;
    try {
      key = await secretsDb.getSecretValue(keyId);
    } catch (error) {
      await secretsDb.deleteSecretValue(keyId);
      throw new CorruptedKeyError('Could not decrypt key');
    }
    if (key && key.length !== keySize) {
      // If the key size is not correct, we have a corrupted key in the DB. This is unrecoverable.
      await secretsDb.deleteSecretValue(keyId);
      throw new CorruptedKeyError('Invalid key');
    }
    if (!key) {
      key = crypto.getRandomValues(new Uint8Array(keySize));
      await secretsDb.saveSecretValue(keyId, key);
    }
    await secretsDb?.close();
    return {key, deleteKey: () => secretsDb.deleteSecretValue(keyId)};
  } catch (error) {
    await secretsDb?.close();
    throw error;
  }
}
