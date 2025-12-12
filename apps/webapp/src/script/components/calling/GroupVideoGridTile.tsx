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

import {KeyboardEvent} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user';

import {VIDEO_STATE} from '@wireapp/avs';
import {TabIndex} from '@wireapp/react-ui-kit';

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import {
  groupVideoActiveSpeaker,
  groupVideoActiveSpeakerTile,
  groupVideoElementVideo,
  groupVideoParticipantAudioStatus,
  groupVideoParticipantName,
  groupVideoParticipantNameWrapper,
  groupVideoPauseOverlayLabel,
  groupVideoTileWrapper,
} from 'Components/calling/GroupVideoGridTile.styles';
import * as Icon from 'Components/Icon';
import type {Participant} from 'Repositories/calling/Participant';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {isEnterKey} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {Video} from './Video';

interface GroupVideoGridTileProps {
  isMaximized: boolean;
  minimized: boolean;
  onTileDoubleClick: (userId: QualifiedId, clientId: string) => void;
  participant: Participant;
  participantCount: number;
  selfParticipant: Participant;
}

const GroupVideoGridTile = ({
  minimized,
  participant,
  selfParticipant,
  participantCount,
  isMaximized,
  onTileDoubleClick,
}: GroupVideoGridTileProps) => {
  const {
    isMuted,
    videoState,
    handRaisedAt,
    videoStream,
    blurredVideoStream,
    isActivelySpeaking,
    isAudioEstablished,
    isSwitchingVideoResolution,
  } = useKoSubscribableChildren(participant, [
    'isMuted',
    'handRaisedAt',
    'videoStream',
    'blurredVideoStream',
    'isActivelySpeaking',
    'videoState',
    'isAudioEstablished',
    'isSwitchingVideoResolution',
  ]);

  const {name} = useKoSubscribableChildren(participant?.user, ['name']);

  const sharesScreen = videoState === VIDEO_STATE.SCREENSHARE;
  const sharesCamera = [VIDEO_STATE.STARTED, VIDEO_STATE.PAUSED].includes(videoState);
  const hasPausedVideo = videoState === VIDEO_STATE.PAUSED;
  const doVideoReconnecting = videoState === VIDEO_STATE.RECONNECTING;
  const hasActiveVideo = (sharesCamera || sharesScreen) && !!videoStream;

  const handleTileClick = () => onTileDoubleClick(participant?.user.qualifiedId, participant?.clientId);

  const handleEnterTileClick = (keyboardEvent: KeyboardEvent) => {
    if (isEnterKey(keyboardEvent)) {
      handleTileClick();
    }
  };

  const nameContainer = !minimized && (
    <div className="group-video-grid__element__label" css={groupVideoActiveSpeaker(isActivelySpeaking)}>
      <span
        data-uie-name={isActivelySpeaking ? 'status-active-speaking' : isMuted ? 'status-audio-off' : 'status-audio-on'}
        css={groupVideoParticipantNameWrapper(isActivelySpeaking, isAudioEstablished)}
      >
        <span
          data-uie-value={participant?.user.id}
          data-uie-name="call-participant-name"
          css={groupVideoParticipantName}
        >
          {name}
        </span>
        {!isAudioEstablished && (
          <span css={groupVideoParticipantAudioStatus(isActivelySpeaking, isAudioEstablished)}>
            {t('videoCallParticipantConnecting')}
          </span>
        )}
      </span>
    </div>
  );

  return (
    <div
      data-uie-name="item-grid"
      data-user-id={participant?.user.id}
      className="group-video-grid__element"
      onDoubleClick={handleTileClick}
      onKeyDown={handleEnterTileClick}
      role="button"
      // minimized is passed only from CallingCell where we don't want to focus individual the tile on the tab press
      tabIndex={
        (!minimized || isMaximized) && participant !== selfParticipant ? TabIndex.FOCUSABLE : TabIndex.UNFOCUSABLE
      }
      aria-label={`Focus video ${participant?.user.id}`}
    >
      {hasActiveVideo ? (
        <div className="tile-wrapper">
          <Video
            autoPlay
            playsInline
            /* This is needed to keep playing the video when detached to a new window,
               only muted video can be played automatically without user interacting with the window first,
               see https://developer.mozilla.org/en-US/docs/Web/Media/Autoplay_guide.
            */
            muted
            srcObject={blurredVideoStream?.stream ?? videoStream}
            className="group-video-grid__element-video"
            css={groupVideoElementVideo(isMaximized || sharesScreen, participant === selfParticipant && sharesCamera)}
          />
        </div>
      ) : (
        <div css={groupVideoTileWrapper}>
          <Avatar
            avatarSize={minimized ? AVATAR_SIZE.MEDIUM : AVATAR_SIZE.LARGE}
            participant={participant?.user}
            hideAvailabilityStatus
          />
        </div>
      )}

      <div css={groupVideoActiveSpeakerTile(isActivelySpeaking, participantCount)} />

      {!minimized && isMuted && (
        <span className="group-video-grid__element__label__icon">
          <Icon.MicOffIcon data-uie-name="mic-icon-off" data-uie-value={participant?.user.id} />
        </span>
      )}

      {!minimized && handRaisedAt && <span className="group-video-grid__element__label__hand_icon">✋</span>}

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

      {nameContainer}

      {(hasPausedVideo || isSwitchingVideoResolution || doVideoReconnecting) && (
        <div className="group-video-grid__pause-overlay">
          <div className="background">
            <div className="background-image"></div>
            <div className="background-darken"></div>
          </div>

          <div
            className="group-video-grid__pause-overlay__label"
            css={groupVideoPauseOverlayLabel(minimized)}
            data-uie-name="status-video-paused"
          >
            {hasPausedVideo ? t('videoCallPaused') : t('videoCallParticipantConnecting')}
          </div>
          {nameContainer}
        </div>
      )}
    </div>
  );
};

export {GroupVideoGridTile};
