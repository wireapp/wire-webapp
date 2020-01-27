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

import {Asset as ProtobufAsset} from '@wireapp/protocol-messaging';
import ko from 'knockout';

import {Logger, getLogger} from 'Util/Logger';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {downloadBlob} from 'Util/util';

import {Asset} from './Asset';

import {AssetRemoteData} from '../../assets/AssetRemoteData';
import {AssetTransferState} from '../../assets/AssetTransferState';
import {AssetType} from '../../assets/AssetType';
import {AssetUploadFailedReason} from '../../assets/AssetUploadFailedReason';

type AssetMetaData = (ProtobufAsset.IAudioMetaData | ProtobufAsset.IImageMetaData | ProtobufAsset.IVideoMetaData) & {
  loudness?: number[];
  duration?: number;
};

export class File extends Asset {
  private readonly original_resource: ko.Observable<AssetRemoteData>;
  public readonly preview_resource: ko.Observable<AssetRemoteData>;
  protected logger: Logger;
  public readonly downloadProgress: ko.PureComputed<number | undefined>;
  public readonly file_name: string;
  public readonly file_size: string;
  public readonly meta: Partial<AssetMetaData>;
  public readonly status: ko.Observable<AssetTransferState>;
  public readonly upload_failed_reason: ko.Observable<AssetUploadFailedReason>;

  constructor(id?: string) {
    super(id);
    this.cancel_download = this.cancel_download.bind(this);

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

    this.download = this.download.bind(this);
    this.downloadProgress = ko.pureComputed(() => {
      if (this.original_resource()) {
        return this.original_resource().downloadProgress();
      }

      return undefined;
    });

    this.upload_failed_reason = ko.observable();
  }

  /**
   * Loads and decrypts otr asset preview
   */
  load_preview(): Promise<void | Blob> {
    return this.preview_resource().load();
  }

  /**
   * Loads and decrypts otr asset
   */
  load(): Promise<void | Blob> {
    this.status(AssetTransferState.DOWNLOADING);

    return this.original_resource()
      .load()
      .then(blob => {
        this.status(AssetTransferState.UPLOADED);
        return blob;
      })
      .catch(error => {
        this.status(AssetTransferState.UPLOADED);
        throw error;
      });
  }

  /**
   * Loads and decrypts otr asset as initiates download
   */
  download(): Promise<number | void> {
    if (this.status() !== AssetTransferState.UPLOADED) {
      return Promise.resolve(undefined);
    }

    const download_started = Date.now();

    return this.load()
      .then(blob => {
        if (!blob) {
          throw new Error('No blob received.');
        }
        return downloadBlob(blob, this.file_name);
      })
      .then(blob => {
        const download_duration = (Date.now() - download_started) / TIME_IN_MILLIS.SECOND;
        this.logger.info(`Downloaded asset in ${download_duration} seconds`);
        return blob;
      })
      .catch(error => this.logger.error('Failed to download asset', error));
  }

  cancel_download(): void {
    this.status(AssetTransferState.UPLOADED);
    this.original_resource().cancelDownload();
  }

  reload(): void {
    this.logger.info('Restart upload');
  }
}
