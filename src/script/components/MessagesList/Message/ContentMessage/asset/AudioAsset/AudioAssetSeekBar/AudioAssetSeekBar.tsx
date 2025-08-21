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

import {FileAsset} from 'Repositories/entity/message/FileAsset';

import {AudioSeekBarNew} from './AudioSeekBarV2/AudioSeekBarV2';

import {SeekBar} from '../../common/SeekBar/SeekBar';

interface AudioAssetSeekBarProps {
  audioElement: HTMLMediaElement;
  asset: FileAsset;
  loudnessPreview: boolean;
  disabled?: boolean;
}

export const AudioAssetSeekBar = ({audioElement, asset, loudnessPreview, disabled}: AudioAssetSeekBarProps) => {
  if (loudnessPreview) {
    return <AudioSeekBarNew audioElement={audioElement} asset={asset} disabled={disabled} />;
  }

  return <SeekBar dark mediaElement={audioElement} data-uie-name="status-audio-seekbar" disabled={disabled} />;
};
