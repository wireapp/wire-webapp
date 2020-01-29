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
import waitForExpect from 'wait-for-expect';
import {ValidationError} from '../module/action/ValidationError';
import {initialRootState} from '../module/reducer';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';
import SetPassword from './SetPassword';

describe('"SetPassword"', () => {
  let wrapper: ReactWrapper;

  const passwordInput = () => wrapper.find('input[data-uie-name="enter-password"]').first();
  const setPasswordButton = () => wrapper.find('button[data-uie-name="do-set-password"]').first();
  const errorMessage = (errorLabel?: string) =>
    wrapper.find(`[data-uie-name="error-message"]${errorLabel ? `[data-uie-value="${errorLabel}"]` : ''}`);

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

  it('handles invalid password', async () => {
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

    expect(errorMessage().exists())
      .withContext('Shows no error')
      .toBe(false);

    passwordInput().simulate('change', {target: {value: 'e'}});
    setPasswordButton().simulate('submit');

    await waitForExpect(() => {
      wrapper.update();

      expect(errorMessage(ValidationError.FIELD.PASSWORD.PATTERN_MISMATCH).exists())
        .withContext('Shows invalid password error')
        .toBe(true);
    });
  });
});
