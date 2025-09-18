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

import {listWrapper} from '../../ParticipantItemContent/ParticipantItem.styles';

export const callParticipantListItemWrapper = (isLast = false): CSSObject => ({
  ...listWrapper({noUnderline: true, noInteraction: true}),
  '&:hover, &:focus, &:focus-visible': {
    backgroundColor: 'var(--disabled-call-button-bg)',
  },
  borderBottom: isLast ? 'none' : '1px solid var(--border-color)',
});

const commonIconStyles = {
  display: 'flex',
  fill: 'currentColor',
  height: '12px',
  width: '12px',
};

export const callParticipantAvatar = (isAudioEstablished = false): CSSObject => ({
  margin: '0 10px',
  opacity: isAudioEstablished ? '1' : '0.5',
});

export const callParticipantConnecting: CSSObject = {
  color: 'var(--danger-color)',
  fontSize: 'var(--font-size-small)',
  flexShrink: 0,
};

export const callParticipantListItem = (noInteraction = false): CSSObject => ({
  display: 'flex',
  overflow: 'hidden',
  height: '56px',
  alignItems: 'center',
  paddingRight: '16px',
  margin: '0',
  cursor: noInteraction ? 'default' : 'pointer',
});

export const callStatusIcons = (activeIconsCount: number): CSSObject => ({
  display: 'grid',
  fill: 'currentColor',
  gap: '8px',
  gridTemplateColumns: `repeat(${activeIconsCount}, 1fr)`,
  placeItems: 'center',
  margin: '0 8px',

  '.participant-mic-on-icon svg': {
    ...commonIconStyles,
  },
});

export const cameraIcon: CSSObject = {
  ...commonIconStyles,
};

export const screenShareIcon: CSSObject = {
  ...commonIconStyles,
};

export const micOffIcon: CSSObject = {
  ...commonIconStyles,
};

export const micOffWrapper: CSSObject = {
  padding: '3px',
};
