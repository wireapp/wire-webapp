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

export interface GroupVideoGripProps {
  grid: Grid;
  minimized?: boolean;
  muted?: boolean;
  selfParticipant: Participant;
}

interface RowsAndColumns extends CSSProperties {
  columns: number;
  rows: number;
}

const calculateRowsAndColumns = (totalCount: number): RowsAndColumns => {
  const columns = Math.ceil(Math.sqrt(totalCount));
  const rows = Math.ceil(totalCount / columns);
  return {columns: columns, rows: rows};
};

const groupVideoOverlayStyles = css({
  '> svg path': {
    fill: '#fff',
  },
  alignItems: 'center',
  backgroundColor: 'var(--background-fade-16)',
  display: 'flex',
  height: '100%',
  justifyContent: 'center',
  left: '0',
  position: 'absolute',
  top: '0',
  transform: 'translateZ(0)',
  width: '100%',
});

const groupVideoThumbnailStyles = css({
  borderRadius: '4px',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.16)',
  lineHeight: 0,
  overflow: 'hidden',
  position: 'absolute',
  right: '32px',
  top: '32px',
  width: '160px',
});

const groupVideoMinimizedThumbnailStyles = css({
  bottom: '8px',
  boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.16)',
  groupVideoThumbnailStyles,
  right: '8px',
  top: 'unset',
  width: '80px',
});

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
    <div css={{height: '100%', position: 'relative', width: '100%'}}>
      <div
        css={{
          backgroundColor: hasBlackBackground() ? '#000' : 'initial',
          display: 'flex',
          flexWrap: 'wrap',
          height: '100%',
          justifyContent: 'center',
          position: 'relative',
          width: '100%',
        }}
        data-uie-name="grids-wrapper"
      >
        {participants.map(participant => (
          <div
            key={participant.clientId + participant.user.id}
            css={{
              boxSizing: 'border-box',
              height: `calc(100% / ${rowsAndColumns.rows})`,
              overflow: 'hidden',
              position: 'relative',
              width: `calc(100% / ${rowsAndColumns.columns})`,
            }}
            onDoubleClick={() => doubleClickedOnVideo(participant.user.id, participant.clientId)}
            data-uie-name="item-grid"
          >
            <Video
              autoPlay
              playsInline
              srcObject={participant.videoStream()}
              css={{
                height: '100%',
                mirror: participant === selfParticipant && participant.sharesCamera(),
                objectFit: !!maximizedParticipant || participant.sharesScreen() ? 'contain' : 'cover',
                position: 'absolute',
                width: '100%',
              }}
            />
            {!minimized && (
              <div
                css={{
                  alignItems: 'center',
                  backdropFilter: 'blur(10px)',
                  backgroundColor: 'rgba(128, 128, 128, 0.24)',
                  borderRadius: 100,
                  bottom: '0',
                  color: '#fff',
                  display: 'flex',
                  fontSize: 12,
                  lineHeight: '1em',
                  margin: 8,
                  maxWidth: 'calc(100% - 16px)',
                  opacity: 0,
                  padding: 8,
                  position: 'absolute',
                  whiteSpace: 'nowrap',
                }}
              >
                {participant.isMuted() ? (
                  <span css={{marginRight: 8}}>
                    <svg
                      css={{
                        '& > path': {
                          fill: '#fff',
                        },
                        width: 16,
                      }}
                      viewBox="0 0 16 16"
                      dangerouslySetInnerHTML={{__html: SVGProvider['mic-off-icon']?.documentElement?.innerHTML}}
                    ></svg>
                  </span>
                ) : (
                  <span css={{marginRight: 8}}>
                    <svg
                      css={{
                        '& > path': {
                          fill: '#fff',
                        },
                        width: 16,
                      }}
                      viewBox="0 0 16 16"
                      dangerouslySetInnerHTML={{__html: SVGProvider['mic-on-icon']?.documentElement?.innerHTML}}
                    ></svg>
                  </span>
                )}
                <span css={{overflow: 'hidden', textOverflow: 'ellipsis'}}>{participant.user.name()}</span>
              </div>
            )}
            {participant.hasPausedVideo() && (
              <div css={groupVideoOverlayStyles}>
                <div css={{transition: 'none'}}>
                  <div className="background-image"></div>
                  <div className="background-darken"></div>
                </div>
                <div
                  css={{
                    color: '#fff',
                    fontSize: minimized ? 11 : 14,
                    fontWeight: 600,
                    maxWidth: '50%',
                    textAlign: 'center',
                    zIndex: 1,
                  }}
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
          css={minimized ? groupVideoMinimizedThumbnailStyles : groupVideoThumbnailStyles}
          data-uie-name="self-video-thumbnail-wrapper"
        >
          <Video
            autoPlay
            playsInline
            data-uie-name="self-video-thumbnail"
            css={{
              borderRadius: '4px',
              mirror: grid.thumbnail.hasActiveVideo() && !grid.thumbnail.sharesScreen(),
              width: '100%',
            }}
            srcObject={grid.thumbnail.videoStream()}
          />
          {muted && (
            <div css={groupVideoOverlayStyles} data-uie-name="status-call-audio-muted">
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
