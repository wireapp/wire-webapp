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

import {PasswordExistsError} from '@wireapp/api-client/src/auth';
import {ReactWrapper} from 'enzyme';
import {createMemoryHistory} from 'history';
import React from 'react';
import waitForExpect from 'wait-for-expect';
import {actionRoot} from '../module/action';
import {initialRootState, RootState, Api} from '../module/reducer';
import {ROUTE} from '../route';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';
import PhoneLogin from './PhoneLogin';
import {MockStoreEnhanced} from 'redux-mock-store';
import {TypeUtil} from '@wireapp/commons';
import {ThunkDispatch} from 'redux-thunk';
import {AnyAction} from 'redux';
import {History} from 'history';

class PhoneLoginPage {
  private readonly driver: ReactWrapper;

  constructor(
    store: MockStoreEnhanced<TypeUtil.RecursivePartial<RootState>, ThunkDispatch<RootState, Api, AnyAction>>,
    history?: History<any>,
  ) {
    this.driver = mountComponent(<PhoneLogin />, store, history);
  }

  getBackButton = () => this.driver.find('a[data-uie-name="go-login"]');
  getPhoneInput = () => this.driver.find('input[data-uie-name="enter-phone"]');
  getCountryCodeInput = () => this.driver.find('input[data-uie-name="enter-country-code"]');
  getLoginButton = () => this.driver.find('button[data-uie-name="do-sign-in-phone"]');

  clickLoginButton = () => this.getLoginButton().simulate('click');
}

describe('PhoneLogin', () => {
  it('has disabled submit button as long as one input is empty', () => {
    const phoneLoginPage = new PhoneLoginPage(
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    expect(phoneLoginPage.getPhoneInput().exists()).withContext('phone number input is present').toBe(true);

    expect(phoneLoginPage.getCountryCodeInput().exists()).withContext('country code input is present').toBe(true);

    expect(phoneLoginPage.getLoginButton().exists()).withContext('login button is present').toBe(true);

    expect(phoneLoginPage.getLoginButton().props().disabled).withContext('login button is disabled').toBe(true);
    phoneLoginPage.getPhoneInput().simulate('change', {target: {value: '1'}});

    expect(phoneLoginPage.getLoginButton().props().disabled).withContext('login button is not disabled').toBe(false);
  });

  it('has an option to navigate back', async () => {
    const history = createMemoryHistory();
    const historyPushSpy = spyOn(history, 'push');
    const phoneLoginPage = new PhoneLoginPage(
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

    expect(phoneLoginPage.getBackButton().exists()).withContext('back button is present').toBe(true);
    phoneLoginPage.getBackButton().simulate('click');

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

    const phoneLoginPage = new PhoneLoginPage(
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

    phoneLoginPage.getCountryCodeInput().simulate('change', {target: {value: '+0'}});
    phoneLoginPage.getPhoneInput().simulate('change', {target: {value: '1111111'}});

    expect(phoneLoginPage.getLoginButton().props().disabled).withContext('login button is not disabled').toBe(false);
    phoneLoginPage.getLoginButton().simulate('click');

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

    const phoneLoginPage = new PhoneLoginPage(
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

    phoneLoginPage.getCountryCodeInput().simulate('change', {target: {value: '+0'}});
    phoneLoginPage.getPhoneInput().simulate('change', {target: {value: '1111111'}});

    expect(phoneLoginPage.getLoginButton().props().disabled).withContext('login button is not disabled').toBe(false);
    phoneLoginPage.getLoginButton().simulate('click');

    await waitForExpect(() => {
      expect(actionRoot.authAction.doSendPhoneLoginCode).withContext('action was called').toHaveBeenCalled();

      expect(historyPushSpy)
        .withContext('navigation to verify phone code page was triggered')
        .toHaveBeenCalledWith(ROUTE.CHECK_PASSWORD as any);
    });
  });
});
