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

import {render} from '@testing-library/react';
import React from 'react';
import {withIntl, withTheme} from '../util/test/TestUtil';
import EntropyContainer from './EntropyContainer';
require('jest-canvas-mock');

describe('EntropyContainer', () => {
  const mockonSetEntropy = jest.fn().mockImplementation((a: [number, number][]) => {
    // eslint-disable-next-line no-console
    console.log(a);
  });

  it('renders elements', () => {
    const {getByText, queryByText} = render(withTheme(withIntl(<EntropyContainer onSetEntropy={mockonSetEntropy} />)));
    expect(getByText(/create entropy/gi)).toBeTruthy();
    expect(getByText(/move your mouse/gi)).toBeTruthy();
    expect(queryByText(/success/gi)).toBeNull();
  });
});
