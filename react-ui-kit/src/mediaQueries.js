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

import {WIDTH} from './Layout/sizes';
import {css} from 'styled-components';

export const QUERY = {
  desktop: `min-width: ${WIDTH.DESKTOP_MIN}px`,
  desktopXL: `min-width: ${WIDTH.DESKTOP_XL_MIN}px`,
  mobile: `max-width: ${WIDTH.MOBILE}px`,
  mobileUp: `min-width: ${WIDTH.MOBILE}px`,
  tablet: `min-width: ${WIDTH.TABLET_MIN}px) and (max-width: ${WIDTH.TABLET_MAX}px`,
  tabletDown: `max-width: ${WIDTH.TABLET_MAX}px`,
  tabletUp: `min-width: ${WIDTH.TABLET_MIN}px`,
};

export default Object.entries(QUERY).reduce(
  (accumulator, [key, value]) => ({
    ...accumulator,
    [key]: content => `@media (${value}){${css(content)}}`,
  }),
  {}
);
