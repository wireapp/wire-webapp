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

import {CSSProperties, ReactNode, useEffect, useState, type FunctionComponent} from 'react';

import type {CSSObject} from '@emotion/react';
import {isNan, isNullOrUndefined} from '@sindresorhus/is';

import {GroupVideoGridTile} from './GroupVideoGridTile';
import {groupVideoBackgroundInitializingOverlay} from './GroupVideoGridTile.styles';
import {useShowLoadingOverlay} from './useShowLoadingOverlay';
import {Video} from './Video';

import {QualifiedId} from '../../apiClient/user/qualifiedId';
import {useActiveWindowMatchMedia} from '../../hooks/useActiveWindowMatchMedia';
import {useApplicationContext} from '../../page/rootProvider';
import {Call} from '../../repositories/calling/Call';
import type {Participant} from '../../repositories/calling/Participant';
import type {Grid} from '../../repositories/calling/videoGridHandler';
import {Loading} from '../../uiKit/dataDisplay/loading/loading';
import {QUERY} from '../../uiKit/utils/mediaQueries';
import {useKoSubscribableChildren} from '../../util/componentUtil';
import {Avatar, AVATAR_SIZE} from '../avatar';
import * as Icon from '../icon';

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
  allowSelfVideoMinimize?: boolean;
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
const MIN_PARTICIPANTS_FOR_MAXIMIZED_VIEW = 2;

interface GroupVideoThumbnailProps {
  readonly thumbnail: Participant;
  readonly minimized: boolean;
  readonly maximizedParticipant: Participant | null;
  readonly selfParticipant: Participant;
  allowMinimize: boolean;
  minimizeLabel: string;
  restoreLabel: string;
  isMinimized: boolean;
  onToggleMinimized: () => void;
}

