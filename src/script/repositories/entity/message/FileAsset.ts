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

import ko from 'knockout';

import type {Asset as ProtobufAsset} from '@wireapp/protocol-messaging';

import type {AssetRemoteData} from 'Repositories/assets/AssetRemoteData';
import {AssetTransferState} from 'Repositories/assets/AssetTransferState';
import {AssetType} from 'Repositories/assets/AssetType';
import {Logger, getLogger} from 'Util/Logger';

import {Asset} from './Asset';

type AssetMetaData = (ProtobufAsset.IAudioMetaData | ProtobufAsset.IImageMetaData | ProtobufAsset.IVideoMetaData) & {
  duration?: number;
  loudness?: number[];
};

export class FileAsset extends Asset {
  public readonly original_resource: ko.Observable<AssetRemoteData>;
  public readonly preview_resource: ko.Observable<AssetRemoteData>;
  protected logger: Logger;
  public readonly downloadProgress: ko.PureComputed<number | undefined>;
  public readonly cancelDownload: () => void;
  public file_size: number;
  public readonly file_type: string;
  public meta: Partial<AssetMetaData>;
  public readonly status: ko.Observable<AssetTransferState>;
  public readonly upload_failed_reason: ko.Observable<ProtobufAsset.NotUploaded>;
  public conversationId: string;
  public correlation_id: string;

  constructor(id?: string) {
    super(id);
    this.type = AssetType.FILE;
    this.logger = getLogger('FileAsset');

    // AssetTransferState
    this.status = ko.observable();

    this.file_name = '';
    this.file_size = 0;
    this.file_type = '';

    // contains asset meta data as object
    this.meta = {};

    // asset URL, instance of an OTR asset this has to be decrypted
    this.original_resource = ko.observable();
    this.preview_resource = ko.observable();

    this.downloadProgress = ko.pureComputed(() => {
      if (this.original_resource()) {
        return this.original_resource().downloadProgress;
      }

      return undefined;
    });

    this.cancelDownload = () => {
      if (this.original_resource()) {
        this.original_resource().cancelDownload();
      }
    };

    this.upload_failed_reason = ko.observable();
  }

  reload(): void {
    this.logger.info('Restart upload');
  }
}
