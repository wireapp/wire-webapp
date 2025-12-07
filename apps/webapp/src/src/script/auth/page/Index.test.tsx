/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {act, waitFor} from '@testing-library/react';
import {Navigate} from 'react-router-dom';

import {Index} from './Index';

import {Config} from '../../Config';
import {initialRootState} from '../module/reducer';
import {initialAuthState} from '../module/reducer/authReducer';
import {ROUTE} from '../route';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';
import {getPrefixedSSOCode} from '../util/urlUtil';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Navigate: jest.fn().mockImplementation(),
}));

describe('when visiting the index page', () => {
  let configSpy: jest.SpyInstance;

  beforeEach(() => {
    configSpy = jest.spyOn(Config, 'getConfig').mockReturnValue({
      APP_BASE: 'https://app.wire.com',
      BACKEND_NAME: 'mybrand',
      FEATURE: {
        ENABLE_ACCOUNT_REGISTRATION: true,
        ENABLE_DOMAIN_DISCOVERY: false,
        ENABLE_SSO: false,
      },
    } as any);
  });
  it('shows the logo', () => {
    const {getByTestId} = mountComponent(<Index />, mockStoreFactory()(initialRootState));

    const logo = getByTestId('ui-wire-logo');
    expect(logo).not.toBeNull();
  });

  it('redirects to SSO login if default SSO code is set', async () => {
    const defaultSSOCode = 'default-a4b0-4c59-a31d-303a7f5eb5ab';

    mountComponent(
      <Index />,
      mockStoreFactory()({
        ...initialRootState,
        authState: {
          ...initialAuthState,
          ssoSettings: {
            default_sso_code: defaultSSOCode,
          },
        },
      }),
    );

    expect(Navigate).toHaveBeenCalledWith({to: `${ROUTE.SSO}/${getPrefixedSSOCode(defaultSSOCode)}`}, {});
  });

  it('shows the welcome text with default backend name', () => {
    const {getByTestId} = mountComponent(<Index />, mockStoreFactory()(initialRootState));

    const welcomeText = getByTestId('welcome-text');
    expect(welcomeText.innerHTML).toContain(Config.getConfig().BACKEND_NAME);
  });

  it('shows the welcome text with custom backend name', () => {
    const customBackendName = 'Test';

    configSpy.mockReturnValue({
      APP_BASE: 'https://app.wire.com',
      BACKEND_NAME: customBackendName,
      FEATURE: {
        ENABLE_ACCOUNT_REGISTRATION: true,
      },
    });
    const {getByTestId} = mountComponent(<Index />, mockStoreFactory()(initialRootState));

    const welcomeText = getByTestId('welcome-text');

    expect(welcomeText.innerHTML).toContain(customBackendName);
  });

  it('navigates to login page when clicking login button', async () => {
    const historyPushSpy = spyOn(history, 'pushState');

    const {getByTestId} = mountComponent(<Index />, mockStoreFactory()(initialRootState));

    const loginButton = getByTestId('go-login');
    act(() => {
      loginButton.click();
    });

    await waitFor(() => {
      expect(historyPushSpy).toHaveBeenCalledWith(expect.any(Object), expect.any(String), `#${ROUTE.LOGIN}`);
    });
  });

  it('navigates to SSO login page when clicking SSO login button', async () => {
    configSpy.mockReturnValue({
      APP_BASE: 'https://app.wire.com',
      FEATURE: {
        ENABLE_DOMAIN_DISCOVERY: true,
        ENABLE_SSO: true,
      },
    });

    const historyPushSpy = spyOn(history, 'pushState');

    const {getByTestId} = mountComponent(<Index />, mockStoreFactory()(initialRootState));

    const ssoLogin = getByTestId('go-sso-login');
    expect(ssoLogin).not.toBeNull();
    act(() => {
      ssoLogin.click();
    });

    await waitFor(() => {
      expect(historyPushSpy).toHaveBeenCalledWith(expect.any(Object), expect.any(String), `#${ROUTE.SSO}`);
    });
  });

  describe('and the account registration is disabled', () => {
    beforeEach(() => {
      configSpy.mockReturnValue({
        FEATURE: {
          ENABLE_ACCOUNT_REGISTRATION: false,
        },
      });
    });

    it('does not show create account button', () => {
      const {queryByTestId} = mountComponent(<Index />, mockStoreFactory()(initialRootState));

      const createAccountButton = queryByTestId('go-set-account-type');
      expect(createAccountButton).toBeNull();
    });
  });

  describe('and the account registration is enabled', () => {
    beforeEach(() => {
      configSpy.mockReturnValue({
        APP_BASE: 'https://app.wire.com',
        FEATURE: {
          ENABLE_ACCOUNT_REGISTRATION: true,
        },
      });
    });

    it('show create account button and navigates to account type selection on click', async () => {
      const historyPushSpy = spyOn(history, 'pushState');

      const {getByTestId} = mountComponent(<Index />, mockStoreFactory()(initialRootState));

      const createAccount = getByTestId('go-set-account-type');
      expect(createAccount).not.toBeNull();
      act(() => {
        createAccount.click();
      });

      await waitFor(() => {
        expect(historyPushSpy).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(String),
          `#${ROUTE.SET_ACCOUNT_TYPE}`,
        );
      });
    });
  });

  describe('and SSO & domain discovery is disabled', () => {
    beforeEach(() => {
      configSpy.mockReturnValue({
        APP_BASE: 'https://app.wire.com',
        FEATURE: {
          ENABLE_DOMAIN_DISCOVERY: false,
          ENABLE_SSO: false,
        },
      });
    });

    it('does not show SSO login button', () => {
      const {queryByTestId} = mountComponent(<Index />, mockStoreFactory()(initialRootState));

      expect(queryByTestId('go-sso-login')).toBeNull();
    });
  });

  describe('and SSO, domain discovery & account registration is disabled', () => {
    beforeEach(() => {
      configSpy.mockReturnValue({
        APP_BASE: 'https://app.wire.com',
        FEATURE: {
          ENABLE_ACCOUNT_REGISTRATION: false,
          ENABLE_DOMAIN_DISCOVERY: false,
          ENABLE_SSO: false,
        },
      });
    });

    it('navigates directly to email login', async () => {
      mountComponent(<Index />, mockStoreFactory()(initialRootState));

      expect(Navigate).toHaveBeenCalledWith({to: ROUTE.LOGIN}, {});
    });
  });
});
