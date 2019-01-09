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

window.z = window.z || {};
window.z.entity = z.entity || {};

z.entity.File = class File extends z.entity.Asset {
  constructor(id) {
    super(id);
    this.cancel_download = this.cancel_download.bind(this);

    this.type = z.assets.AssetType.FILE;
    this.logger = new z.util.Logger('z.entity.File', z.config.LOGGER.OPTIONS);

    // z.assets.AssetTransferState
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

    this.upload_id = ko.observable();
    this.upload_progress = ko.observable();
    this.upload_failed_reason = ko.observable();
    this.upload_cancel = undefined;
    this.isUploading = ko.pureComputed(() => this.status() === z.assets.AssetTransferState.UPLOADING);

    // update progress
    this.upload_id.subscribe(upload_id => {
      if (upload_id) {
        return amplify.subscribe(`upload${upload_id}`, this.on_progress);
      }
    });

    this.status.subscribe(status => {
      if (status === z.assets.AssetTransferState.UPLOADED) {
        return amplify.unsubscribe(`upload${this.upload_id}`, this.on_progress);
      }
    });
  }

  on_progress(progress) {
    return this.upload_progress(progress);
  }

  /**
   * Loads and decrypts otr asset preview
   *
   * @returns {Promise} Returns a promise that resolves with the asset as blob
   */
  load_preview() {
    return this.preview_resource().load();
  }

  /**
   * Loads and decrypts otr asset
   *
   * @returns {Promise} Returns a promise that resolves with the asset as blob
   */
  load() {
    this.status(z.assets.AssetTransferState.DOWNLOADING);

    return this.original_resource()
      .load()
      .then(blob => {
        this.status(z.assets.AssetTransferState.UPLOADED);
        return blob;
      })
      .catch(error => {
        this.status(z.assets.AssetTransferState.UPLOADED);
        throw error;
      });
  }

  /**
   * Loads and decrypts otr asset as initiates download
   *
   * @returns {Promise} Returns a promise that resolves with the asset as blob
   */
  download() {
    if (this.status() !== z.assets.AssetTransferState.UPLOADED) {
      return Promise.resolve(undefined);
    }

    const download_started = Date.now();

    return this.load()
      .then(blob => z.util.downloadBlob(blob, this.file_name))
      .then(() => {
        const download_duration = (Date.now() - download_started) / z.util.TimeUtil.UNITS_IN_MILLIS.SECOND;
        this.logger.info(`Downloaded asset in ${download_duration} seconds`);
      })
      .catch(error => this.logger.error('Failed to download asset', error));
  }

  cancel_download() {
    this.status(z.assets.AssetTransferState.UPLOADED);
    return this.original_resource().cancelDownload();
  }

  cancel(message_et) {
    if (typeof this.upload_cancel === 'function') {
      this.upload_cancel();
    }
    amplify.publish(z.event.WebApp.CONVERSATION.ASSET.CANCEL, message_et);
  }

  reload() {
    this.logger.info('Restart upload');
  }
};
