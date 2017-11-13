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

import baseStyle from './Base';
import {injectGlobal} from 'styled-components';
import styledNormalize from 'styled-normalize';

export const normalizeStyles = () => injectGlobal`${styledNormalize}`;
export const baseStyles = () => injectGlobal`${baseStyle}`;

export * from './Button';
export * from './Heading';
export * from './Logo';
export * from './Container';
export * from './Column';
export * from './Line';
export * from './Text';
export * from './Paragraph';
export * from './Input';
export * from './Select';
export * from './Loading';
export * from './Checkbox';
export * from './Form';
export * from './Link';
export {COLOR} from './variables';
