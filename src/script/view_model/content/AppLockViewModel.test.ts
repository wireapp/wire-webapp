/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import ko from 'knockout';

import type {ClientRepository} from '../../client/ClientRepository';
import type {ClientService} from '../../client/ClientService';
import {Config, Configuration} from '../../Config';
import type {User} from '../../entity/User';
import {APPLOCK_STATE, AppLockViewModel} from './AppLockViewModel';

require('src/script/util/test/mock/LocalStorageMock');

// https://github.com/jedisct1/libsodium.js/issues/235
jest.mock('libsodium-wrappers-sumo', () => ({
  crypto_pwhash_str: (value: string) => value,
  crypto_pwhash_str_verify: (value1: string, value2: string) => value1 === value2,
  ready: Promise.resolve,
}));

type Writable<T> = {
  -readonly [K in keyof T]: T[K];
};

type WriteableConfig = Writable<Configuration>;

const writeableConfig: WriteableConfig = Config.getConfig();

describe('AppLockViewModel', () => {
  const getAppLock = () =>
    new AppLockViewModel(
      ({
        clientService: ({
          deleteClient: (clientId: string, password: string) => Promise.resolve(),
        } as unknown) as ClientService,
        currentClient: ko.observable({id: 'clientId'}),
      } as unknown) as ClientRepository,
      ko.observable(({id: 'userID'} as unknown) as User),
    );
  const originalFeature = writeableConfig.FEATURE;
  beforeEach(() => {
    writeableConfig.FEATURE = {...writeableConfig.FEATURE};
    document.body.innerHTML = '<div id="app"></div><div id="applock"></div>';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    writeableConfig.FEATURE = originalFeature;
  });

  describe('constructor', () => {
    it('does not shows up if no valid timeout is set', () => {
      const appLock = getAppLock();

      expect(appLock.state()).toBe(APPLOCK_STATE.NONE);
    });

    it('shows the locked modal on start if timeout is set as flag and a code is stored', () => {
      writeableConfig.FEATURE = {...writeableConfig.FEATURE, APPLOCK_UNFOCUS_TIMEOUT: 10};
      spyOn(window.localStorage, 'getItem').and.returnValue('savedCode');
      const appLock = getAppLock();

      expect(appLock.state()).toBe(APPLOCK_STATE.LOCKED);
    });

    it('shows the locked modal on start if timeout is set as query parameter and a code is stored', () => {
      window.history.pushState({}, '', '?applock_unfocus_timeout=10');
      spyOn(window.localStorage, 'getItem').and.returnValue('savedCode');
      const appLock = getAppLock();

      expect(appLock.state()).toBe(APPLOCK_STATE.LOCKED);
      window.history.pushState({}, '', '');
    });
  });

  describe('unlock', () => {
    it('stores the passphrase, respects the timeout and unlocks', async () => {
      jest.useFakeTimers();
      writeableConfig.FEATURE = {...writeableConfig.FEATURE, APPLOCK_UNFOCUS_TIMEOUT: 10};
      let storedCode: string;
      const passphrase = 'abcABC123!';
      jest.spyOn(window.localStorage, 'setItem').mockImplementation((_, code) => {
        storedCode = code;
      });
      jest.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
        return storedCode;
      });
      const appLock = getAppLock();
      appLock.isVisible.subscribe(isVisible => {
        if (!isVisible) {
          appLock.onClosed();
        }
      });

      expect(appLock.state()).toBe(APPLOCK_STATE.SETUP);
      appLock.setupPassphrase(passphrase);
      appLock.setupPassphraseRepeat(passphrase);
      await appLock.onSetCode();

      expect(appLock.state()).toBe(APPLOCK_STATE.NONE);
      expect(storedCode).toBeDefined();
      window.dispatchEvent(new Event('blur'));
      jest.advanceTimersByTime(5000);

      expect(appLock.state()).toBe(APPLOCK_STATE.NONE);
      jest.advanceTimersByTime(6000);

      expect(appLock.state()).toBe(APPLOCK_STATE.LOCKED);
      document.body.innerHTML += `<form id="unlock"><input id="pass" value="${passphrase}"/></form>`;
      const unlockForm = ([document.querySelector('#pass')] as unknown) as HTMLFormElement;
      await appLock.onUnlock(unlockForm);

      expect(appLock.state()).toBe(APPLOCK_STATE.NONE);
      jest.useRealTimers();
    });
  });
});
