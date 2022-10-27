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

import {fireEvent, RenderResult} from '@testing-library/react';

import {AccountForm} from './AccountForm';

import {initialRootState} from '../module/reducer';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';

describe('when entering account data', () => {
  let wrapper: RenderResult;

  const nameInput = () => wrapper.getByTestId('enter-name') as HTMLInputElement;
  const emailInput = () => wrapper.getByTestId('enter-email') as HTMLInputElement;
  const passwordInput = () => wrapper.getByTestId('enter-password') as HTMLInputElement;
  const doNextButton = () => wrapper.getByTestId('do-next') as HTMLButtonElement;
  const doTermsCheckbox = () => wrapper.getByTestId('do-terms') as HTMLInputElement;
  const validationErrorMessage = () => wrapper.getByTestId('error-message');

  describe('the submit button', () => {
    it('is disabled if input is insufficient', () => {
      wrapper = mountComponent(
        <AccountForm onSubmit={() => {}} />,
        mockStoreFactory()({
          ...initialRootState,
          authState: {
            account: {
              email: '',
              name: '',
              password: '',
            },
          },
          runtimeState: {
            hasCookieSupport: true,
            hasIndexedDbSupport: true,
            isSupportedBrowser: true,
          },
        }),
      );

      expect(nameInput().required).toBe(true);
      expect(emailInput().required).toBe(true);
      expect(passwordInput().required).toBe(true);
      expect(doTermsCheckbox().required).toBe(true);

      expect(doNextButton().disabled).toBe(true);
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

      expect(doNextButton().disabled).toBe(false);
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
              name: '',
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

      expect(doNextButton().disabled).toBe(true);
      fireEvent.change(nameInput(), {target: {value: expectedName}});

      expect(nameInput().value).toBe(expectedName);
      expect(doNextButton().disabled).toBe(false);
      fireEvent.submit(doNextButton());

      expect(validationErrorMessage().innerHTML).toContain(expectedErrorMessage);
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
              name: '',
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

      expect(doNextButton().disabled).toBe(true);
      fireEvent.change(nameInput(), {target: {value: actualName}});

      expect(nameInput().value).toBe(expectedName);
      expect(doNextButton().disabled).toBe(false);
      fireEvent.submit(doNextButton());

      expect(validationErrorMessage().innerHTML).toContain(expectedErrorMessage);
    });
  });
});
