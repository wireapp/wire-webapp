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

  @param events [Object] Event data
  @param conversation_et [z.entity.Conversation] Conversation entity the events belong to

  @return [Array<z.entity.Message>] Mapped message entities
  ###
  map_json_events: (events, conversation_et, should_create_dummy_image) ->
    events = (@map_json_event event, conversation_et, should_create_dummy_image for event in events.reverse() when event isnt undefined)
    return events.filter (x) -> x isnt undefined

  map_json_event: (event, conversation_et, should_create_dummy_image) =>
    try
      return @_map_json_event event, conversation_et, should_create_dummy_image
    catch error
      @logger.error "Failed to map event: #{error.message}", {error: error, event: event}
      return undefined

  ###
  Convert JSON event into a message entity.

  @param event [Object] Event data
  @param conversation_et [z.entity.Conversation] Conversation entity the events belong to

  @return [z.entity.Message] Mapped message entity
  ###
  _map_json_event: (event, conversation_et, should_create_dummy_image) ->
    switch event.type
      when z.event.Backend.CONVERSATION.ASSET_ADD
        message_et = @_map_event_asset_add event, should_create_dummy_image
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
      when z.event.Client.CONVERSATION.MISSED_MESSAGES
        message_et = @_map_system_missed_messages event
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
      when z.event.Client.CONVERSATION.VERIFICATION
        message_et = @_map_verification event
      when z.event.Client.CONVERSATION.UNABLE_TO_DECRYPT
        message_et = @_map_system_event_unable_to_decrypt event
      else
        message_et = @_map_event_ignored()

    message_et.category = event.category
    message_et.conversation_id = conversation_et.id
    message_et.from = event.from
    message_et.id = event.id
    message_et.primary_key = event.primary_key
    message_et.timestamp new Date(event.time).getTime()
    message_et.type = event.type
    message_et.version = event.version or 1

    if message_et.is_reactable()
      message_et.reactions event.reactions or {}
      message_et.status event.status if event.status

    # todo Remove deprecated expire_after_millis with subsequent release
    if event.ephemeral_expires or event.expire_after_millis
      message_et.ephemeral_expires event.ephemeral_expires or event.expire_after_millis
      message_et.ephemeral_started event.ephemeral_started or '0'

    if window.isNaN message_et.timestamp()
      @logger.warn "Could not get timestamp for message '#{message_et.id}'. Skipping it.", event
      message_et = undefined

    return message_et

  ###############################################################################
  # Event mappers
  ###############################################################################

  ###
  Maps JSON data of conversation.verification message into message entity

  @private

  @param event [Object] Message data

  @return [z.entity.VerificationMessage] Normal message entity
  ###
  _map_verification: (event) ->
    message_et = new z.entity.VerificationMessage()
    message_et.user_ids event.data.user_ids
    message_et.verification_message_type = event.data.type
    return message_et

  ###
  Maps JSON data of conversation.asset_add message into message entity

  @private

  @param event [Object] Message data

  @return [z.entity.NormalMessage] Normal message entity
  ###
  _map_event_asset_add: (event, should_create_dummy_image) ->
    message_et = new z.entity.ContentMessage()
    if event.data?.info.tag is z.assets.ImageSizeType.MEDIUM
      message_et.assets.push @_map_asset_medium_image event, should_create_dummy_image
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
    message_et.call_message_type = z.message.CALL_MESSAGE_TYPE.ACTIVATED
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
    message_et.call_message_type = z.message.CALL_MESSAGE_TYPE.DEACTIVATED
    message_et.finished_reason = event.data.reason
    message_et.visible message_et.finished_reason is z.calling.enum.TERMINATION_REASON.MISSED
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
    asset_et.nonce = data.nonce
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
  _map_link_preview: (link_preview) ->
    return if not link_preview?

    link_preview_et = new z.entity.LinkPreview()
    link_preview_et.title = link_preview.title or link_preview.article.title
    link_preview_et.summary = link_preview.summary or link_preview.article.summary
    link_preview_et.permanent_url = link_preview.permanent_url or link_preview.article.permanent_url
    link_preview_et.original_url = link_preview.url
    link_preview_et.url_offset = link_preview.url_offset
    link_preview_et.meta_data_type = link_preview.meta_data
    link_preview_et.meta_data = link_preview[link_preview.meta_data]

    image = link_preview.image or link_preview.article.image

    if image?
      {asset_token, asset_id, otr_key, sha256} = image.uploaded
      otr_key = new Uint8Array otr_key.toArrayBuffer()
      sha256 = new Uint8Array sha256.toArrayBuffer()
      link_preview_et.image_resource z.assets.AssetRemoteData.v3 asset_id, otr_key, sha256, asset_token, true

    return link_preview_et

  ###
  Maps JSON data of medium image asset into asset entity

  @private

  @param data [Object] Asset data received as JSON

  @return [z.entity.MediumImage] Medium image asset entity
  ###
  _map_asset_medium_image: (event, should_create_dummy_image) ->
    asset_et = new z.entity.MediumImage event.data.id
    asset_et.file_size = event.data.content_length
    asset_et.file_type = event.data.content_type
    asset_et.width = event.data.info.width
    asset_et.height = event.data.info.height
    asset_et.ratio = asset_et.height / asset_et.width
    if event.data.key
      asset_et.resource z.assets.AssetRemoteData.v3 event.data.key, event.data.otr_key, event.data.sha256, event.data.token, true
    else
      asset_et.resource z.assets.AssetRemoteData.v2 event.conversation, asset_et.id, event.data.otr_key, event.data.sha256, true
    if should_create_dummy_image
      asset_et.dummy_url = z.util.dummy_image asset_et.width, asset_et.height
    return asset_et

  ###
  Maps JSON data of file asset into asset entity

  @private

  @param data [Object] Asset data received as JSON

  @return [z.entity.MediumImage] File asset entity
  ###
  _map_asset_file: (event) ->
    asset_et = new z.entity.File event.data.id
    asset_et.correlation_id = event.data.info.correlation_id
    asset_et.conversation_id = event.conversation

    # original
    asset_et.file_size = event.data.content_length
    asset_et.file_type = event.data.content_type
    asset_et.file_name = event.data.info.name
    asset_et.meta = event.data.meta

    # remote data - full
    if event.data.key
      {key, otr_key, sha256, token} = event.data
      asset_et.original_resource z.assets.AssetRemoteData.v3 key, otr_key, sha256, token
    else
      asset_et.original_resource z.assets.AssetRemoteData.v2 asset_et.conversation_id, asset_et.id, event.data.otr_key, event.data.sha256,

    # remote data - preview
    if event.data.preview_otr_key?
      if event.data.preview_key
        {preview_key, preview_otr_key, preview_sha256, preview_token} = event.data
        asset_et.preview_resource z.assets.AssetRemoteData.v3 preview_key, preview_otr_key, preview_sha256, preview_token, true
      else
        asset_et.preview_resource z.assets.AssetRemoteData.v2 asset_et.conversation_id, event.data.preview_id, event.data.preview_otr_key, event.data.preview_sha256, true

    asset_et.status event.data.status or z.assets.AssetTransferState.UPLOADING # TODO
    return asset_et

  ###
  Maps JSON data of local decrypt errors to message entity

  @private

  @param data [Object] Error data received as JSON

  @return [z.entity.MediumImage] Medium image asset entity
  ###
  _map_system_event_unable_to_decrypt: (event) ->
    message_et = new z.entity.DecryptErrorMessage()
    if event.error_code
      message_et.error_code = event.error_code.split(' ')[0]
      message_et.client_id = event.error_code.substring(message_et.error_code.length + 1).replace(/[()]/g, '')
    return message_et

  ###
  Maps JSON data of local missed message event to message entity

  @private

  @return [z.entity.MissedMessage] Missed message entity
  ###
  _map_system_missed_messages: ->
    return new z.entity.MissedMessage()

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
