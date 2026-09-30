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

import {Bold, Large, Muted, Small, Text, Uppercase} from './text';

import {COLOR, THEME_ID} from '../../identity';
import {matchComponent} from '../../utils/testUtil';

describe('"Text"', () => {
  it('renders', () => {
    return matchComponent(<Text>Text</Text>);
  });
  it('renders (dark theme)', () => {
    return matchComponent(<Text>Text</Text>, THEME_ID.DARK);
  });

  it('renders as block', () => {
    return matchComponent(<Text block>Text</Text>);
  });
  it('renders bold', () => {
    return matchComponent(<Text bold>Text</Text>);
  });
  it('renders light', () => {
    return matchComponent(<Text light>Text</Text>);
  });
  it('renders centered', () => {
    return matchComponent(<Text center>Text</Text>);
  });
  it('renders with color', () => {
    return matchComponent(<Text color={COLOR.BLUE}>Text</Text>);
  });
  it('renders with size', () => {
    return matchComponent(<Text fontSize="2px">Text</Text>);
  });
  it('renders muted', () => {
    return matchComponent(<Text muted>Text</Text>);
  });
  it('renders no wrap', () => {
    return matchComponent(<Text noWrap>Text</Text>);
  });
  it('renders with textTransform', () => {
    return matchComponent(<Text textTransform="uppercase">Text</Text>);
  });
  it('renders with truncation', () => {
    return matchComponent(
      <Text textTransform="uppercase">
        aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
      </Text>,
    );
  });
});

describe('Utility components', () => {
  it('renders Bold', () => {
    return matchComponent(<Bold>Bold</Bold>);
  });
  it('renders Small', () => {
    return matchComponent(<Small>Small</Small>);
  });
  it('renders Muted', () => {
    return matchComponent(<Muted>Muted</Muted>);
  });
  it('renders Uppercase', () => {
    return matchComponent(<Uppercase>Uppercase</Uppercase>);
  });
  it('renders Large', () => {
    return matchComponent(<Large>Large</Large>);
  });
});
