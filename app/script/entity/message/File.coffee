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
z.entity ?= {}

# Medium image asset entity.
class z.entity.File extends z.entity.Asset
  ###
  Construct a new medium image asset.

  @param id [String] Asset ID
  ###
  constructor: (id) ->
    super id
    @type = z.assets.AssetType.FILE
    @logger = new z.util.Logger 'z.entity.File', z.config.LOGGER.OPTIONS

    # z.assets.AssetTransferState
    @status = ko.observable()

    # contains asset meta data as object
    @meta = {}

    # asset url, instance of an otr asset this has to be decrypted
    @original_resource  = ko.observable()
    @preview_resource = ko.observable()

    @download_progress = ko.pureComputed => @original_resource()?.download_progress()

    @upload_id = ko.observable()
    @upload_progress = ko.observable()
    @uploaded_on_this_client = ko.observable false
    @upload_failed_reason = ko.observable()
    @pending_upload = ko.pureComputed =>
      return @status() is z.assets.AssetTransferState.UPLOADING and @uploaded_on_this_client()

    # update progress
    @upload_id.subscribe (id) =>
      amplify.subscribe 'upload' + id, @on_progress if id

    @status.subscribe (status) =>
      if status is z.assets.AssetTransferState.UPLOADED
        amplify.unsubscribe 'upload' + @upload_id, @on_progress

  on_progress: (progress) =>
    @upload_progress progress

  ###
  Loads and decrypts otr asset preview

  @return [Promise] Returns a promise that resolves with the asset as blob
  ###
  load_preview: =>
    @preview_resource()?.load()

  ###
  Loads and decrypts otr asset

  @return [Promise] Returns a promise that resolves with the asset as blob
  ###
  load: =>
    @status z.assets.AssetTransferState.DOWNLOADING
    @original_resource()?.load()
    .then (blob) =>
      @status z.assets.AssetTransferState.UPLOADED
      return blob
    .catch (error) =>
      @status z.assets.AssetTransferState.UPLOADED
      throw error

  ###
  Loads and decrypts otr asset as initiates download

  @return [Promise] Returns a promise that resolves with the asset as blob
  ###
  download: =>
    return if @status() isnt z.assets.AssetTransferState.UPLOADED

    download_started = Date.now()
    tracking_data =
      size_bytes: @file_size
      size_mb: z.util.bucket_values (@file_size / 1024 / 1024), [0, 5, 10, 15, 20, 25]
      type: z.util.get_file_extension @file_name
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.FILE.DOWNLOAD_INITIATED, tracking_data

    @load()
    .then (blob) =>
      return z.util.download_blob blob, @file_name
    .then =>
      download_duration = (Date.now() - download_started) / 1000
      @logger.info "Downloaded asset in #{download_duration} seconds"
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.FILE.DOWNLOAD_SUCCESSFUL,
        $.extend tracking_data, {time: download_duration}
    .catch (error) =>
      @logger.error 'Failed to download asset', error
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.FILE.DOWNLOAD_FAILED, tracking_data

  cancel_download: =>
    @status z.assets.AssetTransferState.UPLOADED
    @original_resource()?.cancel_download()

  cancel: (message_et) =>
    amplify.publish z.event.WebApp.CONVERSATION.ASSET.CANCEL, message_et

    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.FILE.UPLOAD_CANCELLED,
      size_bytes: @file_size
      size_mb: z.util.bucket_values (@file_size / 1024 / 1024), [0, 5, 10, 15, 20, 25]
      type: z.util.get_file_extension @file_name

  reload: =>
    @logger.info 'Restart upload'
