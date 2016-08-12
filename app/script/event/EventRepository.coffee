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

# Event repository to handle all backend event channels.
class z.event.EventRepository
  @::NOTIFICATION_SOURCE =
    INJECTION: 'Injection'
    SOCKET: 'WebSocket'
    STREAM: 'Notification Stream'


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

    @notifications_handled = 0
    @notifications_loaded = ko.observable false
    @notifications_promises = []
    @notifications_total = 0
    @notifications_queue = ko.observableArray []
    @notifications_blocked = false

    @notifications_queue.subscribe (notifications) =>
      if notifications.length > 0
        return if @notifications_blocked

        notification = @notifications_queue()[0]
        @notifications_blocked = true
        @_handle_notification notification
        .catch (error) =>
          @logger.log @logger.levels.WARN, 'We failed to handle a notification but will continue with queue', error
        .then =>
          @notifications_blocked = false
          @notifications_queue.shift()
          @notifications_handled++

          if @notifications_handled % 5 is 0
            replace = [@notifications_handled, @notifications_total]
            amplify.publish z.event.WebApp.APP.UPDATE_INIT, z.string.init_events_progress, false, replace

      else if @notifications_loaded() and not @can_handle_web_socket()
        @logger.log @logger.levels.INFO, "Done handling '#{@notifications_total}' notifications from the stream"
        if @is_recovering()
          @is_recovering false
        else
          amplify.publish z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE, false
        @find_ongoing_calls()
        @can_handle_web_socket true
        @notifications_loaded false
        @notifications_promises[0] @last_notification_id()

    @web_socket_buffer = []
    @can_handle_web_socket = ko.observable false
    @can_handle_web_socket.subscribe (was_handled) =>
      @_handle_buffered_notifications() if was_handled

    @last_notification_id = ko.observable undefined
    @last_notification_id.subscribe (last_notification_id) =>
      @logger.log @logger.levels.INFO, "Last notification ID updated to '#{last_notification_id}'"
      @notification_service.save_last_notification_id_to_db last_notification_id if last_notification_id

    @is_recovering = ko.observable false
    @is_recovering.subscribe (is_recovering) =>
      if is_recovering
        amplify.publish z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE, true
        @can_handle_web_socket false
        amplify.publish z.event.WebApp.WARNINGS.SHOW, z.ViewModel.WarningType.CONNECTIVITY_RECOVERY
      else
        amplify.publish z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE, false
        @can_handle_web_socket true
        amplify.publish z.event.WebApp.WARNINGS.DISMISS, z.ViewModel.WarningType.CONNECTIVITY_RECOVERY

    amplify.subscribe z.event.WebApp.CONNECTION.RECONNECT, @reconnect
    amplify.subscribe z.event.WebApp.CONNECTION.ONLINE, @recover_from_notification_stream
    amplify.subscribe z.event.WebApp.EVENT.INJECT, @inject_event


  ###############################################################################
  # WebSocket handling
  ###############################################################################

  # Initiate the WebSocket connection.
  connect: =>
    if not @current_client().id
      throw new z.event.EventError 'Missing client id', z.event.EventError::TYPE.MISSING_CLIENT_ID

    @web_socket_service.client_id = @current_client().id
    @web_socket_service.connect (notification) =>
      if @can_handle_web_socket()
        @notifications_queue.push notification
      else
        @_buffer_web_socket_notification notification

  ###
  Close the WebSocket connection.
  @param trigger [z.event.WebSocketService::CHANGE_TRIGGER] Trigger of the disconnect
  ###
  disconnect: (trigger) =>
    @web_socket_service.reset trigger

  ###
  Re-connect the WebSocket connection.
  @param trigger [z.event.WebSocketService::CHANGE_TRIGGER] Trigger of the disconnect
  ###
  reconnect: (trigger) =>
    @can_handle_web_socket false
    @web_socket_service.reconnect trigger

  ###
  Buffer an incoming notification.
  @param notification [Object] Notification data
  ###
  _buffer_web_socket_notification: (notification) =>
    @web_socket_buffer.push notification

  # Handle buffered notifications.
  _handle_buffered_notifications: =>
    @logger.log @logger.levels.INFO, "Received '#{@web_socket_buffer.length}' notifications via WebSocket while recovering from stream"
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
  get_notifications: (last_notification_id, limit = 10000) ->
    return new Promise (resolve, reject) =>
      _got_notifications = (response) =>
        if response.notifications.length > 0
          last_notification_id = response.notifications[response.notifications.length - 1].id

          notifications = (notification for notification in response.notifications)
          @logger.log @logger.levels.INFO, "Added '#{notifications.length}' notifications to the queue"
          z.util.ko_array_push_all @notifications_queue, notifications

          if @notifications_promises.length is 0
            @notifications_promises = [resolve, reject]

          @notifications_total += notifications.length

          if response.has_more
            @get_notifications last_notification_id, 5000
          else
            @notifications_loaded true
            @logger.log @logger.levels.INFO, "Fetched '#{@notifications_total}' notifications from the backend"
            amplify.publish z.event.WebApp.APP.UPDATE_INIT, z.string.init_events_expectation, true, [@notifications_total]

        else
          error_message = "No notifications found since '#{last_notification_id}'"
          @logger.log @logger.levels.INFO, error_message, response
          reject new z.event.EventError error_message, z.event.EventError::TYPE.NO_NOTIFICATIONS

      @notification_service.get_notifications @current_client().id, last_notification_id, limit
      .then (response) -> _got_notifications response
      .catch (response) =>
        # When asking for notifications with a since set to a notification ID that does not belong to our client ID,
        #   we will get a 404 AND notifications
        if response.notifications
          _got_notifications response
        else if error.code is z.service.BackendClientError::STATUS_CODE.NOT_FOUND
          error_message = "No notifications found since '#{last_notification_id}'"
          @logger.log @logger.levels.INFO, error_message, response
          reject new z.event.EventError error_message, z.event.EventError::TYPE.NO_NOTIFICATIONS
        else
          error_message = "Failed to get notifications: #{error.message}"
          @logger.log @logger.levels.ERROR, error_message, error
          reject new z.event.EventError error_message, z.event.EventError::TYPE.REQUEST_FAILURE

  ###
  Get the last notification ID for a given client.
  @note This API endpoint is currently broken on the backend
  @return [Promise] Promise that resolves with the last known notification ID matching a client
  ###
  get_last_notification_id: ->
    return new Promise (resolve, reject) =>
      @notification_service.get_notifications_last @current_client?().id
      .then (response) ->
        resolve response.id
      .catch reject
  ###
  Will retrieve missed notifications from the stream after a connectivity loss.
  ###
  recover_from_notification_stream: =>
    @is_recovering true
    @update_from_notification_stream()
    .then (number_of_notifications) =>
      @is_recovering false if number_of_notifications is 0
      @logger.log @logger.levels.INFO, "Retrieved '#{number_of_notifications}' notifications from stream after connectivity loss"
    .catch (error) =>
      if error.type isnt z.event.EventError::TYPE.NO_NOTIFICATIONS
        @logger.log @logger.levels.ERROR, "Failed to recover from notification stream: #{error.message}", error
        @is_recovering false
        # @todo What do we do in this case?
        amplify.publish z.event.WebApp.WARNINGS.SHOW, z.ViewModel.WarningType.CONNECTIVITY_RECONNECT

  ###
  Fetch all missed events from the notification stream since the last ID stored in database.
  @return [Promise] Promise that resolves with the total number of notifications
  ###
  update_from_notification_stream: =>
    return new Promise (resolve, reject) =>
      @notification_service.get_last_notification_id_from_db()
      .then (last_notification_id) =>
        @last_notification_id last_notification_id
        @notifications_total = 0
        return @get_notifications @last_notification_id(), 500
      .then (last_notification_id) =>
        if last_notification_id
          @logger.log @logger.levels.INFO, "ID of last notification fetched from stream is '#{last_notification_id}'"
        resolve @notifications_total
      .catch (error) =>
        @can_handle_web_socket true
        if error.type in [z.event.EventError::TYPE.NO_NOTIFICATIONS, z.event.EventError::TYPE.DATABASE_NOT_FOUND]
          amplify.publish z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE, false
          @find_ongoing_calls()
          @logger.log @logger.levels.INFO, 'No notifications found for this user', error
          resolve 0
        else
          @logger.log @logger.levels.ERROR, "Failed to handle notification stream: #{error.message}", error
          reject error

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
      .then (records) ->
        raw_events = (record.raw for record in records)

        filtered_conversations = {}

        for event in raw_events
          conversation_id = event.conversation
          if event.type in include_on
            filtered_conversations[conversation_id] = null
          else if event.type in exclude_on
            delete filtered_conversations[conversation_id]
        resolve Object.keys filtered_conversations
      .catch (error) =>
        @logger.log @logger.levels.ERROR, "Something failed: #{error?.message}", error
        reject error

  ###
  Check for conversations with ongoing calls.
  @return [Promise] Promise that resolves when conversation that could contain a call have been identified
  ###
  find_ongoing_calls: =>
    @logger.log @logger.levels.INFO, 'Checking for ongoing calls'
    @get_conversation_ids_with_active_events [z.event.Backend.CONVERSATION.VOICE_CHANNEL_ACTIVATE], [z.event.Backend.CONVERSATION.VOICE_CHANNEL_DEACTIVATE]
    .then (response) =>
      @logger.log @logger.levels.INFO, "Identified '#{response.length}' conversations that possibly have an ongoing call", response
      amplify.publish z.event.WebApp.CALL.STATE.CHECK, conversation_id for conversation_id in response
    .catch (error) =>
      @logger.log @logger.levels.ERROR, 'Could not check for active calls', error


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
      @logger.log "Injected event ID '#{event.id}' of type '#{event.type}'", event
      @_handle_event event, @NOTIFICATION_SOURCE.INJECTION

  ###
  Publish the given event.
  @param event [Object] Mapped event
  ###
  _distribute_event: (event) ->
    switch event.type.split('.')[0]
      when 'call'
        amplify.publish z.event.WebApp.CALL.EVENT_FROM_BACKEND, event
      when 'conversation'
        amplify.publish z.event.WebApp.CONVERSATION.EVENT_FROM_BACKEND, event
      else
        amplify.publish event.type, event

    if event.conversation
      @logger.log @logger.levels.INFO, "Distributed '#{event.type}' event for conversation '#{event.conversation}'", event
    else
      @logger.log @logger.levels.INFO, "Distributed '#{event.type}' event", event

  ###
  Handle a single event from the notification stream or WebSocket.
  @param event [JSON] Backend event extracted from notification stream
  @return [Promise] Resolves with the saved record or boolean true if the event was skipped
  ###
  _handle_event: (event, source) ->
    return new Promise (resolve, reject) =>
      sending_client = event.data?.sender
      if sending_client
        log_message = "Received encrypted event '#{event.type}' from client '#{sending_client}' of user '#{event.from}'"
      else if event.from
        log_message = "Received plain event '#{event.id}' of type '#{event.type}' from client '#{sending_client}' of user '#{event.from}'"
        if event.type in [
          z.event.Backend.CONVERSATION.ASSET_ADD
          z.event.Backend.CONVERSATION.KNOCK
          z.event.Backend.CONVERSATION.MESSAGE_ADD
        ]
          throw new z.event.EventError z.event.EventError::TYPE.OUTDATED_SCHEMA
      else
        log_message = "Received call event '#{event.type}' in conversation '#{event.conversation}'"
      @logger.log @logger.levels.INFO, log_message, {event_object: event, event_json: JSON.stringify event}

      if event.type in z.event.EventTypeHandling.IGNORE
        @logger.log "Event ignored: '#{event.type}'", {event_object: event, event_json: JSON.stringify event}
        return resolve true
      else if event.type in z.event.EventTypeHandling.DECRYPT
        promise = @cryptography_repository.decrypt_event(event).then (generic_message) =>
          @cryptography_repository.save_encrypted_event generic_message, event
      else if event.type in z.event.EventTypeHandling.STORE
        promise = @cryptography_repository.save_unencrypted_event event
      else
        promise = Promise.resolve {raw: event}

      promise.then (record) =>
        if record and (source is @NOTIFICATION_SOURCE.SOCKET or @is_recovering or record.raw.type.startsWith 'conversation')
          @_distribute_event record.mapped or record.raw
        resolve record
      .catch (error) =>
        if error.type is z.cryptography.CryptographyError::TYPE.PREVIOUSLY_STORED
          resolve true
        else
          @logger.log @logger.levels.ERROR,
            "Failed to handle '#{event.type}' event '#{event.id or 'no ID'}' from '#{source}': '#{error.message}'", event
          reject error

  ###
  Handle all events from the payload of an incoming notification.
  @param event [Object] Event data
  @return [String] ID of the handled notification
  ###
  _handle_notification: (notification) =>
    return new Promise (resolve, reject) =>
      events = notification.payload
      source = if @can_handle_web_socket() then @NOTIFICATION_SOURCE.SOCKET else @NOTIFICATION_SOURCE.STREAM

      @logger.log @logger.levels.INFO,
        "Handling notification '#{notification.id}' from '#{source}' containing '#{events.length}' events", notification

      if events.length is 0
        @logger.log @logger.levels.WARN, 'Notification payload does not contain any events'
        @last_notification_id notification.id
        resolve @last_notification_id()
      else
        proceed = =>
          @last_notification_id notification.id
          resolve @last_notification_id()

        Promise.all (@_handle_event event, source for event in events)
        .then ->
          proceed()
        .catch (error) =>
          if error.message is z.event.EventError::TYPE.OUTDATED_SCHEMA
            @logger.log @logger.levels.WARN, "Ignored notification '#{notification.id}' from '#{source}': #{error.message}", error
            proceed()
          else
            @logger.log @logger.levels.ERROR, "Failed to handle notification '#{notification.id}' from '#{source}': #{error.message}", error
            reject error
