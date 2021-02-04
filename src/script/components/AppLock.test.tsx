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

import 'src/script/util/test/mock/mutationObserverMock';
import 'src/script/util/test/mock/LocalStorageMock';
import {act} from '@testing-library/react';
import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';
import ko from 'knockout';
import TestPage from 'Util/test/TestPage';
import type {ClientRepository} from '../client/ClientRepository';
import type {User} from '../entity/User';
import {TeamState} from '../team/TeamState';
import AppLock, {AppLockProps, APPLOCK_STATE} from './AppLock';

// https://github.com/jedisct1/libsodium.js/issues/235
jest.mock('libsodium-wrappers-sumo', () => ({
  crypto_pwhash_str: (value: string) => value,
  crypto_pwhash_str_verify: (value1: string, value2: string) => value1 === value2,
  ready: Promise.resolve,
}));

class AppLockPage extends TestPage<AppLockProps> {
  constructor(props?: AppLockProps) {
    super(AppLock.AppLock, props);
  }

  getAppLockModal = () => this.get('div[data-uie-name="applock-modal"]');
  getAppLockModalBody = (appLockState: APPLOCK_STATE) =>
    this.get(`div[data-uie-name="applock-modal-body"][data-uie-value="${appLockState}"]`);
  getAppLockInput = () => this.get('input[data-uie-name="input-applock-set-a"]');
  changeAppLockInput = (value: string) => this.changeValue(this.getAppLockInput(), {value});
  getForm = () => this.get('form');
  formSubmit = () => this.submit(this.getForm());
}
describe('AppLock', () => {
  describe('disabled feature', () => {
    it('does not shows up if applock is disabled', () => {
      const teamState: Partial<TeamState> = {
        appLockInactivityTimeoutSecs: ko.pureComputed(() => 10),
        isAppLockEnabled: ko.pureComputed(() => false),
        isAppLockEnforced: ko.pureComputed(() => false),
      };
      const appLockPage = new AppLockPage({
        clientRepository: ({} as unknown) as ClientRepository,
        selfUser: ({id: 'userID'} as unknown) as User,
        teamState: teamState as TeamState,
      });
      const appLockModal = appLockPage.getAppLockModal();
      expect(appLockModal.props().style.display).toBe('none');
    });
  });

  describe('modal state', () => {
    it('shows locked state when it the passhprase is set and app lock is enabled', () => {
      const teamState: Partial<TeamState> = {
        appLockInactivityTimeoutSecs: ko.pureComputed(() => 10),
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

    it('shows setup state when there is no passhprase is set and app lock is enabled', () => {
      const teamState: Partial<TeamState> = {
        appLockInactivityTimeoutSecs: ko.pureComputed(() => 10),
        isAppLockEnabled: ko.pureComputed(() => true),
        isAppLockEnforced: ko.pureComputed(() => false),
      };

      const appLockPage = new AppLockPage({
        clientRepository: ({} as unknown) as ClientRepository,
        selfUser: ({id: 'userID'} as unknown) as User,
        teamState: teamState as TeamState,
      });
      act(() => {
        amplify.publish(WebAppEvents.PREFERENCES.CHANGE_APP_LOCK_PASSPHRASE);
      });
      appLockPage.update();
      expect(appLockPage.getAppLockModalBody(APPLOCK_STATE.SETUP).exists()).toBe(true);
    });

    it('shows setup state when there is no passhprase is set and enforced is enabled', () => {
      const teamState: Partial<TeamState> = {
        appLockInactivityTimeoutSecs: ko.pureComputed(() => 10),
        isAppLockEnabled: ko.pureComputed(() => true),
        isAppLockEnforced: ko.pureComputed(() => true),
      };

      const appLockPage = new AppLockPage({
        clientRepository: ({} as unknown) as ClientRepository,
        selfUser: ({id: 'userID'} as unknown) as User,
        teamState: teamState as TeamState,
      });
      act(() => {
        amplify.publish(WebAppEvents.PREFERENCES.CHANGE_APP_LOCK_PASSPHRASE);
      });
      appLockPage.update();
      expect(appLockPage.getAppLockModalBody(APPLOCK_STATE.SETUP).exists()).toBe(true);
    });
  });

  it('shows the locked modal on start if timeout is set as flag and a code is stored', () => {
    const teamState: Partial<TeamState> = {
      appLockInactivityTimeoutSecs: ko.pureComputed(() => 10),
      isAppLockEnabled: ko.pureComputed(() => true),
      isAppLockEnforced: ko.pureComputed(() => false),
    };
    spyOn(window.localStorage, 'getItem').and.returnValue('savedCode');
    const appLockPage = new AppLockPage({
      clientRepository: ({} as unknown) as ClientRepository,
      selfUser: ({id: 'userID'} as unknown) as User,
      teamState: teamState as TeamState,
    });
    const appLockModal = appLockPage.getAppLockModal();
    expect(appLockModal.props().style.display).toBe('flex');
  });

  it('shows the locked modal on start if timeout is set as query parameter and a code is stored', () => {
    const teamState: Partial<TeamState> = {
      appLockInactivityTimeoutSecs: ko.pureComputed(() => 10),
      isAppLockEnabled: ko.pureComputed(() => true),
      isAppLockEnforced: ko.pureComputed(() => false),
    };
    window.history.pushState({}, '', '?applock_unfocus_timeout=10');
    spyOn(window.localStorage, 'getItem').and.returnValue('savedCode');

    const appLockPage = new AppLockPage({
      clientRepository: ({} as unknown) as ClientRepository,
      selfUser: ({id: 'userID'} as unknown) as User,
      teamState: teamState as TeamState,
    });

    const appLockModal = appLockPage.getAppLockModal();
    expect(appLockModal.props().style.display).toBe('flex');
  });

  describe('unlock', () => {
    it('stores the passphrase, respects the timeout and unlocks', async () => {
      jest.useFakeTimers();

      const teamState: Partial<TeamState> = {
        appLockInactivityTimeoutSecs: ko.pureComputed(() => 10),
        isAppLockEnabled: ko.pureComputed(() => true),
        isAppLockEnforced: ko.pureComputed(() => false),
      };
      spyOn(window.localStorage, 'getItem').and.returnValue('savedCode');

      const appLockPage = new AppLockPage({
        clientRepository: ({} as unknown) as ClientRepository,
        selfUser: ({id: 'userID'} as unknown) as User,
        teamState: teamState as TeamState,
      });

      let storedCode: string;
      const passphrase = 'abcABC123!';
      jest.spyOn(window.localStorage, 'setItem').mockImplementation((_, code) => {
        storedCode = code;
      });
      jest.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
        return storedCode;
      });
      act(() => {
        amplify.publish(WebAppEvents.PREFERENCES.CHANGE_APP_LOCK_PASSPHRASE);
      });
      appLockPage.update();
      expect(appLockPage.getAppLockInput()).toBeDefined();
      appLockPage.changeAppLockInput(passphrase);
      appLockPage.formSubmit();
      expect(storedCode).toBeDefined();

      // const appLockModal = document.querySelector('[data-uie-name=applock-modal]') as HTMLDivElement;
      // expect(appLockModal.style.display).toBe('none');
      // window.dispatchEvent(new Event('blur'));
      // jest.advanceTimersByTime(5000);
      // expect(appLockModal.style.display).toBe('none');
      // jest.advanceTimersByTime(6000);
      // expect(appLockModal.style.display).toBe('flex');
    });
  });
});
