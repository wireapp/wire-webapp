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

import {WebAppEvents} from '@wireapp/webapp-events';

import en from 'I18n/en-US.json';
import type {ClientRepository} from 'Repositories/client';
import {User} from 'Repositories/entity/User/User';
import {TeamState} from 'Repositories/team/TeamState';
import {AppLockCrypto, AppLockRepository} from 'Repositories/user/appLockRepository';
import {AppLockState} from 'Repositories/user/appLockState';
import {UserState} from 'Repositories/user/userState';
import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {withTheme, withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {setStrings, translate} from 'Util/localizerUtil';
import {translateForTest} from 'Util/test/translateForTest';
import {createUuid} from 'Util/uuid';

import {AppLock, APPLOCK_STATE} from './appLock';

const clientRepository = {} as unknown as ClientRepository;
const reactTranslationRenderingRootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({
    isFeatureToggleEnabled(featureName) {
      return featureName === reactTranslationRenderingFeatureToggleName;
    },
    translate,
  }),
);

type TranslationTestFunction = () => void | Promise<void>;

async function withTranslationStrings(strings: typeof en, testFunction: TranslationTestFunction): Promise<void> {
  setStrings({en: strings});

  try {
    await testFunction();
  } finally {
    setStrings({en});
  }
}

const appLockCrypto: AppLockCrypto = {
  cryptoPwhashMemLimitInteractive: 1,
  cryptoPwhashOpsLimitInteractive: 1,
  ready: Promise.resolve(),
  cryptoPwhashStr: (value: string) => value,
  cryptoPwhashStrVerify: (value1: string, value2: string) => value1 === value2,
};

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
  userState.self(new User(createUuid(), '', translateForTest));
  const appLockRepository = new AppLockRepository(translateForTest, userState, appLockState, appLockCrypto);
  return appLockRepository;
};
describe('AppLock', () => {
  it('keeps the legacy setup message rendering when React translation rendering is disabled', async () => {
    await withTranslationStrings(en, () => {
      const appLockState = createAppLockState();
      const appLockRepository = createAppLockRepository(appLockState);
      appLockState.hasPassphrase(false);
      appLockState.isActivatedInPreferences(true);

      const props = {
        appLockRepository,
        appLockState,
        clientRepository,
      };

      const {getByTestId} = render(withTheme(<AppLock {...props} />));
      const setupMessage = getByTestId('label-applock-set-text');

      expect(setupMessage.querySelectorAll('br')).toHaveLength(2);
    });
  });

  it('renders setup line breaks as React nodes when React translation rendering is enabled', async () => {
    await withTranslationStrings(en, () => {
      const appLockState = createAppLockState();
      const appLockRepository = createAppLockRepository(appLockState);
      appLockState.hasPassphrase(false);
      appLockState.isActivatedInPreferences(true);

      const props = {
        appLockRepository,
        appLockState,
        clientRepository,
      };

      const {getByTestId} = render(
        withThemeAndRootContext(<AppLock {...props} />, reactTranslationRenderingRootProviderWrapper),
      );
      const setupMessage = getByTestId('label-applock-set-text');

      expect(setupMessage).toHaveTextContent('Wire will lock itself after 1 minute of inactivity.');
      expect(setupMessage.querySelectorAll('br')).toHaveLength(2);
    });
  });

  it('keeps unsupported setup translation markup as text', async () => {
    await withTranslationStrings(
      {
        ...en,
        modalAppLockSetupMessage: '<img src="example">Wire will lock itself.[br]Enter your passcode.',
      },
      () => {
        const appLockState = createAppLockState();
        const appLockRepository = createAppLockRepository(appLockState);
        appLockState.hasPassphrase(false);
        appLockState.isActivatedInPreferences(true);

        const props = {
          appLockRepository,
          appLockState,
          clientRepository,
        };

        const {getByTestId} = render(
          withThemeAndRootContext(<AppLock {...props} />, reactTranslationRenderingRootProviderWrapper),
        );
        const setupMessage = getByTestId('label-applock-set-text');

        expect(setupMessage).toHaveTextContent('<img src="example">Wire will lock itself.Enter your passcode.');
        expect(setupMessage.querySelector('img')).toBeNull();
        expect(setupMessage.querySelectorAll('br')).toHaveLength(2);
      },
    );
  });

  describe('disabled feature', () => {
    it('does not shows up if applock is disabled', () => {
      const appLockState = createAppLockState(createTeamState({status: FEATURE_STATUS.DISABLED}));
      const appLockRepository = createAppLockRepository(appLockState);

      const props = {
        appLockRepository,
        appLockState,
        clientRepository,
      };

      const {queryByTestId} = render(withTheme(<AppLock {...props} />));

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

      const {getByTestId} = render(withTheme(<AppLock {...props} />));

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

      const {getByTestId} = render(withTheme(<AppLock {...props} />));

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

      const {getByTestId} = render(withTheme(<AppLock {...props} />));

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

    const {getByTestId} = render(withTheme(<AppLock {...props} />));

    const appLockModal = getByTestId('applock-modal');
    expect(window.getComputedStyle(appLockModal).getPropertyValue('display')).toBe('flex');
  });
});
