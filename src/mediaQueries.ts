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

export enum QueryKeys {
  DESKTOP = 'desktop',
  DESKTOP_XL = 'desktopXL',
  MOBILE = 'mobile',
  MOBILE_UP = 'mobileUp',
  TABLET = 'tablet',
  TABLET_DOWN = 'tabletDown',
  TABLET_UP = 'tabletUp',
}

export type QueryMap = {[index in QueryKeys]: string};

export const QUERY: QueryMap = {
  [QueryKeys.DESKTOP]: `min-width: ${WIDTH.DESKTOP_MIN}px`,
  [QueryKeys.DESKTOP_XL]: `min-width: ${WIDTH.DESKTOP_XL_MIN}px`,
  [QueryKeys.MOBILE]: `max-width: ${WIDTH.MOBILE}px`,
  [QueryKeys.MOBILE_UP]: `min-width: ${WIDTH.MOBILE}px`,
  [QueryKeys.TABLET]: `min-width: ${WIDTH.TABLET_MIN}px) and (max-width: ${WIDTH.TABLET_MAX}px`,
  [QueryKeys.TABLET_DOWN]: `max-width: ${WIDTH.TABLET_MAX}px`,
  [QueryKeys.TABLET_UP]: `min-width: ${WIDTH.TABLET_MIN}px`,
};

const media = Object.entries(QUERY).reduce<QueryMap | {}>(
  (accumulator, [key, value]) => ({...accumulator, [key]: `@media (${value})`}),
  {}
);

export default media;
