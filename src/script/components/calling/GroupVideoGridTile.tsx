/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import React from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user';
import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';

import {VIDEO_STATE} from '@wireapp/avs';

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import {Icon} from 'Components/Icon';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {isEnterKey} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {Video} from './Video';

import type {Participant} from '../../calling/Participant';

export interface GroupVideoGridTileProps {
  isMaximized: boolean;
  minimized: boolean;
  onTileDoubleClick: (userId: QualifiedId, clientId: string) => void;
  participant: Participant;
  participantCount: number;
  selfParticipant: Participant;
}

const GroupVideoGridTile: React.FC<GroupVideoGridTileProps> = ({
  minimized,
  participant,
  selfParticipant,
  participantCount,
  isMaximized,
  onTileDoubleClick,
}) => {
  const {isMuted, videoState, videoStream, isActivelySpeaking} = useKoSubscribableChildren(participant, [
    'isMuted',
    'videoStream',
    'isActivelySpeaking',
    'videoState',
  ]);
  const {name} = useKoSubscribableChildren(participant?.user, ['name']);

  const sharesScreen = videoState === VIDEO_STATE.SCREENSHARE;
  const sharesCamera = [VIDEO_STATE.STARTED, VIDEO_STATE.PAUSED].includes(videoState);
  const hasPausedVideo = videoState === VIDEO_STATE.PAUSED;
  const hasActiveVideo = (sharesCamera || sharesScreen) && !!videoStream;
  const activelySpeakingBoxShadow = `inset 0px 0px 0px 1px var(--group-video-bg), inset 0px 0px 0px 4px var(--accent-color), inset 0px 0px 0px 7px var(--app-bg-secondary)`;
  const groupVideoBoxShadow = participantCount > 1 ? 'inset 0px 0px 0px 2px var(--group-video-bg)' : 'initial';

  const handleTileClick = () => onTileDoubleClick(participant?.user.qualifiedId, participant?.clientId);

  const handleEnterTileClick = (keyboardEvent: React.KeyboardEvent) => {
    if (isEnterKey(keyboardEvent)) {
      handleTileClick();
    }
  };

  return (
    <button
      data-uie-name="item-grid"
      data-user-id={participant?.user.id}
      className="group-video-grid__element"
      onDoubleClick={handleTileClick}
      onKeyDown={handleEnterTileClick}
      tabIndex={isMaximized ? TabIndex.FOCUSABLE : TabIndex.UNFOCUSABLE}
    >
      {hasActiveVideo ? (
        <Video
          autoPlay
          playsInline
          srcObject={videoStream}
          className="group-video-grid__element-video"
          css={{
            objectFit: isMaximized || sharesScreen ? 'contain' : 'cover',
            transform: participant === selfParticipant && sharesCamera ? 'rotateY(180deg)' : 'initial',
          }}
        />
      ) : (
        <div
          css={{
            alignItems: 'center',
            backgroundColor: 'var(--group-video-tile-bg)',
            borderRadius: '8px',
            display: 'flex',
            height: '100%',
            justifyContent: 'center',
            width: '100%',
          }}
        >
          <Avatar avatarSize={minimized ? AVATAR_SIZE.MEDIUM : AVATAR_SIZE.LARGE} participant={participant?.user} />
        </div>
      )}

      <div
        css={{
          borderRadius: '8px',
          bottom: 0,
          boxShadow: isActivelySpeaking ? activelySpeakingBoxShadow : groupVideoBoxShadow,
          left: 0,
          position: 'absolute',
          right: 0,
          top: 0,
          transition: 'box-shadow 0.3s ease-in-out',
        }}
      />

      {!minimized && isMuted && (
        <span className="group-video-grid__element__label__icon">
          <Icon.MicOff data-uie-name="mic-icon-off" />
        </span>
      )}

      {isMaximized && (
        <div className="group-video-grid__element__overlay">
          <span className="group-video-grid__element__overlay__label">{t('videoCallOverlayFitVideoLabelGoBack')}</span>
        </div>
      )}

      {!minimized && participantCount > 1 && (
        <div className="group-video-grid__element__overlay">
          <span className="group-video-grid__element__overlay__label">{t('videoCallOverlayFitVideoLabel')}</span>
        </div>
      )}

      {!minimized && (
        <div
          className="group-video-grid__element__label"
          css={{
            backgroundColor: isActivelySpeaking ? 'var(--accent-color)' : 'var(--black)',
          }}
        >
          <span
            data-uie-name={
              isActivelySpeaking ? 'status-active-speaking' : isMuted ? 'status-audio-off' : 'status-audio-on'
            }
            className="group-video-grid__element__label__name"
            css={{
              color: isActivelySpeaking ? 'var(--app-bg-secondary)' : 'var(--white)',
            }}
          >
            {name}
          </span>
        </div>
      )}

      {hasPausedVideo && (
        <div className="group-video-grid__pause-overlay">
          <div className="background">
            <div className="background-image"></div>
            <div className="background-darken"></div>
          </div>

          <div
            className="group-video-grid__pause-overlay__label"
            css={{fontsize: minimized ? '0.6875rem' : '0.875rem'}}
            data-uie-name="status-video-paused"
          >
            {t('videoCallPaused')}
          </div>
        </div>
      )}
    </button>
  );
};

export {GroupVideoGridTile};
