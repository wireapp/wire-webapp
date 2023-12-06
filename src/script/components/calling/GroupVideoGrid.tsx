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

import React, {CSSProperties, useEffect, useState} from 'react';

import {css} from '@emotion/react';
import {QualifiedId} from '@wireapp/api-client/lib/user';

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import {Icon} from 'Components/Icon';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {GroupVideoGridTile} from './GroupVideoGridTile';
import {Video} from './Video';

import type {Participant} from '../../calling/Participant';
import type {Grid} from '../../calling/videoGridHandler';

export interface GroupVideoGripProps {
  grid: Grid;
  maximizedParticipant: Participant | null;
  minimized?: boolean;
  selfParticipant: Participant;
  setMaximizedParticipant?: (participant: Participant | null) => void;
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

const GroupVideoThumbnailWrapper: React.FC<{children?: React.ReactNode; minimized: boolean}> = ({
  minimized,
  children,
}) => (
  <div
    className="group-video__thumbnail"
    css={
      minimized
        ? css`
            bottom: unset;
            box-shadow: 0 0 0 1px var(--gray-90);
            height: 40px;
            right: 8px;
            top: 8px;
            width: 70px;
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

  const doubleClickedOnVideo = (userId: QualifiedId, clientId: string) => {
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

    const participant = grid.grid.find(participant => participant?.doesMatchIds(userId, clientId)) || null;
    setMaximizedParticipant(participant);
  };

  const participants = (maximizedParticipant ? [maximizedParticipant] : grid.grid).filter(Boolean);

  useEffect(() => {
    setRowsAndColumns(calculateRowsAndColumns(participants.length));
  }, [participants.length]);

  const {isMuted: selfIsMuted} = useKoSubscribableChildren(selfParticipant, ['isMuted']);

  return (
    <div className="group-video">
      <div
        className="group-video-grid"
        css={{backgroundColor: 'var(--group-video-bg)'}}
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
                  fill: 'var(--main-color)',
                },
                height: 32,
                marginBottom: 32,
                width: 32,
              }}
            />
            <div
              data-uie-name="no-active-speakers"
              css={{color: 'var(--main-color)', fontSize: 'var(--font-size-xsmall)', fontWeight: 500}}
            >
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
            onTileDoubleClick={doubleClickedOnVideo}
          />
        ))}
      </div>
      {thumbnail.videoStream && !maximizedParticipant && (
        <GroupVideoThumbnailWrapper minimized={minimized}>
          <Video
            isBlurred={!!selfParticipant.isBlurred()}
            className="group-video__thumbnail-video"
            autoPlay
            playsInline
            data-uie-name="self-video-thumbnail"
            css={{
              transform: thumbnail.hasActiveVideo && !thumbnail.sharesScreen ? 'rotateY(180deg)' : 'initial',
            }}
            srcObject={thumbnail.videoStream}
          />
          {selfIsMuted && !minimized && (
            <span className="group-video-grid__element__label__icon" data-uie-name="status-call-audio-muted">
              <Icon.MicOff data-uie-name="mic-icon-off" />
            </span>
          )}
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
            {selfIsMuted && !minimized && (
              <span className="group-video-grid__element__label__icon" data-uie-name="status-call-audio-muted">
                <Icon.MicOff data-uie-name="mic-icon-off" />
              </span>
            )}
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

export {GroupVideoGrid};
