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

import {Asset} from '@wireapp/protocol-messaging';
import Logger from 'utils/Logger';

// AssetService for all asset handling and the calls to the backend REST API.
export default class AssetService {
  /**
   * Construct a new Asset Service.
   * @param {BackendClient} backendClient - Client for the API calls
   */
  constructor(backendClient) {
    this.backendClient = backendClient;
    this.logger = new Logger('AssetService', z.config.LOGGER.OPTIONS);
  }

  /**
   * Update the user profile image by first making it usable, transforming it and then uploading the asset pair.
   * @param {File|Blob} image - Profile image
   * @returns {Promise} Resolves when profile image has been uploaded
   */
  uploadProfileImage(image) {
    return Promise.all([this._compressProfileImage(image), this._compressImage(image)])
      .then(([{compressedBytes: previewImageBytes}, {compressedBytes: mediumImageBytes}]) => {
        const assetUploadOptions = {public: true, retention: z.assets.AssetRetentionPolicy.ETERNAL};
        return Promise.all([
          this.postAsset(previewImageBytes, assetUploadOptions),
          this.postAsset(mediumImageBytes, assetUploadOptions),
        ]);
      })
      .then(([previewCredentials, mediumCredentials]) => {
        return {mediumImageKey: mediumCredentials.key, previewImageKey: previewCredentials.key};
      });
  }

  /**
   * Upload arbitrary binary data using the new asset api v3.
   * The data is AES encrypted before uploading.
   *
   * @param {ArrayBuffer} bytes - Asset binary data
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
   * Upload file using the new asset api v3. Promise will resolve with an Asset instance.
   * In case of an successful upload the uploaded property is set.
   *
   * @param {Blob|File} file - File asset to be uploaded
   * @param {Object} options - Asset upload options
   * @param {boolean} options.public - Flag whether asset is public
   * @param {z.assets.AssetRetentionPolicy} options.retention - Retention duration policy for asset
   * @param {boolean} options.expectsReadConfirmation - Whether the sender expects a read confirmation
   * @param {Function} xhrAccessorFunction - Function will get a reference to the underlying XMLHTTPRequest
   * @returns {Promise} Resolves when asset has been uploaded
   */
  uploadAsset(file, options, xhrAccessorFunction) {
    return z.util
      .loadFileBuffer(file)
      .then(buffer => this._uploadAsset(buffer, options, xhrAccessorFunction))
      .then(({key, keyBytes, sha256, token}) => {
        keyBytes = new Uint8Array(keyBytes);
        sha256 = new Uint8Array(sha256);

        const assetRemoteData = new Asset.RemoteData({assetId: key, assetToken: token, otrKey: keyBytes, sha256});
        const protoAsset = new Asset({
          [z.cryptography.PROTO_MESSAGE_TYPE.ASSET_UPLOADED]: assetRemoteData,
          [z.cryptography.PROTO_MESSAGE_TYPE.EXPECTS_READ_CONFIRMATION]: options.expectsReadConfirmation || false,
        });

        return protoAsset;
      });
  }

