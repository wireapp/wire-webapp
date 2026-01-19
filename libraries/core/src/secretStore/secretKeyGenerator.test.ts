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

import {EncryptedStore, createCustomEncryptedStore, createEncryptedStore} from './encryptedStore';
import {generateSecretKey} from './secretKeyGenerator';

const customCrypto = {
  encrypt: async (value: Uint8Array) => value,
  decrypt: async (value: Uint8Array) => value,
  version: 1,
} as const;

const dbName = 'test';
const keyId = 'test-key';

describe('SecretKeyGenerator', () => {
  let secretsDb: EncryptedStore<any>;
  afterEach(async () => {
    await secretsDb?.wipe();
  });

  it('generates store and deletes a secret key stored in indexeddb', async () => {
    secretsDb = await createEncryptedStore(dbName);
    const {key: secretKey} = await generateSecretKey({secretsDb, keyId});
    expect(secretKey).toBeDefined();

    const {key: secretKey2} = await generateSecretKey({secretsDb, keyId});
    expect(secretKey).toEqual(secretKey2);
  });

  it('deletes the key from DB', async () => {
    secretsDb = await createEncryptedStore(dbName);
    const {key, deleteKey} = await generateSecretKey({secretsDb, keyId});

    await deleteKey();
    const {key: secondKey} = await generateSecretKey({secretsDb, keyId});

    expect(key).not.toEqual(secondKey);
  });

  it('creates a new key from a custom encryption store', async () => {
    secretsDb = await createCustomEncryptedStore(dbName, customCrypto);
    const {key} = await generateSecretKey({secretsDb, keyId});

    expect(key).toBeDefined();

    const {key: key2} = await generateSecretKey({secretsDb, keyId});
    expect(key2).toEqual(key);
  });
});
