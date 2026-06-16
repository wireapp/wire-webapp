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

import {overlayPortalZIndex} from '@wireapp/react-ui-kit';

/** Portaled react-select menus must sit above ModalComponent (z-index 10000000). */
export const scheduleMeetingSelectMenuPortalStyles: CSSObject = {
  zIndex: overlayPortalZIndex,
};

/** Matches DateTimePickerField label-to-input spacing (`gap: 8px` + InputLabel margin). */
export const scheduleMeetingLabeledFieldWrapperStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  marginBottom: 0,
};

export const scheduleMeetingRecurrenceSelectWrapperStyles = scheduleMeetingLabeledFieldWrapperStyles;

export const scheduleMeetingTitleInputWrapperStyles = scheduleMeetingLabeledFieldWrapperStyles;

export const scheduleMeetingTitleClearButtonStyles: CSSObject = {
  alignItems: 'center',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  height: '100%',
  justifyContent: 'center',
  margin: 0,
  padding: 0,
  position: 'absolute',
  right: '8px',
  top: '50%',
  transform: 'translateY(-50%)',
  width: '32px',
};

export const scheduleMeetingFormLayoutCss: CSSObject = {
  display: 'grid',
  gridTemplateColumns: '1fr 1px 1fr',
  gap: '24px',
  width: '100%',
  alignItems: 'start',
};

export const scheduleMeetingFormColumnCss: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
  minWidth: 0,
};

export const scheduleMeetingFormLeftColumnCss: CSSObject = {
  ...scheduleMeetingFormColumnCss,
};

export const scheduleMeetingFormDividerCss: CSSObject = {
  backgroundColor: 'var(--border-color)',
  width: '1px',
  alignSelf: 'stretch',
};

export const scheduleMeetingParticipantsSectionCss: CSSObject = {
  minWidth: 0,
};
