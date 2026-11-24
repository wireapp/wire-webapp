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

import {isUndefined} from '@sindresorhus/is';
import ko from 'knockout';

import type {Asset as ProtobufAsset, IAttachment, ICellAsset} from '@wireapp/protocol-messaging';

import type {LinkPreview} from './linkPreview';
import type {MediumImage as MediumImageAsset} from './mediumImage';

import type {QualifiedId} from '../../../apiClient/user/qualifiedId';
import type {MentionEntity} from '../../../message/mentionEntity';
import type {AssetRemoteData} from '../../assets/assetRemoteData';
import type {AssetTransferState} from '../../assets/assetTransferState';
import {AssetType} from '../../assets/assetType';

export type AssetMetaData = (
  ProtobufAsset.IAudioMetaData | ProtobufAsset.IImageMetaData | ProtobufAsset.IVideoMetaData
) & {
  duration?: number;
  loudness?: number[];
};

/*
 * Structural types for the asset subclasses. They are declared here instead of importing the subclasses, so the type
 * guards below do not make this base class depend on its own subclasses.
 */
interface FileAssetShape {
  readonly original_resource: ko.Observable<AssetRemoteData>;
  readonly preview_resource: ko.Observable<AssetRemoteData>;
  readonly downloadProgress: ko.PureComputed<number | undefined>;
  readonly cancelDownload: () => void;
  file_size: number;
  meta: Partial<AssetMetaData>;
  readonly status: ko.Observable<AssetTransferState>;
  readonly upload_failed_reason: ko.Observable<ProtobufAsset.NotUploaded>;
  conversationId: string;
  correlation_id: string;
  reload(): void;
}

interface LocationAssetShape {
  latitude: string;
  longitude: string;
  name: string;
  zoom: string;
}

interface TextAssetShape {
  readonly mentions: ko.ObservableArray<MentionEntity>;
  readonly previews: ko.ObservableArray<LinkPreview>;
  readonly should_render_text: ko.PureComputed<boolean>;
  render(selfId: QualifiedId, themeColor?: string): string;
  isUserMentioned(userId: QualifiedId): boolean;
}

interface MultipartAssetShape extends TextAssetShape {
  readonly attachments?: ko.ObservableArray<IAttachment>;
  getCellAssets(): ICellAsset[];
}

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
    this.size = '';
    this.type = '';
    this.text = '';
  }

  isDownloadable(): boolean {
    return this.isAudio() || this.isFile() || this.isVideo() || this.isImage();
  }

  isImage(): this is MediumImageAsset {
    return this.type === AssetType.IMAGE;
  }

  isText(): this is Asset & TextAssetShape {
    return this.type === AssetType.TEXT;
  }

  isMultipart(): this is Asset & MultipartAssetShape {
    return this.type === AssetType.MULTIPART;
  }

  isFile(): this is Asset & FileAssetShape {
    return this.type === AssetType.FILE && !this.isVideo() && !this.isAudio();
  }

  isLocation(): this is Asset & LocationAssetShape {
    return this.type === AssetType.LOCATION;
  }

  isVideo(): boolean {
    return this.type === AssetType.FILE && this.file_type?.startsWith('video') === true;
  }

  isAudio(): boolean {
    const fileType = this.file_type;
    const is_audio_asset = this.type === AssetType.FILE && !isUndefined(fileType) && fileType.startsWith('audio');
    if (is_audio_asset && !isUndefined(fileType)) {
      const can_play = document.createElement('audio').canPlayType(fileType);
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
