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

import {EncryptedStore} from './encryptedStore';

export class CorruptedKeyError extends Error {}

export type GeneratedKey = {
  key: Uint8Array;
  deleteKey: () => Promise<void>;
  freshlyGenerated: boolean;
};

/**
 * Will generate (or retrieve) a secret key from the database.
 */
export async function generateSecretKey({
  keyId,
  keySize = 16,
  secretsDb,
}: {
  /** the ID of the key to generate (if the ID already exists, then the generated key will be returned) */
  keyId: string;
  /** size of the key to generate */
  keySize?: number;
  /** name of the database that will hold the secrets */
  secretsDb: EncryptedStore<any>;
}): Promise<GeneratedKey> {
  let freshlyGenerated = false;
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
      key = await crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: keySize * 8,
        },
        true,
        ['encrypt', 'decrypt'],
      );
      key = new Uint8Array(await crypto.subtle.exportKey('raw', key));
      await secretsDb.saveSecretValue(keyId, key);
      freshlyGenerated = true;
    }
    return {key, deleteKey: () => secretsDb.deleteSecretValue(keyId), freshlyGenerated};
  } catch (error) {
    throw error;
  }
}
