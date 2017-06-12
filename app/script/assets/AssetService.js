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
  upload_profile_image(image) {
    return Promise.all([this._compress_profile_image(image), this._compress_image(image)])
      .then(([small, medium]) => {
        const [, small_image_bytes] = small;
        const [, medium_image_bytes] = medium;

        return Promise.all([
          this.post_asset(small_image_bytes, {public: true}),
          this.post_asset(medium_image_bytes, {public: true}),
        ]);
      })
      .then(([small_credentials, medium_credentials]) => {
        return [small_credentials.key, medium_credentials.key];
      });
  }

  /**
   * Upload arbitrary binary data using the new asset api v3.
   * The data is AES encrypted before uploading.
   *
   * @param {Uint8Array} bytes - Asset binary data
   * @param {Object} options - Asset upload options
   * @param {boolean} options.public - Flag whether asset is public
   * @param {z.assets.AssetRetentionPolicy} options.retention - Retention duration policy for asset
   * @param {Function} xhr_accessor_function - Function will get a reference to the underlying XMLHTTPRequest
   * @returns {Promise} Resolves when asset has been uploaded
   */
  _upload_asset(bytes, options, xhr_accessor_function) {
    return z.assets.AssetCrypto.encrypt_aes_asset(bytes).then(({cipher_text, key_bytes, sha256}) => {
      return this.post_asset(new Uint8Array(cipher_text), options, xhr_accessor_function).then(({key, token}) => ({
        key,
        key_bytes,
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
   * @param {Function} xhr_accessor_function - Function will get a reference to the underlying XMLHTTPRequest
   * @returns {Promise} Resolves when asset has been uploaded
   */
  upload_asset(file, options, xhr_accessor_function) {
    return z.util
      .load_file_buffer(file)
      .then(buffer => {
        return this._upload_asset(buffer, options, xhr_accessor_function);
      })
      .then(function({key, key_bytes, sha256, token}) {
        const asset = new z.proto.Asset();
        asset.set('uploaded', new z.proto.Asset.RemoteData(key_bytes, sha256, key, token));
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
  upload_image_asset(image, options) {
    return this._compress_image(image).then(([compressed_image, compressed_bytes]) => {
      return this._upload_asset(compressed_bytes, options).then(function({key, key_bytes, sha256, token}) {
        const image_meta_data = new z.proto.Asset.ImageMetaData(compressed_image.width, compressed_image.height);
        const asset = new z.proto.Asset();
        asset.set('original', new z.proto.Asset.Original(image.type, compressed_bytes.length, null, image_meta_data));
        asset.set('uploaded', new z.proto.Asset.RemoteData(key_bytes, sha256, key, token));
        return asset;
      });
    });
  }

  /**
   * Generates the URL an asset can be downloaded from.
   *
   * @deprecated
   * @param {string} asset_id - ID of asset
   * @param {string} conversation_id - Conversation ID
   * @param {boolean} force_caching - Cache asset in ServiceWorker
   * @returns {string} URL of v1 asset
   */
  generate_asset_url(asset_id, conversation_id, force_caching) {
    const url = this.client.create_url(`/assets/${asset_id}`);
    let asset_url = `${url}?access_token=${this.client.access_token}&conv_id=${conversation_id}`;
    if (force_caching) {
      asset_url = `${asset_url}&forceCaching=true`;
    }
    return asset_url;
  }

  /**
   * Generates the URL for asset api v2.
   *
   * @deprecated
   * @param {string} asset_id - ID of asset
   * @param {string} conversation_id - Conversation ID
   * @param {boolean} force_caching - Cache asset in ServiceWorker
   * @returns {string} URL of v2 asset
   */
  generate_asset_url_v2(asset_id, conversation_id, force_caching) {
    const url = this.client.create_url(`/conversations/${conversation_id}/otr/assets/${asset_id}`);
    let asset_url = `${url}?access_token=${this.client.access_token}`;
    if (force_caching) {
      asset_url = `${asset_url}&forceCaching=true`;
    }
    return asset_url;
  }

  /**
   * Generates the URL for asset api v3.
   *
   * @param {string} asset_key - ID of asset
   * @param {string} asset_token - Asset token
   * @param {boolean} force_caching - Cache asset in ServiceWorker
   * @returns {string} URL of v3 asset
   */
  generate_asset_url_v3(asset_key, asset_token, force_caching) {
    const url = this.client.create_url(`/assets/v3/${asset_key}/`);
    let asset_url = `${url}?access_token=${this.client.access_token}`;
    if (asset_token) {
      asset_url = `${asset_url}&asset_token=${asset_token}`;
    }
    if (force_caching) {
      asset_url = `${asset_url}&forceCaching=true`;
    }
    return asset_url;
  }

  /**
   * Post assets.
   *
   * @param {Uint8Array} asset_data - Asset data
   * @param {Object} metadata - Asset metadata
   * @param {boolean} metadata.public - Flag whether asset is public
   * @param {z.assets.AssetRetentionPolicy} metadata.retention - Retention duration policy for asset
   * @param {Function} xhr_accessor_function - Function will get a reference to the underlying XMLHTTPRequest
   * @returns {Promise} Resolves when asset has been uploaded
   */
  post_asset(asset_data, metadata, xhr_accessor_function) {
    return new Promise((resolve, reject) => {
      const BOUNDARY = 'frontier';

      metadata = Object.assign(
        {
          public: false,
          retention: z.assets.AssetRetentionPolicy.PERSISTENT,
        },
        metadata,
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
      body += `Content-length: ${asset_data.length}\r\n`;
      body += `Content-MD5: ${z.util.array_to_md5_base64(asset_data)}\r\n`;
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

      if (typeof xhr_accessor_function === 'function') {
        xhr_accessor_function(xhr);
      }

      xhr.send(new Blob([body, asset_data, footer]));
    });
  }

  /**
   * Compress image.
   * @param {File|Blob} image - Image to be compressed in ServiceWorker
   * @returns {Promise} Resolves with the compressed imaged
   */
  _compress_image(image) {
    return this._compress_image_with_worker('worker/image-worker.js', image, () => image.type === 'image/gif');
  }

  /**
   * Compress profile image.
   * @param {File|Blob} image - Profile image to be compressed in ServiceWorker
   * @returns {Promise} Resolves with the compressed profile imaged
   */
  _compress_profile_image(image) {
    return this._compress_image_with_worker('worker/profile-image-worker.js', image);
  }

  /**
   * Compress image using given worker.
   * @param {string} worker - Path to worker file
   * @param {File|Blob} image - Image to be compressed in ServiceWorker
   * @param {Function} filter - Optional filter to be applied
   * @returns {Promise} Resolves with the compressed image
   */
  _compress_image_with_worker(worker, image, filter) {
    return z.util
      .load_file_buffer(image)
      .then(buffer => {
        if (typeof filter === 'function' ? filter() : undefined) {
          return new Uint8Array(buffer);
        }
        return new z.util.Worker(worker).post(buffer);
      })
      .then(compressed_bytes => {
        return Promise.all([z.util.load_image(new Blob([compressed_bytes], {type: image.type})), compressed_bytes]);
      });
  }
};
