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

import {ReactWrapper} from 'enzyme';
import {createMemoryHistory} from 'history';
import waitForExpect from 'wait-for-expect';
import {actionRoot} from '../module/action';
import {BackendError} from '../module/action/BackendError';
import {initialRootState, RootState, Api} from '../module/reducer';
import {ROUTE} from '../route';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';
import CheckPassword from './CheckPassword';
import {MockStoreEnhanced} from 'redux-mock-store';
import {TypeUtil} from '@wireapp/commons';
import {ThunkDispatch} from 'redux-thunk';
import {AnyAction} from 'redux';
import {History} from 'history';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

jest.mock('../util/SVGProvider');

class CheckPasswordPage {
  private readonly driver: ReactWrapper;

  constructor(
    store: MockStoreEnhanced<TypeUtil.RecursivePartial<RootState>, ThunkDispatch<RootState, Api, AnyAction>>,
    history?: History<any>,
  ) {
    this.driver = mountComponent(<CheckPassword />, store, history);
  }

  getPasswordInput = () => this.driver.find('input[data-uie-name="enter-password"]');
  getLoginButton = () => this.driver.find('button[data-uie-name="do-sign-in"]');
  getErrorMessage = (errorLabel?: string) =>
    this.driver.find(`[data-uie-name="error-message"]${errorLabel ? `[data-uie-value="${errorLabel}"]` : ''}`);

  clickLoginButton = () => this.getLoginButton().simulate('click');

  enterPassword = (value: string) => this.getPasswordInput().simulate('change', {target: {value}});

  update = () => this.driver.update();
}

describe('CheckPassword', () => {
  it('has disabled submit button as long as there is no input', () => {
    const checkPasswordPage = new CheckPasswordPage(
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    expect(checkPasswordPage.getPasswordInput().exists()).toBe(true);
    expect(checkPasswordPage.getLoginButton().exists()).toBe(true);
    expect(checkPasswordPage.getLoginButton().props().disabled).toBe(true);
    checkPasswordPage.enterPassword('e');
    expect(checkPasswordPage.getLoginButton().props().disabled).toBe(false);
  });

  it('navigates to the history page on valid password', async () => {
    const history = createMemoryHistory();
    const historyPushSpy = spyOn(history, 'push');

    spyOn(actionRoot.authAction, 'doLogin').and.returnValue(() => Promise.resolve());

    const checkPasswordPage = new CheckPasswordPage(
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

    checkPasswordPage.enterPassword('e');

    expect(checkPasswordPage.getLoginButton().props().disabled).toBe(false);

    checkPasswordPage.clickLoginButton();

    await waitForExpect(() => {
      expect(actionRoot.authAction.doLogin).toHaveBeenCalled();
      expect(historyPushSpy).toHaveBeenCalledWith(ROUTE.HISTORY_INFO as any);
    });
  });

  it('handles invalid credentials', async () => {
    const error = new BackendError({code: HTTP_STATUS.NOT_FOUND, label: BackendError.LABEL.INVALID_CREDENTIALS});
    spyOn(actionRoot.authAction, 'doLogin').and.returnValue(() => Promise.reject(error));

    const checkPasswordPage = new CheckPasswordPage(
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    checkPasswordPage.enterPassword('e');

    expect(checkPasswordPage.getLoginButton().props().disabled).toBe(false);

    checkPasswordPage.clickLoginButton();

    await waitForExpect(() => {
      expect(actionRoot.authAction.doLogin).toHaveBeenCalledTimes(1);
    });
    await waitForExpect(() => {
      checkPasswordPage.update();

      expect(checkPasswordPage.getErrorMessage(BackendError.LABEL.INVALID_CREDENTIALS).exists()).toBe(true);
    });
  });

  it('handles too many devices', async () => {
    const history = createMemoryHistory();
    const historyPushSpy = spyOn(history, 'push');

    const error = new BackendError({code: HTTP_STATUS.NOT_FOUND, label: BackendError.LABEL.TOO_MANY_CLIENTS});
    spyOn(actionRoot.authAction, 'doLogin').and.returnValue(() => Promise.reject(error));

    const checkPasswordPage = new CheckPasswordPage(
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

    checkPasswordPage.enterPassword('e');

    expect(checkPasswordPage.getLoginButton().props().disabled).toBe(false);

    checkPasswordPage.clickLoginButton();

    await waitForExpect(() => {
      expect(actionRoot.authAction.doLogin).toHaveBeenCalled();

      expect(historyPushSpy).toHaveBeenCalledWith(ROUTE.CLIENTS as any);
    });
  });
});
