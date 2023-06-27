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

type Payload =
  | {type: 'zip'; files: Record<string, ArrayBuffer | string>; password?: string}
  | {type: 'unzip'; bytes: ArrayBuffer; password?: string};

export async function handleZipEvent(payload: Payload) {
  const zip = new JSZip();
  const password = payload.password;
  switch (payload.type) {
    case 'zip':
      for (const [filename, file] of Object.entries(payload.files)) {
        zip.file(filename, file, {binary: true});
      }

      const OriginalData = await zip.generateAsync({compression: 'DEFLATE', type: 'uint8array'});

      if (password) {
        // Encrypt the ZIP archive using the provided password
        const encryptedData = await encryptData(OriginalData, password);
        // console.log('encryptedData', OriginalData, encryptedData);
        return encryptedData;
      }
      // console.log('array', OriginalData.length);
      return OriginalData;

    case 'unzip':
      let decryptedBytes: Uint8Array;
      if (password) {
        // Decrypt the ZIP archive using the provided password
        const payloadBytes = new Uint8Array(payload.bytes);
        decryptedBytes = await decryptData(payloadBytes, password);
      } else {
        decryptedBytes = new Uint8Array(payload.bytes);
      }
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

async function encryptData(data: Uint8Array, password: string): Promise<Uint8Array> {
  // Derive the encryption key from the password using a suitable key derivation algorithm
  const encoder = new TextEncoder();
  const encodedPassword = encoder.encode(password);
  const keyMaterial = await crypto.subtle.importKey('raw', encodedPassword, 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(16), // Provide the actual salt to be used during encryption
      iterations: 100000, // Provide the desired iteration count
      hash: {name: 'SHA-256'},
    },
    keyMaterial,
    {name: 'AES-GCM', length: 256},
    false,
    ['encrypt'],
  );

  // Encrypt the data using the derived key
  const encryptedData = await crypto.subtle.encrypt(
    {name: 'AES-GCM', iv: new Uint8Array(12)}, // Provide the actual initialization vector (IV) to be used during encryption
    key,
    data,
  );

  return new Uint8Array(encryptedData);
}

async function decryptData(encryptedData: Uint8Array, password: string): Promise<Uint8Array> {
  // Derive the encryption key from the password using a suitable key derivation algorithm
  const encoder = new TextEncoder();
  const encodedPassword = encoder.encode(password);
  const keyMaterial = await crypto.subtle.importKey('raw', encodedPassword, 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(16), // Provide the actual salt used during encryption
      iterations: 100000, // Provide the actual iteration count used during encryption
      hash: {name: 'SHA-256'},
    },
    keyMaterial,
    {name: 'AES-GCM', length: 256},
    false,
    ['decrypt'],
  );

  // Decrypt the data using the derived key
  const decryptedData = await crypto.subtle.decrypt(
    {name: 'AES-GCM', iv: new Uint8Array(12)}, // Provide the actual initialization vector (IV) used during encryption
    key,
    encryptedData,
  );

  return new Uint8Array(decryptedData);
}

self.addEventListener('message', async (event: MessageEvent<Payload>) => {
  try {
    // const password = prompt('Enter the password for encryption (leave blank for no encryption):');
    const result = await handleZipEvent(event.data);
    self.postMessage(result);
  } catch (error) {
    self.postMessage({error: error.message});
  }
});
