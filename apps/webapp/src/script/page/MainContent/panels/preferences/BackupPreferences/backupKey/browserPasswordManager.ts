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

import {Runtime} from '@wireapp/commons';

import {Config} from 'src/script/Config';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';

// `PasswordCredential` is Chromium-only and not part of TypeScript's DOM lib
interface PasswordCredentialData {
  id: string;
  password: string;
  name?: string;
}
type PasswordCredentialConstructor = new (data: PasswordCredentialData) => Credential;

const logger = getLogger('BrowserPasswordManager');

const getPasswordCredential = (): PasswordCredentialConstructor | undefined =>
  (window as unknown as {PasswordCredential?: PasswordCredentialConstructor}).PasswordCredential;

/**
 * Whether the browser's own password manager can be used (Chrome / Edge / Opera, via the Credential Management API).
 * Not available in Firefox, Safari and the desktop app (Electron has no password manager).
 */
export const isBrowserPasswordManagerAvailable = (): boolean =>
  !Runtime.isDesktopApp() && !!getPasswordCredential() && typeof navigator.credentials?.store === 'function';

/**
 * Asks the browser to save the key as a password entry.
 * The browser shows its own prompt; the promise resolving does not mean the user accepted it.
 */
export const saveToBrowserPasswordManager = async (id: string, key: string): Promise<void> => {
  const PasswordCredential = getPasswordCredential();
  if (!PasswordCredential) {
    throw new Error('PasswordCredential is not supported');
  }

  try {
    const credential = new PasswordCredential({
      id,
      password: key,
      name: t('preferencesBackupKeyCredentialIdFallback', {brandName: Config.getConfig().BRAND_NAME}),
    });
    await navigator.credentials.store(credential);
  } catch (error) {
    // Only log the error type, never the credential itself
    logger.warn(`Failed to store backup key in browser password manager: ${(error as Error)?.name}`);
    throw error;
  }
};
