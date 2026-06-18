/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

/**
 * AES-CBC encryption/decryption for conversation description metadata.
 *
 * Wire format matches iOS `zmEncryptPrefixingIV` / `zmDecryptPrefixedIV`:
 *   AES-256-CBC with PKCS#7 padding and a zero IV.
 *   Plaintext is prefixed with one random AES block before encryption.
 *   Decryption decrypts the full payload and drops the first plaintext block.
 *
 * Despite the iOS method name, the IV is not stored in the payload; randomization
 * comes from encrypting the random first block in CBC mode.
 *
 * Key: 32-byte secret derived from MLS epoch via exportSecretKey(groupId, 32).
 */

const BLOCK_LENGTH = 16;
const ALGORITHM = 'AES-CBC';
const ZERO_IV = new Uint8Array(BLOCK_LENGTH);

async function importKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', rawKey, ALGORITHM, false, ['encrypt', 'decrypt']);
}

/**
 * Encrypt a UTF-8 description string.
 *
 * @param plaintext - The description text
 * @param secret - 32-byte MLS-derived secret
 * @returns Base64-encoded AES-CBC blob compatible with iOS zmEncryptPrefixingIV
 */
export async function encryptDescription(plaintext: string, secret: Uint8Array): Promise<string> {
  const key = await importKey(secret);
  const randomPrefix = crypto.getRandomValues(new Uint8Array(BLOCK_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const prefixedPlaintext = new Uint8Array(BLOCK_LENGTH + encoded.length);
  prefixedPlaintext.set(randomPrefix, 0);
  prefixedPlaintext.set(encoded, BLOCK_LENGTH);

  const ciphertext = await crypto.subtle.encrypt({name: ALGORITHM, iv: ZERO_IV}, key, prefixedPlaintext);

  return btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
}

/**
 * Decrypt a base64-encoded description blob.
 *
 * @param ciphertextBase64 - Base64-encoded AES-CBC blob
 * @param secret - 32-byte MLS-derived secret (same epoch as encryption)
 * @returns The decrypted plaintext string
 */
export async function decryptDescription(ciphertextBase64: string, secret: Uint8Array): Promise<string> {
  const key = await importKey(secret);
  const ciphertext = Uint8Array.from(atob(ciphertextBase64), c => c.charCodeAt(0));

  const decrypted = await crypto.subtle.decrypt({name: ALGORITHM, iv: ZERO_IV}, key, ciphertext);
  const plaintext = new Uint8Array(decrypted).slice(BLOCK_LENGTH);

  return new TextDecoder().decode(plaintext);
}
