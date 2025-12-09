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
  fontSize: '20px',
  fontWeight: 600,
  margin: 0,
  alignSelf: 'flex-end',
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
  color: 'var(--gray-70)',
  height: '21px',
};

export const fileHistoryCloseButtonCss: CSSObject = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignSelf: 'flex-start',
  padding: '0px',
  '&:hover': {
    opacity: 0.7,
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
  ':before': {
    content: '""',
    position: 'absolute',
    left: '20px',
    top: '15px',
    bottom: '40px',
    borderLeft: '1px dashed var(--gray-50)',
  },
};

// Version item styles
export const fileVersionItemWrapperCss: CSSObject = {
  display: 'flex',
  gap: '12px',
  padding: '8px 16px',
  borderRadius: '8px',
  ':hover': {
    backgroundColor: 'var(--gray-20)',
    button: {
      visibility: 'visible',
    },
  },
};

export const versionDotCurrentCss: CSSObject = {
  width: '9px',
  height: '9px',
  backgroundColor: 'var(--accent-color)',
  border: 'none',
  borderRadius: '50%',
  marginTop: '8px',
  position: 'relative',
};

export const versionDotOldCss: CSSObject = {
  width: '9px',
  height: '9px',
  backgroundColor: 'var(--modal-bg)',
  border: '1px solid var(--gray-70)',
  borderRadius: '50%',
  marginTop: '8px',
  position: 'relative',
};

export const versionInfoContainerCss: CSSObject = {
  flex: 1,
};

export const versionTimeTextCss: CSSObject = {
  fontWeight: '400',
  fontSize: '16px',
  margin: 0,
};

export const versionMetaTextCss: CSSObject = {
  color: 'var(--gray-70)',
  marginTop: '4px',
  margin: 0,
};

export const versionOwnerSpanCss: CSSObject = {
  marginRight: '8px',
};

// Action button styles
export const versionActionsWrapperCss: CSSObject = {
  display: 'flex',
  gap: '8px',
  marginLeft: 'auto',
};

export const versionButtonCss: CSSObject = {
  visibility: 'hidden',
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
