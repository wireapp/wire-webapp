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

import {media} from '@wireapp/react-ui-kit';

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
  [media.tabletSMDown]: {
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
  height: 24,
  minWidth: 20,
  alignSelf: 'start',
  fill: 'var(--success-color)',
};
