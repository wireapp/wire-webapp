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
import {ReactWrapper} from 'enzyme';
import React from 'react';
import {Config, Configuration} from '../../Config';
import {initialRootState, RootState, Api} from '../module/reducer';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';
import Index from './Index';
import {MockStoreEnhanced} from 'redux-mock-store';
import {AnyAction} from 'redux';
import {ThunkDispatch} from 'redux-thunk';
import {History} from 'history';
import {createMemoryHistory} from 'history';
import waitForExpect from 'wait-for-expect';
import {ROUTE} from '../route';
import {initialAuthState} from '../module/reducer/authReducer';

class IndexPage {
  private readonly driver: ReactWrapper;

  constructor(
    store: MockStoreEnhanced<TypeUtil.RecursivePartial<RootState>, ThunkDispatch<RootState, Api, AnyAction>>,
    history?: History<any>,
  ) {
    this.driver = mountComponent(<Index />, store, history);
  }

  getCreateAccountButton = () => this.driver.find('button[data-uie-name="go-set-account-type"]');
  getLoginButton = () => this.driver.find('button[data-uie-name="go-login"]');
  getSSOLoginButton = () => this.driver.find('button[data-uie-name="go-sso-login"]');
  getLogo = () => this.driver.find('[data-uie-name="ui-wire-logo"]');
  getWelcomeText = () => this.driver.find('span[data-uie-name="welcome-text"]');

  clickCreateAccountButton = () => this.getCreateAccountButton().simulate('click');
  clickLoginButton = () => this.getLoginButton().simulate('click');
  clickSSOLoginButton = () => this.getSSOLoginButton().simulate('click');
}

describe('when visiting the index page', () => {
  it('shows the logo', () => {
    const indexPage = new IndexPage(
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    expect(indexPage.getLogo().exists()).withContext('Logo is visible').toBe(true);
  });

  it('redirects to SSO login if default SSO code is set', async () => {
    const history = createMemoryHistory();
    const historyPushSpy = spyOn(history, 'push');

    const defaultSSOCode = 'default-a4b0-4c59-a31d-303a7f5eb5ab';

    new IndexPage(
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
      history,
    );

    await waitForExpect(() => {
      expect(historyPushSpy)
        .withContext('Navigation to login page was triggered')
        .toHaveBeenCalledWith(`${ROUTE.SSO}/wire-${defaultSSOCode}` as any);
    });
  });

  it('shows the welcome text with default backend name', () => {
    const indexPage = new IndexPage(
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    expect(indexPage.getWelcomeText().exists()).withContext('Welcome text is visible').toBe(true);

    expect(indexPage.getWelcomeText().text())
      .withContext('Welcome text contains default backend name')
      .toContain(Config.getConfig().BRAND_NAME);
  });

  it('shows the welcome text with custom backend name', () => {
    const customBackendName = 'Test';
    spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
      BACKEND_NAME: customBackendName,
      FEATURE: {
        ENABLE_ACCOUNT_REGISTRATION: true,
      },
    });
    const indexPage = new IndexPage(
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    expect(indexPage.getWelcomeText().exists()).withContext('Welcome text is visible').toBe(true);

    expect(indexPage.getWelcomeText().text())
      .withContext('Welcome text contains custom backend name')
      .toContain(customBackendName);
  });

  it('navigates to login page when clicking login button', async () => {
    const history = createMemoryHistory();
    const historyPushSpy = spyOn(history, 'push');

    const indexPage = new IndexPage(
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
      history,
    );

    expect(indexPage.getLoginButton().exists()).withContext('login button is visible').toBe(true);
    indexPage.clickLoginButton();

    await waitForExpect(() => {
      expect(historyPushSpy)
        .withContext('Navigation to login page was triggered')
        .toHaveBeenCalledWith(ROUTE.LOGIN as any);
    });
  });

  it('navigates to SSO login page when clicking SSO login button', async () => {
    spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
      FEATURE: {
        ENABLE_DOMAIN_DISCOVERY: true,
        ENABLE_SSO: true,
      },
    });
    const history = createMemoryHistory();
    const historyPushSpy = spyOn(history, 'push');

    const indexPage = new IndexPage(
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
      history,
    );

    expect(indexPage.getSSOLoginButton().exists()).withContext('SSO login button is visible').toBe(true);
    indexPage.clickSSOLoginButton();

    await waitForExpect(() => {
      expect(historyPushSpy)
        .withContext('Navigation to SSO login page was triggered')
        .toHaveBeenCalledWith(ROUTE.SSO as any);
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
      const indexPage = new IndexPage(
        mockStoreFactory()({
          ...initialRootState,
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );

      expect(indexPage.getCreateAccountButton().exists())
        .withContext('create account button is not visible')
        .toBe(false);
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
      const history = createMemoryHistory();
      const historyPushSpy = spyOn(history, 'push');

      const indexPage = new IndexPage(
        mockStoreFactory()({
          ...initialRootState,
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
        history,
      );

      expect(indexPage.getCreateAccountButton().exists()).withContext('create account button is visible').toBe(true);
      indexPage.clickCreateAccountButton();

      await waitForExpect(() => {
        expect(historyPushSpy)
          .withContext('Navigation to set account type page was triggered')
          .toHaveBeenCalledWith(ROUTE.SET_ACCOUNT_TYPE as any);
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
      const indexPage = new IndexPage(
        mockStoreFactory()({
          ...initialRootState,
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );

      expect(indexPage.getSSOLoginButton().exists()).withContext('SSO login button is not visible').toBe(false);
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
      const history = createMemoryHistory();
      const historyPushSpy = spyOn(history, 'push');
      new IndexPage(
        mockStoreFactory()({
          ...initialRootState,
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
        history,
      );

      await waitForExpect(() => {
        expect(historyPushSpy)
          .withContext('Navigation to email login page was triggered')
          .toHaveBeenCalledWith(ROUTE.LOGIN as any);
      });
    });
  });
});
