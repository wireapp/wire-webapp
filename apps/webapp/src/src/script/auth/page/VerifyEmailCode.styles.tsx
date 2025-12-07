/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {CSSProperties} from 'react';

import {CSSObject} from '@emotion/react';

const container: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  maxWidth: '402px',
  margin: 'auto',
  padding: '0px 16px',
  alignItems: 'center',
};
const header: CSSObject = {
  width: '100%',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '0px 16px',
};
const headline: CSSObject = {
  fontWeight: '500',
  fontSize: '24px',
  marginBottom: '0px',
  textAlign: 'center',
  width: '100%',
  marginRight: '16px',
};
const subhead: CSSObject = {
  margin: '24px 0px',
  textAlign: 'center',
  width: '100%',
};
const codeInput: CSSProperties = {
  margin: 'auto',
  marginTop: 10,
  marginBottom: '24px',
};
const resendLink: CSSObject = {
  fontWeight: '500',
  fontSize: '16px',
  textDecoration: 'underline',
  width: '100%',
  textAlign: 'center',
  textTransform: 'none',
};

export const styles = {
  container,
  header,
  headline,
  subhead,
  codeInput,
  resendLink,
};
