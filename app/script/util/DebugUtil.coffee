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

  _get_conversation_by_id: (conversation_id) ->
    return new Promise (resolve) =>
      @conversation_repository.get_conversation_by_id conversation_id, (conversation_et) ->
        resolve conversation_et

  _get_user_by_id: (user_id) ->
    return new Promise (resolve) =>
      @user_repository.get_user_by_id user_id, (user_et) -> resolve user_et

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

  get_number_of_clients_in_conversation: ->
    user_ets = @conversation_repository.active_conversation().participating_user_ets()

    other_clients = user_ets
    .map (user_et) -> user_et.devices().length
    .reduce (previous, current) -> previous + current

    my_clients = @user_repository.self().devices().length

    return other_clients + my_clients

  get_event_info: (event) ->
    debug_information =
      event: event

    return new Promise (resolve) =>
      @_get_conversation_by_id event.conversation
      .then (conversation_et) =>
        debug_information.conversation = conversation_et
        return @_get_user_by_id event.from
      .then (user_et) =>
        debug_information.user = user_et
        log_message = "Hey #{@user_repository.self().name()}, this is for you:"
        @logger.warn log_message, debug_information
        @logger.warn "Conversation: #{debug_information.conversation.name()}", debug_information.conversation
        @logger.warn "From: #{debug_information.user.name()}", debug_information.user
        resolve debug_information

  log_connection_status: ->
    @logger.log 'Online Status'
    @logger.log "-- Browser online: #{window.navigator.onLine}"
    @logger.log "-- IndexedDB open: #{wire.app.repository.storage.storage_service.db.isOpen()}"
    @logger.log "-- WebSocket ready state: #{window.wire.app.service.web_socket.socket.readyState}"
