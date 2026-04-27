/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

const buttonGroupStyle: CSSObject = {
  margin: '16px 0',
  display: 'flex',
  justifyContent: 'space-around',
};

const buttonStyle: CSSObject = {
  width: '160px',
};

const headerStyle: CSSObject = {
  marginBottom: '32px',
  fontSize: 'var(--font-size-large)',
  textTransform: 'initial',
};

const linkStyle: CSSObject = {
  margin: '32px 0',
  fontSize: 'var(--font-size-base)',
  fontWeight: 'var(--font-weight-bold)',
  display: 'flex',
  justifyContent: 'center',
};

const unlockButtonStyle: CSSObject = {
  margin: '16px 0',
};

export const applockStyles = {
  buttonGroupStyle,
  buttonStyle,
  headerStyle,
  linkStyle,
  unlockButtonStyle,
};
