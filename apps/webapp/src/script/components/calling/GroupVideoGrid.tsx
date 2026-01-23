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

import {ReactNode, CSSProperties, useEffect, useState} from 'react';

import {css} from '@emotion/react';
import {QualifiedId} from '@wireapp/api-client/lib/user';

import {QUERY} from '@wireapp/react-ui-kit';

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import * as Icon from 'Components/Icon';
import {useActiveWindowMatchMedia} from 'Hooks/useActiveWindowMatchMedia';
import {Call} from 'Repositories/calling/Call';
import type {Participant} from 'Repositories/calling/Participant';
import type {Grid} from 'Repositories/calling/videoGridHandler';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {GroupVideoGridTile} from './GroupVideoGridTile';
import {Video} from './Video';

const PARTICIPANTS_LIMITS = {
  TABLET: {SHORT: 2, MEDIUM: 4, TALL: 8},
  DESKTOP: {SHORT: 3, MEDIUM: 6, TALL: 9},
  MOBILE: {WITH_THUMBNAIL: 2, SHORT: 1, MEDIUM: 2, TALL: 4},
};

export interface GroupVideoGripProps {
  grid: Grid;
  maximizedParticipant: Participant | null;
  minimized?: boolean;
  selfParticipant: Participant;
  call: Call;
  setMaximizedParticipant?: (participant: Participant | null) => void;
}

interface RowsAndColumns extends CSSProperties {
  '--columns': number;
  '--rows': number;
}

const COLUMNS = {
  DESKTOP: 3,
  DESKTOP_EDGE_CASE: 2,
  TABLET: 2,
  MOBILE: 1,
};

const PARTICIPANTS_DESKTOP_EDGE_CASE = 3;

interface CalculateRowsAndColumsParams {
  totalCount: number;
  isDesktop: boolean;
  isTablet: boolean;
  isShort: boolean;
}

const getDesiredColumns = ({totalCount, isDesktop, isTablet, isShort}: CalculateRowsAndColumsParams): number => {
  if (isDesktop) {
    // Special case: use different layout for 3 participants when not in short mode
    if (totalCount === PARTICIPANTS_DESKTOP_EDGE_CASE && !isShort) {
      return COLUMNS.DESKTOP_EDGE_CASE;
    }
    return COLUMNS.DESKTOP;
  }

  if (isTablet) {
    return COLUMNS.TABLET;
  }

  return COLUMNS.MOBILE;
};

const calculateRowsAndColumns = (params: CalculateRowsAndColumsParams): RowsAndColumns => {
  const {totalCount} = params;
  const desiredColumns = getDesiredColumns(params);
  const columns = Math.min(totalCount, desiredColumns);
  const rows = totalCount ? Math.ceil(totalCount / columns) : 1;

  return {'--columns': columns, '--rows': rows};
};

const GroupVideoThumbnailWrapper = ({children, minimized}: {children?: ReactNode; minimized: boolean}) => (
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
    aria-hidden="true"
  >
    {children}
  </div>
);

const HEIGHT_QUERIES = {
  SHORT: 'max-height: 469px',
  MEDIUM: 'min-height: 470px) and (max-height: 829px',
  TALL: 'min-height: 830px',
};

