/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import React, {useState, useEffect, CSSProperties} from 'react';
import {css} from '@emotion/core';

import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import Icon from 'Components/Icon';
import type {Grid} from '../../calling/videoGridHandler';
import Video from './Video';
import type {Participant} from '../../calling/Participant';
import GroupVideoGridTile from './GroupVideoGridTile';
import ParticipantMicOnIcon from './ParticipantMicOnIcon';
import Avatar, {AVATAR_SIZE} from 'Components/Avatar';

export interface GroupVideoGripProps {
  grid: Grid;
  maximizedParticipant: Participant;
  minimized?: boolean;
  selfParticipant: Participant;
  setMaximizedParticipant?: (participant: Participant) => void;
}

interface RowsAndColumns extends CSSProperties {
  '--columns': number;
  '--rows': number;
}

const calculateRowsAndColumns = (totalCount: number): RowsAndColumns => {
  const columns = totalCount ? Math.ceil(Math.sqrt(totalCount)) : 1;
  const rows = totalCount ? Math.ceil(totalCount / columns) : 1;
  return {'--columns': columns, '--rows': rows};
};

const GroupVideoThumbnailWrapper: React.FC<{minimized: boolean}> = ({minimized, children}) => (
  <div
    className="group-video__thumbnail"
    css={
      minimized
        ? css`
            top: unset;
            right: 8px;
            bottom: 8px;
            width: 80px;
            height: 60px;
            box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.16);
          `
        : undefined
    }
    data-uie-name="self-video-thumbnail-wrapper"
  >
    {children}
  </div>
);

const GroupVideoGrid: React.FunctionComponent<GroupVideoGripProps> = ({
  minimized = false,
  grid,
  selfParticipant,
  maximizedParticipant,
  setMaximizedParticipant,
}) => {
  const thumbnail = useKoSubscribableChildren(grid.thumbnail, ['hasActiveVideo', 'sharesScreen', 'videoStream']);

  const [rowsAndColumns, setRowsAndColumns] = useState<RowsAndColumns>(calculateRowsAndColumns(grid?.grid.length));

  const doubleClickedOnVideo = (userId: string, clientId: string) => {
    if (typeof setMaximizedParticipant !== 'function') {
      return;
    }
    if (maximizedParticipant !== null) {
      setMaximizedParticipant(null);
      return;
    }
    if (grid.grid.length < 2) {
      return;
    }

    const participant = grid.grid.find(participant => participant?.doesMatchIds(userId, clientId));
    setMaximizedParticipant(participant);
  };

  const participants = (maximizedParticipant ? [maximizedParticipant] : grid.grid).filter(Boolean);

  useEffect(() => {
    setRowsAndColumns(calculateRowsAndColumns(participants.length));
  }, [participants.length]);

  const {isMuted: selfIsMuted, isActivelySpeaking: selfIsActivelySpeaking} = useKoSubscribableChildren(
    selfParticipant,
    ['isMuted', 'isActivelySpeaking'],
  );
  const {name: selfName} = useKoSubscribableChildren(selfParticipant?.user, ['name']);

  return (
    <div className="group-video">
      <div
        className="group-video-grid"
        css={{backgroundColor: '#000'}}
        style={rowsAndColumns}
        data-uie-name="grids-wrapper"
      >
        {grid.grid.length === 0 && (
          <div
            css={{
              alignItems: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Icon.Loading
              css={{
                '> path': {
                  fill: '#fff',
                },
                height: 32,
                marginBottom: 32,
                width: 32,
              }}
            />
            <div data-uie-name="no-active-speakers" css={{color: '#fff', fontSize: 11, fontWeight: 500}}>
              {t('noActiveSpeakers')}
            </div>
          </div>
        )}
        {participants.map(participant => (
          <GroupVideoGridTile
            minimized={minimized}
            participant={participant}
            key={participant.clientId}
            selfParticipant={selfParticipant}
            participantCount={participants.length}
            isMaximized={!!maximizedParticipant}
            onParticipantDoubleClick={doubleClickedOnVideo}
          />
        ))}
      </div>
      {thumbnail.videoStream && !maximizedParticipant && (
        <GroupVideoThumbnailWrapper minimized={minimized}>
          <Video
            className="group-video__thumbnail-video"
            autoPlay
            playsInline
            data-uie-name="self-video-thumbnail"
            css={{
              transform: thumbnail.hasActiveVideo && !thumbnail.sharesScreen ? 'rotateY(180deg)' : 'initial',
            }}
            srcObject={thumbnail.videoStream}
          />
          <div className="group-video-grid__element__label" css={{padding: 4}}>
            {selfIsMuted ? (
              <span
                className="group-video-grid__element__label__icon"
                css={{'> svg': {width: 12}, height: 12}}
                data-uie-name="status-call-audio-muted"
              >
                <Icon.MicOff data-uie-name="mic-icon-off" />
              </span>
            ) : (
              <ParticipantMicOnIcon
                isActive={selfIsActivelySpeaking}
                className="group-video-grid__element__label__icon"
                css={{'> svg': {width: 12}}}
              />
            )}
            <span
              data-uie-name={
                selfIsActivelySpeaking ? 'status-active-speaking' : selfIsMuted ? 'status-audio-off' : 'status-audio-on'
              }
              className="group-video-grid__element__label__name"
              css={{fontSize: 10}}
            >
              {selfName}
            </span>
          </div>
        </GroupVideoThumbnailWrapper>
      )}
      {!!grid.thumbnail && !thumbnail.hasActiveVideo && !!selfParticipant && (
        <GroupVideoThumbnailWrapper minimized={minimized}>
          <div
            css={{
              alignItems: 'center',
              display: 'flex',
              height: '100%',
              justifyContent: 'center',
              width: '100%',
            }}
          >
            <Avatar
              avatarSize={minimized ? AVATAR_SIZE.SMALL : AVATAR_SIZE.MEDIUM}
              participant={selfParticipant.user}
            />
          </div>
        </GroupVideoThumbnailWrapper>
      )}
    </div>
  );
};

export default GroupVideoGrid;
