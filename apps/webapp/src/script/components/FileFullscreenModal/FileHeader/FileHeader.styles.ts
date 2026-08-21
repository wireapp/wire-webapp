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

import {CSSObject} from '@emotion/react';

import {COLOR_V2, ellipsis} from '@wireapp/react-ui-kit';

import {fileHeaderHeight} from '../common/fileHeaderHeight';

export const headerStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '16px',
  height: fileHeaderHeight,
  width: '100%',
  boxSizing: 'border-box',
  padding: '0 16px',
  lineHeight: 'var(--line-height-sm)',
  borderBottom: '1px solid var(--border-color)',
  backgroundColor: 'var(--app-bg)',
};

export const closeButtonStyles: CSSObject = {
  cursor: 'pointer',
  fill: 'currentColor',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  border: 'none',
  background: 'none',
  padding: 0,
  marginRight: '24px',
  flexShrink: 0,
};

export const leftColumnStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  flex: '1 1 auto',
  minWidth: 0,
};

export const metadataStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: 'var(--font-size-small)',
  flex: '1 1 auto',
  minWidth: 0,

  svg: {
    flexShrink: 0,
  },
};

export const metadataTextStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  minWidth: 0,
  whiteSpace: 'nowrap',
};

export const sourceConversationMetadataStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flex: '0 1 auto',
  minWidth: 0,
  maxWidth: '220px',
};

export const sourceConversationIconStyles: CSSObject = {
  flexShrink: 0,
  width: '16px',
  height: '16px',
};

export const nameStyles: CSSObject = {
  ...ellipsis(),
  fontSize: 'var(--font-size-medium)',
  fontWeight: 'var(--font-weight-semibold)',
  margin: 0,
  flex: '0 1 auto',
  minWidth: 0,
  maxWidth: '360px',
};

export const textStyles: CSSObject = {
  ...ellipsis(),
  fontSize: 'var(--font-size-small)',
  color: 'var(--gray-70)',
  flex: '0 1 auto',
  minWidth: 0,
  maxWidth: '180px',

  'body.theme-dark &': {
    color: 'var(--gray-40)',
  },
};

export const timeStyles: CSSObject = {
  ...textStyles,
  flexShrink: 0,
  maxWidth: 'none',
};

export const actionButtonsStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: '0',
  marginInline: '8px',
  gap: '8px',
};

export const downloadButtonStyles: CSSObject = {
  marginBottom: '0',
  flexShrink: '0',
  width: '40px',
  height: '32px',
};

export const editModeButtonStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: '0',
  marginRight: '8px',
  marginLeft: '16px',
  backgroundColor: COLOR_V2.GRAY_20,
  padding: '4px',
  borderRadius: '12px',

  'body.theme-dark &': {
    backgroundColor: 'var(--gray-90)',
  },

  button: {
    padding: '4px 18px',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--base-secondary-text)',
    transition: 'background-color 0.3s ease-in-out, color 0.3s ease-in-out',

    '&.active': {
      backgroundColor: 'var(--app-bg-secondary)',
      color: 'var(--main-color)',
    },
    svg: {
      marginRight: '8px',
      color: 'currentColor',
      fill: 'currentColor',
      transition: 'color 0.3s ease-in-out',
    },
  },
};

export const viewOnlyLabelStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '4px',
  width: '159px',
  height: '32px',
  minHeight: '32px',
  borderRadius: '12px',
  backgroundColor: 'var(--Backgrounds-Background, #EDEFF0)',
  color: 'var(--gray-100, #17181A)',
  fontSize: 'var(--font-size-small)',
  lineHeight: 'var(--line-height-sm)',
  whiteSpace: 'nowrap',

  'body.theme-dark &': {
    backgroundColor: 'var(--gray-100, #17181A)',
    color: 'var(--white, #FFFFFF)',
  },

  svg: {
    color: 'currentColor',
    fill: 'currentColor',
    flexShrink: 0,
  },
};
