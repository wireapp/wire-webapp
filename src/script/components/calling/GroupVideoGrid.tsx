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

import {registerReactComponent, useKoSubscribable} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import Icon from 'Components/Icon';
import type {Grid} from '../../calling/videoGridHandler';
import Video from './Video';
import type {Participant} from '../../calling/Participant';
import GroupVideoGridTile from './GroupVideoGridTile';
import ParticipantMicOnIcon from './ParticipantMicOnIcon';

export interface GroupVideoGripProps {
  grid: Grid;
  maximizedParticipant: Participant;
  minimized?: boolean;
  muted?: boolean;
  selfParticipant: Participant;
  setMaximizedParticipant: (participant: Participant) => void;
}

interface RowsAndColumns extends CSSProperties {
  '--columns': number;
  '--rows': number;
}

const calculateRowsAndColumns = (totalCount: number): RowsAndColumns => {
  const columns = Math.ceil(Math.sqrt(totalCount));
  const rows = Math.ceil(totalCount / columns);
  return {'--columns': columns, '--rows': rows};
};

const GroupVideoGrid: React.FunctionComponent<GroupVideoGripProps> = ({
  minimized = false,
  grid,
  muted = false,
  selfParticipant,
  maximizedParticipant,
  setMaximizedParticipant,
}) => {
  const [thumbnailHasActiveVideo, setThumbnailHasActiveVideo] = useState(false);
  const [thumbnailSharesScreen, setThumbnailSharesScreen] = useState(false);
  const [thumbnailVideoStream, setThumbnailVideoStream] = useState<MediaStream>(null);

  useEffect(() => {
    setThumbnailHasActiveVideo(grid.thumbnail?.hasActiveVideo() ?? false);
    setThumbnailSharesScreen(grid.thumbnail?.sharesScreen() ?? false);
    setThumbnailVideoStream(grid.thumbnail?.videoStream() ?? null);
    const activeVideoSub = grid.thumbnail?.hasActiveVideo.subscribe(val => setThumbnailHasActiveVideo(val));
    const sharesScreenSub = grid.thumbnail?.sharesScreen.subscribe(val => setThumbnailSharesScreen(val));
    const videoStreamSub = grid.thumbnail?.videoStream.subscribe(val => setThumbnailVideoStream(val));
    return () => {
      activeVideoSub?.dispose();
      sharesScreenSub?.dispose();
      videoStreamSub?.dispose();
    };
  }, [grid]);

  const [rowsAndColumns, setRowsAndColumns] = useState<RowsAndColumns>(calculateRowsAndColumns(grid.grid.length));

  const doubleClickedOnVideo = (userId: string, clientId: string) => {
    if (maximizedParticipant !== null) {
      setMaximizedParticipant(null);
      return;
    }
    if (grid.thumbnail) {
      return;
    }
    const participant = grid.grid.find(participant => participant?.doesMatchIds(userId, clientId));
    setMaximizedParticipant(participant);
  };

  const participants = (maximizedParticipant ? [maximizedParticipant] : grid.grid).filter(p => !!p);

  useEffect(() => {
    setRowsAndColumns(calculateRowsAndColumns(participants.length));
  }, [participants.length]);

  const selfName = useKoSubscribable(selfParticipant.user.name);
  const selfIsMuted = useKoSubscribable(selfParticipant.isMuted);
  const selfIsActivelySpeaking = useKoSubscribable(selfParticipant.isActivelySpeaking);

  return (
    <div className="group-video">
      <div
        className="group-video-grid"
        css={{backgroundColor: '#323739'}}
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
              {t('noActiveVideoSpeakers')}
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
            maximizedParticipant={maximizedParticipant}
            onParticipantDoubleClick={doubleClickedOnVideo}
          />
        ))}
      </div>
      {thumbnailVideoStream && !maximizedParticipant && (
        <div
          className="group-video__thumbnail"
          css={
            minimized
              ? css`
                  top: unset;
                  right: 8px;
                  bottom: 8px;
                  width: 80px;
                  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.16);
                `
              : undefined
          }
          data-uie-name="self-video-thumbnail-wrapper"
        >
          <Video
            className="group-video__thumbnail-video"
            autoPlay
            playsInline
            data-uie-name="self-video-thumbnail"
            css={{
              transform: thumbnailHasActiveVideo && !thumbnailSharesScreen ? 'rotateY(180deg)' : 'initial',
            }}
            srcObject={thumbnailVideoStream}
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
        </div>
      )}
    </div>
  );
};

export default GroupVideoGrid;

registerReactComponent('group-video-grid', {
  component: GroupVideoGrid,
  optionalParams: ['muted', 'minimized'],
  template:
    '<div class="group-video-wrapper" data-bind="react: {grid: ko.unwrap(grid), selfParticipant: ko.unwrap(selfParticipant), maximizedParticipant: ko.unwrap(maximizedParticipant), minimized, muted: ko.unwrap(muted)}"></div>',
});
