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
import {initialRootState} from '../module/reducer';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';
import AccountForm from './AccountForm';

describe('when entering account data', () => {
  let wrapper: ReactWrapper;

  const nameInput = () => wrapper.find('[data-uie-name="enter-name"]').first();
  const emailInput = () => wrapper.find('[data-uie-name="enter-email"]').first();
  const passwordInput = () => wrapper.find('[data-uie-name="enter-password"]').first();
  const doNextButton = () => wrapper.find('[data-uie-name="do-next"]').first();
  const doTermsCheckbox = () => wrapper.find('[data-uie-name="do-terms"]').first();
  const validationErrorMessage = () => wrapper.find('[data-uie-name="error-message"]').last();

  describe('the submit button', () => {
    it('is disabled if input is insufficient', () => {
      wrapper = mountComponent(
        <AccountForm onSubmit={() => {}} />,
        mockStoreFactory()({
          ...initialRootState,
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );

      expect(nameInput().props().required).toBe(true);
      expect(emailInput().props().required).toBe(true);
      expect(passwordInput().props().required).toBe(true);
      expect(doTermsCheckbox().props().required).toBe(true);

      expect(doNextButton().props().disabled).toBe(true);
    });

    it('is enabled when data is prefilled', () => {
      wrapper = mountComponent(
        <AccountForm onSubmit={() => {}} />,
        mockStoreFactory()({
          ...initialRootState,
          authState: {
            account: {
              email: 'email@email.com',
              name: 'name',
              password: 'Ab1!Ab1!Ab1!Ab1!Ab1!',
              termsAccepted: true,
            },
          },
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );

      expect(doNextButton().props().disabled).toBe(undefined);
    });
  });

  describe('an error message', () => {
    it('appears if too few characters are entered in the name field', () => {
      const expectedName = 'M';
      const expectedErrorMessage = 'Enter a name with at least 2 characters';

      wrapper = mountComponent(
        <AccountForm onSubmit={() => {}} />,
        mockStoreFactory()({
          ...initialRootState,
          authState: {
            account: {
              email: 'email@email.com',
              password: 'Ab1!Ab1!Ab1!Ab1!Ab1!',
              termsAccepted: true,
            },
          },
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );

      expect(doNextButton().props().disabled).toBe(true);
      nameInput().simulate('change', {target: {value: expectedName}});

      expect(nameInput().props().value).toBe(expectedName);
      expect(doNextButton().props().disabled).toBe(undefined);
      doNextButton().simulate('submit');

      expect(validationErrorMessage().text()).toBe(expectedErrorMessage);
    });

    it('appears when input gets trimmed', () => {
      const actualName = '  ';
      const expectedName = '  ';
      const expectedErrorMessage = 'Enter a name with at least 2 characters';

      wrapper = mountComponent(
        <AccountForm onSubmit={() => {}} />,
        mockStoreFactory()({
          ...initialRootState,
          authState: {
            account: {
              email: 'email@email.com',
              password: 'Ab1!Ab1!Ab1!Ab1!Ab1!',
              termsAccepted: true,
            },
          },
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );

      expect(doNextButton().props().disabled).toBe(true);
      nameInput().simulate('change', {target: {value: actualName}});

      expect(nameInput().props().value).toBe(expectedName);
      expect(doNextButton().props().disabled).toBe(undefined);
      doNextButton().simulate('submit');

      expect(validationErrorMessage().text()).toBe(expectedErrorMessage);
    });
  });
});
