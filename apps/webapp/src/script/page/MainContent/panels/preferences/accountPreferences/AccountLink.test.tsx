/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {fireEvent, render, screen} from '@testing-library/react';
import {withTheme} from 'src/script/auth/util/test/TestUtil';

import {AccountLink} from './AccountLink';

import * as utils from '../../../../../util/ClipboardUtil';

test('copies correct text', async () => {
  const mockCopy: any = jest.spyOn(utils, 'copyText');
  mockCopy.mockImplementation((text: string) => text);

  render(withTheme(<AccountLink label="test" value="test-value" />));

  const button = await screen.findByRole('button');
  fireEvent.click(button);

  expect(mockCopy).toHaveBeenCalledTimes(1);
  expect(mockCopy).toHaveReturnedWith('test-value');
});

test('renders elements correctly', () => {
  render(withTheme(<AccountLink label="test" value="test-value" />));
  const label = screen.getByTestId('label-profile-link');
  const value = screen.getByTestId('profile-link');
  const button = screen.getByTestId('do-copy-profile-link');

  expect(label).toBeTruthy();
  expect(value).toBeTruthy();
  expect(button).toBeTruthy();
});
