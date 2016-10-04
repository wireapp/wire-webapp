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
z.cryptography ?= {}

# Cryptography Mapper to convert all server side JSON encrypted events into core entities
class z.cryptography.CryptographyMapper
  # Construct a new Cryptography Mapper.
  constructor: ->
    @logger = new z.util.Logger 'z.cryptography.CryptographyMapper', z.config.LOGGER.OPTIONS

  ###
  OTR to JSON mapper.
  @param generic_message [z.proto.GenericMessage] Received ProtoBuffer message
  @param event [z.event.Backend.CONVERSATION.OTR-ASSET-ADD, z.event.Backend.CONVERSATION.OTR-MESSAGE-ADD] Event
  @return [Object] Promise that resolves with the mapped event
  ###
  map_generic_message: (generic_message, event) =>
    Promise.resolve()
    .then =>
      if not generic_message
        throw new z.cryptography.CryptographyError z.cryptography.CryptographyError::TYPE.NO_GENERIC_MESSAGE
      return @_map_generic_message generic_message, event
    .then (specific_content) ->
      return $.extend
        conversation: event.conversation
        id: generic_message.message_id
        from: event.from
        time: event.time
        status: event.status
      , specific_content

  _map_generic_message: (generic_message, event) =>
    switch generic_message.content
      when 'asset'
        return @_map_asset generic_message.asset, generic_message.message_id, event.data?.id
      when 'cleared'
        return @_map_cleared generic_message.cleared
      when 'confirmation'
        return @_map_confirmation generic_message.confirmation
      when 'deleted'
        return @_map_deleted generic_message.deleted
      when 'edited'
        return @_map_edited generic_message.edited, generic_message.message_id
      when 'external'
        return @_map_external generic_message.external, event
      when 'hidden'
        return @_map_hidden generic_message.hidden
      when 'image'
        return @_map_image generic_message.image, event.data.id
      when 'knock'
        return @_map_knock generic_message.knock, generic_message.message_id
      when 'lastRead'
        return @_map_last_read generic_message.lastRead
      when 'location'
        return @_map_location generic_message.location, generic_message.message_id
      when 'reaction'
        return @_map_reaction generic_message.reaction
      when 'text'
        return @_map_text generic_message.text, generic_message.message_id
      else
        @logger.log @logger.levels.WARN, "Skipped event '#{generic_message.message_id}' of unhandled type '#{generic_message.content}'"
        throw new z.cryptography.CryptographyError z.cryptography.CryptographyError::TYPE.UNHANDLED_TYPE

  _map_asset: (asset, event_nonce, event_id) ->
    if asset.uploaded?
      return @_map_asset_uploaded asset.uploaded, event_id
    else if asset.not_uploaded?
      return @_map_asset_not_uploaded asset.not_uploaded
    else if asset.preview?
      return @_map_asset_preview asset.preview, event_id
    else if asset.original?
      return @_map_asset_original asset.original, event_nonce
    else
      error = new z.cryptography.CryptographyError z.cryptography.CryptographyError::TYPE.IGNORED_ASSET
      @logger.log @logger.levels.INFO, error.message
      throw error

  _map_asset_meta_data: (original) ->
    if original.audio?
      return {
        duration: original.audio.duration_in_millis.toNumber() / 1000
        loudness: new Uint8Array(original.audio.normalized_loudness?.toArrayBuffer() or [])
      }

  _map_asset_not_uploaded: (not_uploaded) ->
    return {
      data:
        reason: not_uploaded
      type: z.event.Client.CONVERSATION.ASSET_UPLOAD_FAILED
    }

  _map_asset_original: (original, event_nonce) ->
    return {
      data:
        content_length: original.size.toNumber()
        content_type: original.mime_type
        info:
          name: original.name
          nonce: event_nonce
        meta: @_map_asset_meta_data(original)
      type: z.event.Client.CONVERSATION.ASSET_META
    }

  _map_asset_preview: (preview, event_id) ->
    return {
      data:
        id: event_id
        otr_key: new Uint8Array preview.remote.otr_key?.toArrayBuffer()
        sha256: new Uint8Array preview.remote.sha256?.toArrayBuffer()
      type: z.event.Client.CONVERSATION.ASSET_PREVIEW
    }

  _map_asset_uploaded: (uploaded, event_id) ->
    return {
      data:
        id: event_id
        otr_key: new Uint8Array uploaded.otr_key?.toArrayBuffer()
        sha256: new Uint8Array uploaded.sha256?.toArrayBuffer()
      type: z.event.Client.CONVERSATION.ASSET_UPLOAD_COMPLETE
    }

  _map_cleared: (cleared) ->
    return {
      conversation: cleared.conversation_id
      data:
        cleared_timestamp: cleared.cleared_timestamp.toString()
      type: z.event.Backend.CONVERSATION.MEMBER_UPDATE
    }

  _map_confirmation: (confirmation) ->
    return {
      data:
        message_id: confirmation.message_id
        status: switch confirmation.type
          when z.proto.Confirmation.Type.DELIVERED
            z.message.StatusType.DELIVERED
          when z.proto.Confirmation.Type.READ
            z.message.StatusType.SEEN
      type: z.event.Client.CONVERSATION.CONFIRMATION
    }

  _map_deleted: (deleted) ->
    return {
      data:
        message_id: deleted.message_id
      type: z.event.Client.CONVERSATION.MESSAGE_DELETE
    }

  _map_edited: (edited, event_id) ->
    mapped = @_map_text edited.text, event_id
    mapped.data.replacing_message_id = edited.replacing_message_id
    return mapped

  ###
  Unpacks a specific generic message which is wrapped inside an external generic message.

  @note Wrapped messages get the 'message_id' of their wrappers (external message)
  @param external [z.proto.GenericMessage] Generic message of type 'external'
  @param event [JSON] Backend event of type 'conversation.otr-message-add'
  ###
  _map_external: (external, event) ->
    data =
      text: z.util.base64_to_array event.data.data
      otr_key: new Uint8Array external.otr_key.toArrayBuffer()
      sha256: new Uint8Array external.sha256.toArrayBuffer()

    z.assets.AssetCrypto.decrypt_aes_asset data.text.buffer, data.otr_key.buffer, data.sha256.buffer
    .then (external_message_buffer) ->
      return z.proto.GenericMessage.decode external_message_buffer
    .then (generic_message) =>
      @logger.log @logger.levels.INFO, "Received external message of type '#{generic_message.content}'", generic_message
      return @_map_generic_message generic_message, event
    .catch (error) ->
      @logger.log @logger.levels.ERROR, "Failed to map external message: #{error.message}", error
      throw new z.cryptography.CryptographyError z.cryptography.CryptographyError::TYPE.BROKEN_EXTERNAL

  _map_hidden: (hidden) ->
    return {
      data:
        conversation_id: hidden.conversation_id
        message_id: hidden.message_id
      type: z.event.Client.CONVERSATION.MESSAGE_HIDDEN
    }

  _map_image: (image, event_id) ->
    if image.tag is 'medium'
      return @_map_image_medium image, event_id
    else
      error = new z.cryptography.CryptographyError z.cryptography.CryptographyError::TYPE.IGNORED_PREVIEW
      @logger.log @logger.levels.INFO, error.message
      throw error

  _map_image_medium: (image, event_id = z.util.create_random_uuid()) ->
    return {
      data:
        content_length: image.size
        content_type: image.mime_type
        id: event_id
        info:
          tag: image.tag
          width: image.width
          height: image.height
          nonce: event_id or z.util.create_random_uuid() # set nonce even if asset id is missing
          original_width: image.original_width
          original_height: image.original_height
          public: false
        otr_key: new Uint8Array image.otr_key?.toArrayBuffer()
        sha256: new Uint8Array image.sha256?.toArrayBuffer()
      type: z.event.Backend.CONVERSATION.ASSET_ADD
    }

  _map_knock: (knock, event_id) ->
    if knock.hot_knock
      error = new z.cryptography.CryptographyError z.cryptography.CryptographyError::TYPE.IGNORED_HOT_KNOCK
      @logger.log @logger.levels.INFO, error.message
      throw error
    else
      return {
        data:
          nonce: event_id
        type: z.event.Backend.CONVERSATION.KNOCK
      }

  _map_last_read: (last_read) ->
    return {
      conversation: last_read.conversation_id
      data:
        last_read_timestamp: last_read.last_read_timestamp.toString()
      type: z.event.Backend.CONVERSATION.MEMBER_UPDATE
    }

  _map_location: (location, event_id) ->
    return {
      data:
        location:
          longitude: location.longitude
          latitude: location.latitude
          name: location.name
          zoom: location.zoom
        nonce: event_id
      type: z.event.Client.CONVERSATION.LOCATION
    }

  _map_reaction: (reaction) ->
    return {
      data:
        message_id: reaction.message_id
        reaction: reaction.emoji
      type: z.event.Client.CONVERSATION.REACTION
    }

  _map_text: (text, event_id) ->
    return {
      data:
        content: "#{text.content}"
        nonce: event_id
        previews: text.link_preview.map (preview) -> preview.encode64()
      type: z.event.Backend.CONVERSATION.MESSAGE_ADD
    }
