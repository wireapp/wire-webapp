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

export const getTeamImageCSS = (): CSSObject => ({
  width: '22px',
  height: '22px',
  borderRadius: '6px',
  border: 'black 1px solid',
  padding: '2px',
  margin: '15px',
});

export const getContainerCSS = (): CSSObject => ({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
});

export const getHeaderCSS = (): CSSObject => ({
  fontWeight: 500,
  lineHeight: '28.64px',
  fontSize: '24px',
});

export const getBoxCSS = (): CSSObject => ({
  marginBottom: '24px',
  background: COLOR_V2.GRAY_20,
  borderColor: COLOR_V2.GRAY_20,
  padding: '8px',
});

export const getTextCSS = (): CSSObject => ({fontSize: '12px', lineHeight: '16px', display: 'block'});

export const getButtonsCSS = (): CSSObject => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: '74px',
  gap: '16px',
});

export const getButtonCSS = (): CSSObject => ({margin: 'auto', width: 200});

export const getListCSS = (): CSSObject => ({
  marginTop: 0,
  paddingInlineStart: '20px',
  fontSize: '12px',
});
