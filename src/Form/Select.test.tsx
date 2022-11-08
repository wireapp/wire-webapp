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

/* eslint-disable jest/expect-expect */

import * as React from 'react';

import {Select} from './Select';

import {matchComponent} from '../test/testUtil';

const props: React.ComponentProps<typeof Select> = {
  options: [],
  id: 'test',
  dataUieName: 'test',
};

describe('"Select"', () => {
  it('renders', () =>
    matchComponent(
      <Select {...props}>
        <option>a</option>
        <option>b</option>
      </Select>,
    ));
  it('renders as disabled', () => matchComponent(<Select {...props} disabled></Select>));
  it('renders as invalid', () => matchComponent(<Select {...props} markInvalid></Select>));
});
