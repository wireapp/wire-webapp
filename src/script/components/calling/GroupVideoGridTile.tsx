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
import {VIDEO_STATE} from '@wireapp/avs';

import {t} from 'Util/LocalizerUtil';
import Icon from 'Components/Icon';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import Video from './Video';
import ParticipantMicOnIcon from './ParticipantMicOnIcon';
import type {Participant} from '../../calling/Participant';
import Avatar, {AVATAR_SIZE} from 'Components/Avatar';
import {QualifiedId} from '@wireapp/api-client/src/user';

export interface GroupVideoGridTileProps {
  isMaximized: boolean;
  minimized: boolean;
  onParticipantDoubleClick: (userId: QualifiedId, clientId: string) => void;
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
  onParticipantDoubleClick,
}) => {
  const {isMuted, videoState, videoStream, isActivelySpeaking} = useKoSubscribableChildren(participant, [
    'isMuted',
    'videoStream',
    'isActivelySpeaking',
    'videoState',
  ]);
  const {name} = useKoSubscribableChildren(participant?.user, ['name']);
  const {accent_color: selfColor} = useKoSubscribableChildren(selfParticipant?.user, ['accent_color']);

  const sharesScreen = videoState === VIDEO_STATE.SCREENSHARE;
  const sharesCamera = [VIDEO_STATE.STARTED, VIDEO_STATE.PAUSED].includes(videoState);
  const hasPausedVideo = videoState === VIDEO_STATE.PAUSED;
  const hasActiveVideo = (sharesCamera || sharesScreen) && !!videoStream;

  return (
    <div
      data-uie-name="item-grid"
      css={{position: 'relative'}}
      data-user-id={participant?.user.id}
      className="group-video-grid__element"
      onDoubleClick={() => onParticipantDoubleClick(participant?.user.qualifiedId, participant?.clientId)}
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
            backgroundColor: '#33373a',
            boxShadow: participantCount > 1 ? 'inset 0px 0px 0px 1px #000' : 'initial',
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
          bottom: 0,
          boxShadow:
            participantCount > 2 && isActivelySpeaking
              ? `inset 0px 0px 0px 2px ${selfColor}`
              : `inset 0px 0px 0px 0px ${selfColor}`,
          left: 0,
          position: 'absolute',
          right: 0,
          top: 0,
          transition: 'box-shadow 0.3s ease-in-out',
        }}
      />
      {!minimized && (
        <div className="group-video-grid__element__label">
          {isMuted ? (
            <span className="group-video-grid__element__label__icon">
              <Icon.MicOff data-uie-name="mic-icon-off" />
            </span>
          ) : (
            <ParticipantMicOnIcon isActive={isActivelySpeaking} className="group-video-grid__element__label__icon" />
          )}
          <span
            data-uie-name={
              isActivelySpeaking ? 'status-active-speaking' : isMuted ? 'status-audio-off' : 'status-audio-on'
            }
            className="group-video-grid__element__label__name"
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
            css={{fontsize: minimized ? 11 : 14}}
            data-uie-name="status-video-paused"
          >
            {t('videoCallPaused')}
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupVideoGridTile;
