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
z.conversation ?= {}

# Event Mapper to convert all server side JSON events into core entities.
class z.conversation.EventMapper
  ###
  Construct a new Event Mapper.

  @param asset_service [z.assets.AssetService] Asset handling service
  ###
  constructor: (@asset_service) ->
    @logger = new z.util.Logger 'z.conversation.EventMapper', z.config.LOGGER.OPTIONS

  ###
  Convert multiple JSON events into message entities.

  @param json [Object] Event data
  @param conversation_et [z.entity.Conversation] Conversation entity the events belong to

  @return [Array<z.entity.Message>] Mapped message entities
  ###
  map_json_events: (json, conversation_et) ->
    events = (@map_json_event event, conversation_et for event in json.events.reverse() when event isnt undefined)
    return events.filter (x) -> x isnt undefined

  map_json_event: (event, conversation_et) =>
    try
      return @_map_json_event event, conversation_et
    catch error
      @logger.log @logger.levels.ERROR, "Failed to map event: #{error.message}", {error: error, event: event}
      return undefined

  ###
  Convert JSON event into a message entity.

  @param event [Object] Event data
  @param conversation_et [z.entity.Conversation] Conversation entity the events belong to

  @return [z.entity.Message] Mapped message entity
  ###
  _map_json_event: (event, conversation_et) ->
    switch event.type
      when z.event.Backend.CONVERSATION.ASSET_ADD
        message_et = @_map_event_asset_add event
      when z.event.Backend.CONVERSATION.KNOCK
        message_et = @_map_event_ping event
      when z.event.Backend.CONVERSATION.MESSAGE_ADD
        message_et = @_map_event_message_add event
      when z.event.Backend.CONVERSATION.MEMBER_JOIN
        message_et = @_map_event_member_join event, conversation_et
      when z.event.Backend.CONVERSATION.MEMBER_LEAVE
        message_et = @_map_event_member_leave event
      when z.event.Backend.CONVERSATION.MEMBER_UPDATE
        message_et = @_map_event_member_update event
      when z.event.Backend.CONVERSATION.RENAME
        message_et = @_map_event_rename event
      when z.event.Backend.CONVERSATION.VOICE_CHANNEL_ACTIVATE
        message_et = @_map_event_voice_channel_activate()
      when z.event.Backend.CONVERSATION.VOICE_CHANNEL_DEACTIVATE
        message_et = @_map_event_voice_channel_deactivate event
      when z.event.Client.CONVERSATION.ASSET_META
        message_et = @_map_event_asset_meta event
      when z.event.Client.CONVERSATION.DELETE_EVERYWHERE
        message_et = @_map_system_event_delete_everywhere event
      when z.event.Client.CONVERSATION.LOCATION
        message_et = @_map_event_location event
      when z.event.Client.CONVERSATION.UNABLE_TO_DECRYPT
        message_et = @_map_system_event_unable_to_decrypt event
      else
        message_et = @_map_event_ignored()

    message_et.id = event.id
    message_et.from = event.from
    message_et.timestamp = new Date(event.time).getTime()
    message_et.primary_key = z.storage.StorageService.construct_primary_key event
    message_et.type = event.type

    if message_et.is_reactable()
      message_et.reactions event.reactions or {}

    if window.isNaN message_et.timestamp
      @logger.log @logger.levels.WARN, "Could not get timestamp for message '#{message_et.id}'. Skipping it.", event
      message_et = undefined

    return message_et

  ###############################################################################
  # Event mappers
  ###############################################################################

  ###
  Maps JSON data of conversation.asset_add message into message entity

  @private

  @param event [Object] Message data

  @return [z.entity.NormalMessage] Normal message entity
  ###
  _map_event_asset_add: (event) ->
    message_et = new z.entity.ContentMessage()
    if event.data?.info.tag is z.assets.ImageSizeType.PREVIEW
      message_et.assets.push @_map_asset_preview_image event.data
    if event.data?.info.tag is z.assets.ImageSizeType.MEDIUM
      message_et.assets.push @_map_asset_medium_image event
    message_et.nonce = event.data.info.nonce
    return message_et

  ###
  Maps JSON data of conversation.asset_add message into message entity

  @private

  @param event [Object] Message data

  @return [z.entity.NormalMessage] Normal message entity
  ###
  _map_event_asset_meta: (event) ->
    message_et = new z.entity.ContentMessage()
    message_et.assets.push @_map_asset_file event
    message_et.nonce = event.data.info.nonce
    return message_et

  ###
  Maps JSON data of conversation.connect_request message into message entity

  @private

  @param event [Object] Message data received as JSON

  @return [z.entity.NormalMessage] Normal message entity
  ###
  _map_event_connect_request: (event) ->
    message_et = new z.entity.ContentMessage()
    asset_et = @_map_asset_text event.data
    message_et.visible false if not asset_et.text
    message_et.assets.push asset_et
    return message_et

  ###
  Maps JSON data of other message types currently ignored into message entity

  @private

  @return [z.entity.SpecialMessage] Special message entity
  ###
  _map_event_ignored: ->
    message_et = new z.entity.SystemMessage()
    message_et.visible false
    return message_et

  ###
  Maps JSON data of conversation.member_join message into message entity

  @private

  @param event [Object] Message data received as JSON
  @param conversation_et [z.entity.conversation] Conversation entity the event belongs to

  @return [z.entity.MemberMessage] Member message entity
  ###
  _map_event_member_join: (event, conversation_et) ->
    message_et = new z.entity.MemberMessage()
    if conversation_et.type() in [z.conversation.ConversationType.CONNECT, z.conversation.ConversationType.ONE2ONE]
      if event.from is conversation_et.creator and event.data.user_ids.length is 1
        message_et.member_message_type = z.message.SystemMessageType.CONNECTION_ACCEPTED
        event.data.user_ids = conversation_et.participating_user_ids()
      else
        message_et.visible false
    else
      creator_index = event.data.user_ids.indexOf event.from
      if event.from is conversation_et.creator and creator_index isnt -1
        event.data.user_ids.splice creator_index, 1
        message_et.member_message_type = z.message.SystemMessageType.CONVERSATION_CREATE

    message_et.user_ids event.data.user_ids

    return message_et

  ###
  Maps JSON data of conversation.member_join message into message entity

  @private

  @return [z.entity.MemberMessage] Member message entity
  ###
  _map_event_member_leave: (event) ->
    message_et = new z.entity.MemberMessage()
    message_et.user_ids event.data.user_ids
    return message_et

  ###
  Maps JSON data of conversation.member_update message into message entity

  @private

  @return [z.entity.MemberMessage] Member message entity
  ###
  _map_event_member_update: (event) ->
    message_et = new z.entity.MemberMessage()
    # don't render last read
    message_et.visible not event.data.last_read_timestamp
    return message_et

  ###
  Maps JSON data of conversation.message_add message into message entity

  @private

  @param event [Object] Message data received as JSON

  @return [z.entity.NormalMessage] Normal message entity
  ###
  _map_event_message_add: (event) ->
    message_et = new z.entity.ContentMessage()
    message_et.assets.push @_map_asset_text event.data
    message_et.nonce = event.data.nonce
    message_et.replacing_message_id = event.data.replacing_message_id
    message_et.edited_timestamp = new Date(event.edited_time or event.data.edited_time).getTime()
    return message_et

  ###
  Maps JSON data of conversation.knock message into message entity

  @private

  @param event [Object] Message data received as JSON

  @return [z.entity.PingMessage] Ping message entity
  ###
  _map_event_ping: (event) ->
    message_et = new z.entity.PingMessage()
    message_et.nonce = event.data.nonce
    return message_et

  ###
  Maps JSON data of conversation.location message into message entity

  @private

  @param event [Object] Message data received as JSON

  @return [z.entity.LocationMessage] Location message entity
  ###
  _map_event_location: (event) ->
    message_et = new z.entity.ContentMessage()
    asset_et = new z.entity.Location()
    asset_et.longitude = event.data.location.longitude
    asset_et.latitude = event.data.location.latitude
    asset_et.name = event.data.location.name
    asset_et.zoom = event.data.location.zoom
    message_et.assets.push asset_et
    message_et.nonce = event.data.nonce
    return message_et

  ###
  Maps JSON data of conversation.rename message into message entity

  @private

  @param event [Object] Message data received as JSON

  @return [z.entity.RenameMessage] Rename message entity
  ###
  _map_event_rename: (event) ->
    message_et = new z.entity.RenameMessage()
    message_et.name = event.data.name
    return message_et

  ###
  Maps JSON data of conversation.voice-channel-activate message into message entity

  @private

  @param event [Object] Message data received as JSON

  @return [z.entity.CallMessage] Call message entity
  ###
  _map_event_voice_channel_activate: ->
    message_et = new z.entity.CallMessage()
    message_et.call_message_type = z.message.CallMessageType.ACTIVATED
    message_et.visible false
    return message_et
  ###
  Maps JSON data of conversation.voice-channel-deactivate message into message entity

  @private

  @param event [Object] Message data received as JSON

  @return [z.entity.CallMessage] Call message entity
  ###
  _map_event_voice_channel_deactivate: (event) ->
    message_et = new z.entity.CallMessage()
    message_et.call_message_type = z.message.CallMessageType.DEACTIVATED
    message_et.finished_reason = event.data.reason
    message_et.visible message_et.finished_reason is z.calling.enum.CallFinishedReason.MISSED
    return message_et

  ###############################################################################
  # Asset mappers
  ###############################################################################

  ###
  Maps JSON data of text asset into asset entity

  @private

  @param data [Object] Asset data received as JSON

  @return [z.entity.Text] Text asset entity
  ###
  _map_asset_text: (data) ->
    asset_et = new z.entity.Text data.id
    asset_et.key = "text##{data.nonce}"
    asset_et.text = data.content or data.message
    asset_et.previews @_map_link_previews data.previews
    return asset_et

  ###
  Map link previews

  @private

  @param previews [Array] base64 encoded proto previews

  @return [Array<z.assets.LinkPreview>]
  ###
  _map_link_previews: (link_previews = []) ->
    return link_previews
    .map (encoded_link_preview) -> z.proto.LinkPreview.decode64 encoded_link_preview
    .map (link_preview) => @_map_link_preview link_preview
    .filter (link_preview_et) -> link_preview_et?

  ###
  Map link preview

  @private

  @param preview [z.proto.LinkPreview]

  @return [z.entity.LinkPreview]
  ###
  _map_link_preview: (link_preview = {}) ->
    switch link_preview.preview
      when 'article'
        article = link_preview.article

        link_preview_et = new z.entity.LinkPreview()
        link_preview_et.title = article.title
        link_preview_et.summary = article.summary
        link_preview_et.permanent_url = article.permanent_url
        link_preview_et.original_url = link_preview.url
        link_preview_et.url_offset = link_preview.url_offset

        if article.image?.uploaded?
          {asset_token, asset_id, otr_key, sha256} = article.image.uploaded
          otr_key = new Uint8Array otr_key.toArrayBuffer()
          sha256 = new Uint8Array sha256.toArrayBuffer()
          link_preview_et.image_resource z.assets.AssetRemoteData.v3 asset_id, otr_key, sha256, asset_token

        return link_preview_et

  ###
  Maps JSON data of preview image asset into asset entity

  @private

  @param data [Object] Asset data received as JSON

  @return [z.entity.PreviewImage] Preview image asset entity
  ###
  _map_asset_preview_image: (data) ->
    asset_et = new z.entity.PreviewImage data.id
    asset_et.correlation_id = data.info.correlation_id
    asset_et.content_type = data.content_type
    asset_et.encoded_data = data.data
    asset_et.width = data.info.original_width
    asset_et.height = data.info.original_height
    asset_et.original_width = data.info.original_width
    asset_et.original_height = data.info.original_height
    return asset_et

  ###
  Maps JSON data of medium image asset into asset entity

  @private

  @param data [Object] Asset data received as JSON

  @return [z.entity.MediumImage] Medium image asset entity
  ###
  _map_asset_medium_image: (data) ->
    asset_et = new z.entity.MediumImage data.data.id
    asset_et.correlation_id = data.data.info.correlation_id
    asset_et.width = data.data.info.width
    asset_et.height = data.data.info.height
    asset_et.original_width = data.data.info.original_width
    asset_et.original_height = data.data.info.original_height
    asset_et.ratio = asset_et.original_height / asset_et.original_width
    asset_et.resource z.assets.AssetRemoteData.v2 data.conversation, asset_et.id, data.data.otr_key, data.data.sha256
    asset_et.dummy_url = z.util.dummy_image asset_et.original_width, asset_et.original_height
    return asset_et

  ###
  Maps JSON data of file asset into asset entity

  @private

  @param data [Object] Asset data received as JSON

  @return [z.entity.MediumImage] File asset entity
  ###
  _map_asset_file: (data) ->
    asset_et = new z.entity.File data.data.id
    asset_et.correlation_id = data.data.info.correlation_id
    asset_et.conversation_id = data.conversation

    # original
    asset_et.file_size = data.data.content_length
    asset_et.file_type = data.data.content_type
    asset_et.file_name = data.data.info.name
    asset_et.meta = data.data.meta
    asset_et.original_resource z.assets.AssetRemoteData.v2 asset_et.conversation_id, asset_et.id, data.data.otr_key, data.data.sha256,
      if data.data.preview_id?
        asset_et.preview_resource z.assets.AssetRemoteData.v2 asset_et.conversation_id, data.data.preview_id, data.data.preview_otr_key, data.data.preview_sha256
    asset_et.status data.data.status or z.assets.AssetTransferState.UPLOADING # TODO
    return asset_et

  ###
  Maps JSON data of local decrypt errors to message entity

  @private

  @param data [Object] Error data received as JSON

  @return [z.entity.MediumImage] Medium image asset entity
  ###
  _map_system_event_unable_to_decrypt: (event) ->
    message_et = new z.entity.DecryptErrorMessage()
    # error_code style "3690 (f0c0272e8f053774)"
    message_et.error_code = event.error_code?.substring(0, 4)
    message_et.client_id = event.error_code?.substring(5).replace(/[()]/g, '')
    return message_et

  ###
  Maps JSON data of delete everywhere event to message entity

  @private

  @param data [Object] Error data received as JSON

  @return [z.entity.MediumImage] Medium image asset entity
  ###
  _map_system_event_delete_everywhere: (event) ->
    message_et = new z.entity.DeleteMessage()
    message_et.deleted_timestamp = new Date(event.data.deleted_time).getTime()
    return message_et
