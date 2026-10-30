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

import {entropyToMnemonic} from '@scure/bip39';
import {wordlist} from '@scure/bip39/wordlists/english';

import {downloadBlob} from 'Util/util';

import {
  BACKUP_KEY_FILE_NAME,
  BACKUP_KEY_WORD_COUNT,
  downloadBackupKey,
  generateBackupKey,
  isValidBackupKey,
} from './BackupKey';

jest.mock('Util/util', () => ({
  downloadBlob: jest.fn(),
}));

const readBlob = (blob: Blob) =>
  new Promise<string>(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsText(blob);
  });

describe('BackupKey', () => {
  describe('generateBackupKey', () => {
    it('generates a valid 24-word lowercase BIP39 English mnemonic', () => {
      const key = generateBackupKey();
      const words = key.split(' ');

      expect(words).toHaveLength(BACKUP_KEY_WORD_COUNT);
      words.forEach(word => {
        expect(wordlist).toContain(word);
      });
      expect(key).toBe(key.toLowerCase());
      expect(isValidBackupKey(key)).toBe(true);
    });

    it('generates a different key each time', () => {
      expect(generateBackupKey()).not.toBe(generateBackupKey());
    });
  });

  it('uses the standard BIP39 encoding (same as Android)', () => {
    // Standard BIP39 test vector for 256 bits of zero entropy
    const expected = `${Array(23).fill('abandon').join(' ')} art`;

    expect(entropyToMnemonic(new Uint8Array(32), wordlist)).toBe(expected);
    expect(isValidBackupKey(expected)).toBe(true);
  });

  describe('isValidBackupKey', () => {
    it('accepts upper case and extra whitespace', () => {
      const key = generateBackupKey();
      const messyKey = `  ${key.toUpperCase().split(' ').join('   ')}\n`;

      expect(isValidBackupKey(messyKey)).toBe(true);
    });

    it('rejects a 12-word mnemonic', () => {
      const twelveWords = entropyToMnemonic(new Uint8Array(16), wordlist);

      expect(isValidBackupKey(twelveWords)).toBe(false);
    });

    it('rejects a wrong checksum', () => {
      expect(isValidBackupKey(Array(24).fill('abandon').join(' '))).toBe(false);
    });

    it('rejects unknown words', () => {
      const words = generateBackupKey().split(' ');
      words[0] = 'notaword';

      expect(isValidBackupKey(words.join(' '))).toBe(false);
    });
  });

  it('downloads a key file that contains only the mnemonic', async () => {
    const key = generateBackupKey();

    downloadBackupKey(key);

    const [blob, fileName] = (downloadBlob as jest.Mock).mock.calls[0];
    expect(fileName).toBe(BACKUP_KEY_FILE_NAME);
    expect(fileName).toBe('wire-backup-key.txt');
    expect(blob.type).toContain('text/plain');
    expect(await readBlob(blob)).toBe(key);
  });
});
