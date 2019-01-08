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

import * as React from 'react';
import {mockStore, mountWithIntl} from '../util/TestUtil';
import AccountForm from './AccountForm';

describe('when entering account data', () => {
  let wrapper;
  const initialState = {
    authState: {
      account: {
        accent_id: undefined,
        assets: undefined,
        email: undefined,
        email_code: undefined,
        invitation_code: undefined,
        label: undefined,
        locale: undefined,
        name: undefined,
        password: undefined,
        phone: undefined,
        phone_code: undefined,
        team: undefined,
      },
      error: null,
      fetched: false,
      fetching: false,
      isAuthenticated: false,
      isInTeamFlow: false,
    },
    languageState: {
      language: 'en',
    },
  };

  const nameInput = () => wrapper.find('[data-uie-name="enter-name"]').first();
  const emailInput = () => wrapper.find('[data-uie-name="enter-email"]').first();
  const passwordInput = () => wrapper.find('[data-uie-name="enter-password"]').first();
  const doNextButton = () => wrapper.find('[data-uie-name="do-next"]').first();
  const doTermsCheckbox = () => wrapper.find('[data-uie-name="do-terms"]').first();
  const validationErrorMessage = () => wrapper.find('[data-uie-name="error-message"]').last();

  const createAccountState = account => {
    return {
      ...initialState,
      authState: {
        ...initialState.authState,
        account: {
          ...initialState.authState.account,
          ...account,
        },
      },
    };
  };

  describe('the submit button', () => {
    it('is disabled if input is insufficient', () => {
      wrapper = mountWithIntl(<AccountForm />, mockStore(initialState));

      expect(nameInput().props().required).toBe(true);
      expect(emailInput().props().required).toBe(true);
      expect(passwordInput().props().required).toBe(true);
      expect(doTermsCheckbox().props().required).toBe(true);

      expect(doNextButton().props().disabled).toBe(true);
    });

    it('is enabled when data is prefilled', () => {
      const prefilledAccount = {
        email: 'email@email.com',
        name: 'name',
        password: 'password',
        termsAccepted: true,
      };

      wrapper = mountWithIntl(<AccountForm />, mockStore(createAccountState(prefilledAccount)));

      expect(doNextButton().props().disabled).toBe(false);
    });
  });

  describe('an error message', () => {
    it('appears if too few characters are entered in the name field', done => {
      const expectedName = 'M';
      const expectedErrorMessage = 'Enter a name with at least 2 characters';

      const prefilledAccount = {
        email: 'email@email.com',
        password: 'password',
        termsAccepted: true,
      };

      wrapper = mountWithIntl(<AccountForm />, mockStore(createAccountState(prefilledAccount)));

      expect(doNextButton().props().disabled).toBe(true);
      nameInput().simulate('change', {target: {value: expectedName}});

      expect(nameInput().props().value).toBe(expectedName);
      expect(doNextButton().props().disabled).toBe(false);
      doNextButton().simulate('submit');

      expect(validationErrorMessage().text()).toBe(expectedErrorMessage);

      done();
    });

    it('appears when input gets trimmed', done => {
      const actualName = '  ';
      const expectedName = '  ';
      const expectedErrorMessage = 'Enter a name with at least 2 characters';

      const prefilledAccount = {
        email: 'email@email.com',
        password: 'password',
        termsAccepted: true,
      };

      wrapper = mountWithIntl(<AccountForm />, mockStore(createAccountState(prefilledAccount)));

      expect(doNextButton().props().disabled).toBe(true);
      nameInput().simulate('change', {target: {value: actualName}});

      expect(nameInput().props().value).toBe(expectedName);
      expect(doNextButton().props().disabled).toBe(false);
      doNextButton().simulate('submit');

      expect(validationErrorMessage().text()).toBe(expectedErrorMessage);

      done();
    });
  });
});
