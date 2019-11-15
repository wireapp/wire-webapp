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
import React from 'react';
import {actionRoot} from '../module/action';
import {initialRootState} from '../module/reducer';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';
import SetEmail from './SetEmail';

describe('"SetEmail"', () => {
  let wrapper: ReactWrapper;

  const emailInput = () => wrapper.find('input[data-uie-name="enter-email"]').first();
  const verifyEmailButton = () => wrapper.find('button[data-uie-name="do-verify-email"]').first();
  const errorMessage = () => wrapper.find('[data-uie-name="error-message"]').first();

  it('has disabled submit button as long as there is no input', () => {
    wrapper = mountComponent(
      <SetEmail />,
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    expect(emailInput().exists())
      .withContext('Email input should be present')
      .toBe(true);
    expect(verifyEmailButton().exists())
      .withContext('Submit button should be present')
      .toBe(true);

    expect(verifyEmailButton().props().disabled)
      .withContext('Submit button should be disabled')
      .toBe(true);
    emailInput().simulate('change', {target: {value: 'e'}});
    expect(verifyEmailButton().props().disabled)
      .withContext('Submit button should be enabled')
      .toBe(false);
  });

  it('handles invalid email', () => {
    wrapper = mountComponent(
      <SetEmail />,
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
      .withContext('Does not show error')
      .toEqual('');

    emailInput().simulate('change', {target: {value: 'e'}});
    verifyEmailButton().simulate('submit');

    expect(errorMessage().text())
      .withContext('Shows invalid email error')
      .toEqual('Please enter a valid email address');
  });

  it('trims the email', () => {
    spyOn(actionRoot.selfAction, 'doSetEmail').and.returnValue(() => Promise.resolve());

    const email = 'e@e.com';

    wrapper = mountComponent(
      <SetEmail />,
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    emailInput().simulate('change', {target: {value: ` ${email} `}});
    verifyEmailButton().simulate('submit');

    expect(actionRoot.selfAction.doSetEmail)
      .withContext('action was called')
      .toHaveBeenCalledWith(email);
  });
});
