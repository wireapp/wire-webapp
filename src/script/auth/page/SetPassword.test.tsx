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
import React from 'react';
import {initialRootState} from '../module/reducer';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';
import SetPassword from './SetPassword';

describe('"SetPassword"', () => {
  let wrapper: ReactWrapper;

  const passwordInput = () => wrapper.find('input[data-uie-name="enter-password"]').first();
  const setPasswordButton = () => wrapper.find('button[data-uie-name="do-set-password"]').first();
  const errorMessage = () => wrapper.find('[data-uie-name="error-message"]').first();

  it('has disabled submit button as long as there is no input', () => {
    wrapper = mountComponent(
      <SetPassword />,
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
      .withContext('password input should be present')
      .toBe(true);
    expect(setPasswordButton().exists())
      .withContext('submit button should be present')
      .toBe(true);

    expect(setPasswordButton().props().disabled)
      .withContext('submit button should be disabled')
      .toBe(true);
    passwordInput().simulate('change', {target: {value: 'e'}});
    expect(setPasswordButton().props().disabled)
      .withContext('submit button should be enabled')
      .toBe(false);
  });

  it('handles invalid password', () => {
    wrapper = mountComponent(
      <SetPassword />,
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    expect(
      errorMessage()
        .text()
        .trim(),
    )
      .withContext('does not show error')
      .toEqual('');

    passwordInput().simulate('change', {target: {value: 'e'}});
    setPasswordButton().simulate('submit');

    expect(errorMessage().text())
      .withContext('shows invalid password error')
      .toEqual(
        'Use at least 8 characters, with one lowercase letter, one capital letter, a number, and a special character.',
      );
  });
});
