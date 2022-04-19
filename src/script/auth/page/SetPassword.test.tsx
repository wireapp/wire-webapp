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
import waitForExpect from 'wait-for-expect';
import {ValidationError} from '../module/action/ValidationError';
import {initialRootState, RootState, Api} from '../module/reducer';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';
import SetPassword from './SetPassword';
import {MockStoreEnhanced} from 'redux-mock-store';
import {TypeUtil} from '@wireapp/commons';
import {ThunkDispatch} from 'redux-thunk';
import {AnyAction} from 'redux';
import {History} from 'history';

jest.mock('../util/SVGProvider');

class SetPasswordPage {
  private readonly driver: ReactWrapper;

  constructor(
    store: MockStoreEnhanced<TypeUtil.RecursivePartial<RootState>, ThunkDispatch<RootState, Api, AnyAction>>,
    history?: History,
  ) {
    this.driver = mountComponent(<SetPassword />, store, history);
  }

  getPasswordInput = () => this.driver.find('input[data-uie-name="enter-password"]');
  getSetPasswordButton = () => this.driver.find('button[data-uie-name="do-set-password"]');
  getErrorMessage = (errorLabel?: string) =>
    this.driver.find(`[data-uie-name="error-message"]${errorLabel ? `[data-uie-value="${errorLabel}"]` : ''}`);

  clickSetPasswordButton = () => this.getSetPasswordButton().simulate('submit');

  enterPassword = (value: string) => this.getPasswordInput().simulate('change', {target: {value}});

  update = () => this.driver.update();
}

describe('SetPassword', () => {
  it('has disabled submit button as long as there is no input', () => {
    const setPasswordPage = new SetPasswordPage(
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    expect(setPasswordPage.getPasswordInput().exists()).toBe(true);

    expect(setPasswordPage.getSetPasswordButton().exists()).toBe(true);

    expect(setPasswordPage.getSetPasswordButton().props().disabled).toBe(true);
    setPasswordPage.enterPassword('e');

    expect(setPasswordPage.getSetPasswordButton().props().disabled).toBe(false);
  });

  it('handles invalid password', async () => {
    const setPasswordPage = new SetPasswordPage(
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    expect(setPasswordPage.getErrorMessage().exists()).toBe(false);

    setPasswordPage.enterPassword('e');
    setPasswordPage.clickSetPasswordButton();

    await waitForExpect(() => {
      setPasswordPage.update();

      expect(setPasswordPage.getErrorMessage(ValidationError.FIELD.PASSWORD.PATTERN_MISMATCH).exists()).toBe(true);
    });
  });
});
