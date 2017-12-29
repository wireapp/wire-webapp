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

// AssetService for all asset handling and the calls to the backend REST API.
z.assets.AssetService = class AssetService {
  /**
   * Construct a new Asset Service.
   * @param {z.service.BackendClient} client - Client for the API calls
   */
  constructor(client) {
    this.client = client;
    this.logger = new z.util.Logger('z.assets.AssetService', z.config.LOGGER.OPTIONS);
  }

  /**
   * Update the user profile image by first making it usable, transforming it and then uploading the asset pair.
   * @param {File|Blob} image - Profile image
   * @returns {Promise} Resolves when profile image has been uploaded
   */
  uploadProfileImage(image) {
    return Promise.all([this._compressProfileImage(image), this._compressImage(image)])
      .then(([{compressedBytes: smallImageBytes}, {compressedBytes: mediumImageBytes}]) => {
        return Promise.all([
          this.postAsset(smallImageBytes, {public: true}),
          this.postAsset(mediumImageBytes, {public: true}),
        ]);
      })
      .then(([smallCredentials, mediumCredentials]) => [smallCredentials.key, mediumCredentials.key]);
  }

  /**
   * Upload arbitrary binary data using the new asset api v3.
   * The data is AES encrypted before uploading.
   *
   * @param {Uint8Array} bytes - Asset binary data
   * @param {Object} options - Asset upload options
   * @param {boolean} options.public - Flag whether asset is public
   * @param {z.assets.AssetRetentionPolicy} options.retention - Retention duration policy for asset
   * @param {Function} [xhrAccessorFunction] - Function will get a reference to the underlying XMLHTTPRequest
   * @returns {Promise} Resolves when asset has been uploaded
   */
  _uploadAsset(bytes, options, xhrAccessorFunction) {
    return z.assets.AssetCrypto.encryptAesAsset(bytes).then(({cipherText, keyBytes, sha256}) => {
      return this.postAsset(new Uint8Array(cipherText), options, xhrAccessorFunction).then(({key, token}) => ({
        key,
        keyBytes,
        sha256,
        token,
      }));
    });
  }

  /**
   * Upload file using the new asset api v3. Promise will resolve with z.proto.Asset instance.
   * In case of an successful upload the uploaded property is set.
   *
   * @param {Blob|File} file - File asset to be uploaded
   * @param {Object} options - Asset upload options
   * @param {boolean} options.public - Flag whether asset is public
   * @param {z.assets.AssetRetentionPolicy} options.retention - Retention duration policy for asset
   * @param {Function} xhrAccessorFunction - Function will get a reference to the underlying XMLHTTPRequest
   * @returns {Promise} Resolves when asset has been uploaded
   */
  uploadAsset(file, options, xhrAccessorFunction) {
    return z.util
      .load_file_buffer(file)
      .then(buffer => this._uploadAsset(buffer, options, xhrAccessorFunction))
      .then(({key, keyBytes, sha256, token}) => {
        const asset = new z.proto.Asset();
        asset.set('uploaded', new z.proto.Asset.RemoteData(keyBytes, sha256, key, token));
        return asset;
      });
  }

  /**
   * Upload image using the new asset api v3. Promise will resolve with z.proto.Asset instance.
   * In case of an successful upload the uploaded property is set.
   *
   * @param {Blob|File} image - Image asset to be uploaded
   * @param {Object} options - Asset upload options
   * @param {boolean} options.public - Flag whether asset is public
   * @param {z.assets.AssetRetentionPolicy} options.retention - Retention duration policy for asset
   * @returns {Promise} Resolves when asset has been uploaded
   */
  uploadImageAsset(image, options) {
    return this._compressImage(image).then(({compressedBytes, compressedImage}) => {
      return this._uploadAsset(compressedBytes, options).then(({key, keyBytes, sha256, token}) => {
        const imageMetadata = new z.proto.Asset.ImageMetaData(compressedImage.width, compressedImage.height);
        const asset = new z.proto.Asset();
        asset.set('original', new z.proto.Asset.Original(image.type, compressedBytes.length, null, imageMetadata));
        asset.set('uploaded', new z.proto.Asset.RemoteData(keyBytes, sha256, key, token));
        return asset;
      });
    });
  }

  /**
   * Generates the URL an asset can be downloaded from.
   *
   * @deprecated
   * @param {string} assetId - ID of asset
   * @param {string} conversationId - Conversation ID
   * @param {boolean} forceCaching - Cache asset in ServiceWorker
   * @returns {Promise} Resolves with URL of v1 asset
   */
  generateAssetUrl(assetId, conversationId, forceCaching) {
    return Promise.resolve().then(() => {
      z.util.ValidationUtil.asset.legacy(assetId, conversationId);
      const url = this.client.create_url(`/assets/${assetId}`);
      const cachingParam = forceCaching ? '&forceCaching=true' : '';
      const conversationIdParam = `&conv_id=${window.encodeURIComponent(conversationId)}`;

      return `${url}?access_token=${this.client.access_token}${conversationIdParam}${cachingParam}`;
    });
  }

  /**
   * Generates the URL for asset api v2.
   *
   * @deprecated
   * @param {string} assetId - ID of asset
   * @param {string} conversationId - Conversation ID
   * @param {boolean} forceCaching - Cache asset in ServiceWorker
   * @returns {Promise} Resolves with URL of v2 asset
   */
  generateAssetUrlV2(assetId, conversationId, forceCaching) {
    return Promise.resolve().then(() => {
      z.util.ValidationUtil.asset.legacy(assetId, conversationId);
      const url = this.client.create_url(`/conversations/${conversationId}/otr/assets/${assetId}`);
      const cachingParam = forceCaching ? '&forceCaching=true' : '';

      return `${url}?access_token=${this.client.access_token}${cachingParam}`;
    });
  }

  /**
   * Generates the URL for asset api v3.
   *
   * @param {string} assetKey - ID of asset
   * @param {string} assetToken - Asset token
   * @param {boolean} forceCaching - Cache asset in ServiceWorker
   * @returns {Promise} Resolves with URL of v3 asset
   */
  generateAssetUrlV3(assetKey, assetToken, forceCaching) {
    return Promise.resolve().then(() => {
      z.util.ValidationUtil.asset.v3(assetKey, assetToken);
      const url = `${this.client.create_url(`/assets/v3/${assetKey}`)}`;
      const assetTokenParam = assetToken ? `&asset_token=${window.encodeURIComponent(assetToken)}` : '';
      const cachingParam = forceCaching ? '&forceCaching=true' : '';

      return `${url}?access_token=${this.client.access_token}${assetTokenParam}${cachingParam}`;
    });
  }

  /**
   * Post assets.
   *
   * @param {Uint8Array} assetData - Asset data
   * @param {Object} metadata - Asset metadata
   * @param {boolean} [metadata.public] - Flag whether asset is public
   * @param {z.assets.AssetRetentionPolicy} [metadata.retention] - Retention duration policy for asset
   * @param {Function} [xhrAccessorFunction] - Function will get a reference to the underlying XMLHTTPRequest
   * @returns {Promise} Resolves when asset has been uploaded
   */
  postAsset(assetData, metadata, xhrAccessorFunction) {
    return new Promise((resolve, reject) => {
      const BOUNDARY = 'frontier';

      metadata = Object.assign(
        {
          public: false,
          retention: z.assets.AssetRetentionPolicy.PERSISTENT,
        },
        metadata
      );

      metadata = JSON.stringify(metadata);

      let body = '';
      body += `--${BOUNDARY}\r\n`;
      body += 'Content-Type: application/json; charset=utf-8\r\n';
      body += `Content-length: ${metadata.length}\r\n`;
      body += '\r\n';
      body += `${metadata}\r\n`;
      body += `--${BOUNDARY}\r\n`;
      body += 'Content-Type: application/octet-stream\r\n';
      body += `Content-length: ${assetData.length}\r\n`;
      body += `Content-MD5: ${z.util.array_to_md5_base64(assetData)}\r\n`;
      body += '\r\n';
      const footer = `\r\n--${BOUNDARY}--\r\n`;

      const xhr = new XMLHttpRequest();
      xhr.open('POST', this.client.create_url('/assets/v3'));
      xhr.setRequestHeader('Content-Type', `multipart/mixed; boundary=${BOUNDARY}`);
      xhr.setRequestHeader('Authorization', `${this.client.access_token_type} ${this.client.access_token}`);
      xhr.onload = function(event) {
        if (this.status === 201) {
          return resolve(JSON.parse(this.response));
        }
        return reject(event);
      };
      xhr.onerror = reject;

      if (typeof xhrAccessorFunction === 'function') {
        xhrAccessorFunction(xhr);
      }

      xhr.send(new Blob([body, assetData, footer]));
    });
  }

  /**
   * Compress image.
   * @param {File|Blob} image - Image to be compressed in ServiceWorker
   * @returns {Promise} Resolves with the compressed imaged
   */
  _compressImage(image) {
    return this._compressImageWithWorker('worker/image-worker.js', image, () => image.type === 'image/gif');
  }

  /**
   * Compress profile image.
   * @param {File|Blob} image - Profile image to be compressed in ServiceWorker
   * @returns {Promise} Resolves with the compressed profile imaged
   */
  _compressProfileImage(image) {
    return this._compressImageWithWorker('worker/profile-image-worker.js', image);
  }

  /**
   * Compress image using given worker.
   * @param {string} worker - Path to worker file
   * @param {File|Blob} image - Image to be compressed in ServiceWorker
   * @param {Function} filter - Optional filter to be applied
   * @returns {Promise} Resolves with the compressed image
   */
  _compressImageWithWorker(worker, image, filter) {
    return z.util
      .load_file_buffer(image)
      .then(buffer => {
        if (typeof filter === 'function' ? filter() : undefined) {
          return new Uint8Array(buffer);
        }
        return new z.util.Worker(worker).post(buffer);
      })
      .then(compressedBytes => {
        return z.util
          .load_image(new Blob([compressedBytes], {type: image.type}))
          .then(compressedImage => ({compressedBytes, compressedImage}));
      });
  }
};
