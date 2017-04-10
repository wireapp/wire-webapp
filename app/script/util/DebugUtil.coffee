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
z.util ?= {}

class z.util.DebugUtil
  constructor: (@user_repository, @conversation_repository) ->
    @logger = new z.util.Logger 'z.util.DebugUtil', z.config.LOGGER.OPTIONS

  block_all_connections: ->
    block_users = []
    wire.app.repository.user.users().forEach (user_et) =>
      block_users.push @user_repository.block_user user_et
    return Promise.all block_users

  break_session: (user_id, client_id) ->
    session_id = "#{user_id}@#{client_id}"
    wire.app.repository.cryptography.cryptobox.session_load session_id
    .then (cryptobox_session) ->
      cryptobox_session.session.session_states = {}

      record =
        created: Date.now()
        id: session_id
        serialised: cryptobox_session.session.serialise()
        version: 'broken_by_qa'

      return wire.app.repository.storage.storage_service.save z.storage.StorageService::OBJECT_STORE_SESSIONS, session_id, record
    .then (session_id) =>
      @logger.log "Corrupted Session ID '#{session_id}'"

  get_number_of_clients_in_conversation: =>
    user_ets = @conversation_repository.active_conversation().participating_user_ets()

    other_clients = user_ets
    .map (user_et) -> user_et.devices().length
    .reduce (previous, current) -> previous + current

    my_clients = @user_repository.self().devices().length

    return other_clients + my_clients

  get_event_info: (event) =>
    debug_information =
      event: event

    @conversation_repository.get_conversation_by_id_async event.conversation
    .then (conversation_et) =>
      debug_information.conversation = conversation_et
      return @user_repository.get_user_by_id event.from
    .then (user_et) =>
      debug_information.user = user_et
      log_message = "Hey #{@user_repository.self().name()}, this is for you:"
      @logger.warn log_message, debug_information
      @logger.warn "Conversation: #{debug_information.conversation.name()}", debug_information.conversation
      @logger.warn "From: #{debug_information.user.name()}", debug_information.user
      return debug_information

  get_serialised_session: (session_id) ->
    wire.app.repository.storage.storage_service.load 'sessions', session_id
    .then (record) ->
      base64_encoded_payload = z.util.array_to_base64 record.serialised
      record.serialised = base64_encoded_payload
      return record

  get_serialised_identity: ->
    wire.app.repository.storage.storage_service.load 'keys', 'local_identity'
    .then (record) ->
      base64_encoded_payload = z.util.array_to_base64 record.serialised
      record.serialised = base64_encoded_payload
      return record

  get_notification_from_stream: (notification_id, notification_id_since) =>
    client_id = wire.app.repository.client.current_client().id

    _got_notifications = ({has_more, notifications}) =>
      matching_notifications = notifications.filter (notification) ->
        return notification.id is notification_id
      return matching_notifications[0] if matching_notifications.length

      if has_more
        last_notification = notifications[notifications.length - 1]
        @get_notification_from_stream notification_id, last_notification.id
      else
        @logger.log "Notification '#{notification_id}' was not found in encrypted notification stream"

    wire.app.service.notification.get_notifications client_id, notification_id_since, 10000
    .then _got_notifications

  get_notifications_from_stream: (remote_user_id, remote_client_id, matching_notifications = [], notification_id_since) =>
    local_client_id = wire.app.repository.client.current_client().id
    local_user_id = wire.app.repository.user.self().id

    _got_notifications = ({has_more, notifications}) =>
      additional_notifications = notifications.filter (notification) ->
        {payload} = notification
        for {data, from} in payload when data and from in [local_user_id, remote_user_id]
          {sender, recipient} = data
          incoming_event = sender is remote_client_id and recipient is local_client_id
          outgoing_event = sender is local_client_id and recipient is remote_client_id
          return incoming_event or outgoing_event
        return false

      matching_notifications = matching_notifications.concat additional_notifications
      if has_more
        last_notification = notifications[notifications.length - 1]
        return @get_notifications_from_stream remote_user_id, remote_client_id, matching_notifications, last_notification.id
      @logger.log "Found '#{matching_notifications.length}' notification between '#{local_client_id}' and '#{remote_client_id}'", matching_notifications
      return matching_notifications

    client_scope = if remote_user_id is local_user_id then undefined else local_client_id
    wire.app.service.notification.get_notifications client_scope, notification_id_since, 10000
    .then _got_notifications

  get_objects_for_decryption_errors: (session_id, notification_id) ->
    return Promise.all [
      @get_notification_from_stream notification_id
      @get_serialised_identity()
      @get_serialised_session session_id
    ]
    .then (resolve_array) ->
      return JSON.stringify
        notification: resolve_array[0]
        identity: resolve_array[1]
        session: resolve_array[2]

  get_info_for_client_decryption_errors: (remote_user_id, remote_client_id) ->
    return Promise.all [
      @get_notifications_from_stream remote_user_id, remote_client_id
      @get_serialised_identity()
      @get_serialised_session "#{remote_user_id}@#{remote_client_id}"
    ]
    .then (resolve_array) ->
      return JSON.stringify
        notifications: resolve_array[0]
        identity: resolve_array[1]
        session: resolve_array[2]

  get_v2_call_participants: (conversation_id = wire.app.repository.conversation.active_conversation().id) =>
    wire.app.service.call.get_state conversation_id
    .then (response) =>
      participants = []
      for id, participant of response.participants when participant.state is z.calling.enum.ParticipantState.JOINED
        participants.push wire.app.repository.user.get_user_by_id id

      @logger.debug "Call in '#{conversation_id}' has '#{participants.length}' joined participant/s", participants
      for participant in participants
        @logger.log "User '#{participant.name()}' with ID '#{participant.id}' is joined"

  log_connection_status: ->
    @logger.log 'Online Status'
    @logger.log "-- Browser online: #{window.navigator.onLine}"
    @logger.log "-- IndexedDB open: #{wire.app.repository.storage.storage_service.db.isOpen()}"
    @logger.log "-- WebSocket ready state: #{window.wire.app.service.web_socket.socket.readyState}"