function GroupVideoThumbnail({
  thumbnail: thumbnailParticipant,
  minimized,
  maximizedParticipant,
  selfParticipant,
  allowMinimize,
  minimizeLabel,
  restoreLabel,
  isMinimized,
  onToggleMinimized,
}: GroupVideoThumbnailProps): ReactNode {
  const thumbnail = useKoSubscribableChildren(thumbnailParticipant, [
    'hasActiveVideo',
    'sharesScreen',
    'videoStream',
    'processedVideoStream',
  ]);
  const {showLoadingOverlay, onVideoCanPlay} = useShowLoadingOverlay(
    true,
    thumbnail.hasActiveVideo,
    thumbnail.processedVideoStream,
  );
  const {isMuted: selfIsMuted, handRaisedAt: selfHandRaisedAt} = useKoSubscribableChildren(selfParticipant, [
    'isMuted',
    'handRaisedAt',
  ]);

  const selfVideoToggleControl = (
    <button
      type="button"
      aria-label={isMinimized ? restoreLabel : minimizeLabel}
      title={isMinimized ? restoreLabel : minimizeLabel}
      onClick={onToggleMinimized}
      data-uie-name={isMinimized ? 'restore-self-video-preview' : 'minimize-self-video-preview'}
      css={{
        alignItems: 'center',
        backgroundColor: 'transparent',
        border: 0,
        borderRadius: 4,
        color: isMinimized ? 'var(--white)' : 'var(--foreground)',
        cursor: 'pointer',
        display: 'flex',
        height: 32,
        justifyContent: 'center',
        opacity: isMinimized ? 1 : 0,
        padding: 6,
        width: 32,
        transition: 'opacity 120ms ease-out',
        '.group-video__thumbnail:hover &, .group-video__thumbnail:focus-within &': {opacity: 1},
        '&:focus-visible': {
          outline: '2px solid var(--white)',
          outlineOffset: 2,
          opacity: 1,
        },
        '@media (hover: none)': {opacity: 1},
      }}
    >
      {isMinimized ? (
        <Icon.FullscreenIcon aria-hidden="true" css={{'&& path': {fill: 'currentColor'}}} />
      ) : (
        <Icon.MinusIcon aria-hidden="true" />
      )}
    </button>
  );
  const selfVideoWindowHeader = allowMinimize && (
    <div data-uie-name="self-video-preview-window-header" css={{position: 'absolute', right: 4, top: 4, zIndex: 2}}>
      {selfVideoToggleControl}
    </div>
  );

  return (
    <>
      {!isNullOrUndefined(thumbnail.videoStream) && maximizedParticipant === null && (
        <GroupVideoThumbnailWrapper
          minimized={minimized}
          allowMinimize={allowMinimize}
          selfPreviewMinimized={isMinimized}
        >
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
            onCanPlay={onVideoCanPlay}
            css={{
              transform: thumbnail.hasActiveVideo && !thumbnail.sharesScreen ? 'rotateY(180deg)' : 'initial',
              visibility: isMinimized ? 'hidden' : 'visible',
            }}
            srcObject={thumbnail.processedVideoStream?.stream ?? thumbnail.videoStream}
          />
          {showLoadingOverlay && (
            <div
              aria-busy={showLoadingOverlay}
              css={groupVideoBackgroundInitializingOverlay}
              data-uie-name="background-effect-initializing"
            >
              <Loading size={32} />
            </div>
          )}
          {selfIsMuted && !minimized && (
            <span
              className="group-video-grid__element__label__icon"
              data-uie-name={isMinimized ? 'self-preview-muted-indicator' : 'status-call-audio-muted'}
              css={
                isMinimized
                  ? {
                      '&&': {
                        alignItems: 'center',
                        backgroundColor: 'transparent',
                        bottom: 4,
                        color: 'var(--white)',
                        display: 'flex',
                        height: 16,
                        left: 4,
                        margin: 0,
                        padding: 0,
                        width: 16,
                        zIndex: 3,
                      },
                    }
                  : undefined
              }
            >
              <Icon.MicOffIcon css={{'&& path': {fill: 'currentColor'}}} data-uie-name="mic-icon-off" />
            </span>
          )}
          {!isNullOrUndefined(selfHandRaisedAt) && !minimized && (
            <span
              className="group-video-grid__element__label__hand_icon small"
              data-uie-name={isMinimized ? 'self-preview-hand-raised-indicator' : 'status-call-audio-muted'}
              css={
                isMinimized
                  ? {
                      '&&': {
                        alignItems: 'center',
                        backgroundColor: 'transparent',
                        borderRadius: 0,
                        color: 'var(--white)',
                        display: 'flex',
                        filter: 'grayscale(1) brightness(2)',
                        fontSize: 14,
                        height: 16,
                        justifyContent: 'center',
                        left: 4,
                        margin: 0,
                        top: 4,
                        width: 16,
                        zIndex: 3,
                      },
                    }
                  : undefined
              }
            >
              ✋
            </span>
          )}
          {selfVideoWindowHeader}
        </GroupVideoThumbnailWrapper>
      )}
      {!thumbnail.hasActiveVideo && (
        <GroupVideoThumbnailWrapper
          minimized={minimized}
          allowMinimize={allowMinimize}
          selfPreviewMinimized={isMinimized}
        >
          <div
            css={{
              alignItems: 'center',
              display: 'flex',
              height: '100%',
              justifyContent: 'center',
              width: '100%',
              visibility: isMinimized ? 'hidden' : 'visible',
            }}
          >
            {selfIsMuted && !minimized && (
              <span className="group-video-grid__element__label__icon" data-uie-name="status-call-audio-muted">
                <Icon.MicOffIcon data-uie-name="mic-icon-off" />
              </span>
            )}
            {!isNullOrUndefined(selfHandRaisedAt) && !minimized && (
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
          {selfVideoWindowHeader}
        </GroupVideoThumbnailWrapper>
      )}
    </>
  );
}

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
  const rows = totalCount !== 0 && !isNan(totalCount) ? Math.ceil(totalCount / columns) : 1;

  return {'--columns': columns, '--rows': rows};
};

const GroupVideoThumbnailWrapper: FunctionComponent<{
  children?: ReactNode;
  minimized: boolean;
  allowMinimize?: boolean;
  selfPreviewMinimized?: boolean;
}> = ({children, minimized, allowMinimize = false, selfPreviewMinimized = false}) => {
  let thumbnailStyles: CSSObject | undefined;
  if (selfPreviewMinimized) {
    thumbnailStyles = {
      backgroundColor: 'var(--gray-95)',
      borderRadius: 20,
      bottom: 'unset',
      boxShadow: 'none',
      height: 40,
      maxHeight: 'none',
      maxWidth: 'none',
      overflow: 'visible',
      right: 8,
      top: 8,
      width: 72,
    };
  } else if (minimized) {
    thumbnailStyles = {
      bottom: 'unset',
      boxShadow: '0 0 0 1px var(--gray-90)',
      height: 40,
      right: 8,
      top: 8,
      width: 70,
    };
  }

  return (
    <div
      className="group-video__thumbnail"
      css={thumbnailStyles}
      data-uie-name="self-video-thumbnail-wrapper"
      aria-hidden={!allowMinimize}
    >
      {children}
    </div>
  );
};

const HEIGHT_QUERIES = {
  SHORT: 'max-height: 469px',
  MEDIUM: 'min-height: 470px) and (max-height: 829px',
  TALL: 'min-height: 830px',
};

const GroupVideoGrid: FunctionComponent<GroupVideoGripProps> = ({
  minimized = false,
  grid,
  selfParticipant,
  maximizedParticipant,
  call,
  setMaximizedParticipant,
  allowSelfVideoMinimize = false,
}: GroupVideoGripProps) => {
  const isMobile = useActiveWindowMatchMedia(QUERY.mobile);
  const isTablet = useActiveWindowMatchMedia(QUERY.tablet);
  const isDesktop = useActiveWindowMatchMedia(QUERY.desktop);
  const isShort = useActiveWindowMatchMedia(HEIGHT_QUERIES.SHORT);
  const isMedium = useActiveWindowMatchMedia(HEIGHT_QUERIES.MEDIUM);
  const isTall = useActiveWindowMatchMedia(HEIGHT_QUERIES.TALL);

  const [isSelfVideoMinimized, setIsSelfVideoMinimized] = useState(false);
  const {translate} = useApplicationContext();

  useEffect(() => {
    setIsSelfVideoMinimized(false);
  }, [call]);
  const [rowsAndColumns, setRowsAndColumns] = useState<RowsAndColumns>(
    calculateRowsAndColumns({
      totalCount: grid?.grid.length,
      isTablet: isTablet,
      isDesktop: isDesktop,
      isShort: isShort,
    }),
  );

  const doubleClickedOnVideo = (userId: QualifiedId, clientId: string): void => {
    if (typeof setMaximizedParticipant !== 'function') {
      return;
    }
    if (maximizedParticipant !== null) {
      setMaximizedParticipant(null);
      return;
    }
    if (grid.grid.length < MIN_PARTICIPANTS_FOR_MAXIMIZED_VIEW) {
      return;
    }

    const participant =
      grid.grid.find(participant => {
        return participant.doesMatchIds(userId, clientId);
      }) ?? null;
    setMaximizedParticipant(participant);
  };

  const participants = (isNullOrUndefined(maximizedParticipant) ? grid.grid : [maximizedParticipant]).filter(Boolean);
  const visibleParticipantCount = isSelfVideoMinimized
    ? Math.max(
        1,
        participants.filter(participant => {
          return participant !== selfParticipant;
        }).length,
      )
    : participants.length;

  useEffect(() => {
    setRowsAndColumns(
      calculateRowsAndColumns({
        totalCount: visibleParticipantCount,
        isTablet: isTablet,
        isDesktop: isDesktop,
        isShort: isShort,
      }),
    );
  }, [visibleParticipantCount, isTablet, isDesktop, isShort]);

  useEffect(() => {
    const setParticipantsForDevice = (limits: {
      WITH_THUMBNAIL?: number;
      SHORT: number;
      MEDIUM: number;
      TALL: number;
    }): void => {
      if (isShort) {
        // Special case: use different layout for 2 participants when in short mode
        if (!isNullOrUndefined(grid.thumbnail) && limits.WITH_THUMBNAIL != null) {
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
              {translate('noActiveSpeakers')}
            </div>
          </div>
        )}
        {participants.map(participant => {
          return (
            <GroupVideoGridTile
              minimized={minimized}
              participant={participant}
              key={participant.clientId}
              selfParticipant={selfParticipant}
              participantCount={participants.length}
              isMaximized={!isNullOrUndefined(maximizedParticipant)}
              onTileDoubleClick={doubleClickedOnVideo}
              isSelfPreviewMinimized={isSelfVideoMinimized}
              allowSelfPreviewMinimize={allowSelfVideoMinimize}
              minimizeSelfPreviewLabel={translate('videoCallOverlayMinimizeSelfVideo')}
              restoreSelfPreviewLabel={translate('videoCallOverlayRestoreSelfVideo')}
              onToggleSelfPreviewMinimized={() => {
                return setIsSelfVideoMinimized(minimized => {
                  return !minimized;
                });
              }}
            />
          );
        })}
      </div>
      {!isNullOrUndefined(grid.thumbnail) && (
        <GroupVideoThumbnail
          thumbnail={grid.thumbnail}
          minimized={minimized}
          maximizedParticipant={maximizedParticipant}
          selfParticipant={selfParticipant}
          allowMinimize={allowSelfVideoMinimize}
          minimizeLabel={translate('videoCallOverlayMinimizeSelfVideo')}
          restoreLabel={translate('videoCallOverlayRestoreSelfVideo')}
          isMinimized={allowSelfVideoMinimize && isSelfVideoMinimized}
          onToggleMinimized={() => {
            return setIsSelfVideoMinimized(minimized => {
              return !minimized;
            });
          }}
        />
      )}
    </div>
  );
};

export {GroupVideoGrid};
