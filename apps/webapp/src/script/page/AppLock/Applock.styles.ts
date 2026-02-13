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

const unlockButtonStyle: CSSObject = {
  margin: '16px 0',
};
const buttonGroupStyle: CSSObject = {
  margin: '32px 0',
};

const bodyStyle: CSSObject = {
  padding: '16px 16px 32px',
};

const headerStyle: CSSObject = {
  marginBottom: '32px',
  fontSize: 'var(--font-size-large)',
  textTransform: 'initial',
};

const labelStyle: CSSObject = {
  marginBottom: '0',
  fontSize: 'var(--font-size-xsmall)',
};

const linkStyle: CSSObject = {
  margin: '32px 0',
  fontSize: 'var(--font-size-base)',
  fontWeight: 'var(--font-weight-bold)',
  display: 'flex',
  justifyContent: 'center',
};

const inputErrorStyle: CSSObject = {
  minHeight: '14px',
};

const passcodeInfoStyle: CSSObject = {
  margin: '2px 0',
  color: 'var(--foreground)',
  fontSize: 'var(--font-size-xsmall)',
  fontWeight: 600,
  lineHeight: 'var(--line-height-sm)',
  '&:before': {
    position: 'relative',
    top: '2px',
    display: 'block',
    width: '12px',
    height: '12px',
    backgroundImage:
      "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'><path d='M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16zm4.9-11.48l-.2.19-8.18 8.18a6 6 0 0 0 8.37-8.37zm-1.42-1.41a6 6 0 0 0-8.37 8.37l8.18-8.19.19-.18z'\"></path></svg>\")",
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'contain',
    content: "''",
    float: 'left',
  },
};

const passcodeInfoValidStyle: CSSObject = {
  '&:before': {
    backgroundImage:
      "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='12'><path d='M5.7 11.9L16 1.4 14.6 0 5.7 9 1.4 4.8 0 6.2z' fill='%2300c800'/></svg>\")",
  },
};

export const applockStyles = {
  buttonGroupStyle,
  bodyStyle,
  headerStyle,
  labelStyle,
  linkStyle,
  inputErrorStyle,
  passcodeInfoStyle,
  passcodeInfoValidStyle,
  unlockButtonStyle,
};
