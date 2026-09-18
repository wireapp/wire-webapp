/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import type {CSSObject} from '@emotion/react';

export const titleStyles: CSSObject = {
  fontSize: '0.875rem',
  fontWeight: 400,
};

export const subTitleStyles: CSSObject = {
  color: 'var(--text-input-placeholder)',
  fontSize: '0.75rem',
  fontWeight: 400,
  marginBottom: 16,
  wordBreak: 'break-all',
};

export const wrapperStyles: CSSObject = {
  marginLeft: 'auto',
  maxWidth: 'calc(100% - 20px)',
  paddingTop: 4,
};

export const protocolButtonStyles: CSSObject = {
  display: 'block',
  border: 0,
  padding: 0,
  background: 'transparent',
  color: 'inherit',
  textAlign: 'start',
};

export const protocolLabelStyles: CSSObject = {...titleStyles, display: 'block'};

export const protocolValueStyles: CSSObject = {...subTitleStyles, display: 'block'};
