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

export const sharedDriveContainerCss: CSSObject = {
  '& .button-label': {padding: 0, width: 48},
  '& .panel__content > div:first-child': {
    height: 70,
    padding: 16,
    position: 'relative',
  },
  '& .panel__content > div:first-child::after': {
    backgroundColor: '#CBCED1',
    content: '""',
    height: 1,
    left: 16,
    position: 'absolute',
    right: 16,
    top: 70,
  },
  '& .panel__header': {height: 45, minHeight: 45},
  '& .slider': {width: 48},
  '& .slider.disabled .button-label__switch': {backgroundColor: '#9FA1A7'},
  '& .base-toggle': {borderBottom: 0, marginBottom: 0},
  '& .base-toggle .info-toggle__details': {marginTop: 0, position: 'absolute', top: 36},
};

export const sharedDriveToggleContainerCss: CSSObject = {padding: 16};

export const sharedDriveInfoCss: CSSObject = {padding: 16};

export const sharedDriveInfoHeadingCss: CSSObject = {lineHeight: '20px', margin: 0};

export const sharedDriveDescriptionCss: CSSObject = {fontSize: 12, lineHeight: '14px', margin: '4px 0 0'};

export const sharedDriveExternalDescriptionCss: CSSObject = {
  fontSize: 12,
  lineHeight: '14px',
  margin: '14px 0 0',
};

export const sharedDriveParticipantListCss: CSSObject = {listStyle: 'none', margin: 0, padding: 0};

export const sharedDriveParticipantItemCss: CSSObject = {
  alignItems: 'center',
  display: 'flex',
  minHeight: 56,
  padding: '8px 16px 8px 0',
  position: 'relative',
};

export const sharedDriveAvatarCss: CSSObject = {margin: '0 20px 0 16px'};

export const sharedDriveViewerRoleCss: CSSObject = {
  '& > span': {marginLeft: 0},
  alignItems: 'center',
  display: 'flex',
  gap: 8,
  paddingLeft: 8,
};

export const sharedDriveRoleLabelCss: CSSObject = {
  border: '1px solid var(--gray-40)',
  borderRadius: 8,
  flexShrink: 0,
  fontSize: 12,
  fontWeight: 600,
  lineHeight: '14px',
  marginLeft: 8,
  padding: '4px 8px',
};
