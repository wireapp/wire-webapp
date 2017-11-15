/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

import {WIDTH} from './Grid/sizes';
import {css} from 'styled-components';

export default {
  desktop: (...content) => css`
    @media (min-width: ${WIDTH.DESKTOP_MIN}px) {
      ${css(...content)};
    }
  `,
  desktopXL: (...content) => css`
    @media (min-width: ${WIDTH.DESKTOP_XL_MIN}px) {
      ${css(...content)};
    }
  `,
  mobile: (...content) => css`
    @media (max-width: ${WIDTH.MOBILE}px) {
      ${css(...content)};
    }
  `,
  mobileUp: (...content) => css`
    @media (min-width: ${WIDTH.MOBILE}px) {
      ${css(...content)};
    }
  `,
  tablet: (...content) => css`
    @media (min-width: ${WIDTH.TABLET_MIN}px) and (max-width: ${WIDTH.TABLET_MAX}px) {
      ${css(...content)};
    }
  `,
  tabletDown: (...content) => css`
    @media (min-width: ${WIDTH.TABLET_MAX}px) {
      ${css(...content)};
    }
  `,
};
