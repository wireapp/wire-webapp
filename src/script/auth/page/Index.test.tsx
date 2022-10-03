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

import {TypeUtil} from '@wireapp/commons';
import {Config, Configuration} from '../../Config';
import {initialRootState} from '../module/reducer';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponentReact18} from '../util/test/TestUtil';
import Index from './Index';
import {ROUTE} from '../route';
import {initialAuthState} from '../module/reducer/authReducer';
import {act, waitFor} from '@testing-library/react';

jest.mock('../util/SVGProvider');

describe('when visiting the index page', () => {
  it('shows the logo', () => {
    const {getByTestId} = mountComponentReact18(
      <Index />,
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    const logo = getByTestId('ui-wire-logo');
    expect(logo).not.toBeNull();
  });

  it('redirects to SSO login if default SSO code is set', async () => {
    const historyPushSpy = spyOn(history, 'pushState');

    const defaultSSOCode = 'default-a4b0-4c59-a31d-303a7f5eb5ab';

    mountComponentReact18(
      <Index />,
      mockStoreFactory()({
        ...initialRootState,
        authState: {
          ...initialAuthState,
          ssoSettings: {
            default_sso_code: defaultSSOCode,
          },
        },
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    await waitFor(() => {
      expect(historyPushSpy).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        `#${ROUTE.SSO}/wire-${defaultSSOCode}` as any,
      );
    });
  });

  it('shows the welcome text with default backend name', () => {
    const {getByTestId} = mountComponentReact18(
      <Index />,
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    const welcomeText = getByTestId('welcome-text');
    expect(welcomeText.innerHTML).toContain(Config.getConfig().BRAND_NAME);
  });

  it('shows the welcome text with custom backend name', () => {
    const customBackendName = 'Test';
    spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
      BACKEND_NAME: customBackendName,
      FEATURE: {
        ENABLE_ACCOUNT_REGISTRATION: true,
      },
    });
    const {getByTestId} = mountComponentReact18(
      <Index />,
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    const welcomeText = getByTestId('welcome-text');

    expect(welcomeText.innerHTML).toContain(customBackendName);
  });

  it('navigates to login page when clicking login button', async () => {
    const historyPushSpy = spyOn(history, 'pushState');

    const {getByTestId} = mountComponentReact18(
      <Index />,
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    const loginButton = getByTestId('go-login');
    act(() => {
      loginButton.click();
    });

    await waitFor(() => {
      expect(historyPushSpy).toHaveBeenCalledWith(expect.any(Object), expect.any(String), `#${ROUTE.LOGIN}`);
    });
  });

  it('navigates to SSO login page when clicking SSO login button', async () => {
    spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
      FEATURE: {
        ENABLE_DOMAIN_DISCOVERY: true,
        ENABLE_SSO: true,
      },
    });

    const historyPushSpy = spyOn(history, 'pushState');

    const {getByTestId} = mountComponentReact18(
      <Index />,
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

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
    beforeAll(() => {
      spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
        FEATURE: {
          ENABLE_ACCOUNT_REGISTRATION: false,
        },
      });
    });

    it('does not show create account button', () => {
      const {queryByTestId} = mountComponentReact18(
        <Index />,
        mockStoreFactory()({
          ...initialRootState,
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );

      const createAccountButton = queryByTestId('go-set-account-type');
      expect(createAccountButton).toBeNull();
    });
  });

  describe('and the account registration is enabled', () => {
    beforeAll(() => {
      spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
        FEATURE: {
          ENABLE_ACCOUNT_REGISTRATION: true,
        },
      });
    });

    it('show create account button and navigates to account type selection on click', async () => {
      const historyPushSpy = spyOn(history, 'pushState');

      const {getByTestId} = mountComponentReact18(
        <Index />,
        mockStoreFactory()({
          ...initialRootState,
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );

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
    beforeAll(() => {
      spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
        FEATURE: {
          ENABLE_DOMAIN_DISCOVERY: false,
          ENABLE_SSO: false,
        },
      });
    });

    it('does not show SSO login button', () => {
      const {queryByTestId} = mountComponentReact18(
        <Index />,
        mockStoreFactory()({
          ...initialRootState,
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );

      expect(queryByTestId('go-sso-login')).toBeNull();
    });
  });

  describe('and SSO, domain discovery & account registration is disabled', () => {
    beforeAll(() => {
      spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
        FEATURE: {
          ENABLE_ACCOUNT_REGISTRATION: false,
          ENABLE_DOMAIN_DISCOVERY: false,
          ENABLE_SSO: false,
        },
      });
    });

    it('navigates directly to email login', async () => {
      const historyPushSpy = spyOn(history, 'pushState');
      mountComponentReact18(
        <Index />,
        mockStoreFactory()({
          ...initialRootState,
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );

      await waitFor(() => {
        expect(historyPushSpy).toHaveBeenCalledWith(expect.any(Object), expect.any(String), `#${ROUTE.LOGIN}`);
      });
    });
  });
});
