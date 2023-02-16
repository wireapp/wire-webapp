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

import {SecretCrypto} from '../../../../mls/types';

const isBase64 = /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/;
const KEY_SIZE = 16;

export class CorruptedKeyError extends Error {}

type GeneratedKey = {
  key: Uint8Array;
  deleteKey: () => Promise<void>;
};

export async function generateSecretKey({
  dbName,
  systemCrypto: baseCrypto,
}: {
  dbName: string;
  systemCrypto?: SecretCrypto;
}): Promise<GeneratedKey> {
  const coreCryptoKeyId = 'corecrypto-key';

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
      key = await secretsDb.getsecretValue(coreCryptoKeyId);
    } catch (error) {
      throw new CorruptedKeyError('Could not decrypt key');
    }
    if (key && key.length !== KEY_SIZE) {
      // If the key size is not correct, we have a corrupted key in the DB. This is unrecoverable.
      throw new CorruptedKeyError('Invalid key');
    }
    if (!key) {
      key = crypto.getRandomValues(new Uint8Array(KEY_SIZE));
      await secretsDb.saveSecretValue(coreCryptoKeyId, key);
    }
    await secretsDb?.close();
    return {key, deleteKey: () => secretsDb.wipe()};
  } catch (error) {
    await secretsDb?.close();
    throw error;
  }
}
