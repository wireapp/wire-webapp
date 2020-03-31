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
import waitForExpect from 'wait-for-expect';
import {actionRoot} from '../module/action';
import {ValidationError} from '../module/action/ValidationError';
import {initialRootState, RootState, Api} from '../module/reducer';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';
import SetEmail from './SetEmail';
import {MockStoreEnhanced} from 'redux-mock-store';
import {TypeUtil} from '@wireapp/commons';
import {ThunkDispatch} from 'redux-thunk';
import {AnyAction} from 'redux';
import {History} from 'history';

class SetEmailPage {
  private readonly driver: ReactWrapper;

  constructor(
    store: MockStoreEnhanced<TypeUtil.RecursivePartial<RootState>, ThunkDispatch<RootState, Api, AnyAction>>,
    history?: History<any>,
  ) {
    this.driver = mountComponent(<SetEmail />, store, history);
  }

  getEmailInput = () => this.driver.find('input[data-uie-name="enter-email"]');
  getVerifyEmailButton = () => this.driver.find('button[data-uie-name="do-verify-email"]');
  getErrorMessage = (errorLabel?: string) =>
    this.driver.find(`[data-uie-name="error-message"]${errorLabel ? `[data-uie-value="${errorLabel}"]` : ''}`);

  clickVerifyEmailButton = () => this.getVerifyEmailButton().simulate('submit');

  enterEmail = (value: string) => this.getEmailInput().simulate('change', {target: {value}});

  update = () => this.driver.update();
}

describe('SetEmail', () => {
  it('has disabled submit button as long as there is no input', () => {
    const setEmailPage = new SetEmailPage(
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    expect(setEmailPage.getEmailInput().exists()).withContext('Email input should be present').toBe(true);

    expect(setEmailPage.getVerifyEmailButton().exists()).withContext('Submit button should be present').toBe(true);

    expect(setEmailPage.getVerifyEmailButton().props().disabled)
      .withContext('Submit button should be disabled')
      .toBe(true);
    setEmailPage.enterEmail('e');

    expect(setEmailPage.getVerifyEmailButton().props().disabled)
      .withContext('Submit button should be enabled')
      .toBe(false);
  });

  it('handles invalid email', async () => {
    const setEmailPage = new SetEmailPage(
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    expect(setEmailPage.getErrorMessage().exists()).withContext('Shows no error').toBe(false);

    setEmailPage.enterEmail('e');
    setEmailPage.clickVerifyEmailButton();

    await waitForExpect(() => {
      setEmailPage.update();

      expect(setEmailPage.getErrorMessage(ValidationError.FIELD.EMAIL.TYPE_MISMATCH).exists())
        .withContext('Shows invalid email error')
        .toBe(true);
    });
  });

  it('trims the email', () => {
    spyOn(actionRoot.selfAction, 'doSetEmail').and.returnValue(() => Promise.resolve());

    const email = 'e@e.com';

    const setEmailPage = new SetEmailPage(
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    setEmailPage.enterEmail(` ${email} `);
    setEmailPage.clickVerifyEmailButton();

    expect(actionRoot.selfAction.doSetEmail).withContext('action was called').toHaveBeenCalledWith(email);
  });
});
