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

z.assets.AssetRemoteData = class AssetRemoteData {

  /*
  Use either z.assets.AssetRemoteData.v2 or z.assets.AssetRemoteData.v3
  to initialize.

  @param otr_key [Uint8Array]
  @param sha256 [Uint8Array]
  */
  constructor(otr_key, sha256) {
    this.load = this.load.bind(this);
    this.get_object_url = this.get_object_url.bind(this);
    this._load_buffer = this._load_buffer.bind(this);
    this.otr_key = otr_key;
    this.sha256 = sha256;
    this.download_progress = ko.observable();
    this.cancel_download = undefined;
    this.generate_url = undefined;
    this.identifier = undefined;
  }

  /*
  Static initializer for v3 assets

  @param asset_key [String]
  @param otr_key [Uint8Array]
  @param sha256 [Uint8Array]
  @param asset_token [String] token is optional
  @param force_caching [Boolean]
  */
  static v3(asset_key, otr_key, sha256, asset_token, force_caching) {
    if (force_caching == null) { force_caching = false; }
    let remote_data = new z.assets.AssetRemoteData(otr_key, sha256);
    remote_data.generate_url = () => wire.app.service.asset.generate_asset_url_v3(asset_key, asset_token, force_caching);
    remote_data.identifier = `${asset_key}`;
    return remote_data;
  }

  /*
  Static initializer for v2 assets

  @param conversation_id [String]
  @param asset_id [String]
  @param otr_key [Uint8Array]
  @param sha256 [Uint8Array]
  @param force_caching [Boolean]
  */
  static v2(conversation_id, asset_id, otr_key, sha256, force_caching) {
    if (force_caching == null) { force_caching = false; }
    let remote_data = new z.assets.AssetRemoteData(otr_key, sha256);
    remote_data.generate_url = () => wire.app.service.asset.generate_asset_url_v2(asset_id, conversation_id, force_caching);
    remote_data.identifier = `${conversation_id}${asset_id}`;
    return remote_data;
  }

  /*
  Static initializer for v1 assets

  @deprecated
  @param conversation_id [String]
  @param asset_id [String]
  @param force_caching [Boolean]
  */
  static v1(conversation_id, asset_id, force_caching) {
    if (force_caching == null) { force_caching = false; }
    let remote_data = new z.assets.AssetRemoteData();
    remote_data.generate_url = () => wire.app.service.asset.generate_asset_url(asset_id, conversation_id, force_caching);
    remote_data.identifier = `${conversation_id}${asset_id}`;
    return remote_data;
  }

  /*
  Loads and decrypts stored asset

  @returns [Blob]
  */
  load() {
    let type = undefined;

    return this._load_buffer()
    .then(data => {
      let buffer;
      [buffer, type] = Array.from(data);
      if ((this.otr_key != null) && (this.sha256 != null)) {
        return z.assets.AssetCrypto.decrypt_aes_asset(buffer, this.otr_key.buffer, this.sha256.buffer);
      }
      return buffer;
    }).then(buffer => new Blob([new Uint8Array(buffer)], {type}));
  }

  /*
  Get object url for asset remote data. URLs are cached in memory

  @returns [String] url
  */
  get_object_url() {
    let object_url = z.assets.AssetURLCache.get_url(this.identifier);
    if (object_url != null) { return Promise.resolve(object_url); }

    return this.load().then(blob => z.assets.AssetURLCache.set_url(this.identifier, window.URL.createObjectURL(blob)));
  }

  _load_buffer() {
    return z.util.load_url_buffer(this.generate_url(), xhr => {
      xhr.onprogress = event => this.download_progress(Math.round((event.loaded / event.total) * 100));
      return this.cancel_download = () => xhr.abort.call(xhr);
    }
    );
  }
};
