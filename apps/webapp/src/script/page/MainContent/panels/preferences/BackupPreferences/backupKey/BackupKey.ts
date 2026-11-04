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

import {generateMnemonic, validateMnemonic} from '@scure/bip39';
import {wordlist} from '@scure/bip39/wordlists/english';

import {Config} from 'src/script/Config';
import {copyText} from 'Util/ClipboardUtil';
import {t} from 'Util/LocalizerUtil';
import {downloadBlob} from 'Util/util';

/**
 * Backup encryption key: a standard BIP39 English mnemonic with 256 bits of entropy (24 words).
 * Same format as the Android client, so keys can be used across platforms.
 */
export const BACKUP_KEY_STRENGTH_BITS = 256;
export const BACKUP_KEY_WORD_COUNT = 24;
export const BACKUP_KEY_FILE_NAME = 'wire-backup-key.txt';

const normalizeBackupKey = (input: string) => input.trim().toLowerCase().split(/\s+/).join(' ');

export const generateBackupKey = (): string => generateMnemonic(wordlist, BACKUP_KEY_STRENGTH_BITS);

export const isValidBackupKey = (input: string): boolean => {
  const key = normalizeBackupKey(input);
  return key.split(' ').length === BACKUP_KEY_WORD_COUNT && validateMnemonic(key, wordlist);
};

export const copyBackupKey = (key: string): Promise<void> => copyText(key);

/** The key file contains only the mnemonic, without a trailing newline (same as Android). */
export const downloadBackupKey = (key: string): number =>
  downloadBlob(new Blob([key], {type: 'text/plain;charset=utf-8'}), BACKUP_KEY_FILE_NAME);

export interface BackupKeyAccount {
  email?: string;
  username?: string;
  name?: string;
}

/**
 * Title/id of the password manager entry, e.g. "Wire backup key · kim@example.com" (same as Android).
 * Must differ from the account login, otherwise browsers offer to update the account password.
 */
export const getBackupKeyCredentialId = ({email, username, name}: BackupKeyAccount): string => {
  const brandName = Config.getConfig().BRAND_NAME;
  const account = email || (username ? `@${username}` : '') || name;
  return account
    ? t('preferencesBackupKeyCredentialId', {account, brandName})
    : t('preferencesBackupKeyCredentialIdFallback', {brandName});
};