  /**
   * Upload image using the new asset api v3. Promise will resolve with an Asset instance.
   * In case of an successful upload the uploaded property is set.
   *
   * @param {Blob|File} image - Image asset to be uploaded
   * @param {Object} options - Asset upload options
   * @param {boolean} options.public - Flag whether asset is public
   * @param {z.assets.AssetRetentionPolicy} options.retention - Retention duration policy for asset
   * @param {boolean} options.expectsReadConfirmation - Whether the sender expects a read confirmation
   * @param {Function} [xhrAccessorFunction] - Function will get a reference to the underlying XMLHTTPRequest
   * @returns {Promise} Resolves when asset has been uploaded
   */
  uploadImageAsset(image, options, xhrAccessorFunction) {
    return this._compressImage(image).then(({compressedBytes, compressedImage}) => {
      return this._uploadAsset(compressedBytes, options, xhrAccessorFunction).then(({key, keyBytes, sha256, token}) => {
        keyBytes = new Uint8Array(keyBytes);
        sha256 = new Uint8Array(sha256);

        const assetImageMetadata = new Asset.ImageMetaData({
          height: compressedImage.height,
          width: compressedImage.width,
        });

        const assetOriginal = new Asset.Original({
          image: assetImageMetadata,
          mimeType: image.type,
          size: compressedBytes.length,
        });

        const assetRemoteData = new Asset.RemoteData({assetId: key, assetToken: token, otrKey: keyBytes, sha256});

        const protoAsset = new Asset({
          [z.cryptography.PROTO_MESSAGE_TYPE.ASSET_ORIGINAL]: assetOriginal,
          [z.cryptography.PROTO_MESSAGE_TYPE.ASSET_UPLOADED]: assetRemoteData,
          [z.cryptography.PROTO_MESSAGE_TYPE.EXPECTS_READ_CONFIRMATION]: options.expectsReadConfirmation || false,
        });

        return protoAsset;
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
      const url = this.backendClient.createUrl(`/assets/${assetId}`);
      const cachingParam = forceCaching ? '&forceCaching=true' : '';
      const conversationIdParam = `&conv_id=${window.encodeURIComponent(conversationId)}`;

      return `${url}?access_token=${this.backendClient.accessToken}${conversationIdParam}${cachingParam}`;
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
      const url = this.backendClient.createUrl(`/conversations/${conversationId}/otr/assets/${assetId}`);
      const cachingParam = forceCaching ? '&forceCaching=true' : '';

      return `${url}?access_token=${this.backendClient.accessToken}${cachingParam}`;
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
      const url = `${this.backendClient.createUrl(`/assets/v3/${assetKey}`)}`;
      const assetTokenParam = assetToken ? `&asset_token=${window.encodeURIComponent(assetToken)}` : '';
      const cachingParam = forceCaching ? '&forceCaching=true' : '';

      return `${url}?access_token=${this.backendClient.accessToken}${assetTokenParam}${cachingParam}`;
    });
  }

  getAssetRetention(userEntity, conversationEntity) {
    const isTeamMember = userEntity.inTeam();
    const isTeamConversation = conversationEntity.inTeam();
    const isTeamUserInConversation = conversationEntity
      .participating_user_ets()
      .some(conversationParticipant => conversationParticipant.inTeam());

    const isEternal = isTeamMember || isTeamConversation || isTeamUserInConversation;
    return isEternal ? z.assets.AssetRetentionPolicy.ETERNAL : z.assets.AssetRetentionPolicy.PERSISTENT;
  }

  /**
   * Post assets.
   *
   * @param {Uint8Array} assetData - Asset data
   * @param {Object} options - Asset metadata
   * @param {boolean} options.public - Flag whether asset is public
   * @param {z.assets.AssetRetentionPolicy} options.retention - Retention duration policy for asset
   * @param {Function} [xhrAccessorFunction] - Function will get a reference to the underlying XMLHTTPRequest
   * @returns {Promise} Resolves when asset has been uploaded
   */
  postAsset(assetData, options, xhrAccessorFunction) {
    const BOUNDARY = 'frontier';

    options = Object.assign(
      {
        public: false,
        retention: z.assets.AssetRetentionPolicy.PERSISTENT,
      },
      options
    );

    options = JSON.stringify(options);

    const body = [
      `--${BOUNDARY}`,
      'Content-Type: application/json; charset=utf-8',
      `Content-length: ${options.length}`,
      '',
      `${options}`,
      `--${BOUNDARY}`,
      'Content-Type: application/octet-stream',
      `Content-length: ${assetData.length}`,
      `Content-MD5: ${z.util.arrayToMd5Base64(assetData)}`,
      '',
      '',
    ].join('\r\n');

    const footer = `\r\n--${BOUNDARY}--\r\n`;
    const xhr = new XMLHttpRequest();
    if (typeof xhrAccessorFunction === 'function') {
      xhrAccessorFunction(xhr);
    }
    xhr.open('POST', this.backendClient.createUrl('/assets/v3'));
    xhr.setRequestHeader('Content-Type', `multipart/mixed; boundary=${BOUNDARY}`);
    xhr.setRequestHeader('Authorization', `${this.backendClient.accessTokenType} ${this.backendClient.accessToken}`);
    xhr.send(new Blob([body, assetData, footer]));

    return new Promise((resolve, reject) => {
      xhr.onload = function(event) {
        return this.status === 201 ? resolve(JSON.parse(this.response)) : reject(event);
      };
      xhr.onerror = reject;
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
      .loadFileBuffer(image)
      .then(buffer => {
        if (typeof filter === 'function' ? filter() : undefined) {
          return new Uint8Array(buffer);
        }
        return new z.util.Worker(worker).post(buffer);
      })
      .then(compressedBytes => {
        return z.util
          .loadImage(new Blob([compressedBytes], {type: image.type}))
          .then(compressedImage => ({compressedBytes, compressedImage}));
      });
  }
}
