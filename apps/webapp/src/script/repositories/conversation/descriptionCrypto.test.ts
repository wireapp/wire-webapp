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

import {encryptDescription, decryptDescription} from './descriptionCrypto';

describe('descriptionCrypto', () => {
  const generateTestKey = async (): Promise<Uint8Array> => {
    const key = new Uint8Array(32);
    crypto.getRandomValues(key);
    return key;
  };

  it('encrypts and decrypts a description round-trip', async () => {
    const secret = await generateTestKey();
    const plaintext = 'Team channel for discussions';

    const ciphertextBase64 = await encryptDescription(plaintext, secret);
    const decrypted = await decryptDescription(ciphertextBase64, secret);

    expect(decrypted).toBe(plaintext);
  });

  it('produces different ciphertext for same plaintext (random IV)', async () => {
    const secret = await generateTestKey();
    const plaintext = 'Same text';

    const a = await encryptDescription(plaintext, secret);
    const b = await encryptDescription(plaintext, secret);

    expect(a).not.toBe(b);
  });

  it('fails to decrypt with wrong key', async () => {
    const secret1 = await generateTestKey();
    const secret2 = await generateTestKey();
    const plaintext = 'Secret text';

    const ciphertextBase64 = await encryptDescription(plaintext, secret1);

    await expect(decryptDescription(ciphertextBase64, secret2)).rejects.toThrow();
  });

  it('handles empty string', async () => {
    const secret = await generateTestKey();

    const ciphertextBase64 = await encryptDescription('', secret);
    const decrypted = await decryptDescription(ciphertextBase64, secret);

    expect(decrypted).toBe('');
  });

  it('handles unicode text', async () => {
    const secret = await generateTestKey();
    const plaintext = '日本語テスト 🎉 émojis';

    const ciphertextBase64 = await encryptDescription(plaintext, secret);
    const decrypted = await decryptDescription(ciphertextBase64, secret);

    expect(decrypted).toBe(plaintext);
  });

  it('produces base64 AES-CBC output with a random encrypted prefix block', async () => {
    const secret = await generateTestKey();
    const ciphertextBase64 = await encryptDescription('test', secret);

    // Should be valid base64
    const raw = Uint8Array.from(atob(ciphertextBase64), c => c.charCodeAt(0));

    // AES-CBC ciphertext is block-aligned and includes one random prefix block
    expect(raw.length).toBeGreaterThanOrEqual(32);
    expect(raw.length % 16).toBe(0);
  });
});
