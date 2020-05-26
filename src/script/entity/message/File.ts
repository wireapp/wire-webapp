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

import type {Asset as ProtobufAsset} from '@wireapp/protocol-messaging';
import ko from 'knockout';

import {Logger, getLogger} from 'Util/Logger';
// import {TIME_IN_MILLIS} from 'Util/TimeUtil';
// import {downloadBlob} from 'Util/util';

import {Asset} from './Asset';

import type {AssetRemoteData} from '../../assets/AssetRemoteData';
import {AssetTransferState} from '../../assets/AssetTransferState';
import {AssetType} from '../../assets/AssetType';

type AssetMetaData = (ProtobufAsset.IAudioMetaData | ProtobufAsset.IImageMetaData | ProtobufAsset.IVideoMetaData) & {
  loudness?: number[];
  duration?: number;
};

export class File extends Asset {
  public readonly original_resource: ko.Observable<AssetRemoteData>;
  public readonly preview_resource: ko.Observable<AssetRemoteData>;
  protected logger: Logger;
  public readonly downloadProgress: ko.PureComputed<number | undefined>;
  public file_name: string;
  public file_size: string;
  public meta: Partial<AssetMetaData>;
  public readonly status: ko.Observable<AssetTransferState>;
  public readonly upload_failed_reason: ko.Observable<ProtobufAsset.NotUploaded>;

  constructor(id?: string) {
    super(id);
    // this.cancel_download = this.cancel_download.bind(this);

    this.type = AssetType.FILE;
    this.logger = getLogger('File');

    // AssetTransferState
    this.status = ko.observable();

    this.file_name = '';
    this.file_size = '';
    this.file_type = '';

    // contains asset meta data as object
    this.meta = {};

    // asset url, instance of an otr asset this has to be decrypted
    this.original_resource = ko.observable();
    this.preview_resource = ko.observable();

    // this.download = this.download.bind(this);
    this.downloadProgress = ko.pureComputed(() => {
      if (this.original_resource()) {
        return this.original_resource().downloadProgress();
      }

      return undefined;
    });

    this.upload_failed_reason = ko.observable();
  }

  // cancel_download(): void {
  //   this.status(AssetTransferState.UPLOADED);
  //   this.original_resource().cancelDownload();
  // }

  reload(): void {
    this.logger.info('Restart upload');
  }
}
