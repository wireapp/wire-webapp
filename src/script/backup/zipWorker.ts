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

import CryptoJS from 'crypto-js';
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

      const array = await zip.generateAsync({compression: 'DEFLATE', type: 'uint8array'});

      if (password) {
        // Encrypt the ZIP archive using the provided password
        const encryptedData = encryptData(array, password);
        return encryptedData;
      }

      return array;

    case 'unzip':
      let decryptedBytes: Uint8Array;
      if (password) {
        // Decrypt the ZIP archive using the provided password
        decryptedBytes = decryptData(payload.bytes, password);
      } else {
        decryptedBytes = new Uint8Array(payload.bytes);
      }
      //console.log('decryptedBytes', decryptedBytes);
      const archive = await JSZip.loadAsync(decryptedBytes)
        .then(zip => {
          // console.log('zip', zip);
        })
        .catch(err => {
          //  console.log('err-here', err);
        });
      const files: Record<string, Uint8Array> = {};

      for (const fileName in archive.files) {
        files[fileName] = await archive.files[fileName].async('uint8array');
      }

      return files;
  }
}

function encryptData(data: Uint8Array, password: string): Uint8Array {
  const wordArray = CryptoJS.lib.WordArray.create(data);
  const encrypted = CryptoJS.AES.encrypt(wordArray, password);
  const ciphertext = CryptoJS.enc.Base64.parse(encrypted.toString());
  return new Uint8Array(ciphertext.words);
}

function decryptData(encryptedData: Uint8Array, password: string): Uint8Array {
  const ciphertext = CryptoJS.lib.WordArray.create(encryptedData);
  const encrypted = CryptoJS.enc.Base64.stringify(ciphertext);
  const decrypted = CryptoJS.AES.decrypt(encrypted, password);
  return new Uint8Array(decrypted.words);
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
