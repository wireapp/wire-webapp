#
# Wire
# Copyright (C) 2016 Wire Swiss GmbH
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see http://www.gnu.org/licenses/.
#

window.z ?= {}
z.assets ?= {}

class z.assets.AssetRemoteData

  ###
  Use either z.assets.AssetRemoteData.v2 or z.assets.AssetRemoteData.v3
  to initialize.

  @param otr_key [Uint8Array]
  @param sha256 [Uint8Array]
  ###
  constructor: (@otr_key, @sha256) ->
    @download_progress = ko.observable()
    @cancel_download = undefined
    @generate_url = undefined
    @identifier = undefined

  ###
  Static initializer for v3 assets

  @param asset_key [String]
  @param otr_key [Uint8Array]
  @param sha256 [Uint8Array]
  @param asset_token [String] token is optional
  ###
  @v3: (asset_key, otr_key, sha256, asset_token) ->
    remote_data = new z.assets.AssetRemoteData otr_key, sha256
    remote_data.generate_url = -> wire.app.service.asset.generate_asset_url_v3 asset_key, asset_token
    remote_data.identifier = "#{asset_key}"
    return remote_data

  ###
  Static initializer for v2 assets

  @param conversation_id [String]
  @param asset_id [String]
  @param otr_key [Uint8Array]
  @param sha256 [Uint8Array]
  ###
  @v2: (conversation_id, asset_id, otr_key, sha256) ->
    remote_data = new z.assets.AssetRemoteData otr_key, sha256
    remote_data.generate_url = -> wire.app.service.asset.generate_asset_url_v2 asset_id, conversation_id
    remote_data.identifier = "#{conversation_id}#{asset_id}"
    return remote_data

  ###
  Static initializer for v1 assets

  @deprecated
  @param conversation_id [String]
  @param asset_id [String]
  ###
  @v1: (conversation_id, asset_id) ->
    remote_data = new z.assets.AssetRemoteData()
    remote_data.generate_url = -> wire.app.service.asset.generate_asset_url asset_id, conversation_id
    remote_data.identifier = "#{conversation_id}#{asset_id}"
    return remote_data

  ###
  Loads and decrypts stored asset

  @returns [Blob]
  ###
  load: =>
    type = undefined

    @_load_buffer()
    .then (data) =>
      [buffer, type] = data
      if @otr_key? and @sha256?
        return z.assets.AssetCrypto.decrypt_aes_asset buffer, @otr_key.buffer, @sha256.buffer
      return buffer
    .then (buffer) ->
      return new Blob [new Uint8Array buffer], type: type

  ###
  Get object url for asset remote data. URLs are cached in memory

  @returns [String] url
  ###
  get_object_url: =>
    object_url = z.assets.AssetURLCache.get_url @identifier
    return Promise.resolve object_url if object_url?

    @load().then (blob) => z.assets.AssetURLCache.set_url @identifier, window.URL.createObjectURL(blob)

  _load_buffer: =>
    z.util.load_url_buffer @generate_url(), (xhr) =>
      xhr.onprogress = (event) => @download_progress Math.round event.loaded / event.total * 100
      @cancel_download = -> xhr.abort.call xhr
