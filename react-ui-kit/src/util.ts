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

import {CSSObject} from '@emotion/react';

export const noop = () => {};

export const inlineSVG = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export const filterProps: <T extends Record<string, any>>(props: T, propsToFilter: (keyof T)[]) => Object = (
  props,
  propsToFilter,
) => {
  return Object.entries(props).reduce<Object>(
    (accumulator, [key, value]) => (!propsToFilter.includes(key) ? {...accumulator, [key]: value} : accumulator),
    {},
  );
};

export const manySelectors = (selectors: string[], css: CSSObject) =>
  selectors.reduce((acc, selector) => {
    acc[selector] = css;
    return acc;
  }, {});
