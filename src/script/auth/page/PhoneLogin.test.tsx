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

import {fireEvent, waitFor} from '@testing-library/react';
import {PasswordExistsError} from '@wireapp/api-client/lib/auth';

import {PhoneLogin} from './PhoneLogin';

import {actionRoot} from '../module/action';
import {initialRootState} from '../module/reducer';
import {ROUTE} from '../route';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';

jest.mock('../util/SVGProvider');
const backButtonId = 'go-login';
const phoneInputId = 'enter-phone';
const countryCodeInputId = 'enter-country-code';
const loginButtonId = 'do-sign-in-phone';

describe('PhoneLogin', () => {
  it('has disabled submit button as long as one input is empty', () => {
    const {getByTestId} = mountComponent(
      <PhoneLogin />,
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    const phoneInput = getByTestId(phoneInputId);
    const loginButton = getByTestId(loginButtonId) as HTMLButtonElement;

    expect(loginButton.disabled).toBe(true);
    fireEvent.change(phoneInput, {target: {value: '1'}});

    expect(loginButton.disabled).toBe(false);
  });

  it('has an option to navigate back', async () => {
    const {getByTestId} = mountComponent(
      <PhoneLogin />,
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    const backButton = getByTestId(backButtonId) as HTMLAnchorElement;
    expect(backButton.href).toContain(ROUTE.LOGIN);
  });

  it('navigates to verify phone code page if no password is set', async () => {
    const historyPushSpy = spyOn(history, 'pushState');

    spyOn(actionRoot.authAction, 'doSendPhoneLoginCode').and.returnValue(() => Promise.resolve());

    const {getByTestId} = mountComponent(
      <PhoneLogin />,
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    const phoneInput = getByTestId(phoneInputId);
    const countryCodeInput = getByTestId(countryCodeInputId);
    const loginButton = getByTestId(loginButtonId) as HTMLButtonElement;

    fireEvent.change(phoneInput, {target: {value: '1111111'}});
    fireEvent.change(countryCodeInput, {target: {value: '+0'}});

    expect(loginButton.disabled).toBe(false);
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(actionRoot.authAction.doSendPhoneLoginCode).toHaveBeenCalled();

      expect(historyPushSpy).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        `#${ROUTE.VERIFY_PHONE_CODE}`,
      );
    });
  });

  it('navigates to check password page if password is set', async () => {
    const historyPushSpy = spyOn(history, 'pushState');

    const error: any = new PasswordExistsError('test error') as any;
    spyOn(actionRoot.authAction, 'doSendPhoneLoginCode').and.returnValue(() => Promise.reject(error));

    const {getByTestId} = mountComponent(
      <PhoneLogin />,
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    const phoneInput = getByTestId(phoneInputId);
    const countryCodeInput = getByTestId(countryCodeInputId);
    const loginButton = getByTestId(loginButtonId) as HTMLButtonElement;

    fireEvent.change(phoneInput, {target: {value: '1111111'}});
    fireEvent.change(countryCodeInput, {target: {value: '+0'}});

    expect(loginButton.disabled).toBe(false);
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(actionRoot.authAction.doSendPhoneLoginCode).toHaveBeenCalled();

      expect(historyPushSpy).toHaveBeenCalledWith(expect.any(Object), expect.any(String), `#${ROUTE.CHECK_PASSWORD}`);
    });
  });
});
