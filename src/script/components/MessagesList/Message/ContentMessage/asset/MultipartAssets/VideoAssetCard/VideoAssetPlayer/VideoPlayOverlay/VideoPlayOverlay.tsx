/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {wrapperStyles} from './VideoPlayOverlay.styles';

import {VideoPlayButton} from '../common/VideoPlayButton/VideoPlayButton';

interface VideoPlayOverlayProps {
  isPlaying: boolean;
  videoElement?: HTMLVideoElement;
  handlePlay: () => void;
  handlePause: () => void;
  isFocusable: boolean;
}

export const VideoPlayOverlay = ({
  isPlaying,
  videoElement,
  handlePlay,
  handlePause,
  isFocusable,
}: VideoPlayOverlayProps) => {
  return (
    <div css={wrapperStyles}>
      <VideoPlayButton
        isPlaying={isPlaying}
        mediaElement={videoElement}
        onPlay={handlePlay}
        onPause={handlePause}
        isFocusable={isFocusable}
        isFullscreen
      />
    </div>
  );
};
