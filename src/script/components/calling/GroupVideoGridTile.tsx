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

import {t} from 'Util/LocalizerUtil';
import Icon from 'Components/Icon';
import {useKoSubscribable} from 'Util/ComponentUtil';

import Video from './Video';
import ParticipantMicOnIcon from './ParticipantMicOnIcon';
import type {Participant} from '../../calling/Participant';

export interface GroupVideoGridTileProps {
  maximizedParticipant: Participant;
  minimized: boolean;
  onParticipantDoubleClick: (userId: string, clientId: string) => void;
  participant: Participant;
  participantCount: number;
  selfParticipant: Participant;
}

const GroupVideoGridTile: React.FC<GroupVideoGridTileProps> = ({
  minimized,
  participant,
  selfParticipant,
  participantCount,
  maximizedParticipant,
  onParticipantDoubleClick,
}) => {
  const name = useKoSubscribable(participant.user.name);
  const isMuted = useKoSubscribable(participant.isMuted);
  const videoStream = useKoSubscribable(participant.videoStream);
  const sharesScreen = useKoSubscribable(participant.sharesScreen);
  const sharesCamera = useKoSubscribable(participant.sharesCamera);
  const hasPausedVideo = useKoSubscribable(participant.hasPausedVideo);
  const selfColor = useKoSubscribable(selfParticipant.user.accent_color);
  const isActivelySpeaking = useKoSubscribable(participant.isActivelySpeaking);

  return (
    <div
      data-uie-name="item-grid"
      css={{position: 'relative'}}
      data-user-id={participant.user.id}
      className="group-video-grid__element"
      onDoubleClick={() => onParticipantDoubleClick(participant.user.id, participant.clientId)}
    >
      <Video
        autoPlay
        playsInline
        srcObject={videoStream}
        className="group-video-grid__element-video"
        css={{
          objectFit: !!maximizedParticipant || sharesScreen ? 'contain' : 'cover',
          transform: participant === selfParticipant && sharesCamera ? 'rotateY(180deg)' : 'initial',
        }}
      />
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
