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

import {AssetType} from 'Repositories/assets/AssetType';

import type {FileAsset} from './FileAsset';
import type {Location as LocationAsset} from './Location';
import type {MediumImage as MediumImageAsset} from './MediumImage';
import type {Multipart as MultipartAsset} from './Multipart';
import type {Text as TextAsset} from './Text';

export class Asset {
  public file_type?: string;
  public file_name?: string;
  public id?: string;
  public key: string;
  public size: string;
  public type: string;
  public text: string;

  constructor(id?: string) {
    this.id = id;
    this.key = '';
    this.type = '';
    this.text = '';
  }

  isDownloadable(): boolean {
    return this.isAudio() || this.isFile() || this.isVideo() || this.isImage();
  }

  isImage(): this is MediumImageAsset {
    return this.type === AssetType.IMAGE;
  }

  isText(): this is TextAsset {
    return this.type === AssetType.TEXT;
  }

  isMultipart(): this is MultipartAsset {
    return this.type === AssetType.MULTIPART;
  }

  isFile(): this is FileAsset {
    return this.type === AssetType.FILE && !this.isVideo() && !this.isAudio();
  }

  isLocation(): this is LocationAsset {
    return this.type === AssetType.LOCATION;
  }

  isVideo(): boolean {
    return this.type === AssetType.FILE && !!this.file_type?.startsWith('video');
  }

  isAudio(): boolean {
    const is_audio_asset = this.type === AssetType.FILE && this.file_type?.startsWith('audio');
    if (is_audio_asset) {
      const can_play = document.createElement('audio').canPlayType(this.file_type!);
      if (can_play !== '') {
        return true;
      }
    }
    return false;
  }

  isButton(): boolean {
    return this.type === AssetType.BUTTON;
  }
}
