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

# AssetService for all asset handling and the calls to the backend REST API.
class z.assets.AssetService
  ###
  Construct a new Asset Service.

  @param client [z.service.Client] Client for the API calls
  ###
  constructor: (@client) ->
    @logger = new z.util.Logger 'z.assets.AssetService', z.config.LOGGER.OPTIONS
    @rotator = new zeta.webapp.module.image.rotation.ImageFileRotator()
    @compressor = new zeta.webapp.module.image.ImageCompressor()

    @BOUNDARY = 'frontier'

    @PREVIEW_CONFIG =
      squared: false
      max_image_size: 30
      max_byte_size: 1024
      lossy_scaling: true
      compression: 0

    @SMALL_PROFILE_CONFIG =
      squared: true
      max_image_size: 280
      max_byte_size: 1024 * 1024
      lossy_scaling: true
      compression: 0.7

    @pending_uploads = {}

  ###############################################################################
  # REST API calls
  ###############################################################################

  ###
  Upload any asset to the backend using asset api v1.

  @deprecated
  @param config [Object] Configuration object containing the jQuery call settings
  @option config [String] url
  @option config [Object] data
  @option config [String] contentType
  @option config [String] contentDisposition
  @option config [Function] callback
  ###
  post_asset: (config) ->
    @client.send_request
      type: 'POST'
      url: config.url
      data: config.data
      processData: false # otherwise jquery will convert it to a query string
      contentType: config.contentType
      headers:
        'Content-Disposition': config.contentDisposition
      callback: config.callback

  ###
  Upload any asset pair to the backend using asset api v1.

  @deprecated
  @param small [z.assets.Asset] Small asset for upload
  @param medium [z.assets.Asset] Medium asset for upload
  ###
  post_asset_pair: (small, medium) ->
    Promise.all [
      @post_asset
        contentType: small.content_type
        url: @client.create_url '/assets'
        contentDisposition: small.get_content_disposition()
        data: small.array_buffer
      @post_asset
        contentType: medium.content_type
        url: @client.create_url '/assets'
        contentDisposition: medium.get_content_disposition()
        data: medium.array_buffer
    ]

  ###############################################################################
  # Asset service interactions
  ###############################################################################

  ###
  Update the user profile image by first making it usable, transforming it and then uploading the asset pair.

  @deprecated
  @param conversation_id [String] ID of self conversation
  @param file [File, Blob] Image
  ###
  upload_profile_image: (conversation_id, file, callback) ->
    @_convert_image file, (image) =>
      @_upload_profile_assets conversation_id, image, callback

  ###
  Upload arbitrary binary data using the new asset api v3.
  The data is AES encrypted before uploading.

  @param bytes [Uint8Array] asset binary data
  @param options [Object]
  @option public [Boolean]
  @option retention [z.assets.AssetRetentionPolicy]
  ###
  _upload_asset: (bytes, options) ->
    key_bytes = null
    sha256 = null

    z.assets.AssetCrypto.encrypt_aes_asset bytes
    .then (data) =>
      [key_bytes, sha256, ciphertext] = data
      return @post_asset_v3 ciphertext, options
    .then (data) ->
      {key, token} = data
      return [key_bytes, sha256, key, token]

  ###
  Upload image the new asset api v3. Promise will resolve with z.proto.Asset instance.
  In case of an successful upload the uploaded property is set. Otherwise it will be marked as not
  uploaded.

  @param file [File, Blob] Image
  @param options [Object]
  @option public [Boolean]
  @option retention [z.assets.AssetRetentionPolicy]
  ###
  upload_image_asset: (file, options) ->
    compressed_image = null
    image_bytes = null

    @compress_image file
    .then (data) ->
      [original_image, compressed_image] = data
      return z.util.base64_to_array compressed_image.src
    .then (bytes) =>
      image_bytes = bytes
      @_upload_asset image_bytes, options
    .then (data) ->
      [key_bytes, sha256, key, token] = data
      image_meta_data = new z.proto.Asset.ImageMetaData compressed_image.width, compressed_image.height
      asset = new z.proto.Asset()
      asset.set 'original', new z.proto.Asset.Original file.type, image_bytes.length, null, image_meta_data
      asset.set 'uploaded', new z.proto.Asset.RemoteData key_bytes, sha256, key, token
      return asset
    .catch (error) =>
      @logger.log @logger.levels.ERROR, error
      asset = new z.proto.Asset()
      asset.set 'not_uploaded', z.proto.Asset.NotUploaded.FAILED
      return asset

  ###
  Generates the URL an asset can be downloaded from.

  @param asset_id [String] ID of the asset
  @param conversation_id [String] ID of the conversation the asset belongs to
  @return [String] Asset URL
  ###
  generate_asset_url: (asset_id, conversation_id) ->
    url = @client.create_url "/assets/#{asset_id}"
    asset_url = "#{url}?access_token=#{@client.access_token}&conv_id=#{conversation_id}"
    return asset_url

  ###
  Generates the URL for asset api v2.

  @param asset_id [String] ID of the asset
  @param conversation_id [String] ID of the conversation the asset belongs to
  @return [String] Asset URL
  ###
  generate_asset_url_v2: (asset_id, conversation_id) ->
    url = @client.create_url "/conversations/#{conversation_id}/otr/assets/#{asset_id}"
    asset_url = "#{url}?access_token=#{@client.access_token}"
    return asset_url

  ###
  Generates the URL for asset api v3.

  @param asset_key [String]
  @param asset_token [String]
  @return [String] Asset URL
  ###
  generate_asset_url_v3: (asset_key, asset_token) ->
    url = @client.create_url "/assets/v3/#{asset_key}/"
    asset_url = "#{url}?access_token=#{@client.access_token}"
    asset_url = "#{asset_url}&asset_token=#{asset_token}" if asset_token
    return asset_url

  ###############################################################################
  # Private
  ###############################################################################

  ###
  Compress image before uploading.

  @param file [File, Blob] Image
  ###
  compress_image: (file) ->
    return new Promise (resolve) =>
      @_convert_image file, (image) =>
        @compressor.transform_image image, (compressed_image) ->
          resolve [image, compressed_image]

  ###
  Convert an image before uploading it.

  @param file [File, Blob] Image
  @param callback [Function] Function to be called on return
  ###
  _convert_image: (file, callback) ->
    @_rotate_image file, (rotated_file) ->
      z.util.read_deferred(rotated_file, 'url').done (url) ->
        image = new Image()
        image.onload = -> callback image
        image.onerror = (e) => @logger.log "Loading image failed #{e}"
        image.src = url
  ###
  Rotate an image file unless it is a gif.

  @private

  @param file [Object] Image file to be rotated
  @param callback [Function] Function to be called on return
  ###
  _rotate_image: (file, callback) ->
    return callback file if file.type is 'image/gif'
    @rotator.rotate file, callback

  ###
  Update the profile image of the user.

  @note We need to upload it in sizes 'smallProfile', and 'medium'.
  @private

  @param conversation_id [String] ID of the self conversation
  @param image [Object] Image to be used as new profile picture
  @param callback [Function] Function to be called on server return
  ###
  _upload_profile_assets: (conversation_id, image, callback) ->
    # Finished compressing medium image
    medium_image_compressed = (medium_image) =>
      medium_asset = new z.assets.Asset
        conversation_id: conversation_id
        original_width: medium_image.width
        original_height: medium_image.height
        public: true
      medium_asset.set_image medium_image

      # Finished compressing small image
      small_profile_image_compressed = (small_image) =>
        small_profile_asset = $.extend true, {}, medium_asset
        small_profile_asset.payload.tag = z.assets.ImageSizeType.SMALL_PROFILE
        small_profile_asset.set_image small_image

        @post_asset_pair small_profile_asset, medium_asset
        .then (value) ->
          [small_response, medium_response] = value
          callback [small_response.data, medium_response.data]
        .catch (error) ->
          callback [], error

      # Compress small image
      @compressor.transform_image medium_image, small_profile_image_compressed, @SMALL_PROFILE_CONFIG

    # Compress medium image
    @compressor.transform_image image, medium_image_compressed # default config #

  ###
  Create request data for asset upload.

  @param asset_data [UInt8Array|ArrayBuffer] Asset data
  @param metadata [Object] image meta data
  ###
  _create_asset_multipart_body: (asset_data, metadata) ->
    metadata = JSON.stringify metadata
    asset_data_md5 = z.util.encode_base64_md5_array_buffer_view asset_data

    body = ''
    body += '--' + @BOUNDARY + '\r\n'
    body += 'Content-Type: application/json; charset=utf-8\r\n'
    body += "Content-length: #{metadata.length}\r\n"
    body += '\r\n'
    body += metadata + '\r\n'
    body += '--' + @BOUNDARY + '\r\n'
    body += 'Content-Type: application/octet-stream\r\n'
    body += "Content-length: #{asset_data.length}\r\n"
    body += "Content-MD5: #{asset_data_md5}\r\n"
    body += '\r\n'

    footer = '\r\n--' + @BOUNDARY + '--\r\n'

    return new Blob [body, asset_data, footer]

  ###
  Post assets to a conversation.

  @deprecated
  @param conversation_id [String] ID of the self conversation
  @param json_payload [Object] First part of the multipart message
  @param image_data [Uint8Array|ArrayBuffer] encrypted image data
  @param force_sending [Boolean] Force sending
  @param upload_id [String] Identifies the upload request
  ###
  post_asset_v2: (conversation_id, json_payload, image_data, force_sending, upload_id) ->
    return new Promise (resolve, reject) =>
      url = @client.create_url "/conversations/#{conversation_id}/otr/assets"
      url = "#{url}?ignore_missing=true" if force_sending

      image_data = new Uint8Array image_data
      data = @_create_asset_multipart_body image_data, json_payload
      pending_uploads = @pending_uploads

      xhr = new XMLHttpRequest()
      xhr.open 'POST', url
      xhr.setRequestHeader 'Content-Type', 'multipart/mixed; boundary=' + @BOUNDARY
      xhr.setRequestHeader 'Authorization', "#{@client.access_token_type} #{@client.access_token}"
      xhr.onload = (event) ->
        if @status is 201
          resolve [JSON.parse(@response), @getResponseHeader 'Location']
        else if @status is 412
          reject JSON.parse @response
        else
          reject event
        delete pending_uploads[upload_id]
      xhr.onerror = (error) ->
        reject error
        delete pending_uploads[upload_id]
      xhr.upload.onprogress = (event) ->
        if upload_id
          # we use amplify due to the fact that Promise API lacks progress support
          percentage_progress = Math.round(event.loaded / event.total * 100)
          amplify.publish 'upload' + upload_id, percentage_progress
      xhr.send data

      pending_uploads[upload_id] = xhr

  ###
  Post assets using asset api v3.

  @param asset_data [Uint8Array|ArrayBuffer]
  @param metadata [Object]
  @option public [Boolean] Default is false
  @option retention [z.assets.AssetRetentionPolicy] Default is z.assets.AssetRetentionPolicy.PERSISTENT
  @param xhr_accessor_function [Function] Function will get a reference to the underlying XMLHTTPRequest
  ###
  post_asset_v3: (asset_data, metadata, xhr_accessor_function) ->
    return new Promise (resolve, reject) =>
      metadata = $.extend
        public: false
        retention: z.assets.AssetRetentionPolicy.PERSISTENT
      , metadata

      xhr = new XMLHttpRequest()
      xhr.open 'POST', @client.create_url '/assets/v3'
      xhr.setRequestHeader 'Content-Type', 'multipart/mixed; boundary=' + @BOUNDARY
      xhr.setRequestHeader 'Authorization', "#{@client.access_token_type} #{@client.access_token}"
      xhr.onload = (event) -> if @status is 201 then resolve JSON.parse(@response) else reject event
      xhr.onerror = reject
      xhr_accessor_function? xhr
      xhr.send @_create_asset_multipart_body new Uint8Array(asset_data), metadata

  ###
  Cancel an asset upload.

  @param upload_id [String] Identifies the upload request
  ###
  cancel_asset_upload: (upload_id) =>
    xhr = @pending_uploads[upload_id]
    if xhr?
      xhr.abort()
      delete @pending_uploads[upload_id]

  ###
  Create image proto message.
  @param image [File, Blob]
  ###
  create_image_proto: (image) ->
    original_image = null
    compressed_image = null
    image_bytes = null

    z.util.load_file_buffer image
    .then (buffer) ->
      image_bytes = new Uint8Array buffer
      return new z.util.load_image image
    .then (image) ->
      original_image = compressed_image = image
      return z.assets.AssetCrypto.encrypt_aes_asset image_bytes
    .then ([key_bytes, sha256, ciphertext]) ->
      image_asset = new z.proto.ImageAsset()
      image_asset.set_tag z.assets.ImageSizeType.MEDIUM
      image_asset.set_width compressed_image.width
      image_asset.set_height compressed_image.height
      image_asset.set_original_width original_image.width
      image_asset.set_original_height original_image.height
      image_asset.set_mime_type image.type
      image_asset.set_size image_bytes.length
      image_asset.set_otr_key key_bytes
      image_asset.set_sha256 sha256
      return [image_asset, new Uint8Array ciphertext]

  ###
  Create asset proto message.
  @param asset [File, Blob]
  ###
  create_asset_proto: (asset) ->
    z.util.load_file_buffer asset
    .then (file_bytes) ->
      return z.assets.AssetCrypto.encrypt_aes_asset file_bytes
    .then ([key_bytes, sha256, ciphertext]) ->
      asset = new z.proto.Asset()
      asset.set 'uploaded', new z.proto.Asset.RemoteData key_bytes, sha256
      return [asset, ciphertext]
