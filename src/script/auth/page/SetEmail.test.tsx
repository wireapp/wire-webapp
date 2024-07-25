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

import {act, fireEvent, waitFor} from '@testing-library/react';
import * as ReactRouter from 'react-router';

import {SetEmail} from './SetEmail';

import {actionRoot} from '../module/action';
import {ValidationError} from '../module/action/ValidationError';
import {initialRootState} from '../module/reducer';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';

const emailInputId = 'enter-email';
const verifyButtonId = 'do-verify-email';
const errorMessageId = 'error-message';

describe('SetEmail', () => {
  it('has disabled submit button as long as there is no input', async () => {
    const {getByTestId} = mountComponent(<SetEmail />, mockStoreFactory()(initialRootState));

    await waitFor(() => getByTestId(emailInputId));
    const emailInput = getByTestId(emailInputId);
    const verifyButton = getByTestId(verifyButtonId) as HTMLButtonElement;

    expect(verifyButton.disabled).toBe(true);
    fireEvent.change(emailInput, {target: {value: 'e'}});

    expect(verifyButton.disabled).toBe(false);
  });

  it('handles invalid email', async () => {
    const {getByTestId, container} = mountComponent(<SetEmail />, mockStoreFactory()(initialRootState));

    await waitFor(() => getByTestId(emailInputId));
    const emailInput = getByTestId(emailInputId);

    fireEvent.change(emailInput, {target: {value: 'e'}});
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => {
      const errorMessage = getByTestId(errorMessageId);

      expect(errorMessage.dataset.uieValue).toBe(ValidationError.FIELD.EMAIL.TYPE_MISMATCH);
    });
  });

  it('trims the email', async () => {
    spyOn(actionRoot.selfAction, 'doSetEmail').and.returnValue(() => Promise.resolve());
    jest.spyOn(ReactRouter, 'useNavigate').mockReturnValue(jest.fn());

    const email = 'e@e.com';

    const {getByTestId} = mountComponent(<SetEmail />, mockStoreFactory()(initialRootState));

    await waitFor(() => getByTestId(emailInputId));
    const emailInput = getByTestId(emailInputId);
    const verifyButton = getByTestId(verifyButtonId) as HTMLButtonElement;

    act(() => {
      fireEvent.change(emailInput, {target: {value: ` ${email} `}});

      fireEvent.click(verifyButton);
    });

    expect(actionRoot.selfAction.doSetEmail).toHaveBeenCalledWith(email);
  });
});
