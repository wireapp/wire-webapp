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

export const fileHistoryModalWrapperCss: CSSObject = {
  overflow: 'unset',
  overflowY: 'unset',
  width: '500px',
  maxHeight: '650px',
  height: '80vh',
  margin: '1rem',
  borderRadius: '10px',
};

export const fileVersionRestoreModalWrapperCss: CSSObject = {
  overflow: 'unset',
  overflowY: 'unset',
  width: '460px',
  height: 'auto',
  margin: '1rem',
  borderRadius: '10px',
};

// Header styles
export const fileHistoryHeaderContainerCss: CSSObject = {
  display: 'flex',
  alignItems: 'end',
  justifyContent: 'space-between',
  padding: '12px 12px 12px 16px',
  height: '100px',
  flexDirection: 'row',
};

export const fileHistoryHeaderTitleCss: CSSObject = {
  fontSize: 'var(--font-size-large)',
  fontWeight: 'var(--font-weight-semibold)',
  margin: 0,
};

export const fileHeaderInfoWrapperCss: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  marginTop: 12,
};

export const fileHeaderFileInfoCss: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  color: 'var(--base-secondary-text)',
  height: '21px',
};

export const fileHistoryCloseButtonCss: CSSObject = {
  background: 'none',
  border: 'none',
  color: 'var(--main-color)',
  cursor: 'pointer',
  display: 'flex',
  alignSelf: 'flex-start',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  padding: 0,
  borderRadius: '8px',
  '& svg': {
    fill: 'currentColor',
  },
  '&:hover': {
    backgroundColor: 'var(--cells-version-history-item-hover-bg)',
  },
};

export const fileHistoryRestoreCloseButtonCss: CSSObject = {
  ...fileHistoryCloseButtonCss,
  alignSelf: 'flex-end',
};

// Content styles
export const fileHistoryContentCss: CSSObject = {
  padding: '6px 0px 6px 16px',
  overflowY: 'auto',
};

export const fileHistoryListCss: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  position: 'relative',
};

export const fileHistoryDateHeadingCss: CSSObject = {
  marginBottom: '8px',
};

export const fileHistoryTimelineContainerCss: CSSObject = {
  position: 'relative',
};

// Version item styles
export const fileVersionItemWrapperCss: CSSObject = {
  // Keep these values in `rem` so they scale with the user's font size.
  '--cells-vh-item-padding-y': '0.5rem',
  '--cells-vh-item-padding-x': '1rem',
  '--cells-vh-dot-size': '0.5625rem',
  '--cells-vh-dot-margin-top': '0.5rem',
  '--cells-vh-dot-center-offset':
    'calc(var(--cells-vh-item-padding-y) + var(--cells-vh-dot-margin-top) + (var(--cells-vh-dot-size) / 2))',
  display: 'flex',
  gap: '12px',
  padding: 'var(--cells-vh-item-padding-y) var(--cells-vh-item-padding-x)',
  borderRadius: '8px',
  position: 'relative',
  ':hover': {
    backgroundColor: 'var(--cells-version-history-item-hover-bg)',
    '& [data-version-actions="true"]': {
      display: 'flex',
    },
  },
  ':focus-within': {
    backgroundColor: 'var(--cells-version-history-item-hover-bg)',
    '& [data-version-actions="true"]': {
      display: 'flex',
    },
  },
  ':focus-visible': {
    outline: '2px solid var(--accent-color)',
    outlineOffset: '2px',
  },
};

export const versionDotCurrentCss: CSSObject = {
  width: 'var(--cells-vh-dot-size)',
  height: 'var(--cells-vh-dot-size)',
  backgroundColor: 'var(--accent-color)',
  border: 'none',
  borderRadius: '50%',
  marginTop: 'var(--cells-vh-dot-margin-top)',
  position: 'relative',
  zIndex: 1,
};

export const versionDotOldCss: CSSObject = {
  width: 'var(--cells-vh-dot-size)',
  height: 'var(--cells-vh-dot-size)',
  backgroundColor: 'var(--cells-version-history-dot-fill-color)',
  border: '1px solid var(--cells-version-history-dot-border-color)',
  borderRadius: '50%',
  marginTop: 'var(--cells-vh-dot-margin-top)',
  position: 'relative',
  zIndex: 1,
};

export const versionTimelineConnectorCss: CSSObject = {
  position: 'absolute',
  left: 'calc(var(--cells-vh-item-padding-x) + (var(--cells-vh-dot-size) / 2))',
  top: 'var(--cells-vh-dot-center-offset)',
  bottom: 'calc(-1 * var(--cells-vh-dot-center-offset))',
  width: '1px',
  backgroundImage:
    'repeating-linear-gradient(to bottom, var(--cells-version-history-timeline-color) 0 4px, transparent 4px 12px)',
  pointerEvents: 'none',
  zIndex: 0,
};

export const versionInfoContainerCss: CSSObject = {
  flex: 1,
  minWidth: 0,
};

export const versionTimeTextCss: CSSObject = {
  fontWeight: 'var(--font-weight-regular)',
  fontSize: 'var(--font-size-base)',
  margin: 0,
};

export const versionMetaTextCss: CSSObject = {
  color: 'var(--base-secondary-text)',
  marginTop: '4px',
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  minWidth: 0,
};

export const versionOwnerSpanCss: CSSObject = {
  flexShrink: 1,
  minWidth: 0,
  marginRight: '8px',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
};

export const versionSizeSpanCss: CSSObject = {
  flexShrink: 0,
};

// Action button styles
export const versionActionsWrapperCss: CSSObject = {
  display: 'none',
  gap: '8px',
  marginLeft: 'auto',
  flexShrink: 0,
};

export const versionButtonCss: CSSObject = {
  height: '32px',
  minHeight: 'auto',
  minWidth: 'auto',
  padding: '0px 16px',
  alignSelf: 'center',
  marginBottom: '0px',
  borderRadius: '12px',
};

export const iconMarginRightCss: CSSObject = {
  marginRight: '8px',
};

export const restoreIconCss: CSSObject = {
  transform: 'scaleY(-1) rotate(180deg)',
  marginRight: '8px',
};

// Restore modal styles
export const restoreModalContainerCss: CSSObject = {
  flexDirection: 'column',
  display: 'flex',
  padding: '12px',
};

export const restoreModalTitleCss: CSSObject = {
  textAlign: 'center',
  margin: '0 0 8px 0',
};

export const restoreModalDescriptionCss: CSSObject = {
  fontSize: 16,
  margin: '14px 18px',
};

export const restoreModalButtonsContainerCss: CSSObject = {
  display: 'flex',
  justifyContent: 'space-evenly',
  gap: '12px',
  margin: '0px 14px',
};

export const restoreModalButtonCss: CSSObject = {
  marginBottom: '0px',
  width: '100%',
};
