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
window.z.assets = z.assets || {};

z.assets.AssetRemoteData = class AssetRemoteData {
  /**
   * Use either z.assets.AssetRemoteData.v2 or z.assets.AssetRemoteData.v3 to initialize.
   * @param {Uint8Array} otrKey - Encryption key
   * @param {Uint8Array} sha256 - Checksum
   * @param {string} identifier - The asset's idenfifier
   * @param {Object} urlData - Data needed to generate the url to fetch the asset
   */
  constructor(otrKey, sha256, identifier, urlData) {
    this.otrKey = otrKey;
    this.sha256 = sha256;
    this.downloadProgress = ko.observable();
    this.cancelDownload = undefined;
    this.urlData = urlData;
    this.identifier = identifier;

    this.loadPromise = undefined;

    this.logger = new z.util.Logger('z.assets.AssetRemoteData', z.config.LOGGER.OPTIONS);
  }

  generateUrl() {
    const {version, assetId, conversationId, forceCaching, assetKey, assetToken} = this.urlData;
    switch (version) {
      case 3:
        return wire.app.service.asset.generateAssetUrlV3(assetKey, assetToken, forceCaching);
      case 2:
        return wire.app.service.asset.generateAssetUrlV2(assetId, conversationId, forceCaching);
      case 1:
        return wire.app.service.asset.generateAssetUrl(assetId, conversationId, forceCaching);
    }
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
    return new z.assets.AssetRemoteData(otrKey, sha256, assetKey, {
      assetKey,
      assetToken,
      forceCaching,
      version: 3,
    });
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
    return new z.assets.AssetRemoteData(otrKey, sha256, `${conversationId}${assetId}`, {
      assetId,
      conversationId,
      forceCaching,
      version: 2,
    });
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
    return new z.assets.AssetRemoteData(undefined, undefined, `${conversationId}${assetId}`, {
      assetId,
      conversationId,
      forceCaching,
      version: 1,
    });
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
        this.loadPromise = undefined;
        const isEncryptedAsset = this.otrKey && this.sha256;
        return isEncryptedAsset
          ? z.assets.AssetCrypto.decryptAesAsset(buffer, this.otrKey.buffer, this.sha256.buffer)
          : buffer;
      })
      .then(plaintext => new Blob([new Uint8Array(plaintext)], {type}))
      .catch(error => {
        this.loadPromise = undefined;
        const errorMessage = (error && error.message) || '';
        const isAssetNotFound = errorMessage.endsWith(z.error.BackendClientError.STATUS_CODE.NOT_FOUND);
        const isServerError = errorMessage.endsWith(z.error.BackendClientError.STATUS_CODE.INTERNAL_SERVER_ERROR);

        const isExpectedError = isAssetNotFound || isServerError;
        if (!isExpectedError) {
          throw error;
        }
      });

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
          ? `Failed to validate an asset URL (_loadBuffer): ${error.message}`
          : `Failed to load asset: ${error.message || error}`;

        this.logger.error(message);

        throw error;
      });
  }
};
