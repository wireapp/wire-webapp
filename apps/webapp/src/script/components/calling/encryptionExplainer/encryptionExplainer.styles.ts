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

import {media} from '../../../uiKit/utils/mediaQueries';

export const encryptionExplainerStyles: CSSObject = {
  position: 'absolute',
  zIndex: 20,
  top: 'calc(100% + 8px)',
  left: 0,
  width: 'min(340px, calc(100vw - 16px))',
  padding: '14px 16px 16px',
  border: '1px solid var(--foreground-fade-16)',
  borderRadius: 12,
  backgroundColor: 'var(--dropdown-menu-bg)',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.14)',
  color: 'var(--main-color)',
  textAlign: 'left',

  [media.tabletUp]: {
    left: '50%',
    transform: 'translateX(-50%)',
  },
};

// In the green room panel the badge sits at the start of the column: start-aligned until the
// two-column desktop layout, where centring keeps the popover inside the panel.
export const encryptionExplainerPanelStyles: CSSObject = {
  ...encryptionExplainerStyles,

  [media.tabletUp]: {
    left: 0,
    transform: 'none',
  },

  [media.desktop]: {
    left: '50%',
    transform: 'translateX(-50%)',
  },
};

export const encryptionExplainerHeadStyles: CSSObject = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
};

// Same height as one title line, so the shield is centred on the first line even when the title wraps.
export const encryptionExplainerIconStyles: CSSObject = {
  display: 'flex',
  height: 20,
  alignItems: 'center',
  flexShrink: 0,
};

export const encryptionExplainerTitleStyles: CSSObject = {
  flex: 1,
  margin: 0,
  fontSize: 14,
  fontWeight: 600,
  lineHeight: '20px',
  textWrap: 'balance',
};

export const encryptionExplainerCloseStyles: CSSObject = {
  display: 'inline-flex',
  width: 24,
  height: 24,
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  border: 'none',
  margin: '-2px -4px 0 0',
  background: 'transparent',
  borderRadius: 6,
  cursor: 'pointer',

  '&:focus-visible': {
    outline: '2px solid var(--accent-color)',
  },
};

export const encryptionExplainerBodyStyles: CSSObject = {
  margin: '8px 0 0',
  color: 'var(--foreground-fade-56)',
  fontSize: 13,
  lineHeight: '19px',
};

export const encryptionExplainerLinkStyles: CSSObject = {
  display: 'inline-block',
  marginTop: 10,
  color: 'var(--accent-color)',
  fontSize: 13,
  fontWeight: 500,
  textDecoration: 'underline',
};
