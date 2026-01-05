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

const participantNameColor = (isActivelySpeaking: boolean, isAudioEstablished: boolean) => {
  if (!isAudioEstablished) {
    return 'var(--gray-60)';
  }
  if (isActivelySpeaking) {
    return 'var(--app-bg-secondary)';
  }
  return 'var(--white)';
};

export const activelySpeakingBoxShadow = `inset 0px 0px 0px 1px var(--group-video-bg), inset 0px 0px 0px 4px var(--accent-color), inset 0px 0px 0px 7px var(--app-bg-secondary)`;

export const groupVideoBoxShadow = (participantCount: number): string =>
  participantCount > 1 ? 'inset 0px 0px 0px 2px var(--group-video-bg)' : 'initial';

export const groupVideoTileWrapper: CSSObject = {
  alignItems: 'center',
  backgroundColor: 'var(--group-video-tile-bg)',
  borderRadius: '10px',
  display: 'flex',
  height: '100%',
  justifyContent: 'center',
  width: '100%',
};

export const groupVideoActiveSpeakerTile = (isActivelySpeaking: boolean, participantCount: number): CSSObject => ({
  borderRadius: '8px',
  bottom: 0,
  boxShadow: isActivelySpeaking ? activelySpeakingBoxShadow : groupVideoBoxShadow(participantCount),
  left: 0,
  position: 'absolute',
  right: 0,
  top: 0,
  transition: 'box-shadow 0.3s ease-in-out',
});

export const groupVideoActiveSpeaker = (isActivelySpeaking: boolean): CSSObject => ({
  backgroundColor: isActivelySpeaking ? 'var(--accent-color)' : 'var(--black)',
});

export const groupVideoParticipantNameWrapper = (
  isActivelySpeaking: boolean,
  isAudioEstablished: boolean,
): CSSObject => ({
  overflow: 'hidden',
  display: 'flex',
  color: participantNameColor(isActivelySpeaking, isAudioEstablished),
});

export const groupVideoParticipantName: CSSObject = {
  textOverflow: 'ellipsis',
  overflow: 'hidden',
};

export const groupVideoParticipantAudioStatus = (
  isActivelySpeaking: boolean,
  isAudioEstablished: boolean,
): CSSObject => {
  const color = participantNameColor(isActivelySpeaking, isAudioEstablished);
  return {
    color: 'var(--participant-audio-connecting-color)',
    flexShrink: 0,
    '&::before': {
      content: "' • '",
      whiteSpace: 'pre',
      color,
    },
  };
};

export const groupVideoElementVideo = (fitContain: boolean, mirrorSelf: boolean): CSSObject => ({
  objectFit: fitContain ? 'contain' : 'cover',
  transform: mirrorSelf ? 'rotateY(180deg)' : 'initial',
});

export const groupVideoPauseOverlayLabel = (minimized: boolean): CSSObject => ({
  fontSize: minimized ? '0.6875rem' : '0.875rem',
});
