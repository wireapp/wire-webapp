/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {AssetType} from '../../assets/AssetType';
import type {FileAsset} from './FileAsset';
import type {Location as LocationAsset} from './Location';
import type {MediumImage as MediumImageAsset} from './MediumImage';
import type {Text as TextAsset} from './Text';

export interface AssetPayload {
  id: string;
  key: string;
  size: string;
  type: string;
}

export class Asset {
  public file_type?: string;
  public id?: string;
  public key: string;
  public size: string;
  public type: string;

  constructor(id?: string) {
    this.id = id;
    this.key = '';
    this.type = '';
  }

  is_downloadable(): boolean {
    return this.is_audio() || this.is_file() || this.is_video() || this.is_image();
  }

  is_image(): this is MediumImageAsset {
    return this.type === AssetType.IMAGE;
  }

  is_text(): this is TextAsset {
    return this.type === AssetType.TEXT;
  }

  is_file(): this is FileAsset {
    return this.type === AssetType.FILE && !this.is_video() && !this.is_audio();
  }

  is_location(): this is LocationAsset {
    return this.type === AssetType.LOCATION;
  }

  is_video(): boolean {
    const is_video_asset = this.type === AssetType.FILE && this.file_type?.startsWith('video');
    if (is_video_asset) {
      const can_play = document.createElement('video').canPlayType(this.file_type);
      if (can_play !== '') {
        return true;
      }
    }
    return false;
  }

  is_audio(): boolean {
    const is_audio_asset = this.type === AssetType.FILE && this.file_type?.startsWith('audio');
    if (is_audio_asset) {
      const can_play = document.createElement('audio').canPlayType(this.file_type);
      if (can_play !== '') {
        return true;
      }
    }
    return false;
  }

  is_button(): boolean {
    return this.type === AssetType.BUTTON;
  }
}
