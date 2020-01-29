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
import React from 'react';
import waitForExpect from 'wait-for-expect';
import {actionRoot} from '../module/action';
import {BackendError} from '../module/action/BackendError';
import {initialRootState} from '../module/reducer';
import {ROUTE} from '../route';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';
import CheckPassword from './CheckPassword';

describe('"CheckPassword"', () => {
  let wrapper: ReactWrapper;

  const passwordInput = () => wrapper.find('input[data-uie-name="enter-password"]').first();
  const loginButton = () => wrapper.find('button[data-uie-name="do-sign-in"]').first();
  const errorMessage = (errorLabel?: string) =>
    wrapper.find(`[data-uie-name="error-message"]${errorLabel ? `[data-uie-value="${errorLabel}"]` : ''}`);

  it('has disabled submit button as long as there is no input', () => {
    wrapper = mountComponent(
      <CheckPassword />,
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    expect(passwordInput().exists())
      .withContext('password input is present')
      .toBe(true);

    expect(loginButton().exists())
      .withContext('submit button is present')
      .toBe(true);

    expect(loginButton().props().disabled)
      .withContext('submit button is disabled')
      .toBe(true);

    passwordInput().simulate('change', {target: {value: 'e'}});

    expect(loginButton().props().disabled)
      .withContext('submit button should be enabled')
      .toBe(false);
  });

  it('navigates to the history page on valid password', async () => {
    const history = createMemoryHistory();
    const historyPushSpy = spyOn(history, 'push');

    spyOn(actionRoot.authAction, 'doLogin').and.returnValue(() => Promise.resolve());

    wrapper = mountComponent(
      <CheckPassword />,
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

    passwordInput().simulate('change', {target: {value: 'e'}});

    expect(loginButton().props().disabled)
      .withContext('submit button should be enabled')
      .toBe(false);

    loginButton().simulate('click');

    await waitForExpect(() => {
      expect(actionRoot.authAction.doLogin)
        .withContext('action was called')
        .toHaveBeenCalled();

      expect(historyPushSpy)
        .withContext('navigation to history page was triggered')
        .toHaveBeenCalledWith(ROUTE.HISTORY_INFO as any);
    });
  });

  it('handles invalid credentials', async () => {
    const error = new BackendError({code: 404, label: BackendError.LABEL.INVALID_CREDENTIALS});
    spyOn(actionRoot.authAction, 'doLogin').and.returnValue(() => Promise.reject(error));

    wrapper = mountComponent(
      <CheckPassword />,
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    passwordInput().simulate('change', {target: {value: 'e'}});

    expect(loginButton().props().disabled)
      .withContext('submit button should be enabled')
      .toBe(false);

    loginButton().simulate('click');

    await waitForExpect(() => {
      expect(actionRoot.authAction.doLogin)
        .withContext('action was called')
        .toHaveBeenCalledTimes(1);
    });
    await waitForExpect(() => {
      wrapper.update();

      expect(errorMessage(BackendError.LABEL.INVALID_CREDENTIALS).exists())
        .withContext('Shows invalid credentials error')
        .toBe(true);
    });
  });

  it('handles too many devices', async () => {
    const history = createMemoryHistory();
    const historyPushSpy = spyOn(history, 'push');

    const error = new BackendError({code: 404, label: BackendError.LABEL.TOO_MANY_CLIENTS});
    spyOn(actionRoot.authAction, 'doLogin').and.returnValue(() => Promise.reject(error));

    wrapper = mountComponent(
      <CheckPassword />,
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

    passwordInput().simulate('change', {target: {value: 'e'}});

    expect(loginButton().props().disabled)
      .withContext('submit button should be enabled')
      .toBe(false);

    loginButton().simulate('click');

    await waitForExpect(() => {
      expect(actionRoot.authAction.doLogin)
        .withContext('action was called')
        .toHaveBeenCalled();

      expect(historyPushSpy)
        .withContext('navigation to too many clients page was triggered')
        .toHaveBeenCalledWith(ROUTE.CLIENTS as any);
    });
  });
});
