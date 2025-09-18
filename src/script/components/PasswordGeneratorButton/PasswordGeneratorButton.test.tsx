/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {render} from '@testing-library/react';
import {act} from 'react-dom/test-utils';

import {PasswordGeneratorButton} from './PasswordGeneratorButton';

import {withTheme} from '../../auth/util/test/TestUtil';

describe('PasswordGeneratorButton', () => {
  it('calls onGeneratePassword prop with a random password when clicked', () => {
    const onGeneratePasswordMock = jest.fn();
    const {getByTestId} = render(withTheme(<PasswordGeneratorButton onGeneratePassword={onGeneratePasswordMock} />));
    const generatePasswordButton = getByTestId('do-generate-password');

    act(() => {
      generatePasswordButton.click();
    });

    expect(onGeneratePasswordMock).toHaveBeenCalledTimes(1);
    expect(onGeneratePasswordMock).toHaveBeenCalledWith(expect.any(String));
  });

  it('calls onGeneratePassword prop with a random password with 15 charachters when clicked', () => {
    const onGeneratePasswordMock = jest.fn();
    const {getByTestId} = render(
      withTheme(<PasswordGeneratorButton passwordLength={15} onGeneratePassword={onGeneratePasswordMock} />),
    );
    const generatePasswordButton = getByTestId('do-generate-password');

    act(() => {
      generatePasswordButton.click();
    });

    expect(onGeneratePasswordMock).toHaveBeenCalledTimes(1);
    expect(onGeneratePasswordMock).toHaveBeenCalledWith(expect.stringMatching(/^.{15}$/));
  });

  it('displays a shield icon next to the button label', () => {
    const {getByTestId} = render(withTheme(<PasswordGeneratorButton onGeneratePassword={jest.fn()} />));
    const shieldIcon = getByTestId('generate-password-icon');
    expect(shieldIcon).toBeTruthy();
  });

  it('uses the onGeneratePassword prop to generate a new password each time the button is clicked', () => {
    const onGeneratePasswordMock = jest.fn();
    const {getByTestId} = render(withTheme(<PasswordGeneratorButton onGeneratePassword={onGeneratePasswordMock} />));
    const generatePasswordButton = getByTestId('do-generate-password');

    act(() => {
      generatePasswordButton.click();
    });

    const firstPassword = onGeneratePasswordMock.mock.calls[0][0];
    onGeneratePasswordMock.mockClear();

    act(() => {
      generatePasswordButton.click();
    });

    const secondPassword = onGeneratePasswordMock.mock.calls[0][0];

    expect(firstPassword).not.toBe(secondPassword);
  });
});
