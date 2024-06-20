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

import {fireEvent, waitFor} from '@testing-library/react';

import {SetPassword} from './SetPassword';

import {ValidationError} from '../module/action/ValidationError';
import {initialRootState} from '../module/reducer';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';

const passwordInputId = 'enter-password';
const setPasswordButtonId = 'do-set-password';
const errorMessageId = 'error-message';

describe('SetPassword', () => {
  it('has disabled submit button as long as there is no input', () => {
    const {getByTestId} = mountComponent(<SetPassword />, mockStoreFactory()(initialRootState));

    const passwordInput = getByTestId(passwordInputId);
    const setPasswordButton = getByTestId(setPasswordButtonId) as HTMLButtonElement;

    expect(setPasswordButton.disabled).toBe(true);
    fireEvent.change(passwordInput, {target: {value: 'e'}});

    expect(setPasswordButton.disabled).toBe(false);
  });

  it('handles invalid password', async () => {
    const {getByTestId, container} = mountComponent(<SetPassword />, mockStoreFactory()(initialRootState));

    const passwordInput = getByTestId(passwordInputId);

    fireEvent.change(passwordInput, {target: {value: 'e'}});
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => {
      const errorMessage = getByTestId(errorMessageId);
      expect(errorMessage.dataset.uieValue).toBe(ValidationError.FIELD.PASSWORD.PATTERN_MISMATCH);
    });
  });
});
