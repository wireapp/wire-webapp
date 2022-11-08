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

import {ButtonLink} from './ButtonLink';

import {THEME_ID} from '../Layout';
import {matchComponent} from '../test/testUtil';

/* eslint-disable jest/expect-expect */

describe('"ButtonLink"', () => {
  it('renders', () => matchComponent(<ButtonLink>Submit</ButtonLink>));
  it('renders (dark theme)', () => matchComponent(<ButtonLink>ButtonLink</ButtonLink>, THEME_ID.DARK));
  it('renders in loading state', () => matchComponent(<ButtonLink showLoading>Submit</ButtonLink>));
});
