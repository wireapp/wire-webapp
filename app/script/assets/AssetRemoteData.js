/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

'use strict';

window.z = window.z || {};
window.z.assets = z.assets || {};

z.assets.AssetRemoteData = class AssetRemoteData {
  /**
   * Use either z.assets.AssetRemoteData.v2 or z.assets.AssetRemoteData.v3 to initialize.
   * @param {Uint8Array} otr_key - Encryption key
   * @param {Uint8Array} sha256 - Checksum
   */
  constructor(otr_key, sha256) {
    this.otr_key = otr_key;
    this.sha256 = sha256;
    this.download_progress = ko.observable();
    this.cancel_download = undefined;
    this.generate_url = undefined;
    this.identifier = undefined;

    this.logger = new z.util.Logger('z.assets.AssetRemoteData', z.config.LOGGER.OPTIONS);
  }

  /**
   * Static initializer for v3 assets.
   *
   * @param {string} asset_key - ID to retrieve asset with
   * @param {Uint8Array} [otr_key] - Encryption key
   * @param {Uint8Array} [sha256] - Checksum
   * @param {string} [asset_token] - Token data
   * @param {boolean} [force_caching=false] - Cache asset in ServiceWorker
   * @returns {z.assets.AssetRemoteData} V3 asset remote data
   */
  static v3(asset_key, otr_key, sha256, asset_token, force_caching = false) {
    const remote_data = new z.assets.AssetRemoteData(otr_key, sha256);
    remote_data.generate_url = () =>
      wire.app.service.asset.generate_asset_url_v3(asset_key, asset_token, force_caching);
    remote_data.identifier = `${asset_key}`;
    return remote_data;
  }

  /**
   * Static initializer for v2 assets.
   *
   * @param {string} conversation_id - ID of conversation
   * @param {string} asset_id - ID to retrieve asset with
   * @param {Uint8Array} otr_key - Encryption key
   * @param {Uint8Array} sha256 - Checksum
   * @param {boolean} [force_caching=false] - Cache asset in ServiceWorker
   * @returns {z.assets.AssetRemoteData} V2 asset remote data
   */
  static v2(conversation_id, asset_id, otr_key, sha256, force_caching = false) {
    const remote_data = new z.assets.AssetRemoteData(otr_key, sha256);
    remote_data.generate_url = () =>
      wire.app.service.asset.generate_asset_url_v2(asset_id, conversation_id, force_caching);
    remote_data.identifier = `${conversation_id}${asset_id}`;
    return remote_data;
  }

  /**
   * Static initializer for v1 assets.
   *
   * @deprecated
   * @param {string} conversation_id - ID of conversation
   * @param {string} asset_id - ID to retrieve asset with
   * @param {boolean} [force_caching=false] - Cache asset in ServiceWorker
   * @returns {z.assets.AssetRemoteData} V1 asset remote data
   */
  static v1(conversation_id, asset_id, force_caching = false) {
    const remote_data = new z.assets.AssetRemoteData();
    remote_data.generate_url = () =>
      wire.app.service.asset.generate_asset_url(asset_id, conversation_id, force_caching);
    remote_data.identifier = `${conversation_id}${asset_id}`;
    return remote_data;
  }

  /**
   * Loads and decrypts stored asset
   * @returns {Promise<Blob>} Resolves with the decrypted asset data
   */
  load() {
    let mime_type;

    return this._load_buffer()
      .then(([buffer, type]) => {
        mime_type = type;
        if (this.otr_key && this.sha256) {
          return z.assets.AssetCrypto.decrypt_aes_asset(buffer, this.otr_key.buffer, this.sha256.buffer);
        }
        return buffer;
      })
      .then(plaintext => new Blob([new Uint8Array(plaintext)], {mime_type}));
  }

  /**
   * Get object url for asset remote data. URLs are cached in memory.
   * @returns {Promise<string>} Object URL for asset
   */
  get_object_url() {
    const object_url = z.assets.AssetURLCache.get_url(this.identifier);
    if (object_url) {
      return Promise.resolve(object_url);
    }

    return this.load().then(blob => z.assets.AssetURLCache.set_url(this.identifier, window.URL.createObjectURL(blob)));
  }

  _load_buffer() {
    return this.generate_url()
      .then(generated_url => {
        return z.util.load_url_buffer(generated_url, xhr => {
          xhr.onprogress = event => this.download_progress(Math.round(event.loaded / event.total * 100));
          return (this.cancel_download = () => xhr.abort.call(xhr));
        });
      })
      .catch(error => {
        if (error instanceof z.util.ValidationUtilError) {
          this.logger.error(`Failed to validate an asset URL (_load_buffer). Error: ${error.message}`);
        }
        throw error;
      });
  }
};
