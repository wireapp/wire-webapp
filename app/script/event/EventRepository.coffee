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
z.event ?= {}

EVENT_CONFIG =
  E_CALL_EVENT_LIFETIME: 30 * 1000 # 30 seconds

# Event repository to handle all backend event channels.
class z.event.EventRepository
  @::NOTIFICATION_SOURCE =
    INJECTION: 'Injection'
    STREAM: 'Notification Stream'
    WEB_SOCKET: 'WebSocket'


  ###
  Construct a new Event Repository.
  @param web_socket_service [z.event.WebSocketService] WebSocket service
  @param notification_service [z.event.NotificationService] Service handling the notification stream
  @param cryptography_repository [z.cryptography.CryptographyRepository] Repository for all cryptography interactions
  @param user_repository [z.user.UserRepository] Repository for all user and connection interactions
  ###
  constructor: (@web_socket_service, @notification_service, @cryptography_repository, @user_repository) ->
    @logger = new z.util.Logger 'z.event.EventRepository', z.config.LOGGER.OPTIONS

    @current_client = undefined

    @notification_handling_state = ko.observable z.event.NotificationHandlingState.STREAM
    @notification_handling_state.subscribe (handling_state) =>
      amplify.publish z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE, handling_state

      if handling_state is z.event.NotificationHandlingState.WEB_SOCKET
        @_handle_buffered_notifications()
        if @previous_handling_state is z.event.NotificationHandlingState.RECOVERY
          amplify.publish z.event.WebApp.WARNING.DISMISS, z.ViewModel.WarningType.CONNECTIVITY_RECOVERY
      @previous_handling_state = handling_state

    @previous_handling_state = @notification_handling_state()

    @notifications_handled = 0
    @notifications_loaded = ko.observable false
    @notifications_promises = []
    @notifications_total = 0
    @notifications_queue = ko.observableArray []
    @notifications_blocked = false

    @notifications_queue.subscribe (notifications) =>
      if notifications.length
        return if @notifications_blocked

        notification = @notifications_queue()[0]
        @notifications_blocked = true
        @_handle_notification notification
        .catch (error) =>
          @logger.warn "We failed to handle a notification but will continue with queue: #{error.message}", error
        .then =>
          @notifications_blocked = false
          @notifications_queue.shift()
          @notifications_handled++

          if @notifications_handled % 5 is 0
            replace = [@notifications_handled, @notifications_total]
            amplify.publish z.event.WebApp.APP.UPDATE_INIT, z.string.init_events_progress, false, replace

      else if @notifications_loaded() and @notification_handling_state() isnt z.event.NotificationHandlingState.WEB_SOCKET
        @logger.info "Done handling '#{@notifications_total}' notifications from the stream"
        @notification_handling_state z.event.NotificationHandlingState.WEB_SOCKET
        @_find_ongoing_calls()
        @notifications_loaded false
        @notifications_promises[0] @last_notification_id()

    @web_socket_buffer = []

    @last_notification_id = ko.observable undefined

    amplify.subscribe z.event.WebApp.CONNECTION.ONLINE, @recover_from_notification_stream
    amplify.subscribe z.event.WebApp.EVENT.INJECT, @inject_event


  ###############################################################################
  # WebSocket handling
  ###############################################################################

  # Initiate the WebSocket connection.
  connect_web_socket: =>
    if not @current_client().id
      throw new z.event.EventError z.event.EventError::TYPE.NO_CLIENT_ID

    @web_socket_service.client_id = @current_client().id
    @web_socket_service.connect (notification) =>
      if @notification_handling_state() is z.event.NotificationHandlingState.WEB_SOCKET
        @notifications_queue.push notification
      else
        @_buffer_web_socket_notification notification

  ###
  Close the WebSocket connection.
  @param trigger [z.event.WebSocketService::CHANGE_TRIGGER] Trigger of the disconnect
  ###
  disconnect_web_socket: (trigger) =>
    @web_socket_service.reset trigger

  ###
  Re-connect the WebSocket connection.
  @param trigger [z.event.WebSocketService::CHANGE_TRIGGER] Trigger of the reconnect
  ###
  reconnect_web_socket: (trigger) =>
    @notification_handling_state z.event.NotificationHandlingState.RECOVERY
    @web_socket_service.reconnect trigger

  ###
  Buffer an incoming notification.
  @param notification [Object] Notification data
  ###
  _buffer_web_socket_notification: (notification) =>
    @web_socket_buffer.push notification

  # Handle buffered notifications.
  _handle_buffered_notifications: =>
    @logger.info "Received '#{@web_socket_buffer.length}' notifications via WebSocket while handling stream"
    if @web_socket_buffer.length
      z.util.ko_array_push_all @notifications_queue, @web_socket_buffer
      @web_socket_buffer.length = 0


  ###############################################################################
  # Notification Stream handling
  ###############################################################################

  ###
  Get notifications for the current client from the stream.
  @param notification_id [String] Event ID to start from
  @return [Promise] Promise that resolves when all new notifications from the stream have been handled
  ###
  get_notifications: (notification_id, limit = 10000) ->
    return new Promise (resolve, reject) =>
      _got_notifications = (response) =>
        if response.notifications.length > 0
          notification_id = response.notifications[response.notifications.length - 1].id

          notifications = (notification for notification in response.notifications)
          @logger.info "Added '#{notifications.length}' notifications to the queue"
          z.util.ko_array_push_all @notifications_queue, notifications

          if @notifications_promises.length is 0
            @notifications_promises = [resolve, reject]

          @notifications_total += notifications.length

          if response.has_more
            @get_notifications notification_id, 5000
          else
            @notifications_loaded true
            @logger.info "Fetched '#{@notifications_total}' notifications from the backend"
            amplify.publish z.event.WebApp.APP.UPDATE_INIT, z.string.init_events_expectation, true, [@notifications_total]

        else
          @logger.info "No notifications found since '#{notification_id}'", response
          reject new z.event.EventError z.event.EventError::TYPE.NO_NOTIFICATIONS

      @notification_service.get_notifications @current_client().id, notification_id, limit
      .then (response) -> _got_notifications response
      .catch (error_response) =>
        # When asking for notifications with a since set to a notification ID that does not belong to our client ID,
        #   we will get a 404 AND notifications
        if error_response.notifications
          _got_notifications error_response
        else if error_response.code is z.service.BackendClientError::STATUS_CODE.NOT_FOUND
          @logger.info "No notifications found since '#{notification_id}'", error_response
          reject new z.event.EventError z.event.EventError::TYPE.NO_NOTIFICATIONS
        else
          @logger.error "Failed to get notifications: #{error_response.message}", error_response
          reject new z.event.EventError z.event.EventError::TYPE.REQUEST_FAILURE

  ###
  Get the last notification.
  @return [Promise] Promise that resolves with the last handled notification ID
  ###
  get_last_notification_id_from_db: =>
    @notification_service.get_last_notification_id_from_db()
    .then (last_notification_id) =>
      @last_notification_id last_notification_id
      return @last_notification_id()

  ###
  Get the last notification ID for a given client.
  @return [Promise] Promise that resolves with the last known notification ID matching a client
  ###
  initialize_last_notification_id: =>
    @notification_service.get_notifications_last @current_client?().id
    .then (response) =>
      @_update_last_notification_id response.id
      @logger.info "Set starting point on notification stream to '#{@last_notification_id()}'"

  # Initialize from notification stream.
  initialize_from_notification_stream: =>
    @get_last_notification_id_from_db()
    .then (last_notification_id) =>
      @_update_from_notification_stream last_notification_id
    .catch (error) =>
      @notification_handling_state z.event.NotificationHandlingState.WEB_SOCKET
      if error.type is z.event.EventError::TYPE.NO_LAST_ID
        @logger.info 'No notifications found for this user', error
        return 0

  # Retrieve missed notifications from the stream after a connectivity loss.
  recover_from_notification_stream: =>
    @notification_handling_state z.event.NotificationHandlingState.RECOVERY
    amplify.publish z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.CONNECTIVITY_RECOVERY
    @_update_from_notification_stream @_get_last_known_notification_id()
    .then (number_of_notifications) =>
      @notification_handling_state z.event.NotificationHandlingState.WEB_SOCKET if number_of_notifications is 0
      @logger.info "Retrieved '#{number_of_notifications}' notifications from stream after connectivity loss"
    .catch (error) =>
      if error.type isnt z.event.EventError::TYPE.NO_NOTIFICATIONS
        @logger.error "Failed to recover from notification stream: #{error.message}", error
        @notification_handling_state z.event.NotificationHandlingState.WEB_SOCKET
        # @todo What do we do in this case?
        amplify.publish z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.CONNECTIVITY_RECONNECT

  ###
  Method to return an array of Conversation IDs which have a certain active conversation type.

  Example:
  If the notifications for a conversation are for example "call.on", "call.off" and "call.on" then the call is active
  because the last event which was seen was a "call.on". But if it would be "call.off" then the conversation would not
  be marked as active and it's ID would not be returned.

  @param include_on [Array<String>] List of event types to look for
  @param exclude_on [Array<String>] Remove activate state on these events
  ###
  get_conversation_ids_with_active_events: (include_on, exclude_on) =>
    return new Promise (resolve, reject) =>
      @cryptography_repository.storage_repository.load_events_by_types _.flatten [include_on, exclude_on]
      .then (events) ->
        filtered_conversations = {}

        for event in events
          conversation_id = event.conversation
          if event.type in include_on
            filtered_conversations[conversation_id] = null
          else if event.type in exclude_on
            delete filtered_conversations[conversation_id]
        resolve Object.keys filtered_conversations
      .catch (error) =>
        @logger.error "Something failed: #{error?.message}", error
        reject error

  ###
  Check for conversations with ongoing calls.
  @private
  @return [Promise] Promise that resolves when conversation that could contain a call have been identified
  ###
  _find_ongoing_calls: ->
    @logger.info 'Checking for ongoing calls'
    @get_conversation_ids_with_active_events [z.event.Backend.CONVERSATION.VOICE_CHANNEL_ACTIVATE], [z.event.Backend.CONVERSATION.VOICE_CHANNEL_DEACTIVATE]
    .then (response) =>
      @logger.info "Identified '#{response.length}' conversations that possibly have an ongoing call", response
      amplify.publish z.event.WebApp.CALL.STATE.CHECK, conversation_id for conversation_id in response
    .catch (error) =>
      @logger.error 'Could not check for active calls', error

  ###
  Get the ID of the last known notification.
  @note Notifications that have not yet been handled but are in the queue should not be fetched again on recovery
  @private
  @return [String] ID of last known notification
  ###
  _get_last_known_notification_id: ->
    if @notifications_queue().length
      return @notifications_queue()[@notifications_queue().length - 1].id
    return @last_notification_id()

  ###
  Fetch all missed events from the notification stream since the given last notification ID.
  @private
  @return [Promise] Promise that resolves with the total number of notifications
  ###
  _update_from_notification_stream: (last_notification_id) ->
    @notifications_total = 0
    return @get_notifications last_notification_id, 500
    .then (last_notification_id) =>
      if last_notification_id
        @logger.info "ID of last notification fetched from stream is '#{last_notification_id}'"
      return @notifications_total
    .catch (error) =>
      @notification_handling_state z.event.NotificationHandlingState.WEB_SOCKET
      if error.type is z.event.EventError::TYPE.NO_NOTIFICATIONS
        @_find_ongoing_calls()
        @logger.info 'No notifications found for this user', error
        return 0
      @logger.error "Failed to handle notification stream: #{error.message}", error
      throw error

  _update_last_notification_id: (last_notification_id) ->
    return if not last_notification_id

    @last_notification_id last_notification_id
    @notification_service.save_last_notification_id_to_db last_notification_id


  ###############################################################################
  # Notification/Event handling
  ###############################################################################

  ###
  Inject event into a conversation.
  @note Don't add unable to decrypt to self conversation
  @param event [Object] Event payload to be injected
  ###
  inject_event: (event) =>
    if event.conversation isnt @user_repository.self().id
      @logger.info "Injected event ID '#{event.id}' of type '#{event.type}'", event
      @_handle_event event, @NOTIFICATION_SOURCE.INJECTION

  ###
  Publish the given event.
  @param event [Object] Mapped event
  ###
  _distribute_event: (event) ->
    if event.conversation
      @logger.info "Distributed '#{event.type}' event for conversation '#{event.conversation}'", event
    else
      @logger.info "Distributed '#{event.type}' event", event

    switch event.type.split('.')[0]
      when 'call'
        amplify.publish z.event.WebApp.CALL.EVENT_FROM_BACKEND, event
      when 'conversation'
        amplify.publish z.event.WebApp.CONVERSATION.EVENT_FROM_BACKEND, event
      else
        amplify.publish event.type, event

  ###
  Handle a single event from the notification stream or WebSocket.
  @param event [JSON] Backend event extracted from notification stream
  @return [Promise] Resolves with the saved record or boolean true if the event was skipped
  ###
  _handle_event: (event) ->
    if event.type in z.event.EventTypeHandling.IGNORE
      @logger.info "Event ignored: '#{event.type}'", {event_object: event, event_json: JSON.stringify event}
      return Promise.resolve true

    Promise.resolve()
    .then =>
      if event.type in z.event.EventTypeHandling.DECRYPT
        return @cryptography_repository.decrypt_event event
        .then (generic_message) =>
          @cryptography_repository.cryptography_mapper.map_generic_message generic_message, event
      return event
    .then (mapped_event) =>
      if mapped_event.type in z.event.EventTypeHandling.STORE
        return @cryptography_repository.save_unencrypted_event mapped_event
      return mapped_event
    .then (saved_event) =>
      @_validate_call_event_lifetime event if event.type is z.event.Client.CALL.E_CALL
      @_distribute_event saved_event
      return saved_event
    .catch (error) ->
      ignored_errors = [
        z.cryptography.CryptographyError::TYPE.IGNORED_ASSET
        z.cryptography.CryptographyError::TYPE.IGNORED_PREVIEW
        z.cryptography.CryptographyError::TYPE.PREVIOUSLY_STORED
        z.cryptography.CryptographyError::TYPE.UNHANDLED_TYPE
        z.event.EventError::TYPE.OUTDATED_E_CALL_EVENT
      ]
      throw error unless error.type in ignored_errors

  ###
  Handle all events from the payload of an incoming notification.
  @param event [Object] Event data
  @return [String] ID of the handled notification
  ###
  _handle_notification: (notification) =>
    return new Promise (resolve, reject) =>
      events = notification.payload
      source = switch @notification_handling_state()
        when z.event.NotificationHandlingState.WEB_SOCKET
          @NOTIFICATION_SOURCE.WEB_SOCKET
        else
          @NOTIFICATION_SOURCE.STREAM

      @logger.info "Handling notification '#{notification.id}' from '#{source}' containing '#{events.length}' events", notification

      if events.length is 0
        @logger.warn 'Notification payload does not contain any events'
        @_update_last_notification_id notification.id
        resolve @last_notification_id()
      else
        Promise.all (@_handle_event event for event in events)
        .then =>
          @_update_last_notification_id notification.id
          resolve @last_notification_id()
        .catch (error) =>
          @logger.error "Failed to handle notification '#{notification.id}' from '#{source}': #{error.message}", error
          reject error

    ###
    Check if call event is handled within its valid lifespan.
    @todo Includes correction of time for possible local clock drift.
    @return [Boolean] Returns true if event is handled within is lifetime, otherwise throws error
    ###
    _validate_call_event_lifetime: (event) ->
      return true if @notification_handling_state() is z.event.NotificationHandlingState.WEB_SOCKET
      return true if event.content.type is z.calling.enum.E_CALL_MESSAGE_TYPE.CANCEL

      current_timestamp = Date.now()
      event_timestamp = new Date(event.time).getTime()
      if Date.now() > EVENT_CONFIG.E_CALL_EVENT_LIFETIME + event_timestamp
        @logger.info "Ignored outdated '#{event.type}' event in conversation '#{event.conversation}' - Event: '#{event_timestamp}', Now: '#{current_timestamp}'", {event_object: event, event_json: JSON.stringify event}
        throw new z.event.EventError z.event.EventError::TYPE.OUTDATED_E_CALL_EVENT
      return true
