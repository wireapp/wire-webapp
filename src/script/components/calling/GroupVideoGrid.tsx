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

import React, {useState, CSSProperties} from 'react';
import {css} from '@emotion/core';

import {registerReactComponent} from 'Util/ComponentUtil';
import SVGProvider from '../../auth/util/SVGProvider';
import type {Grid} from '../../calling/videoGridHandler';
import type {Participant} from '../../calling/Participant';
import Video from './Video';
import {t} from '../../util/LocalizerUtil';
import ParticipantMicOnIcon from './ParticipantMicOnIcon';

export interface GroupVideoGripProps {
  grid: Grid;
  minimized?: boolean;
  muted?: boolean;
  selfParticipant: Participant;
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
}) => {
  const [maximizedParticipant, setMaximizedParticipant] = useState<Participant | null>(null);
  const [rowsAndColumns, setRowsAndColumns] = useState<RowsAndColumns>(calculateRowsAndColumns(grid.grid.length));
  const videoParticipants: Participant[] = grid.grid.filter(participant => !!participant);

  const hasBlackBackground = (): boolean => {
    const gridElementsCount = grid.grid.filter(participant => !!participant).length;
    return minimized && gridElementsCount > 1;
  };

  const doubleClickedOnVideo = (userId: string, clientId: string) => {
    if (maximizedParticipant !== null) {
      setMaximizedParticipant(null);
      setRowsAndColumns(calculateRowsAndColumns(grid.grid.length));
      return;
    }
    const participant = videoParticipants.find(participant => participant.doesMatchIds(userId, clientId));
    setMaximizedParticipant(participant);
    setRowsAndColumns(calculateRowsAndColumns(1));
  };

  const participants = (maximizedParticipant ? [maximizedParticipant] : grid.grid).filter(p => !!p);

  return (
    <div className="group-video">
      <div
        className="group-video-grid"
        css={
          hasBlackBackground()
            ? css`
                background-color: #000;
              `
            : undefined
        }
        style={rowsAndColumns}
        data-uie-name="grids-wrapper"
      >
        {participants.map(participant => (
          <div
            key={participant.clientId + participant.user.id}
            className="group-video-grid__element"
            onDoubleClick={() => doubleClickedOnVideo(participant.user.id, participant.clientId)}
            data-uie-name="item-grid"
          >
            <Video
              className="group-video-grid__element-video"
              autoPlay
              playsInline
              srcObject={participant.videoStream()}
              css={{
                objectFit: !!maximizedParticipant || participant.sharesScreen() ? 'contain' : 'initial',
                transform:
                  participant === selfParticipant && participant.sharesCamera() ? 'rotateY(180deg)' : 'initial',
              }}
            />
            {!minimized && (
              <div className="group-video-grid__element__label">
                {participant.isMuted() ? (
                  <span className="group-video-grid__element__label__icon">
                    <svg
                      viewBox="0 0 16 16"
                      dangerouslySetInnerHTML={{__html: SVGProvider['mic-off-icon']?.documentElement?.innerHTML}}
                    ></svg>
                  </span>
                ) : (
                  <ParticipantMicOnIcon
                    isActive={participant.isActivelySpeaking()}
                    activeColor={participant.user.accent_color()}
                    className="group-video-grid__element__label__icon"
                  />
                )}
                <span className="group-video-grid__element__label__name">{participant.user.name()}</span>
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
                <svg
                  viewBox="0 0 16 16"
                  dangerouslySetInnerHTML={{__html: SVGProvider['mic-off-icon']?.documentElement?.innerHTML}}
                ></svg>
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
    '<div class="group-video-wrapper" data-bind="react: {grid: ko.unwrap(grid), selfParticipant: ko.unwrap(selfParticipant), minimized, muted: ko.unwrap(muted)}"></div>',
});
