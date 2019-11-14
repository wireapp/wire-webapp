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
import {createMemoryHistory} from 'history';
import React from 'react';
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
  const loginButton = () => wrapper.find('button[data-uie-name="do-sign-in"]').first();

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

    expect(phoneInput().exists()).toBe(true);
    expect(countryCodeInput().exists()).toBe(true);
    expect(loginButton().exists()).toBe(true);

    expect(loginButton().props().disabled).toBe(true);
    phoneInput().simulate('change', {target: {value: '1'}});

    expect(loginButton().props().disabled).toBe(false);
  });

  it('has an option to navigate back', () => {
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

    expect(backButton().exists()).toBe(true);
    backButton().simulate('click');
    expect(historyPushSpy).toHaveBeenCalledWith(ROUTE.LOGIN as any);
  });
});
