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

import {PasswordExistsError} from '@wireapp/api-client/dist/auth';
import {ReactWrapper} from 'enzyme';
import {createMemoryHistory} from 'history';
import React from 'react';
import waitForExpect from 'wait-for-expect';
import {actionRoot} from '../module/action';
import {initialRootState} from '../module/reducer';
import {ROUTE} from '../route';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';
import PhoneLogin from './PhoneLogin';

describe('"PhoneLogin"', () => {
  let wrapper: ReactWrapper;

  const backButton = () => wrapper.find('a[data-uie-name="go-login"]').first();
  const phoneInput = () => wrapper.find('input[data-uie-name="enter-phone"]').first();
  const countryCodeInput = () => wrapper.find('input[data-uie-name="enter-country-code"]').first();
  const loginButton = () => wrapper.find('button[data-uie-name="do-sign-in-phone"]').first();

  it('has disabled submit button as long as one input is empty', () => {
    wrapper = mountComponent(
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

    expect(phoneInput().exists())
      .withContext('phone number input is present')
      .toBe(true);
    expect(countryCodeInput().exists())
      .withContext('country code input is present')
      .toBe(true);
    expect(loginButton().exists())
      .withContext('login button is present')
      .toBe(true);

    expect(loginButton().props().disabled)
      .withContext('login button is disabled')
      .toBe(true);
    phoneInput().simulate('change', {target: {value: '1'}});

    expect(loginButton().props().disabled)
      .withContext('login button is not disabled')
      .toBe(false);
  });

  it('has an option to navigate back', async () => {
    const history = createMemoryHistory();
    const historyPushSpy = spyOn(history, 'push');
    wrapper = mountComponent(
      <PhoneLogin />,
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

    expect(backButton().exists())
      .withContext('back button is present')
      .toBe(true);
    backButton().simulate('click');

    await waitForExpect(() => {
      expect(historyPushSpy)
        .withContext('Navigation to email login was triggered')
        .toHaveBeenCalledWith(ROUTE.LOGIN as any);
    });
  });

  it('navigates to verify phone code page if no password is set', async () => {
    const history = createMemoryHistory();
    const historyPushSpy = spyOn(history, 'push');

    spyOn(actionRoot.authAction, 'doSendPhoneLoginCode').and.returnValue(() => Promise.resolve());

    wrapper = mountComponent(
      <PhoneLogin />,
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

    countryCodeInput().simulate('change', {target: {value: '+0'}});
    phoneInput().simulate('change', {target: {value: '1111111'}});

    expect(loginButton().props().disabled)
      .withContext('login button is not disabled')
      .toBe(false);
    loginButton().simulate('click');

    await waitForExpect(() => {
      expect(actionRoot.authAction.doSendPhoneLoginCode)
        .withContext('action for sending login code was called')
        .toHaveBeenCalled();
      expect(historyPushSpy)
        .withContext('Navigation to verify phone code page was triggered')
        .toHaveBeenCalledWith(ROUTE.VERIFY_PHONE_CODE as any);
    });
  });

  it('navigates to check password page if password is set', async () => {
    const history = createMemoryHistory();
    const historyPushSpy = spyOn(history, 'push');

    const error: any = new PasswordExistsError('test error') as any;
    spyOn(actionRoot.authAction, 'doSendPhoneLoginCode').and.returnValue(() => Promise.reject(error));

    wrapper = mountComponent(
      <PhoneLogin />,
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

    countryCodeInput().simulate('change', {target: {value: '+0'}});
    phoneInput().simulate('change', {target: {value: '1111111'}});

    expect(loginButton().props().disabled)
      .withContext('login button is not disabled')
      .toBe(false);
    loginButton().simulate('click');

    await waitForExpect(() => {
      expect(actionRoot.authAction.doSendPhoneLoginCode)
        .withContext('action was called')
        .toHaveBeenCalled();
      expect(historyPushSpy)
        .withContext('navigation to verify phone code page was triggered')
        .toHaveBeenCalledWith(ROUTE.CHECK_PASSWORD as any);
    });
  });
});
