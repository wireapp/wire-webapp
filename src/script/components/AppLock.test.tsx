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

import {act} from '@testing-library/react';
import type {TypeUtil} from '@wireapp/commons';
import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';
import ko from 'knockout';
import TestPage from 'Util/test/TestPage';
import type {ClientRepository} from '../client/ClientRepository';
import type {ClientService} from '../client/ClientService';
import {Config, Configuration} from '../Config';
import type {User} from '../entity/User';
import {TeamState} from '../team/TeamState';
import AppLock, {AppLockProps, APPLOCK_STATE} from './AppLock';

require('src/script/util/test/mock/mutationObserverMock');
require('src/script/util/test/mock/LocalStorageMock');

/**
 * Show or not the applock based on:im
 *   - App lock enabled (status)
 *   - App lock enforced
 *   - Stored in local storage
 *
 * */

// https://github.com/jedisct1/libsodium.js/issues/235
jest.mock('libsodium-wrappers-sumo', () => ({
  crypto_pwhash_str: (value: string) => value,
  crypto_pwhash_str_verify: (value1: string, value2: string) => value1 === value2,
  ready: Promise.resolve,
}));

class AppLockPage extends TestPage<AppLockProps> {
  constructor(props?: AppLockProps) {
    super(AppLock.AppLock, props);
    act(() => AppLock.init(props.clientRepository, props.selfUser));
  }

  getAppLockModal = () => this.get('div[data-uie-name="applock-modal"]');
  getAppLockModalBody = (appLockState: APPLOCK_STATE) =>
    this.get(`div[data-uie-name="applock-modal-body"][data-uie-value="${appLockState}"]`);
}
describe('AppLock', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="wire-main"><div id="app"></div><div id="applock"></div></div>';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('constructor', () => {
    it('does not shows up if no valid timeout is set', () => {
      spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
        FEATURE: {
          APPLOCK_INACTIVITY_TIMEOUT: undefined,
        },
      });
      const appLockPage = new AppLockPage({
        clientRepository: ({
          clientService: ({
            deleteClient: (clientId: string, password: string) => Promise.resolve(),
          } as unknown) as ClientService,
          currentClient: ko.observable({id: 'clientId'}),
        } as unknown) as ClientRepository,
        selfUser: ({id: 'userID'} as unknown) as User,
      });
      const appLockModal = appLockPage.getAppLockModal();
      expect(appLockModal.props().style.display).toBe('none');
    });
    it('shows the locked modal on start if timeout is set as flag and a code is stored', () => {
      spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
        FEATURE: {
          APPLOCK_INACTIVITY_TIMEOUT: 10,
        },
      });
      spyOn(window.localStorage, 'getItem').and.returnValue('savedCode');
      const appLockPage = new AppLockPage({
        clientRepository: ({
          clientService: ({
            deleteClient: (clientId: string, password: string) => Promise.resolve(),
          } as unknown) as ClientService,
          currentClient: ko.observable({id: 'clientId'}),
        } as unknown) as ClientRepository,
        selfUser: ({id: 'userID'} as unknown) as User,
      });
      appLockPage.debug();
      const appLockModal = appLockPage.getAppLockModal();
      expect(appLockModal.props().style.display).toBe('flex');
    });
    it('shows the locked modal on start if timeout is set as query parameter and a code is stored', () => {
      spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
        FEATURE: {
          APPLOCK_INACTIVITY_TIMEOUT: undefined,
        },
      });
      window.history.pushState({}, '', '?applock_unfocus_timeout=10');
      spyOn(window.localStorage, 'getItem').and.returnValue('savedCode');
      // TODO: Instantiate AppLock
      const appLockModal = document.querySelector('[data-uie-name=applock-modal]') as HTMLDivElement;
      expect(appLockModal.style.display).toBe('flex');
    });
  });

  describe('applock', () => {
    it('show the app lock modal locked when it the passhprase is set and app lock is enabled', () => {
      const teamState: Partial<TeamState> = {
        isAppLockEnabled: ko.pureComputed(() => true),
        isAppLockEnforced: ko.pureComputed(() => false),
      };
      spyOn(window.localStorage, 'getItem').and.returnValue('savedCode');

      const appLockPage = new AppLockPage({
        clientRepository: ({} as unknown) as ClientRepository,
        selfUser: ({id: 'userID'} as unknown) as User,
        teamState: teamState as TeamState,
      });
      expect(appLockPage.getAppLockModalBody(APPLOCK_STATE.LOCKED).exists()).toBe(true);
    });

    it('show the app lock modal setup when there is no passhprase is set and app lock is enabled', () => {
      const teamState: Partial<TeamState> = {
        isAppLockEnabled: ko.pureComputed(() => true),
        isAppLockEnforced: ko.pureComputed(() => false),
      };

      const appLockPage = new AppLockPage({
        clientRepository: ({} as unknown) as ClientRepository,
        selfUser: ({id: 'userID'} as unknown) as User,
        teamState: teamState as TeamState,
      });
      amplify.publish(WebAppEvents.PREFERENCES.CHANGE_APP_LOCK_PASSPHRASE);
      appLockPage.update();
      expect(appLockPage.getAppLockModalBody(APPLOCK_STATE.SETUP).exists()).toBe(true);
    });
    // it('show the app lock setup modal dialog, when enabled, enforced and there is no stored passphrase', () => {});
    // it('show the app lock setup modal dialog, when enabled, enforced and there is no stored passphrase', () => {});
  });
  // describe('unlock', () => {
  //   // TODO: Figure out the steps to hide the modal after submitting the passphrase.
  //   it.skip('stores the passphrase, respects the timeout and unlocks', async () => {
  //     jest.useFakeTimers();
  //     spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
  //       FEATURE: {
  //         APPLOCK_INACTIVITY_TIMEOUT: 10,
  //       },
  //     });
  //     let storedCode: string;
  //     const passphrase = 'abcABC123!';
  //     jest.spyOn(window.localStorage, 'setItem').mockImplementation((_, code) => {
  //       storedCode = code;
  //     });
  //     jest.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
  //       return storedCode;
  //     });
  //     const page = initAppLock();
  //     const setupInput = page.get('input[data-uie-name="input-applock-set-a"]');
  //     expect(setupInput).toBeDefined();
  //     setupInput.simulate('change', {target: {value: passphrase}});
  //     await page.get('form').simulate('submit');
  //     expect(storedCode).toBeDefined();
  //     const appLockModal = document.querySelector('[data-uie-name=applock-modal]') as HTMLDivElement;
  //     expect(appLockModal.style.display).toBe('none');
  //     window.dispatchEvent(new Event('blur'));
  //     jest.advanceTimersByTime(5000);
  //     expect(appLockModal.style.display).toBe('none');
  //     jest.advanceTimersByTime(6000);
  //     expect(appLockModal.style.display).toBe('flex');
  //   });
  // });
});
