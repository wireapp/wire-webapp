/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {COLOR_V2} from '@wireapp/react-ui-kit';

export const teamImageCSS: CSSObject = {
  width: '22px',
  height: '22px',
  borderRadius: '6px',
  border: 'black 1px solid',
  padding: '2px',
  margin: '15px',
};

export const containerCSS: CSSObject = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

export const headerCSS: CSSObject = {
  fontWeight: 500,
  lineHeight: '28.64px',
  fontSize: '24px',
};

export const boxCSS: CSSObject = {
  marginBottom: '24px',
  background: COLOR_V2.GRAY_20,
  borderColor: COLOR_V2.GRAY_20,
  padding: '8px',
};

export const textCSS: CSSObject = {fontSize: '12px', lineHeight: '16px', display: 'block'};
export const mobileTextCSS: CSSObject = {
  fontSize: '12px',
  lineHeight: '16px',
  display: 'block',
  marginLeft: '30px',
  marginRight: '30px',
};

export const buttonsCSS: CSSObject = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: '74px',
  gap: '16px',
};

export const mobileButtonsCSS: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  marginTop: '20px',
  gap: '16px',
};

export const buttonCSS: CSSObject = {margin: 'auto', width: 200};
export const mobileButtonCSS: CSSObject = {margin: 'auto', width: 300, height: 60};

export const listCSS: CSSObject = {
  marginTop: 0,
  paddingInlineStart: '20px',
  fontSize: '12px',
};
