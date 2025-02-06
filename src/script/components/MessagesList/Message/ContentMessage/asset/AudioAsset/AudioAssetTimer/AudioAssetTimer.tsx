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

import {currentTimeStyles, durationStyles, wrapperStyles} from './AudioAssetTimer.styles';

interface AudioAssetTimerProps {
  currentTime: number;
  overallDuration: number;
}

export const AudioAssetTimer = ({currentTime, overallDuration}: AudioAssetTimerProps) => {
  return (
    <div css={wrapperStyles}>
      <span css={currentTimeStyles} data-uie-name="status-audio-time">
        {formatSeconds(currentTime === overallDuration ? 0 : currentTime)}
      </span>
      <span css={durationStyles} data-uie-name="status-audio-time">
        {formatSeconds(overallDuration)}
      </span>
    </div>
  );
};
