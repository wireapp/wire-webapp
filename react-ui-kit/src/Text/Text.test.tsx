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

import {Bold, Large, Muted, Small, Text, Uppercase} from './Text';

import {COLOR} from '../Identity';
import {THEME_ID} from '../Layout';
import {matchComponent} from '../test/testUtil';

/* eslint-disable jest/expect-expect */

describe('"Text"', () => {
  it('renders', () => matchComponent(<Text>Text</Text>));
  it('renders (dark theme)', () => matchComponent(<Text>Text</Text>, THEME_ID.DARK));

  it('renders as block', () => matchComponent(<Text block>Text</Text>));
  it('renders bold', () => matchComponent(<Text bold>Text</Text>));
  it('renders light', () => matchComponent(<Text light>Text</Text>));
  it('renders centered', () => matchComponent(<Text center>Text</Text>));
  it('renders with color', () => matchComponent(<Text color={COLOR.BLUE}>Text</Text>));
  it('renders with size', () => matchComponent(<Text fontSize="2px">Text</Text>));
  it('renders muted', () => matchComponent(<Text muted>Text</Text>));
  it('renders no wrap', () => matchComponent(<Text noWrap>Text</Text>));
  it('renders with textTransform', () => matchComponent(<Text textTransform="uppercase">Text</Text>));
  it('renders with truncation', () =>
    matchComponent(
      <Text textTransform="uppercase">
        aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
      </Text>,
    ));
});

describe('Utility components', () => {
  it('renders Bold', () => matchComponent(<Bold>Bold</Bold>));
  it('renders Small', () => matchComponent(<Small>Small</Small>));
  it('renders Muted', () => matchComponent(<Muted>Muted</Muted>));
  it('renders Uppercase', () => matchComponent(<Uppercase>Uppercase</Uppercase>));
  it('renders Large', () => matchComponent(<Large>Large</Large>));
});
