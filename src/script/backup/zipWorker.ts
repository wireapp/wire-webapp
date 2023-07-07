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

import JSZip from 'jszip';
import sodium from 'libsodium-wrappers';

type Payload =
  | {type: 'zip'; files: Record<string, ArrayBuffer | string>; encrytionKey?: Uint8Array}
  | {type: 'unzip'; bytes: ArrayBuffer; encrytionKey?: Uint8Array};

export async function handleZipEvent(payload: Payload) {
  const zip = new JSZip();
  const encrytionKey = payload.encrytionKey;
  console.log('encrytionKey', encrytionKey);
  switch (payload.type) {
    case 'zip':
      for (const [filename, file] of Object.entries(payload.files)) {
        zip.file(filename, file, {binary: true});
      }

      const OriginalData = await zip.generateAsync({compression: 'DEFLATE', type: 'uint8array'});

      if (encrytionKey) {
        // Encrypt the ZIP archive using the provided encrytionKey
        const encryptedData = await encryptFile(OriginalData, encrytionKey);
        console.log('OriginalData', OriginalData);
        console.log('encryptedData', encryptedData);
        return encryptedData;
      }
      return OriginalData;

    case 'unzip':
      let decryptedBytes: Uint8Array;
      if (!!encrytionKey) {
        // Decrypt the ZIP archive using the provided encrytionKey
        const payloadBytes = new Uint8Array(payload.bytes);
        decryptedBytes = await decryptFile(payloadBytes, encrytionKey);
      } else {
        decryptedBytes = new Uint8Array(payload.bytes);
      }
      console.log('decryptedBytes', decryptedBytes);
      // const isVerificationSuccessful = JSON.stringify(decryptedBytes) === JSON.stringify(originalData);
      // console.log('Verification successful:', isVerificationSuccessful);
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

  // Create a random nonce
  const nonce = sodium.randombytes_buf(sodium.crypto_secretstream_xchacha20poly1305_ABYTES);

  // Create the encryption state
  const stateAndHeader = sodium.crypto_secretstream_xchacha20poly1305_init_push(encryptionKey);
  const state = stateAndHeader.state;

  // Encrypt the file content
  const encryptedFile = sodium.crypto_secretstream_xchacha20poly1305_push(
    state,
    fileContent,
    null,
    sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL,
  );

  // Verify the positions
  // Combine the nonce and encrypted content
  const encryptedData = new Uint8Array(nonce.length + encryptedFile.length);
  encryptedData.set(nonce);
  encryptedData.set(encryptedFile, nonce.length);
  return encryptedData;
}

// Decrypt a file
async function decryptFile(encryptedDataSource: Uint8Array, encryptionKey: Uint8Array) {
  await sodium.ready;
  // Split the backupHeader, nonce, header, and encrypted content
  const backupHeaderLength = 63;
  const nonceLength = sodium.crypto_secretstream_xchacha20poly1305_ABYTES;
  const backupHeader = encryptedDataSource.slice(0, sodium.crypto_secretstream_xchacha20poly1305_HEADERBYTES);
  const encryptedContent = encryptedDataSource.slice(backupHeaderLength + nonceLength + 1);
  console.log('decryptFile-encryptedContent', encryptedContent);
  // Create the decryption state

  const state = sodium.crypto_secretstream_xchacha20poly1305_init_pull(backupHeader, encryptionKey);

  // Decrypt the file content
  const decryptedFile = sodium.crypto_secretstream_xchacha20poly1305_pull(state, encryptedContent);

  return decryptedFile.message;
}

self.addEventListener('message', async (event: MessageEvent<Payload>) => {
  try {
    const result = await handleZipEvent(event.data);
    self.postMessage(result);
  } catch (error) {
    self.postMessage({error: error.message});
  }
});
