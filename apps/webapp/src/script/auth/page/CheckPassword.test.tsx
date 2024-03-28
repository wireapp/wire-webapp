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

import {fireEvent, waitFor} from '@testing-library/dom';
import {BackendError, BackendErrorLabel} from '@wireapp/api-client/lib/http/';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {act} from 'react-dom/test-utils';

import {CheckPassword} from './CheckPassword';

import {actionRoot} from '../module/action';
import {initialRootState} from '../module/reducer';
import {ROUTE} from '../route';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';

describe('CheckPassword', () => {
  it('has disabled submit button as long as there is no input', () => {
    const {getByTestId} = mountComponent(
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

    const loginButton = getByTestId('do-sign-in') as HTMLButtonElement;
    const passwordInput = getByTestId('enter-password');
    expect(passwordInput).not.toBeNull();
    expect(loginButton).not.toBeNull();
    expect(loginButton.disabled).toBe(true);
    fireEvent.change(passwordInput, {target: {value: 'e'}});
    expect(loginButton.disabled).toBe(false);
  });

  it('navigates to the history page on valid password', async () => {
    const history = window.history;
    const historyPushSpy = spyOn(history, 'pushState');

    spyOn(actionRoot.authAction, 'doLogin').and.returnValue(() => Promise.resolve());

    const {getByTestId} = mountComponent(
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
    const loginButton = getByTestId('do-sign-in') as HTMLButtonElement;
    const passwordInput = getByTestId('enter-password');
    fireEvent.change(passwordInput, {target: {value: 'e'}});

    expect(loginButton.disabled).toBe(false);

    act(() => {
      loginButton.click();
    });

    await waitFor(() => {
      expect(actionRoot.authAction.doLogin).toHaveBeenCalled();
      expect(historyPushSpy).toHaveBeenCalledWith(expect.any(Object), expect.any(String), `#${ROUTE.HISTORY_INFO}`);
    });
  });

  it('handles invalid credentials', async () => {
    const error = new BackendError('', BackendErrorLabel.INVALID_CREDENTIALS, HTTP_STATUS.NOT_FOUND);
    spyOn(actionRoot.authAction, 'doLogin').and.returnValue(() => Promise.reject(error));

    const {getByTestId} = mountComponent(
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

    const passwordInput = getByTestId('enter-password');
    const loginButton = getByTestId('do-sign-in') as HTMLButtonElement;

    fireEvent.change(passwordInput, {target: {value: 'e'}});

    expect(loginButton.disabled).toBe(false);

    act(() => {
      loginButton.click();
    });

    await waitFor(() => {
      expect(actionRoot.authAction.doLogin).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      const errorMessage = getByTestId('error-message');
      expect(errorMessage.dataset.uieValue).toEqual(BackendErrorLabel.INVALID_CREDENTIALS);
    });
  });

  it('handles too many devices', async () => {
    const history = window.history;
    const historyPushSpy = spyOn(history, 'pushState');

    const error = new BackendError('', BackendErrorLabel.TOO_MANY_CLIENTS, HTTP_STATUS.NOT_FOUND);
    spyOn(actionRoot.authAction, 'doLogin').and.returnValue(() => Promise.reject(error));

    const {getByTestId} = mountComponent(
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

    const passwordInput = getByTestId('enter-password');
    const loginButton = getByTestId('do-sign-in') as HTMLButtonElement;
    fireEvent.change(passwordInput, {target: {value: 'e'}});

    expect(loginButton.disabled).toBe(false);

    act(() => {
      loginButton.click();
    });

    await waitFor(() => {
      expect(actionRoot.authAction.doLogin).toHaveBeenCalled();

      expect(historyPushSpy).toHaveBeenCalledWith(expect.any(Object), expect.any(String), `#${ROUTE.CLIENTS}`);
    });
  });
});
