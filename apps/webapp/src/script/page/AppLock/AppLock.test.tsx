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

import {act, render} from '@testing-library/react';
import {FEATURE_STATUS} from '@wireapp/api-client/lib/team/feature/';
import {amplify} from 'amplify';
import ko from 'knockout';
import type {ClientRepository} from 'Repositories/client';
import {TeamState} from 'Repositories/team/TeamState';
import {AppLockRepository} from 'Repositories/user/AppLockRepository';
import {AppLockState} from 'Repositories/user/AppLockState';
import {UserState} from 'Repositories/user/UserState';
import {createUuid} from 'Util/uuid';

import {WebAppEvents} from '@wireapp/webapp-events';

import {AppLock, APPLOCK_STATE} from './AppLock';

// https://github.com/jedisct1/libsodium.js/issues/235
jest.mock('libsodium-wrappers', () => ({
  crypto_pwhash_str: (value: string) => value,
  crypto_pwhash_str_verify: (value1: string, value2: string) => value1 === value2,
  ready: Promise.resolve,
}));

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
  jest.spyOn(userState, 'self').mockImplementation(ko.observable({id: createUuid()}));
  const appLockRepository = new AppLockRepository(userState, appLockState);
  return appLockRepository;
};
describe('AppLock', () => {
  describe('disabled feature', () => {
    it('does not shows up if applock is disabled', () => {
      const appLockState = createAppLockState(createTeamState({status: FEATURE_STATUS.DISABLED}));
      const appLockRepository = createAppLockRepository(appLockState);

      const props = {
        appLockRepository,
        appLockState,
        clientRepository,
      };

      const {queryByTestId} = render(<AppLock {...props} />);

      const appLockModal = queryByTestId('applock-modal');
      expect(appLockModal).toBe(null);
    });
  });

  describe('modal state', () => {
    it('shows locked state when it the passphrase is set and app lock is enabled', () => {
      const appLockState = createAppLockState();
      const appLockRepository = createAppLockRepository(appLockState);
      appLockState.hasPassphrase(true);
      appLockState.isActivatedInPreferences(true);
      jest.spyOn(document, 'querySelector').mockReturnValue(document.createElement('div'));

      const props = {
        appLockRepository,
        appLockState,
        clientRepository,
      };

      const {getByTestId} = render(<AppLock {...props} />);

      const appLockModalBody = getByTestId('applock-modal-body');
      expect(appLockModalBody.getAttribute('data-uie-value')).toEqual(APPLOCK_STATE.LOCKED);
    });

    it('shows setup state when there is no passphrase is set and app lock is enabled', () => {
      const appLockState = createAppLockState();
      const appLockRepository = createAppLockRepository(appLockState);
      appLockState.hasPassphrase(false);
      appLockState.isActivatedInPreferences(true);
      jest.spyOn(document, 'querySelector').mockReturnValue(document.createElement('div'));

      const props = {
        appLockRepository,
        appLockState,
        clientRepository,
      };

      const {getByTestId} = render(<AppLock {...props} />);

      act(() => {
        amplify.publish(WebAppEvents.PREFERENCES.CHANGE_APP_LOCK_PASSPHRASE);
      });

      const appLockModalBody = getByTestId('applock-modal-body');
      expect(appLockModalBody.getAttribute('data-uie-value')).toEqual(APPLOCK_STATE.SETUP);
    });

    it('shows setup state when there is no passphrase is set and enforced is enabled', () => {
      const appLockState = createAppLockState(createTeamState({enforceAppLock: true, status: 'enabled'}));
      const appLockRepository = createAppLockRepository(appLockState);
      appLockState.hasPassphrase(false);
      jest.spyOn(document, 'querySelector').mockReturnValue(document.createElement('div'));

      const props = {
        appLockRepository,
        appLockState,
        clientRepository,
      };

      const {getByTestId} = render(<AppLock {...props} />);

      act(() => {
        amplify.publish(WebAppEvents.PREFERENCES.CHANGE_APP_LOCK_PASSPHRASE);
      });

      const appLockModalBody = getByTestId('applock-modal-body');
      expect(appLockModalBody.getAttribute('data-uie-value')).toEqual(APPLOCK_STATE.SETUP);
    });
  });

  it('shows the locked modal on start if timeout is set as flag and a code is stored', async () => {
    const appLockState = createAppLockState();
    const appLockRepository = createAppLockRepository(appLockState);
    appLockState.hasPassphrase(true);
    appLockState.isActivatedInPreferences(true);
    jest.spyOn(document, 'querySelector').mockReturnValue(document.createElement('div'));

    const props = {
      appLockRepository,
      appLockState,
      clientRepository,
    };

    const {getByTestId} = render(<AppLock {...props} />);

    const appLockModal = getByTestId('applock-modal');
    expect(window.getComputedStyle(appLockModal).getPropertyValue('display')).toBe('flex');
  });
});
