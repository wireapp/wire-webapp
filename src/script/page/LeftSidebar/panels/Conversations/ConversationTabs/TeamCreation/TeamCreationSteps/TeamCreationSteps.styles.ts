/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {BASE_DARK_COLOR, BASE_LIGHT_COLOR, COLOR_V2} from '@wireapp/react-ui-kit';

import {tabletMediaQuery} from '../TeamCreation.styles';

export const forgotPasswordCss: CSSObject = {
  textAlign: 'right',
  marginTop: '-1rem',
  marginBottom: 'var(--font-size-small)',
  '& a:link': {
    color: COLOR_V2.GRAY_60,
  },
};

export const termsCheckboxLabelCss: CSSObject = {
  fontSize: 'var(--font-size-small)',
  fontWeight: 'normal',
};

export const termsOfUseLinkCss: CSSObject = {
  color: 'var(--accent-color)',
  textTransform: 'none',
  fontSize: 'var(--font-size-small)',
};

export const modalButtonsCss: CSSObject = {
  position: 'absolute',
  gap: '0.75rem',
  margin: '1.5rem 3.5rem',
  [tabletMediaQuery]: {
    margin: '1rem 0',
    flexDirection: 'column',
    position: 'unset',
  },
};

export const listCss: CSSObject = {
  paddingLeft: '1.25rem',
  marginBottom: '2rem',
};

export const introStepSubHeaderCss: CSSObject = {
  marginTop: '1rem',
  marginBottom: '0.25rem',
};

export const introStepLinkCss: CSSObject = {
  textDecoration: 'underline',
  textTransform: 'none',
  marginTop: '1.25rem',
};

export const introItemCss: CSSObject = {
  borderBottom: '0.5px solid var(--main-color)',
  display: 'flex',
  gap: '0.875rem',
  alignItems: 'center',
  padding: '1.25rem 0 0.875rem 0',
};

export const successStepSubHeaderCss: CSSObject = {
  margin: '1.25rem 0',
};

export const termsCheckboxWrapperCss: CSSObject = {
  margin: '1rem 0',
};

export const checkIconCss: CSSObject = {
  width: 20,
  fill: BASE_LIGHT_COLOR.GREEN,
  'body.theme-dark &': {
    fill: BASE_DARK_COLOR.GREEN,
  },
};
