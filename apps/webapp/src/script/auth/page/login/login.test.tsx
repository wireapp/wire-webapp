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

import {fireEvent, render, waitFor} from '@testing-library/react';
import {ClientType} from '@wireapp/api-client/lib/client';
import {BackendError, BackendErrorLabel} from '@wireapp/api-client/lib/http/';
import {Runtime, TypeUtil} from '@wireapp/commons';
import {StatusCodes} from 'http-status-codes';
import {Provider} from 'react-redux';
import {HashRouter as Router} from 'react-router';

import {Login} from './login';

import {Config, Configuration} from '../../../Config';
import {configureStore} from '../../configureStore';
import {actionRoot} from '../../module/action';
import {AuthActionCreator} from '../../module/action/creator';
import {initialRootState, ThunkDispatch} from '../../module/reducer';
import {ROUTE} from '../../route';
import {mockStoreFactory} from '../../util/test/mockStoreFactory';
import {mountComponent, withIntl, withTheme} from '../../util/test/testUtil';

describe('Login', () => {
  it('successfully logs in with email', async () => {
    const historyPushSpy = spyOn(history, 'pushState');

    const email = 'email@mail.com';
    const password = 'password';

    spyOn(actionRoot.authAction, 'doLogin').and.returnValue(() => Promise.resolve());

    const {getByTestId} = mountComponent(<Login />, mockStoreFactory()(initialRootState));

    const emailInput = getByTestId('enter-email');
    const passwordInput = getByTestId('enter-password');
    const submitButton = getByTestId('do-sign-in');

    fireEvent.change(emailInput, {target: {value: email}});
    fireEvent.change(passwordInput, {target: {value: password}});
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(actionRoot.authAction.doLogin).toHaveBeenCalledWith(
        {clientType: ClientType.PERMANENT, email, password},
        undefined,
      );
    });

    expect(historyPushSpy).toHaveBeenCalledWith(expect.any(Object), expect.any(String), `#${ROUTE.HISTORY_INFO}`);
  });

  it('redirects to client deletion page if max devices is reached', async () => {
    const historyPushSpy = spyOn(history, 'pushState');

    const email = 'email@mail.com';
    const password = 'password';

    spyOn(actionRoot.authAction, 'doLogin').and.returnValue(() =>
      Promise.reject(new BackendError('Too many clients', BackendErrorLabel.TOO_MANY_CLIENTS, StatusCodes.NOT_FOUND)),
    );

    const {getByTestId} = mountComponent(<Login />, mockStoreFactory()(initialRootState));

    const emailInput = getByTestId('enter-email');
    const passwordInput = getByTestId('enter-password');
    const submitButton = getByTestId('do-sign-in');

    fireEvent.change(emailInput, {target: {value: email}});
    fireEvent.change(passwordInput, {target: {value: password}});
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(actionRoot.authAction.doLogin).toHaveBeenCalledWith(
        {clientType: ClientType.PERMANENT, email, password},
        undefined,
      );
    });

    expect(historyPushSpy).toHaveBeenCalledWith(expect.any(Object), expect.any(String), `#${ROUTE.CLIENTS}`);
  });

  it('successfully logs in with handle', async () => {
    const historyPushSpy = spyOn(history, 'pushState');

    const handle = 'extra-long-handle-with-special-characters...';
    const password = 'password';

    spyOn(actionRoot.authAction, 'doLogin').and.returnValue(() => Promise.resolve());

    const {getByTestId} = mountComponent(<Login />, mockStoreFactory()(initialRootState));

    const emailInput = getByTestId('enter-email');
    const passwordInput = getByTestId('enter-password');
    const submitButton = getByTestId('do-sign-in');

    fireEvent.change(emailInput, {target: {value: handle}});
    fireEvent.change(passwordInput, {target: {value: password}});
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(actionRoot.authAction.doLogin).toHaveBeenCalledWith(
        {clientType: ClientType.PERMANENT, handle, password},
        undefined,
      );
    });

    expect(historyPushSpy).toHaveBeenCalledWith(expect.any(Object), expect.any(String), `#${ROUTE.HISTORY_INFO}`);
  });

  it('keeps invalid credentials visible after a failed Electron login rerender', async () => {
    const invalidCredentialsError = new BackendError(
      'Authentication failed',
      BackendErrorLabel.INVALID_CREDENTIALS,
      StatusCodes.FORBIDDEN,
    );
    const authErrorTransitions: Array<Error | null> = [];

    spyOn(Runtime, 'isDesktopApp').and.returnValue(true);
    spyOn(actionRoot.authAction, 'doLogin').and.returnValue(async (dispatch: ThunkDispatch): Promise<void> => {
      dispatch(AuthActionCreator.startLogin());
      dispatch(AuthActionCreator.failedLogin(invalidCredentialsError));
      throw invalidCredentialsError;
    });

    const store = configureStore();
    store.subscribe(() => {
      authErrorTransitions.push(store.getState().authState.error);
    });

    const {getByTestId} = render(
      <Router>{withTheme(<Provider store={store}>{withIntl(<Login />)}</Provider>)}</Router>,
    );

    fireEvent.change(getByTestId('enter-email'), {target: {value: 'email@mail.com'}});
    fireEvent.change(getByTestId('enter-password'), {target: {value: 'wrong-password'}});
    fireEvent.click(getByTestId('do-sign-in'));

    await waitFor(() => {
      expect(getByTestId('error-message')).toBeVisible();
    });

    const errorMessage = getByTestId('error-message');
    const finalAuthErrorTransition = authErrorTransitions[authErrorTransitions.length - 1];
    expect(errorMessage).toHaveAttribute('data-uie-value', BackendErrorLabel.INVALID_CREDENTIALS);
    expect(getByTestId('do-sign-in')).toBeVisible();
    expect(store.getState().authState.error).toBe(invalidCredentialsError);
    expect(finalAuthErrorTransition).toBe(invalidCredentialsError);
  });

  it('has disabled submit button as long as one input is empty', () => {
    const {getByTestId} = mountComponent(<Login />, mockStoreFactory()(initialRootState));

    const emailInput = getByTestId('enter-email');
    const passwordInput = getByTestId('enter-password');
    const submitButton = getByTestId('do-sign-in') as HTMLButtonElement;

    expect(submitButton.disabled).toBe(true);
    fireEvent.change(emailInput, {target: {value: 'e'}});

    expect(submitButton.disabled).toBe(true);
    fireEvent.change(passwordInput, {target: {value: 'e'}});

    expect(submitButton.disabled).toBe(false);
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
      const {queryByTestId} = mountComponent(<Login />, mockStoreFactory()(initialRootState));

      const backButton = queryByTestId('go-index');
      expect(backButton).toBeNull();
    });
  });

  describe('with account registration enabled', () => {
    it('shows the back button', () => {
      spyOn<{getConfig: () => TypeUtil.RecursivePartial<Configuration>}>(Config, 'getConfig').and.returnValue({
        FEATURE: {
          ENABLE_ACCOUNT_REGISTRATION: true,
        },
      });
      const {getByTestId} = mountComponent(<Login />, mockStoreFactory()(initialRootState));

      const backButton = getByTestId('go-index');
      expect(backButton).not.toBeNull();
    });
  });
});
