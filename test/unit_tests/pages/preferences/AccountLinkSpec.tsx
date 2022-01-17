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

import React from 'react';
import {render, fireEvent, screen} from '@testing-library/react';
import AccountLink from '../../../../src/script/page/preferences/accountPreferences/AccountLink';
import * as utils from '../../../../src/script/util/ClipboardUtil';

test('copies correct text', async () => {
  const mockCopy: any = jest.spyOn(utils, 'copyText');
  mockCopy.mockImplementation((text: string) => text);

  render(<AccountLink label="test" value="test-value" />);

  const button = await screen.findByRole('button');
  fireEvent.click(button);

  expect(mockCopy).toBeCalledTimes(1);
  expect(mockCopy).toReturnWith('test-value');
});

test('renders elements correctly', () => {
  render(<AccountLink label="test" value="test-value" />);
  const label = screen.getByText(/^test$/);
  const value = screen.getByText(/test-value/);

  expect(label).toBeTruthy();
  expect(value).toBeTruthy();
});
