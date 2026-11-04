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

import {isBrowserPasswordManagerAvailable, saveToBrowserPasswordManager} from './browserPasswordManager';

class PasswordCredentialStub {
  constructor(public data: {id: string; password: string; name?: string}) {}
}

describe('browserPasswordManager', () => {
  const windowWithCredential = window as unknown as {PasswordCredential?: typeof PasswordCredentialStub};
  const store = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.spyOn(Runtime, 'isDesktopApp').mockReturnValue(false);
    windowWithCredential.PasswordCredential = PasswordCredentialStub;
    Object.defineProperty(navigator, 'credentials', {value: {store}, configurable: true});
    store.mockClear();
  });

  afterEach(() => {
    delete windowWithCredential.PasswordCredential;
    jest.restoreAllMocks();
  });

  describe('isBrowserPasswordManagerAvailable', () => {
    it('is available in browsers supporting PasswordCredential', () => {
      expect(isBrowserPasswordManagerAvailable()).toBe(true);
    });

    it('is not available in the desktop app', () => {
      jest.spyOn(Runtime, 'isDesktopApp').mockReturnValue(true);

      expect(isBrowserPasswordManagerAvailable()).toBe(false);
    });

    it('is not available without PasswordCredential support', () => {
      delete windowWithCredential.PasswordCredential;

      expect(isBrowserPasswordManagerAvailable()).toBe(false);
    });
  });

  it('stores the key as a password credential', async () => {
    await saveToBrowserPasswordManager('Wire backup key · kim@example.com', 'abandon art');

    const [credential] = store.mock.calls[0];
    expect(credential).toBeInstanceOf(PasswordCredentialStub);
    expect(credential.data).toEqual(
      expect.objectContaining({id: 'Wire backup key · kim@example.com', password: 'abandon art'}),
    );
  });

  it('rethrows store failures', async () => {
    store.mockRejectedValueOnce(new Error('NotAllowedError'));

    await expect(saveToBrowserPasswordManager('id', 'key')).rejects.toThrow('NotAllowedError');
  });
});
