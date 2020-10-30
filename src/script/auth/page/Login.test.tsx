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

import {ReactWrapper} from 'enzyme';
import React from 'react';
import {initialRootState, RootState, Api} from '../module/reducer';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';
import Login from './Login';
import {Config, Configuration} from '../../Config';
import {TypeUtil} from '@wireapp/commons';
import {MockStoreEnhanced} from 'redux-mock-store';
import {ThunkDispatch} from 'redux-thunk';
import {AnyAction} from 'redux';
import {History} from 'history';
import {actionRoot} from '../module/action';
import waitForExpect from 'wait-for-expect';
import {createMemoryHistory} from 'history';
import {ROUTE} from '../route';
import {ClientType} from '@wireapp/api-client/src/client';
import {BackendError} from '../module/action/BackendError';

class LoginPage {
  private readonly driver: ReactWrapper;

  constructor(
    store: MockStoreEnhanced<TypeUtil.RecursivePartial<RootState>, ThunkDispatch<RootState, Api, AnyAction>>,
    history?: History<any>,
  ) {
    this.driver = mountComponent(<Login />, store, history);
  }

  getBackButton = () => this.driver.find('[data-uie-name="go-index"]');
  getEmailInput = () => this.driver.find('input[data-uie-name="enter-email"]');
  getPasswordInput = () => this.driver.find('input[data-uie-name="enter-password"]');
  getLoginButton = () => this.driver.find('button[data-uie-name="do-sign-in"]');

  enterEmail = (email: string) => this.getEmailInput().simulate('change', {target: {value: email}});
  enterPassword = (password: string) => this.getPasswordInput().simulate('change', {target: {value: password}});

  clickLoginButton = () => this.getLoginButton().simulate('click');

  update = () => this.driver.update();
}

describe('Login', () => {
  it('successfully logs in with email', async () => {
    const history = createMemoryHistory();
    const historyPushSpy = spyOn(history, 'push');

    const email = 'email@mail.com';
    const password = 'password';

    spyOn(actionRoot.authAction, 'doLogin').and.returnValue(() => Promise.resolve());

    const loginPage = new LoginPage(
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

    loginPage.enterEmail(email);
    loginPage.enterPassword(password);
    loginPage.clickLoginButton();

    await waitForExpect(() => {
      expect(actionRoot.authAction.doLogin)
        .withContext('doLogin action was called')
        .toHaveBeenCalledWith({clientType: ClientType.PERMANENT, email, password});
    });

    expect(historyPushSpy)
      .withContext('navigation to history page was triggered')
      .toHaveBeenCalledWith(ROUTE.HISTORY_INFO as any);
  });

  it('redirects to client deletion page if max devices is reached', async () => {
    const history = createMemoryHistory();
    const historyPushSpy = spyOn(history, 'push');

    const email = 'email@mail.com';
    const password = 'password';

    spyOn(actionRoot.authAction, 'doLogin').and.returnValue(() =>
      Promise.reject({label: BackendError.LABEL.TOO_MANY_CLIENTS}),
    );

    const loginPage = new LoginPage(
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

    loginPage.enterEmail(email);
    loginPage.enterPassword(password);
    loginPage.clickLoginButton();

    await waitForExpect(() => {
      expect(actionRoot.authAction.doLogin)
        .withContext('doLogin action was called')
        .toHaveBeenCalledWith({clientType: ClientType.PERMANENT, email, password});
    });

    expect(historyPushSpy)
      .withContext('navigation to max clients page was triggered')
      .toHaveBeenCalledWith(ROUTE.CLIENTS as any);
  });

  it('successfully logs in with handle', async () => {
    const history = createMemoryHistory();
    const historyPushSpy = spyOn(history, 'push');

    const handle = 'extra-long-handle-with-special-characters...';
    const password = 'password';

    spyOn(actionRoot.authAction, 'doLogin').and.returnValue(() => Promise.resolve());

    const loginPage = new LoginPage(
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

    loginPage.enterEmail(handle);
    loginPage.enterPassword(password);

    loginPage.clickLoginButton();

    await waitForExpect(() => {
      expect(actionRoot.authAction.doLogin)
        .withContext('doLogin action was called')
        .toHaveBeenCalledWith({clientType: ClientType.PERMANENT, handle, password});
    });

    expect(historyPushSpy)
      .withContext('navigation to history page was triggered')
      .toHaveBeenCalledWith(ROUTE.HISTORY_INFO as any);
  });

  it('has disabled submit button as long as one input is empty', () => {
    const loginPage = new LoginPage(
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    expect(loginPage.getEmailInput().exists()).toBe(true);
    expect(loginPage.getPasswordInput().exists()).toBe(true);
    expect(loginPage.getLoginButton().exists()).toBe(true);

    expect(loginPage.getLoginButton().props().disabled).toBe(true);
    loginPage.enterEmail('e');

    expect(loginPage.getLoginButton().props().disabled).toBe(true);
    loginPage.enterPassword('p');

    expect(loginPage.getLoginButton().props().disabled).toBe(false);
  });

  describe('with account registration and SSO disabled', () => {
    it('hides the back button', () => {
      spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
        FEATURE: {
          ENABLE_ACCOUNT_REGISTRATION: false,
          ENABLE_DOMAIN_DISCOVERY: false,
          ENABLE_SSO: false,
        },
      });
      const loginPage = new LoginPage(
        mockStoreFactory()({
          ...initialRootState,
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );

      expect(loginPage.getBackButton().exists()).toBe(false);
    });
  });

  describe('with account registration enabled', () => {
    it('shows the back button', () => {
      spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
        FEATURE: {
          ENABLE_ACCOUNT_REGISTRATION: true,
        },
      });
      const loginPage = new LoginPage(
        mockStoreFactory()({
          ...initialRootState,
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );

      expect(loginPage.getBackButton().exists()).toBe(true);
    });
  });
});
