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

'use strict';

window.z = window.z || {};
window.z.assets = z.assets || {};

z.assets.AssetRemoteData = class AssetRemoteData {
  /**
   * Use either z.assets.AssetRemoteData.v2 or z.assets.AssetRemoteData.v3 to initialize.
   * @param {Uint8Array} otrKey - Encryption key
   * @param {Uint8Array} sha256 - Checksum
   */
  constructor(otrKey, sha256) {
    this.otrKey = otrKey;
    this.sha256 = sha256;
    this.downloadProgress = ko.observable();
    this.cancelDownload = undefined;
    this.generateUrl = undefined;
    this.identifier = undefined;

    this.loadPromise = undefined;

    this.logger = new z.util.Logger('z.assets.AssetRemoteData', z.config.LOGGER.OPTIONS);
  }

  /**
   * Static initializer for v3 assets.
   *
   * @param {string} assetKey - ID to retrieve asset with
   * @param {Uint8Array} [otrKey] - Encryption key
   * @param {Uint8Array} [sha256] - Checksum
   * @param {string} [assetToken] - Token data
   * @param {boolean} [forceCaching=false] - Cache asset in ServiceWorker
   * @returns {z.assets.AssetRemoteData} V3 asset remote data
   */
  static v3(assetKey, otrKey, sha256, assetToken, forceCaching = false) {
    const remoteData = new z.assets.AssetRemoteData(otrKey, sha256);
    remoteData.generateUrl = () => wire.app.service.asset.generateAssetUrlV3(assetKey, assetToken, forceCaching);
    remoteData.identifier = `${assetKey}`;
    return remoteData;
  }

  /**
   * Static initializer for v2 assets.
   *
   * @param {string} conversationId - ID of conversation
   * @param {string} assetId - ID to retrieve asset with
   * @param {Uint8Array} otrKey - Encryption key
   * @param {Uint8Array} sha256 - Checksum
   * @param {boolean} [forceCaching=false] - Cache asset in ServiceWorker
   * @returns {z.assets.AssetRemoteData} V2 asset remote data
   */
  static v2(conversationId, assetId, otrKey, sha256, forceCaching = false) {
    const remoteData = new z.assets.AssetRemoteData(otrKey, sha256);
    remoteData.generateUrl = () => wire.app.service.asset.generateAssetUrlV2(assetId, conversationId, forceCaching);
    remoteData.identifier = `${conversationId}${assetId}`;
    return remoteData;
  }

  /**
   * Static initializer for v1 assets.
   *
   * @deprecated
   * @param {string} conversationId - ID of conversation
   * @param {string} assetId - ID to retrieve asset with
   * @param {boolean} [forceCaching=false] - Cache asset in ServiceWorker
   * @returns {z.assets.AssetRemoteData} V1 asset remote data
   */
  static v1(conversationId, assetId, forceCaching = false) {
    const remoteData = new z.assets.AssetRemoteData();
    remoteData.generateUrl = () => wire.app.service.asset.generateAssetUrl(assetId, conversationId, forceCaching);
    remoteData.identifier = `${conversationId}${assetId}`;
    return remoteData;
  }

  /**
   * Get object url for asset remote data. URLs are cached in memory.
   * @returns {Promise<string>} Object URL for asset
   */
  getObjectUrl() {
    const objectUrl = z.assets.AssetURLCache.getUrl(this.identifier);
    return objectUrl
      ? Promise.resolve(objectUrl)
      : this.load().then(blob => {
          if (blob) {
            const url = window.URL.createObjectURL(blob);
            return z.assets.AssetURLCache.setUrl(this.identifier, url);
          }
        });
  }

  /**
   * Loads and decrypts stored asset
   * @returns {Promise<Blob>} Resolves with the decrypted asset data
   */
  load() {
    let type;

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this._loadBuffer()
      .then(({buffer, mimeType}) => {
        type = mimeType;
        const isEncryptedAsset = this.otrKey && this.sha256;
        return isEncryptedAsset
          ? z.assets.AssetCrypto.decryptAesAsset(buffer, this.otrKey.buffer, this.sha256.buffer)
          : buffer;
      })
      .then(plaintext => new Blob([new Uint8Array(plaintext)], {mime_type: type}))
      .catch(error => {
        const errorMessage = (error && error.message) || '';
        const isAssetNotFound = errorMessage.endsWith(z.error.BackendClientError.STATUS_CODE.NOT_FOUND);
        const isServerError = errorMessage.endsWith(z.error.BackendClientError.STATUS_CODE.INTERNAL_SERVER_ERROR);

        const isExpectedError = isAssetNotFound || isServerError;
        if (!isExpectedError) {
          throw error;
        }
      })
      .finally(() => (this.loadPromise = undefined));

    return this.loadPromise;
  }

  _loadBuffer() {
    return this.generateUrl()
      .then(generatedUrl => {
        return z.util.loadUrlBuffer(generatedUrl, xhr => {
          xhr.onprogress = event => this.downloadProgress(Math.round((event.loaded / event.total) * 100));
          this.cancelDownload = () => xhr.abort.call(xhr);
        });
      })
      .catch(error => {
        const isValidationUtilError = error instanceof z.util.ValidationUtilError;
        const message = isValidationUtilError
          ? `Failed to validate an asset URL (_load_buffer): ${error.message}`
          : `Failed to load asset: ${error.message || error}`;

        this.logger.error(message);

        throw error;
      });
  }
};
