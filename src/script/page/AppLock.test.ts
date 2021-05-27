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
import {act} from '@testing-library/react';
import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';
import {FeatureStatus} from '@wireapp/api-client/src/team/feature/';

import TestPage from 'Util/test/TestPage';
import type {ClientRepository} from '../client/ClientRepository';
import AppLock, {AppLockProps, APPLOCK_STATE} from './AppLock';
import {AppLockState} from '../user/AppLockState';
import {AppLockRepository} from '../user/AppLockRepository';
import {UserState} from '../user/UserState';
import {createRandomUuid} from 'Util/util';
import {TeamState} from '../team/TeamState';

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

const clientRepository = {} as unknown as ClientRepository;

const createTeamState = ({
  status = 'enabled',
  enforceAppLock = false,
  inactivityTimeoutSecs = 10,
}: {
  enforceAppLock?: boolean;
  inactivityTimeoutSecs?: number;
  status?: string;
} = {}) => {
  const teamState = new TeamState();
  jest.spyOn(teamState, 'isTeam').mockImplementation(ko.pureComputed(() => true));
  const teamFeatures = {
    applock: {
      config: {
        enforceAppLock,
        inactivityTimeoutSecs,
      },
      status,
    },
  };
  jest.spyOn(teamState, 'teamFeatures').mockImplementation(ko.observable(teamFeatures));
  return teamState;
};

const createAppLockState = (teamState?: TeamState) => {
  teamState = teamState ?? createTeamState();
  const appLockState = new AppLockState(teamState);
  return appLockState;
};

const createAppLockRepository = (appLockState?: AppLockState) => {
  const userState = new UserState();
  appLockState = appLockState ?? createAppLockState();
  jest.spyOn(userState, 'self').mockImplementation(ko.observable({id: createRandomUuid()}));
  const appLockRepository = new AppLockRepository(userState, appLockState);
  return appLockRepository;
};
describe('AppLock', () => {
  describe('disabled feature', () => {
    it('does not shows up if applock is disabled', () => {
      const appLockState = createAppLockState(createTeamState({status: FeatureStatus.DISABLED}));
      const appLockRepository = createAppLockRepository(appLockState);

      const appLockPage = new AppLockPage({
        appLockRepository,
        appLockState,
        clientRepository,
      });
      const appLockModal = appLockPage.getAppLockModal();
      expect(appLockModal.props().style.display).toBe('none');
    });
  });

  describe('modal state', () => {
    it('shows locked state when it the passphrase is set and app lock is enabled', () => {
      const appLockState = createAppLockState();
      const appLockRepository = createAppLockRepository(appLockState);
      appLockState.hasPassphrase(true);
      appLockState.isActivatedInPreferences(true);
      jest.spyOn(document, 'querySelector').mockReturnValue(document.createElement('div'));

      const appLockPage = new AppLockPage({
        appLockRepository,
        appLockState,
        clientRepository,
      });
      expect(appLockPage.getAppLockModalBody(APPLOCK_STATE.LOCKED).exists()).toBe(true);
    });

    it('shows setup state when there is no passphrase is set and app lock is enabled', () => {
      const appLockState = createAppLockState();
      const appLockRepository = createAppLockRepository(appLockState);
      appLockState.hasPassphrase(false);
      appLockState.isActivatedInPreferences(true);
      jest.spyOn(document, 'querySelector').mockReturnValue(document.createElement('div'));

      const appLockPage = new AppLockPage({
        appLockRepository,
        appLockState,
        clientRepository,
      });
      act(() => {
        amplify.publish(WebAppEvents.PREFERENCES.CHANGE_APP_LOCK_PASSPHRASE);
      });
      appLockPage.update();
      expect(appLockPage.getAppLockModalBody(APPLOCK_STATE.SETUP).exists()).toBe(true);
    });

    it('shows setup state when there is no passphrase is set and enforced is enabled', () => {
      const appLockState = createAppLockState(createTeamState({enforceAppLock: true, status: 'enabled'}));
      const appLockRepository = createAppLockRepository(appLockState);
      appLockState.hasPassphrase(false);
      jest.spyOn(document, 'querySelector').mockReturnValue(document.createElement('div'));

      const appLockPage = new AppLockPage({
        appLockRepository,
        appLockState,
        clientRepository,
      });
      act(() => {
        amplify.publish(WebAppEvents.PREFERENCES.CHANGE_APP_LOCK_PASSPHRASE);
      });
      appLockPage.update();
      expect(appLockPage.getAppLockModalBody(APPLOCK_STATE.SETUP).exists()).toBe(true);
    });
  });

  it('shows the locked modal on start if timeout is set as flag and a code is stored', async () => {
    const appLockState = createAppLockState();
    const appLockRepository = createAppLockRepository(appLockState);
    appLockState.hasPassphrase(true);
    appLockState.isActivatedInPreferences(true);
    jest.spyOn(document, 'querySelector').mockReturnValue(document.createElement('div'));

    const appLockPage = new AppLockPage({
      appLockRepository,
      appLockState,
      clientRepository,
    });

    const appLockModal = appLockPage.getAppLockModal();
    expect(appLockModal.props().style.display).toBe('flex');
  });
});