const GroupVideoGrid = ({
  minimized = false,
  grid,
  selfParticipant,
  maximizedParticipant,
  call,
  setMaximizedParticipant,
}: GroupVideoGripProps) => {
  const isMobile = useActiveWindowMatchMedia(QUERY.mobile);
  const isTablet = useActiveWindowMatchMedia(QUERY.tablet);
  const isDesktop = useActiveWindowMatchMedia(QUERY.desktop);
  const isShort = useActiveWindowMatchMedia(HEIGHT_QUERIES.SHORT);
  const isMedium = useActiveWindowMatchMedia(HEIGHT_QUERIES.MEDIUM);
  const isTall = useActiveWindowMatchMedia(HEIGHT_QUERIES.TALL);

  const thumbnail = useKoSubscribableChildren(grid.thumbnail!, [
    'hasActiveVideo',
    'sharesScreen',
    'videoStream',
    'blurredVideoStream',
  ]);

  const [rowsAndColumns, setRowsAndColumns] = useState<RowsAndColumns>(
    calculateRowsAndColumns({
      totalCount: grid?.grid.length,
      isTablet: isTablet,
      isDesktop: isDesktop,
      isShort: isShort,
    }),
  );

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
    setRowsAndColumns(
      calculateRowsAndColumns({
        totalCount: participants.length,
        isTablet: isTablet,
        isDesktop: isDesktop,
        isShort: isShort,
      }),
    );
  }, [participants.length, isTablet, isDesktop, isShort]);

  useEffect(() => {
    const setParticipantsForDevice = (limits: {
      WITH_THUMBNAIL?: number;
      SHORT: number;
      MEDIUM: number;
      TALL: number;
    }) => {
      if (isShort) {
        // Special case: use different layout for 2 participants when in short mode
        if (grid.thumbnail && limits.WITH_THUMBNAIL) {
          return call.setNumberOfParticipantsInOnePage(limits.WITH_THUMBNAIL);
        }
        return call.setNumberOfParticipantsInOnePage(limits.SHORT);
      }
      if (isMedium) {
        return call.setNumberOfParticipantsInOnePage(limits.MEDIUM);
      }
      if (isTall) {
        return call.setNumberOfParticipantsInOnePage(limits.TALL);
      }
    };

    if (isTablet) {
      setParticipantsForDevice(PARTICIPANTS_LIMITS.TABLET);
      return;
    }
    if (isDesktop) {
      setParticipantsForDevice(PARTICIPANTS_LIMITS.DESKTOP);
      return;
    }
    if (isMobile) {
      setParticipantsForDevice(PARTICIPANTS_LIMITS.MOBILE);
    }
  }, [call, grid.thumbnail, isTablet, isDesktop, isMobile, isShort, isMedium, isTall]);

  const {isMuted: selfIsMuted, handRaisedAt: selfHandRaisedAt} = useKoSubscribableChildren(selfParticipant, [
    'isMuted',
    'handRaisedAt',
  ]);

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
            <Icon.LoadingIcon
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
            className="group-video__thumbnail-video"
            autoPlay
            playsInline
            /* This is needed to keep playing the video when detached to a new window,
               only muted video can be played automatically without user interacting with the window first,
               see https://developer.mozilla.org/en-US/docs/Web/Media/Autoplay_guide.
            */
            muted
            data-uie-name="self-video-thumbnail"
            css={{
              transform: thumbnail.hasActiveVideo && !thumbnail.sharesScreen ? 'rotateY(180deg)' : 'initial',
            }}
            srcObject={thumbnail.blurredVideoStream?.stream ?? thumbnail.videoStream}
          />
          {selfIsMuted && !minimized && (
            <span className="group-video-grid__element__label__icon" data-uie-name="status-call-audio-muted">
              <Icon.MicOffIcon data-uie-name="mic-icon-off" />
            </span>
          )}
          {selfHandRaisedAt && !minimized && (
            <span className="group-video-grid__element__label__hand_icon small" data-uie-name="status-call-audio-muted">
              ✋
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
                <Icon.MicOffIcon data-uie-name="mic-icon-off" />
              </span>
            )}
            {selfHandRaisedAt && !minimized && (
              <span
                className="group-video-grid__element__label__hand_icon small"
                data-uie-name="status-call-audio-muted"
              >
                ✋
              </span>
            )}
            <Avatar
              avatarSize={minimized ? AVATAR_SIZE.SMALL : AVATAR_SIZE.MEDIUM}
              participant={selfParticipant.user}
              hideAvailabilityStatus
            />
          </div>
        </GroupVideoThumbnailWrapper>
      )}
    </div>
  );
};

export {GroupVideoGrid};
