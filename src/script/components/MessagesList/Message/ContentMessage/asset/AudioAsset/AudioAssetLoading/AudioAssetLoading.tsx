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

import {PlayIcon} from '@wireapp/react-ui-kit';

import {buttonStyles, seekBarStyles, timerWrapperStyles, wrapperStyles} from './AudioAssetLoading.styles';
import {AudioEmptySeekBar} from './AudioEmptySeekBar/AudioEmptySeekBar';

import {timeStyles} from '../AudioAssetTimer/AudioAssetTimer.styles';

export const AudioAssetLoading = () => {
  return (
    <div css={wrapperStyles}>
      <div css={buttonStyles}>
        <PlayIcon width={12.5} height={12.5} />
      </div>
      <div>
        <div css={seekBarStyles}>
          <AudioEmptySeekBar />
        </div>
        <div css={timerWrapperStyles}>
          <span css={timeStyles}>0:00</span>
          <div className="loading-dots" />
        </div>
      </div>
    </div>
  );
};
