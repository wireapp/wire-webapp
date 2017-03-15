//
// Wire
// Copyright (C) 2016 Wire Swiss GmbH
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see http://www.gnu.org/licenses/.
//

if (window.z == null) { window.z = {}; }
if (z.assets == null) { z.assets = {}; }

// AssetService for all asset handling and the calls to the backend REST API.
z.assets.AssetService = class AssetService {
  /*
  Construct a new Asset Service.

  @param client [z.service.Client] Client for the API calls
  */
  constructor(client) {
    this.cancel_asset_upload = this.cancel_asset_upload.bind(this);
    this.client = client;
    this.logger = new z.util.Logger('z.assets.AssetService', z.config.LOGGER.OPTIONS);
    this.BOUNDARY = 'frontier';
    this.pending_uploads = {};
  }

  /*
  Upload any asset to the backend using asset api v1.

  @deprecated
  @param config [Object] Configuration object containing the jQuery call settings
  @option config [Object] data
  @option config [String] contentType
  @option config [String] contentDisposition
  */
  post_asset(config) {
    return this.client.send_request({
      type: 'POST',
      url: this.client.create_url('/assets'),
      data: config.data,
      processData: false, // otherwise jquery will convert it to a query string
      contentType: config.contentType,
      headers: {
        'Content-Disposition': config.contentDisposition
      }
    });
  }

  /*
  Upload any asset pair to the backend using asset api v1.

  @deprecated
  @param small [z.assets.Asset] Small asset for upload
  @param medium [z.assets.Asset] Medium asset for upload
  */
  post_asset_pair(small, medium) {
    return Promise.all([
      this.post_asset({
        contentType: small.content_type,
        contentDisposition: small.get_content_disposition(),
        data: small.array_buffer
      }),
      this.post_asset({
        contentType: medium.content_type,
        contentDisposition: medium.get_content_disposition(),
        data: medium.array_buffer
      })
    ]);
  }

  /*
  Update the user profile image by first making it usable, transforming it and then uploading the asset pair.

  @deprecated
  @param conversation_id [String] ID of self conversation
  @param image [File, Blob]
  */
  upload_profile_image(conversation_id, image) {
    return Promise.all([
      this._compress_profile_image(image),
      this._compress_image(image)
    ]).then((...args) => {
      let [small, medium] = Array.from(args[0]);
      let [small_image, small_image_bytes] = Array.from(small);
      let [medium_image, medium_image_bytes] = Array.from(medium);

      let medium_asset = new z.assets.Asset({
        array_buffer: medium_image_bytes,
        content_type: 'image/jpg',
        conversation_id,
        md5: z.util.array_to_md5_base64(medium_image_bytes),
        width: medium_image.height,
        height: medium_image.height,
        public: true
      });

      let small_profile_asset = $.extend(true, {}, medium_asset);
      small_profile_asset.array_buffer = small_image_bytes;
      small_profile_asset.payload.width = small_image.width;
      small_profile_asset.payload.height = small_image.height;
      small_profile_asset.payload.md5 = z.util.array_to_md5_base64(small_image_bytes);
      small_profile_asset.payload.tag = z.assets.ImageSizeType.SMALL_PROFILE;

      return this.post_asset_pair(small_profile_asset, medium_asset);
    }).then(function(...args) {
      let [small_response, medium_response] = Array.from(args[0]);
      return [small_response.data, medium_response.data];});
  }

  /*
  Update the user profile image by first making it usable, transforming it and then uploading the asset pair.

  @param conversation_id [String] ID of self conversation
  @param image [File, Blob]
  */
  upload_profile_image_v3(image) {
    return Promise.all([
      this._compress_profile_image(image),
      this._compress_image(image)
    ]).then((...args) => {
      let [small, medium] = Array.from(args[0]);
      let [small_image, small_image_bytes] = Array.from(small);
      let [medium_image, medium_image_bytes] = Array.from(medium);

      return Promise.all([
        this.post_asset_v3(small_image_bytes, {public: true}),
        this.post_asset_v3(medium_image_bytes, {public: true})
      ]);
    }).then(function(...args) {
      let [small_credentials, medium_credentials] = Array.from(args[0]);
      return [small_credentials.key, medium_credentials.key];});
  }

  /*
  Upload arbitrary binary data using the new asset api v3.
  The data is AES encrypted before uploading.

  @param bytes [Uint8Array] asset binary data
  @param options [Object]
  @option public [Boolean]
  @option retention [z.assets.AssetRetentionPolicy]
  @param xhr_accessor_function [Function] Function will get a reference to the underlying XMLHTTPRequest
  */
  _upload_asset(bytes, options, xhr_accessor_function) {
    return z.assets.AssetCrypto.encrypt_aes_asset(bytes)
    .then((...args) => {
      let [key_bytes, sha256, ciphertext] = Array.from(args[0]);
      return this.post_asset_v3(ciphertext, options, xhr_accessor_function)
      .then(({key, token}) => [key_bytes, sha256, key, token]);
    });
  }

  /*
  Upload file using the new asset api v3. Promise will resolve with z.proto.Asset instance.
  In case of an successful upload the uploaded property is set.

  @param file [File, Blob]
  @param options [Object]
  @option public [Boolean]
  @option retention [z.assets.AssetRetentionPolicy]
  @param xhr_accessor_function [Function] Function will get a reference to the underlying XMLHTTPRequest
  */
  upload_asset(file, options, xhr_accessor_function) {
    return z.util.load_file_buffer(file)
    .then(buffer => {
      return this._upload_asset(buffer, options, xhr_accessor_function);
    }).then(function(...args) {
      let [key_bytes, sha256, key, token] = Array.from(args[0]);
      let asset = new z.proto.Asset();
      asset.set('uploaded', new z.proto.Asset.RemoteData(key_bytes, sha256, key, token));
      return asset;
    });
  }

  /*
  Upload image using the new asset api v3. Promise will resolve with z.proto.Asset instance.
  In case of an successful upload the uploaded property is set.

  @param image [File, Blob]
  @param options [Object]
  @option public [Boolean]
  @option retention [z.assets.AssetRetentionPolicy]
  */
  upload_image_asset(image, options) {
    return this._compress_image(image)
    .then((...args) => {
      let [compressed_image, compressed_bytes] = Array.from(args[0]);
      return this._upload_asset(compressed_bytes, options)
      .then(function(...args1) {
        let [key_bytes, sha256, key, token] = Array.from(args1[0]);
        let image_meta_data = new z.proto.Asset.ImageMetaData(compressed_image.width, compressed_image.height);
        let asset = new z.proto.Asset();
        asset.set('original', new z.proto.Asset.Original(image.type, compressed_bytes.length, null, image_meta_data));
        asset.set('uploaded', new z.proto.Asset.RemoteData(key_bytes, sha256, key, token));
        return asset;
      });
    }
    );
  }

  /*
  Generates the URL an asset can be downloaded from.

  @deprecated
  @param asset_id [String] ID of the asset
  @param conversation_id [String] ID of the conversation the asset belongs to
  @param force_caching [Boolean]
  @return [String] Asset URL
  */
  generate_asset_url(asset_id, conversation_id, force_caching) {
    let url = this.client.create_url(`/assets/${asset_id}`);
    let asset_url = `${url}?access_token=${this.client.access_token}&conv_id=${conversation_id}`;
    if (force_caching) { asset_url = `${asset_url}&forceCaching=true`; }
    return asset_url;
  }

  /*
  Generates the URL for asset api v2.

  @deprecated
  @param asset_id [String] ID of the asset
  @param conversation_id [String] ID of the conversation the asset belongs to
  @param force_caching [Boolean]
  @return [String] Asset URL
  */
  generate_asset_url_v2(asset_id, conversation_id, force_caching) {
    let url = this.client.create_url(`/conversations/${conversation_id}/otr/assets/${asset_id}`);
    let asset_url = `${url}?access_token=${this.client.access_token}`;
    if (force_caching) { asset_url = `${asset_url}&forceCaching=true`; }
    return asset_url;
  }

  /*
  Generates the URL for asset api v3.

  @param asset_key [String]
  @param asset_token [String]
  @param force_caching [Boolean]
  @return [String] Asset URL
  */
  generate_asset_url_v3(asset_key, asset_token, force_caching) {
    let url = this.client.create_url(`/assets/v3/${asset_key}/`);
    let asset_url = `${url}?access_token=${this.client.access_token}`;
    if (asset_token) { asset_url = `${asset_url}&asset_token=${asset_token}`; }
    if (force_caching) { asset_url = `${asset_url}&forceCaching=true`; }
    return asset_url;
  }

  /*
  Create request data for asset upload.

  @param asset_data [UInt8Array|ArrayBuffer] Asset data
  @param metadata [Object] image meta data
  */
  _create_asset_multipart_body(asset_data, metadata) {
    metadata = JSON.stringify(metadata);
    let asset_data_md5 = z.util.array_to_md5_base64(asset_data);

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

    let footer = `\r\n--${this.BOUNDARY}--\r\n`;

    return new Blob([body, asset_data, footer]);
  }

  /*
  Post assets to a conversation.

  @deprecated
  @param conversation_id [String] ID of the self conversation
  @param json_payload [Object] First part of the multipart message
  @param image_data [Uint8Array|ArrayBuffer] encrypted image data
  @param precondition_option [Array<String>|Boolean] Level that backend checks for missing clients
  @param upload_id [String] Identifies the upload request
  */
  post_asset_v2(conversation_id, json_payload, image_data, precondition_option, upload_id) {
    return new Promise((function(resolve, reject) {
      let url = this.client.create_url(`/conversations/${conversation_id}/otr/assets`);

      if (_.isArray(precondition_option)) {
        url = `${url}?report_missing=${precondition_option.join(',')}`;
      } else if (precondition_option) {
        url = `${url}?ignore_missing=true`;
      }

      image_data = new Uint8Array(image_data);
      let data = this._create_asset_multipart_body(image_data, json_payload);
      let { pending_uploads } = this;

      let xhr = new XMLHttpRequest();
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
        return delete pending_uploads[upload_id];
      };
      xhr.onerror = function(error) {
        reject(error);
        return delete pending_uploads[upload_id];
      };
      xhr.upload.onprogress = function(event) {
        if (upload_id) {
          // we use amplify due to the fact that Promise API lacks progress support
          let percentage_progress = Math.round((event.loaded / event.total) * 100);
          return amplify.publish(`upload${upload_id}`, percentage_progress);
        }
      };
      xhr.send(data);

      return pending_uploads[upload_id] = xhr;
    }.bind(this)));
  }

  /*
  Post assets using asset api v3.

  @param asset_data [Uint8Array|ArrayBuffer]
  @param metadata [Object]
  @option public [Boolean] Default is false
  @option retention [z.assets.AssetRetentionPolicy] Default is z.assets.AssetRetentionPolicy.PERSISTENT
  @param xhr_accessor_function [Function] Function will get a reference to the underlying XMLHTTPRequest
  */
  post_asset_v3(asset_data, metadata, xhr_accessor_function) {
    return new Promise((function(resolve, reject) {
      metadata = $.extend({
        public: false,
        retention: z.assets.AssetRetentionPolicy.PERSISTENT
      }
      , metadata);

      let xhr = new XMLHttpRequest();
      xhr.open('POST', this.client.create_url('/assets/v3'));
      xhr.setRequestHeader('Content-Type', `multipart/mixed; boundary=${this.BOUNDARY}`);
      xhr.setRequestHeader('Authorization', `${this.client.access_token_type} ${this.client.access_token}`);
      xhr.onload = function(event) { if (this.status === 201) { return resolve(JSON.parse(this.response)); } else { return reject(event); } };
      xhr.onerror = reject;
      if (typeof xhr_accessor_function === 'function') {
        xhr_accessor_function(xhr);
      }
      return xhr.send(this._create_asset_multipart_body(new Uint8Array(asset_data), metadata));
    }.bind(this)));
  }

  /*
  Cancel an asset upload.

  @param upload_id [String] Identifies the upload request
  */
  cancel_asset_upload(upload_id) {
    let xhr = this.pending_uploads[upload_id];
    if (xhr != null) {
      xhr.abort();
      return delete this.pending_uploads[upload_id];
    }
  }

  /*
  Create image proto message.

  @deprecated
  @param image [File, Blob]
  */
  create_image_proto(image) {
    return this._compress_image(image)
    .then(function(...args) {
      let [compressed_image, compressed_bytes] = Array.from(args[0]);
      return z.assets.AssetCrypto.encrypt_aes_asset(compressed_bytes)
      .then(function(...args1) {
        let [key_bytes, sha256, ciphertext] = Array.from(args1[0]);
        let image_asset = new z.proto.ImageAsset();
        image_asset.set_tag(z.assets.ImageSizeType.MEDIUM);
        image_asset.set_width(compressed_image.width);
        image_asset.set_height(compressed_image.height);
        image_asset.set_original_width(compressed_image.width);
        image_asset.set_original_height(compressed_image.height);
        image_asset.set_mime_type(image.type);
        image_asset.set_size(compressed_bytes.length);
        image_asset.set_otr_key(key_bytes);
        image_asset.set_sha256(sha256);
        return [image_asset, new Uint8Array(ciphertext)];});});
  }

  /*
  Create asset proto message.

  @deprecated
  @param asset [File, Blob]
  */
  create_asset_proto(asset) {
    return z.util.load_file_buffer(asset)
    .then(file_bytes => z.assets.AssetCrypto.encrypt_aes_asset(file_bytes)).then(function(...args) {
      let [key_bytes, sha256, ciphertext] = Array.from(args[0]);
      asset = new z.proto.Asset();
      asset.set('uploaded', new z.proto.Asset.RemoteData(key_bytes, sha256));
      return [asset, ciphertext];});
  }

  /*
  Compress image.
  @param image [File, Blob]
  */
  _compress_image(image) {
    return this._compress_image_with_worker('worker/image-worker.js', image, () => image.type === 'image/gif');
  }

  /*
  Compress profile image.
  @param image [File, Blob]
  */
  _compress_profile_image(image) {
    return this._compress_image_with_worker('worker/profile-image-worker.js', image);
  }

  /*
  Compress image using given worker.
  @param worker [String] path to worker file
  @param image [File, Blob]
  @param filter [Function] skips compression if function returns true
  */
  _compress_image_with_worker(worker, image, filter) {
    return z.util.load_file_buffer(image)
    .then(function(buffer) {
      if (typeof filter === 'function' ? filter() : undefined) { return buffer; }
      let image_worker = new z.util.Worker(worker);
      return image_worker.post(buffer);}).then(compressed_bytes =>
      z.util.load_image(new Blob([new Uint8Array(compressed_bytes)], {'type': image.type}))
      .then(compressed_image => [compressed_image, new Uint8Array(compressed_bytes)]));
  }
};
