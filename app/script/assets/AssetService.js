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
    this.cancel_asset_upload = this.cancel_asset_upload.bind(this);
    this.client = client;
    this.logger = new z.util.Logger('z.assets.AssetService', z.config.LOGGER.OPTIONS);
    this.BOUNDARY = 'frontier';
    this.pending_uploads = {};
  }

  /**
   * Upload any asset to the backend using asset api v1.
   *
   * @deprecated
   * @param {Object} config - Configuration object containing the jQuery call settings
   * @param {string} config.data - Asset data
   * @param {string} config.contentDisposition - Content disposition header
   * @param {string} config.contentType - Content type
   * @returns {Promise} Resolve when asset has been uploaded
   */
  post_asset(config) {
    return this.client.send_request({
      contentType: config.contentType,
      data: config.data,
      headers: {
        'Content-Disposition': config.contentDisposition,
      },
      processData: false, // otherwise jquery will convert it to a query string
      type: 'POST',
      url: this.client.create_url('/assets'),
    });
  }

  /**
   * Upload any asset pair to the backend using asset api v1.
   *
   * @deprecated
   * @param {z.assets.Asset} small - Small asset
   * @param {z.assets.Asset} medium - Medium asset
   * @returns {Promise} Resolves when asset pair has been uploaded
   */
  post_asset_pair(small, medium) {
    return Promise.all([
      this.post_asset({
        contentDisposition: small.get_content_disposition(),
        contentType: small.content_type,
        data: small.array_buffer,
      }),
      this.post_asset({
        contentDisposition: medium.get_content_disposition(),
        contentType: medium.content_type,
        data: medium.array_buffer,
      }),
    ]);
  }

  /**
   * Update the user profile image by first making it usable, transforming it and then uploading the asset pair.
   *
   * @deprecated
   * @param {string} conversation_id - ID of self conversation
   * @param {File|Blob} image - Profile image
   * @returns {Promise} Resolves when profile image has been uploaded
   */
  upload_profile_image(conversation_id, image) {
    return Promise.all([
      this._compress_profile_image(image),
      this._compress_image(image),
    ]).then(([small, medium]) => {
      const [small_image, small_image_bytes] = small;
      const [medium_image, medium_image_bytes] = medium;

      const medium_asset = new z.assets.Asset({
        array_buffer: medium_image_bytes,
        content_type: 'image/jpg',
        conversation_id: conversation_id,
        height: medium_image.height,
        md5: z.util.array_to_md5_base64(medium_image_bytes),
        public: true,
        width: medium_image.width,
      });

      const small_profile_asset = $.extend(true, {}, medium_asset);
      small_profile_asset.__proto__ = z.assets.Asset.prototype;
      small_profile_asset.array_buffer = small_image_bytes;
      small_profile_asset.payload.width = small_image.width;
      small_profile_asset.payload.height = small_image.height;
      small_profile_asset.payload.md5 = z.util.array_to_md5_base64(small_image_bytes);
      small_profile_asset.payload.tag = z.assets.ImageSizeType.SMALL_PROFILE;

      return this.post_asset_pair(small_profile_asset, medium_asset);
    })
    .then(([small_response, medium_response]) => {
      return [small_response.data, medium_response.data];
    });
  }

  /**
   * Update the user profile image by first making it usable, transforming it and then uploading the asset pair.
   * @param {File|Blob} image - Profile image
   * @returns {Promise} Resolves when profile image has been uploaded
   */
  upload_profile_image_v3(image) {
    return Promise.all([
      this._compress_profile_image(image),
      this._compress_image(image),
    ])
    .then(([small, medium]) => {
      const [, small_image_bytes] = small;
      const [, medium_image_bytes] = medium;

      return Promise.all([
        this.post_asset_v3(small_image_bytes, {public: true}),
        this.post_asset_v3(medium_image_bytes, {public: true}),
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
    return z.assets.AssetCrypto.encrypt_aes_asset(bytes)
    .then(([key_bytes, sha256, ciphertext]) => {
      return this.post_asset_v3(ciphertext, options, xhr_accessor_function)
      .then(({key, token}) => [key_bytes, sha256, key, token]);
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
    return z.util.load_file_buffer(file)
    .then((buffer) => {
      return this._upload_asset(buffer, options, xhr_accessor_function);
    })
    .then(function([key_bytes, sha256, key, token]) {
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
    return this._compress_image(image)
    .then(([compressed_image, compressed_bytes]) => {
      return this._upload_asset(compressed_bytes, options)
      .then(function([key_bytes, sha256, key, token]) {
        const image_meta_data = new z.proto.Asset.ImageMetaData(compressed_image.width, compressed_image.height);
        const asset = new z.proto.Asset();
        asset.set('original', new z.proto.Asset.Original(image.type, compressed_bytes.length, null, image_meta_data));
        asset.set('uploaded', new z.proto.Asset.RemoteData(key_bytes, sha256, key, token));
        return asset;
      });
    }
    );
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
   * Create request data for asset upload.
   *
   * @param {Uint8Array|ArrayBuffer} asset_data - Asset data
   * @param {Object} metadata - Asset metadata
   * @returns {Blob} Asset multipart body
   */
  _create_asset_multipart_body(asset_data, metadata) {
    metadata = JSON.stringify(metadata);
    const asset_data_md5 = z.util.array_to_md5_base64(asset_data);

    let body = '';
    body += `--${this.BOUNDARY}\r\n`;
    body += 'Content-Type: application/json; charset=utf-8\r\n';
    body += `Content-length: ${metadata.length}\r\n`;
    body += '\r\n';
    body += metadata + '\r\n';
    body += `--${this.BOUNDARY}\r\n`;
    body += 'Content-Type: application/octet-stream\r\n';
    body += `Content-length: ${asset_data.length}\r\n`;
    body += `Content-MD5: ${asset_data_md5}\r\n`;
    body += '\r\n';

    const footer = `\r\n--${this.BOUNDARY}--\r\n`;

    return new Blob([body, asset_data, footer]);
  }

  /**
   * Post assets to a conversation.
   *
   * @deprecated
   * @param {string} conversation_id - ID of conversation
   * @param {Object} json_payload - Payload to post
   * @param {Uint8Array|ArrayBuffer} image_data - Asset data to upload
   * @param {Array|boolean} precondition_option - Level that backend checks for missing clients
   * @param {string} upload_id - Id to track upload with
   * @returns {Promise} Resolves when asset has been uploaded
   */
  post_asset_v2(conversation_id, json_payload, image_data, precondition_option, upload_id) {
    return new Promise((resolve, reject) => {
      let url = this.client.create_url(`/conversations/${conversation_id}/otr/assets`);

      if (Array.isArray(precondition_option)) {
        url = `${url}?report_missing=${precondition_option.join(',')}`;
      } else if (precondition_option) {
        url = `${url}?ignore_missing=true`;
      }

      image_data = new Uint8Array(image_data);
      const data = this._create_asset_multipart_body(image_data, json_payload);
      const {pending_uploads} = this;

      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.setRequestHeader('Content-Type', `multipart/mixed; boundary=${this.BOUNDARY}`);
      xhr.setRequestHeader('Authorization', `${this.client.access_token_type} ${this.client.access_token}`);
      xhr.onload = function(event) {
        if (this.status === 201) {
          resolve([JSON.parse(this.response), this.getResponseHeader('Location')]);
        } else if (this.status === 412) {
          reject(JSON.parse(this.response));
        } else {
          reject(event);
        }
        delete pending_uploads[upload_id];
      };
      xhr.onerror = function(error) {
        reject(error);
        delete pending_uploads[upload_id];
      };
      xhr.upload.onprogress = function(event) {
        if (upload_id) {
          // we use amplify due to the fact that Promise API lacks progress support
          const percentage_progress = Math.round((event.loaded / event.total) * 100);
          return amplify.publish(`upload${upload_id}`, percentage_progress);
        }
      };
      xhr.send(data);

      return pending_uploads[upload_id] = xhr;
    });
  }

  /**
   * Post assets using asset api v3.
   *
   * @param {Uint8Array|ArrayBuffer} asset_data - Asset data
   * @param {Object} metadata - Asset metadata
   * @param {boolean} metadata.public - Flag whether asset is public
   * @param {z.assets.AssetRetentionPolicy} metadata.retention - Retention duration policy for asset
   * @param {Function} xhr_accessor_function - Function will get a reference to the underlying XMLHTTPRequest
   * @returns {Promise} Resolves when asset has been uploaded
   */
  post_asset_v3(asset_data, metadata, xhr_accessor_function) {
    return new Promise((resolve, reject) => {
      metadata = Object.assign({
        public: false,
        retention: z.assets.AssetRetentionPolicy.PERSISTENT,
      }, metadata);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', this.client.create_url('/assets/v3'));
      xhr.setRequestHeader('Content-Type', `multipart/mixed; boundary=${this.BOUNDARY}`);
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

      xhr.send(this._create_asset_multipart_body(new Uint8Array(asset_data), metadata));
    });
  }

  /**
   * Cancel an asset upload.
   * @param {string} upload_id - Identifies the upload request
   * @returns {undefined} No return value
   */
  cancel_asset_upload(upload_id) {
    const xhr = this.pending_uploads[upload_id];
    if (xhr != null) {
      xhr.abort();
      delete this.pending_uploads[upload_id];
    }
  }

  /**
   * Create image proto message.
   * @deprecated
   * @param {File|Blob} image - Image asset
   * @returns {Promise} Resolves with image asset protobuffer
   */
  create_image_proto(image) {
    return this._compress_image(image)
    .then(([compressed_image, compressed_bytes]) => {
      return z.assets.AssetCrypto.encrypt_aes_asset(compressed_bytes)
      .then(([key_bytes, sha256, ciphertext]) => {
        const image_asset = new z.proto.ImageAsset();
        image_asset.set_tag(z.assets.ImageSizeType.MEDIUM);
        image_asset.set_width(compressed_image.width);
        image_asset.set_height(compressed_image.height);
        image_asset.set_original_width(compressed_image.width);
        image_asset.set_original_height(compressed_image.height);
        image_asset.set_mime_type(image.type);
        image_asset.set_size(compressed_bytes.length);
        image_asset.set_otr_key(key_bytes);
        image_asset.set_sha256(sha256);
        return [image_asset, new Uint8Array(ciphertext)];
      });
    });
  }

  /**
   * Create asset proto message.
   * @deprecated
   * @param {File|Blob} asset - Asset
   * @returns {Promise} Resolves with asset protobuffer
   */
  create_asset_proto(asset) {
    return z.util.load_file_buffer(asset)
    .then((file_bytes) => z.assets.AssetCrypto.encrypt_aes_asset(file_bytes))
    .then(([key_bytes, sha256, ciphertext]) => {
      asset = new z.proto.Asset();
      asset.set('uploaded', new z.proto.Asset.RemoteData(key_bytes, sha256));
      return [asset, ciphertext];
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
    return z.util.load_file_buffer(image)
    .then((buffer) => {
      if (typeof filter === 'function' ? filter() : undefined) {
        return new Uint8Array(buffer);
      }
      return new z.util.Worker(worker).post(buffer);
    })
    .then((compressed_bytes) => {
      return Promise.all([
        z.util.load_image(new Blob([compressed_bytes], {'type': image.type})),
        compressed_bytes,
      ]);
    });
  }
};
