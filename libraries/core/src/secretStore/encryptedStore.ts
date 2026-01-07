/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {DBSchema, IDBPDatabase, openDB, deleteDB} from 'idb';

import {toBufferSource} from '../util/bufferUtils';

interface DefaultEncryptedPayload {
  iv: Uint8Array | ArrayBuffer;
  value: Uint8Array | ArrayBuffer;
}
interface EncryptedDB<EncryptedPayload> extends DBSchema {
  key: {
    key: string;
    value: CryptoKey;
  };
  secrets: {
    key: string;
    value: EncryptedPayload;
  };
}

type DecryptFn<EncryptedPayload> = (payload: EncryptedPayload) => Promise<Uint8Array>;
type EncryptFn<EncryptedPayload> = (value: Uint8Array) => Promise<EncryptedPayload>;

type EncryptedStoreConfig<EncryptedPayload> = {
  encrypt: EncryptFn<EncryptedPayload>;
  decrypt: DecryptFn<EncryptedPayload>;
};

export class EncryptedStore<EncryptedPayload = unknown> {
  readonly #decrypt: DecryptFn<EncryptedPayload>;
  readonly #encrypt: EncryptFn<EncryptedPayload>;
  constructor(
    private readonly db: IDBPDatabase<EncryptedDB<EncryptedPayload>>,
    {encrypt, decrypt}: EncryptedStoreConfig<EncryptedPayload>,
  ) {
    this.#encrypt = encrypt;
    this.#decrypt = decrypt;
  }

  async saveSecretValue(primaryKey: string, value: Uint8Array) {
    const encrypted = await this.#encrypt(value);
    await this.db.put('secrets', encrypted, primaryKey);
  }

  async getSecretValue(primaryKey: string) {
    const result = await this.db.get('secrets', primaryKey);
    if (!result) {
      return undefined;
    }
    return this.#decrypt(result);
  }

  async deleteSecretValue(primaryKey: string) {
    const instance = await openDB(this.db.name, this.db.version);
    await instance.delete('secrets', primaryKey);
    instance.close();
  }

  close() {
    this.db.close();
  }

  async wipe() {
    this.close();
    await deleteDB(this.db.name);
  }
}

async function generateKey() {
  return crypto.subtle.generateKey(
    {name: 'AES-GCM', length: 256},
    false, //whether the key is extractable (i.e. can be used in exportKey)
    ['encrypt', 'decrypt'],
  );
}

async function defaultDecrypt({value, iv}: DefaultEncryptedPayload, key: CryptoKey): Promise<Uint8Array> {
  const ivBuffer = iv instanceof Uint8Array ? toBufferSource(iv) : iv;
  const valueBuffer = value instanceof Uint8Array ? toBufferSource(value) : value;
  const decrypted = await crypto.subtle.decrypt({name: 'AES-GCM', iv: ivBuffer}, key, valueBuffer);
  return new Uint8Array(decrypted);
}

async function defaultEncrypt(data: Uint8Array, key: CryptoKey): Promise<DefaultEncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return {
    iv,
    value: await crypto.subtle.encrypt({name: 'AES-GCM', iv}, key, toBufferSource(data)),
  };
}

/**
 * Will create a database that uses the built in encryption/decryption functions.
 * The master key will be created and stored inside the database
 *
 * @param dbName the name of the database to create
 */
export async function createEncryptedStore(dbName: string): Promise<EncryptedStore<DefaultEncryptedPayload>> {
  const db = await openDB<EncryptedDB<DefaultEncryptedPayload>>(dbName, 1, {
    upgrade: async database => {
      database.createObjectStore('key');
      database.createObjectStore('secrets');
    },
  });

  const keyPrimaryKey = 'dbKey';
  let key = await db.get('key', keyPrimaryKey);
  if (!key) {
    key = await generateKey();
    await db.put('key', key, keyPrimaryKey);
  }
  return new EncryptedStore(db, {
    encrypt: value => defaultEncrypt(value, key as CryptoKey),
    decrypt: payload => defaultDecrypt(payload, key as CryptoKey),
  });
}

/**
 * Will create a database that uses a custom encryption method. It needs the encrypt and decrypt function to be able to process the values stored.
 * It's the responsability of the consumer to store the encryption key
 *
 * @param dbName the name of the database to create
 * @param config contains the encrypt and decrypt methods
 */
export async function createCustomEncryptedStore<EncryptedPayload>(
  dbName: string,
  config: EncryptedStoreConfig<EncryptedPayload>,
): Promise<EncryptedStore<EncryptedPayload>> {
  const db = await openDB<EncryptedDB<EncryptedPayload>>(dbName, 1, {
    upgrade: async database => {
      database.createObjectStore('secrets');
    },
  });

  return new EncryptedStore(db, config);
}
