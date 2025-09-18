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

import {formatSeconds} from 'Util/TimeUtil';

import {wrapperStyles, playButtonWrapperStyles, seekbarStyles, timeStyles} from './VideoControls.styles';

import {SeekBar} from '../../../../common/SeekBar/SeekBar';
import {VideoPlayButton} from '../common/VideoPlayButton/VideoPlayButton';

interface VideoControlsProps {
  videoElement: HTMLVideoElement;
  isPlaying: boolean;
  isFocusable: boolean;
  handlePlay: () => void;
  handlePause: () => void;
}

export const VideoControls = ({videoElement, isPlaying, isFocusable, handlePlay, handlePause}: VideoControlsProps) => {
  const currentTime = formatSeconds(videoElement.currentTime);
  const duration = formatSeconds(videoElement.duration);

  return (
    <div css={wrapperStyles}>
      <div css={playButtonWrapperStyles}>
        <VideoPlayButton
          mediaElement={videoElement}
          isPlaying={isPlaying}
          onPlay={handlePlay}
          onPause={handlePause}
          isFocusable={isFocusable}
        />
      </div>
      <span css={timeStyles} data-uie-name="status-video-time">
        {currentTime}
      </span>
      <SeekBar
        css={seekbarStyles}
        data-uie-name="status-video-seekbar"
        mediaElement={videoElement}
        isFocusable={isFocusable}
      />
      <span css={timeStyles} data-uie-name="status-video-time">
        {duration}
      </span>
    </div>
  );
};
