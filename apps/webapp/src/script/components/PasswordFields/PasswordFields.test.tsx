/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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
 */

import {useRef, useState, type JSX} from 'react';

import {fireEvent, render, screen} from '@testing-library/react';

import {withTheme} from '../../auth/util/test/testUtil';
import {translateForTest} from '../../util/test/translateForTest';

import {PasswordFields} from './PasswordFields';

describe('PasswordFields', () => {
  it('renders required password inputs and forwards their changes', () => {
    const onPasswordValueChange = jest.fn();
    const onPasswordConfirmationChange = jest.fn();
    const passwordValueRef = {current: null};

    render(
      withTheme(
        <PasswordFields
          translate={translateForTest}
          passwordValue=""
          passwordValueRef={passwordValueRef}
          onPasswordValueChange={onPasswordValueChange}
          isPasswordInputMarkInvalid={false}
          passwordConfirmationValue=""
          onPasswordConfirmationChange={onPasswordConfirmationChange}
          isPasswordConfirmationMarkInvalid={false}
        />,
      ),
    );

    const passwordInput = screen.getByTestId('guest-link-password');
    const confirmationInput = screen.getByTestId('guest-link-password-confirm');

    expect(passwordInput).toBeRequired();
    expect(confirmationInput).toBeRequired();
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(confirmationInput).toHaveAttribute('type', 'password');

    fireEvent.change(passwordInput, {target: {value: 'ValidPassword1!'}});
    fireEvent.change(confirmationInput, {target: {value: 'ValidPassword1!'}});

    expect(onPasswordValueChange).toHaveBeenCalledWith('ValidPassword1!');
    expect(onPasswordConfirmationChange).toHaveBeenCalledWith('ValidPassword1!');
  });

  it('can render optional password inputs', () => {
    render(
      withTheme(
        <PasswordFields
          translate={translateForTest}
          required={false}
          passwordValue=""
          passwordValueRef={{current: null}}
          onPasswordValueChange={jest.fn()}
          isPasswordInputMarkInvalid={false}
          passwordConfirmationValue=""
          onPasswordConfirmationChange={jest.fn()}
          isPasswordConfirmationMarkInvalid={false}
        />,
      ),
    );

    expect(screen.getByTestId('guest-link-password')).not.toBeRequired();
    expect(screen.getByTestId('guest-link-password-confirm')).not.toBeRequired();
  });

  it('keeps clear buttons in optional meeting password fields', () => {
    render(
      withTheme(
        <PasswordFields
          translate={translateForTest}
          required={false}
          passwordValue="secret"
          passwordValueRef={{current: null}}
          onPasswordValueChange={jest.fn()}
          isPasswordInputMarkInvalid={false}
          passwordConfirmationValue="secret"
          onPasswordConfirmationChange={jest.fn()}
          isPasswordConfirmationMarkInvalid={false}
        />,
      ),
    );

    expect(screen.getAllByRole('button', {name: 'password.clear'})).toHaveLength(2);
  });

  it('shows the password error when the password input is marked invalid', () => {
    render(
      withTheme(
        <PasswordFields
          translate={translateForTest}
          passwordValue="invalid"
          passwordValueRef={{current: null}}
          onPasswordValueChange={jest.fn()}
          isPasswordInputMarkInvalid
          passwordConfirmationValue="invalid"
          onPasswordConfirmationChange={jest.fn()}
          isPasswordConfirmationMarkInvalid={false}
        />,
      ),
    );

    expect(screen.getByTestId('primary-modals-error-message')).toBeInTheDocument();
  });

  it('clears each populated meeting password field independently', () => {
    const onPasswordValueChange = jest.fn();
    const onPasswordConfirmationChange = jest.fn();
    render(
      withTheme(
        <PasswordFields
          translate={translateForTest}
          passwordValue="secret"
          passwordValueRef={{current: null}}
          onPasswordValueChange={onPasswordValueChange}
          isPasswordInputMarkInvalid={false}
          passwordConfirmationValue="secret"
          onPasswordConfirmationChange={onPasswordConfirmationChange}
          isPasswordConfirmationMarkInvalid={false}
        />,
      ),
    );

    const clearButtons = screen.getAllByRole('button', {name: 'password.clear'});
    expect(clearButtons).toHaveLength(2);
    fireEvent.click(clearButtons[0]);
    expect(onPasswordValueChange).toHaveBeenCalledWith('');
    expect(screen.getByTestId('guest-link-password')).toHaveFocus();
    fireEvent.click(clearButtons[1]);
    expect(onPasswordConfirmationChange).toHaveBeenCalledWith('');
    expect(screen.getByTestId('guest-link-password-confirm')).toHaveFocus();
  });

  it('returns focus to each input when clearing removes its button', () => {
    const ControlledFields = (): JSX.Element => {
      const [password, setPassword] = useState('secret');
      const [confirmation, setConfirmation] = useState('secret');
      const passwordRef = useRef<HTMLInputElement>(null);
      return (
        <PasswordFields
          translate={translateForTest}
          passwordValue={password}
          passwordValueRef={passwordRef}
          onPasswordValueChange={setPassword}
          isPasswordInputMarkInvalid={false}
          passwordConfirmationValue={confirmation}
          onPasswordConfirmationChange={setConfirmation}
          isPasswordConfirmationMarkInvalid={false}
        />
      );
    };
    render(withTheme(<ControlledFields />));

    fireEvent.click(screen.getAllByRole('button', {name: 'password.clear'})[0]);
    expect(screen.getByTestId('guest-link-password')).toHaveFocus();
    expect(screen.getAllByRole('button', {name: 'password.clear'})).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', {name: 'password.clear'}));
    expect(screen.getByTestId('guest-link-password-confirm')).toHaveFocus();
    expect(screen.queryByRole('button', {name: 'password.clear'})).not.toBeInTheDocument();
  });
});
