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
 * AES-GCM encryption/decryption for conversation description metadata.
 *
 * Wire format (matching iOS zmEncryptPrefixingIV / zmDecryptPrefixedIV):
 *   [12-byte IV][ciphertext+tag bytes]
 * The combined blob is base64-encoded for transport.
 *
 * Key: 32-byte secret derived from MLS epoch via exportSecretKey(conversationId, 32).
 */

const IV_LENGTH = 12;
const ALGORITHM = 'AES-GCM';

async function importKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', rawKey, ALGORITHM, false, ['encrypt', 'decrypt']);
}

/**
 * Encrypt a UTF-8 description string.
 *
 * @param plaintext - The description text
 * @param secret - 32-byte MLS-derived secret
 * @returns Base64-encoded blob: [IV][ciphertext]
 */
export async function encryptDescription(plaintext: string, secret: Uint8Array): Promise<string> {
  const key = await importKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt({name: ALGORITHM, iv}, key, encoded);

  // Prepend IV to ciphertext (matching iOS wire format)
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a base64-encoded description blob.
 *
 * @param ciphertextBase64 - Base64-encoded blob: [IV][ciphertext]
 * @param secret - 32-byte MLS-derived secret (same epoch as encryption)
 * @returns The decrypted plaintext string
 */
export async function decryptDescription(ciphertextBase64: string, secret: Uint8Array): Promise<string> {
  const key = await importKey(secret);
  const combined = Uint8Array.from(atob(ciphertextBase64), c => c.charCodeAt(0));

  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt({name: ALGORITHM, iv}, key, ciphertext);

  return new TextDecoder().decode(decrypted);
}
