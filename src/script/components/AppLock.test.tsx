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
import TestPage from 'Util/test/TestPage';

import type {ClientRepository} from '../client/ClientRepository';
import type {ClientService} from '../client/ClientService';
import {Config, Configuration} from '../Config';
import type {User} from '../entity/User';
import AppLock, {AppLockProps} from './AppLock';
import {act} from '@testing-library/react';

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

class AppLockPage extends TestPage<AppLockProps> {
  constructor(props?: AppLockProps) {
    super(AppLock.AppLock, props);
    act(() => AppLock.init(props.clientRepository, props.selfUser));
  }
}
describe('AppLock', () => {
  const initAppLock = () =>
    new AppLockPage({
      clientRepository: ({
        clientService: ({
          deleteClient: (clientId: string, password: string) => Promise.resolve(),
        } as unknown) as ClientService,
        currentClient: ko.observable({id: 'clientId'}),
      } as unknown) as ClientRepository,
      selfUser: ({id: 'userID'} as unknown) as User,
    });

  const originalFeature = writeableConfig.FEATURE;
  beforeEach(() => {
    writeableConfig.FEATURE = {...writeableConfig.FEATURE};
    document.body.innerHTML = '<div id="wire-main"><div id="app"></div><div id="applock"></div></div>';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    writeableConfig.FEATURE = originalFeature;
  });

  describe('constructor', () => {
    it('does not shows up if no valid timeout is set', () => {
      writeableConfig.FEATURE = {
        ...writeableConfig.FEATURE,
        APPLOCK_SCHEDULED_TIMEOUT: undefined,
        APPLOCK_UNFOCUS_TIMEOUT: undefined,
      };
      initAppLock();
      const appLockModal = document.querySelector('[data-uie-name=applock-modal]') as HTMLDivElement;
      expect(appLockModal.style.display).toBe('none');
    });
    it.skip('shows the locked modal on start if timeout is set as flag and a code is stored', () => {
      writeableConfig.FEATURE = {...writeableConfig.FEATURE, APPLOCK_UNFOCUS_TIMEOUT: 10};
      spyOn(window.localStorage, 'getItem').and.returnValue('savedCode');
      initAppLock();
      const appLockModal = document.querySelector('#applock [data-uie-name=applock-modal]') as HTMLDivElement;
      expect(appLockModal.style.display).toBe('flex');
    });
    it.skip('shows the locked modal on start if timeout is set as query parameter and a code is stored', () => {
      writeableConfig.FEATURE = {
        ...writeableConfig.FEATURE,
        APPLOCK_SCHEDULED_TIMEOUT: undefined,
        APPLOCK_UNFOCUS_TIMEOUT: undefined,
      };
      window.history.pushState({}, '', '?applock_unfocus_timeout=10');
      spyOn(window.localStorage, 'getItem').and.returnValue('savedCode');
      initAppLock();
      const appLockModal = document.querySelector('[data-uie-name=applock-modal]') as HTMLDivElement;
      expect(appLockModal.style.display).toBe('flex');
    });
  });

  describe('unlock', () => {
    // TODO: Figure out the steps to hide the modal after submitting the passphrase.
    it.skip('stores the passphrase, respects the timeout and unlocks', async () => {
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
      const page = initAppLock();
      const setupInput = page.get('input[data-uie-name="input-applock-set-a"]');
      expect(setupInput).toBeDefined();
      setupInput.simulate('change', {target: {value: passphrase}});
      await page.get('form').simulate('submit');
      expect(storedCode).toBeDefined();
      const appLockModal = document.querySelector('[data-uie-name=applock-modal]') as HTMLDivElement;
      expect(appLockModal.style.display).toBe('none');
      window.dispatchEvent(new Event('blur'));
      jest.advanceTimersByTime(5000);
      expect(appLockModal.style.display).toBe('none');
      jest.advanceTimersByTime(6000);
      expect(appLockModal.style.display).toBe('flex');
    });
  });
});
