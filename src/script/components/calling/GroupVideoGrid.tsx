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

import {registerReactComponent} from 'Util/ComponentUtil';
import type {Grid} from '../../calling/videoGridHandler';
import type {Participant} from '../../calling/Participant';
import Video from './Video';
import {t} from '../../util/LocalizerUtil';
import ParticipantMicOnIcon from './ParticipantMicOnIcon';
import NamedIcon from 'Components/NamedIcon';

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
  const [rowsAndColumns, setRowsAndColumns] = useState<RowsAndColumns>(calculateRowsAndColumns(grid.grid.length));
  const videoParticipants: Participant[] = grid.grid.filter(participant => !!participant);

  const doubleClickedOnVideo = (userId: string, clientId: string) => {
    if (maximizedParticipant !== null) {
      setMaximizedParticipant(null);
      return;
    }
    if (grid.thumbnail) {
      return;
    }
    const participant = videoParticipants.find(participant => participant.doesMatchIds(userId, clientId));
    setMaximizedParticipant(participant);
  };

  const participants = (maximizedParticipant ? [maximizedParticipant] : grid.grid).filter(p => !!p);

  useEffect(() => {
    setRowsAndColumns(calculateRowsAndColumns(participants.length));
  }, [participants.length]);

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
            <NamedIcon
              css={{
                '> path': {
                  fill: '#fff',
                },
                height: 32,
                marginBottom: 32,
                width: 32,
              }}
              name="loading-icon"
            />
            <div data-uie-name="no-active-speakers" css={{color: '#fff', fontSize: 11, fontWeight: 500}}>
              {t('noActiveSpeakers')}
            </div>
          </div>
        )}
        {participants.map(participant => (
          <div
            key={participant.clientId + participant.user.id}
            className="group-video-grid__element"
            onDoubleClick={() => doubleClickedOnVideo(participant.user.id, participant.clientId)}
            data-uie-name="item-grid"
            data-user-id={participant.user.id}
            css={{position: 'relative'}}
          >
            <Video
              className="group-video-grid__element-video"
              autoPlay
              playsInline
              srcObject={participant.videoStream()}
              css={{
                objectFit: !!maximizedParticipant || participant.sharesScreen() ? 'contain' : 'cover',
                transform:
                  participant === selfParticipant && participant.sharesCamera() ? 'rotateY(180deg)' : 'initial',
              }}
            />
            <div
              css={{
                bottom: 0,
                boxShadow:
                  participants.length > 2 && participant.isActivelySpeaking()
                    ? `inset 0px 0px 2px 2px ${selfParticipant.user.accent_color()}`
                    : `inset 0px 0px 0px 0px ${selfParticipant.user.accent_color()}`,
                left: 0,
                position: 'absolute',
                right: 0,
                top: 0,
                transition: 'box-shadow 0.3s ease-in-out',
              }}
            />
            {!minimized && (
              <div className="group-video-grid__element__label">
                {participant.isMuted() ? (
                  <span className="group-video-grid__element__label__icon">
                    <NamedIcon name="mic-off-icon" data-uie-name="mic-icon-off" />
                  </span>
                ) : (
                  <ParticipantMicOnIcon
                    isActive={participant.isActivelySpeaking()}
                    className="group-video-grid__element__label__icon"
                  />
                )}
                <span
                  data-uie-name={
                    participant.isActivelySpeaking()
                      ? 'status-active-speaking'
                      : participant.isMuted()
                      ? 'status-audio-off'
                      : 'status-audio-on'
                  }
                  className="group-video-grid__element__label__name"
                >
                  {participant.user.name()}
                </span>
              </div>
            )}
            {participant.hasPausedVideo() && (
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
        ))}
      </div>
      {grid.thumbnail && grid.thumbnail.videoStream() && !maximizedParticipant && (
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
              transform:
                grid.thumbnail.hasActiveVideo() && !grid.thumbnail.sharesScreen() ? 'rotateY(180deg)' : 'initial',
            }}
            srcObject={grid.thumbnail.videoStream()}
          />
          {muted && (
            <div className="group-video-grid__mute-overlay" data-uie-name="status-call-audio-muted">
              <span>
                <NamedIcon name="mic-off-icon" data-uie-name="mic-icon-off" />
              </span>
            </div>
          )}
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
