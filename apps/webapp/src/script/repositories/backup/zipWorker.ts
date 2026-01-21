/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import JSZip from 'jszip';
import sodium from 'libsodium-wrappers-sumo';

import {ImportError} from './Error';

type Payload =
  | {type: 'zip'; files: Record<string, ArrayBuffer | string>; encrytionKey?: Uint8Array}
  | {type: 'unzip'; bytes: ArrayBuffer; encrytionKey?: Uint8Array; headerLength?: number};

export async function handleZipEvent(payload: Payload) {
  const zip = new JSZip();
  const encrytionKey = payload.encrytionKey;
  switch (payload.type) {
    case 'zip':
      for (const [filename, file] of Object.entries(payload.files)) {
        zip.file(filename, file, {binary: true});
      }

      const OriginalData = await zip.generateAsync({compression: 'DEFLATE', type: 'uint8array'});

      if (encrytionKey) {
        // Encrypt the ZIP archive using the provided encrytionKey
        const encryptedData = await encryptFile(OriginalData, encrytionKey);
        return encryptedData;
      }
      return OriginalData;

    case 'unzip':
      let decryptedBytes;

      if (!!encrytionKey) {
        // Decrypt the ZIP archive using the provided encrytionKey
        const payloadBytes = new Uint8Array(payload.bytes);
        const headerLength = payload.headerLength ? payload.headerLength : 0;
        try {
          decryptedBytes = await decryptFile(payloadBytes, encrytionKey, headerLength);
        } catch (error) {
          // Handle decryption failure
          throw new ImportError(error.message);
        }
      } else {
        decryptedBytes = payload.bytes;
      }
      const archive = await JSZip.loadAsync(decryptedBytes);
      const files: Record<string, Uint8Array> = {};

      for (const fileName in archive.files) {
        files[fileName] = await archive.files[fileName].async('uint8array');
      }

      return files;
  }
}

// Encrypt a file
async function encryptFile(fileContent: Uint8Array, encryptionKey: Uint8Array): Promise<Uint8Array> {
  await sodium.ready;

  const headerBytes = sodium.crypto_secretstream_xchacha20poly1305_HEADERBYTES;
  const stateAndHeader = sodium.crypto_secretstream_xchacha20poly1305_init_push(encryptionKey);
  const {state, header} = stateAndHeader;

  const encryptedFile = sodium.crypto_secretstream_xchacha20poly1305_push(
    state,
    fileContent,
    null,
    sodium.crypto_secretstream_xchacha20poly1305_TAG_MESSAGE,
  );
  const encrypted = new Uint8Array(headerBytes + encryptedFile.length);

  encrypted.set(header);
  encrypted.set(encryptedFile, headerBytes);

  return encrypted;
}

// Decrypt a file
async function decryptFile(encryptedDataSource: Uint8Array, encryptionKey: Uint8Array, headerLength: number) {
  await sodium.ready;

  const metaDataHeader = headerLength;
  const headerBytes = sodium.crypto_secretstream_xchacha20poly1305_HEADERBYTES;
  const header = encryptedDataSource.slice(metaDataHeader, metaDataHeader + headerBytes);
  const state = sodium.crypto_secretstream_xchacha20poly1305_init_pull(header, encryptionKey);
  const encryptedContent = encryptedDataSource.slice(headerBytes + metaDataHeader);
  const decrypted = sodium.crypto_secretstream_xchacha20poly1305_pull(state, encryptedContent);

  if (!decrypted) {
    throw new ImportError('WRONG_PASSWORD');
  }

  return decrypted.message;
}
self.addEventListener('message', async (event: MessageEvent<Payload>) => {
  try {
    const result = await handleZipEvent(event.data);
    self.postMessage(result);
  } catch (error) {
    self.postMessage({error: error.message});
  }
});
