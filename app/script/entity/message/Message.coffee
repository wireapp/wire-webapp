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

# Base message entity.
class z.entity.Message
  ###
  Sort messages by timestamp
  @return [Boolean] Is message of type system
  ###
  @sort_by_timestamp: (message_ets) ->
    message_ets.sort (m1, m2) -> m1.timestamp > m2.timestamp

  # Construct a new base message entity.
  constructor: (id = '0', super_type = '') ->
    @from = ''
    @id = id
    @primary_key = undefined
    @super_type = super_type
    @timestamp = Date.now()
    @type = ''
    @user = ko.observable new z.entity.User()
    @visible = ko.observable true
    @is_editing = ko.observable false
    @status = ko.observable z.message.StatusType.UNSPECIFIED

    @display_timestamp_short = =>
      date = moment.unix @timestamp / 1000
      return date.local().format 'HH:mm'

    @sender_name = ko.pureComputed =>
      z.util.get_first_name @user()
    , @, deferEvaluation: true

    @accent_color = ko.pureComputed =>
      return "accent-color-#{@user().accent_id()}"
    , @, deferEvaluation: true

  ###
  Check if message contains an asset of type file.
  @return [Boolean] Message contains any file type asset
  ###
  has_asset: ->
    if @is_content()
      return true for asset_et in @assets() when asset_et.type is z.assets.AssetType.FILE
    return false

  ###
  Check if message contains a file asset.
  @return [Boolean] Message contains a file
  ###
  has_asset_file: ->
    if @is_content()
      return true for asset_et in @assets() when asset_et.is_file()
    return false

  ###
  Check if message contains any image asset.
  @return [Boolean] Message contains any image
  ###
  has_asset_image: ->
    if @is_content()
      return true for asset_et in @assets() when asset_et.is_medium_image() or asset_et.is_preview_image()
    return false

  ###
  Check if message contains a location asset.
  @return [Boolean] Message contains a location
  ###
  has_asset_location: ->
    if @is_content()
      return true for asset_et in @assets() when asset_et.is_location()
    return false

  ###
  Check if message contains a medium image asset.
  @return [Boolean] Message contains a medium image
  ###
  has_asset_medium_image: ->
    if @is_content()
      return true for asset_et in @assets() when asset_et.is_medium_image()
    return false

  ###
  Check if message contains a preview image asset.
  @return [Boolean] Message contains a preview image
  ###
  has_asset_preview_image: ->
    if @is_content()
      return true for asset_et in @assets() when asset_et.is_preview_image()
    return false

  ###
  Check if message contains a text asset.
  @return [Boolean] Message contains text
  ###
  has_asset_text: ->
    if @is_content()
      return true for asset_et in @assets() when asset_et.is_text()
    return false

  ###
  Check if message contains a nonce.
  @return [Boolean] Message contains a nonce
  ###
  has_nonce: ->
    return @super_type in [z.message.SuperType.CONTENT]

  ###
  Check if message is a call message.
  @return [Boolean] Is message of type call
  ###
  is_call: ->
    return @super_type is z.message.SuperType.CALL

  ###
  Check if message is a content message.
  @return [Boolean] Is message of type content
  ###
  is_content: ->
    return @super_type is z.message.SuperType.CONTENT

  ###
  Check if message is a member message.
  @return [Boolean] Is message of type member
  ###
  is_member: ->
    return @super_type is z.message.SuperType.MEMBER

  ###
  Check if message is a ping message.
  @return [Boolean] Is message of type ping
  ###
  is_ping: ->
    return @super_type is z.message.SuperType.PING

  ###
  Check if message is a system message.
  @return [Boolean] Is message of type system
  ###
  is_system: ->
    return @super_type is z.message.SuperType.SYSTEM

  ###
  Check if message is a e2ee message.
  @return [Boolean] Is message of type system
  ###
  is_device: ->
    return @super_type is z.message.SuperType.DEVICE

  ###
  Check if message is a e2ee message.
  @return [Boolean] Is message of type system
  ###
  is_all_verified: ->
    return @super_type is z.message.SuperType.ALL_VERIFIED

  ###
  Check if message is a e2ee message.
  @return [Boolean] Is message of type system
  ###
  is_unable_to_decrypt: ->
    return @super_type is z.message.SuperType.UNABLE_TO_DECRYPT

  ###
  Check if message can be deleted.
  @return [Boolean]
  ###
  is_deletable: ->
    return true if @is_ping() or not @has_asset()
    return @get_first_asset().status() not in [z.assets.AssetTransferState.DOWNLOADING, z.assets.AssetTransferState.UPLOADING]

  ###
  Check if message can be edited.
  @return [Boolean]
  ###
  is_editable: ->
    return @has_asset_text() and @user().is_me

  ###
  Check if message can be reacted to.
  @return [Boolean]
  ###
  is_reactable: ->
    return @is_content()

  ###
  Update the status of a message.
  @param update_status [z.message.StatusType] New status of message
  ###
  update_status: (updated_status) ->
    if @status() >= z.message.StatusType.SENT
      if updated_status > @status()
        return @status updated_status
    else if @status() isnt updated_status
      return @status updated_status
    return false
