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

import {Heading} from './Heading';

import {THEME_ID} from '../Layout';
import {matchComponent} from '../test/testUtil';

/* eslint-disable jest/expect-expect */

describe('"Heading"', () => {
  it('renders H1 as default', () => matchComponent(<Heading>H1</Heading>));
  it('renders H! (dark theme)', () => matchComponent(<Heading>H1</Heading>, THEME_ID.DARK));
  it('renders H1', () => matchComponent(<Heading level="1">H1</Heading>));
  it('renders H2', () => matchComponent(<Heading level="2">H2</Heading>));
  it('renders H3', () => matchComponent(<Heading level="3">H3</Heading>));
  it('renders H4', () => matchComponent(<Heading level="4">H4</Heading>));
});
