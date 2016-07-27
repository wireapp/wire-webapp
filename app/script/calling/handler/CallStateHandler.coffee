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
z.calling ?= {}
z.calling.handler ?= {}

# Call state handler
class z.calling.handler.CallStateHandler
  ###
  Construct a new call state handler.
  @param call_center [z.calling.CallCenter] Call center with references to all other handlers
  ###
  constructor: (@call_center) ->
    @logger = new z.util.Logger 'z.calling.handler.CallStateHandler', z.config.LOGGER.OPTIONS

    @calls = ko.observableArray []
    @joined_call = ko.pureComputed => return call_et for call_et in @calls() when call_et.self_client_joined()

    @self_state = @call_center.media_stream_handler.self_stream_state

    @is_handling_notifications = ko.observable true
    @subscribe_to_events()
    return

  # Subscribe to amplify topics.
  subscribe_to_events: =>
    amplify.subscribe z.event.WebApp.CALL.STATE.CHECK, @check_state
    amplify.subscribe z.event.WebApp.CALL.STATE.DELETE, @delete_call
    amplify.subscribe z.event.WebApp.CALL.STATE.IGNORE, @ignore_call
    amplify.subscribe z.event.WebApp.CALL.STATE.JOIN, @join_call
    amplify.subscribe z.event.WebApp.CALL.STATE.LEAVE, @leave_call
    amplify.subscribe z.event.WebApp.CALL.STATE.REMOVE_PARTICIPANT, @remove_participant
    amplify.subscribe z.event.WebApp.CALL.STATE.TOGGLE, @toggle_joined
    amplify.subscribe z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE, @set_notification_handling_state

  # Un-subscribe from amplify topics.
  un_subscribe: ->
    subscriptions = [
      z.event.WebApp.CALL.STATE.CHECK
      z.event.WebApp.CALL.STATE.DELETE
      z.event.WebApp.CALL.STATE.JOIN
      z.event.WebApp.CALL.STATE.LEAVE
      z.event.WebApp.CALL.STATE.REMOVE_PARTICIPANT
      z.event.WebApp.CALL.STATE.TOGGLE
    ]
    amplify.unsubscribeAll topic for topic in subscriptions


  ###############################################################################
  # Notification stream handling
  ###############################################################################

  ###
  Check for ongoing call in conversation.
  @param conversation_id [String] Conversation ID
  ###
  check_state: (conversation_id) =>
    conversation_et = @call_center.conversation_repository.get_conversation_by_id conversation_id
    return if not conversation_et? or conversation_et.removed_from_conversation()

    @_is_call_ongoing conversation_id
    .then ([is_call_ongoing, response]) =>
      if is_call_ongoing
        @on_call_state @_fake_on_state_event(response, conversation_id), true
        @call_center.conversation_repository.unarchive_conversation conversation_et if conversation_et.is_archived()

  ###
  Set the notification handling state.
  @note Temporarily ignore call related events when handling notifications from the stream
  @param handling_notifications [Boolean] Notifications are being handled from the stream
  ###
  set_notification_handling_state: (handling_notifications) =>
    @is_handling_notifications handling_notifications
    @_update_ongoing_calls() if not @is_handling_notifications()
    @logger.log @logger.levels.INFO, "Ignoring call events: #{handling_notifications}"

  ###
  Update state of currently ongoing calls.
  @private
  ###
  _update_ongoing_calls: ->
    for call_et in @calls()
      @_is_call_ongoing call_et.id
      .then ([is_call_ongoing, response]) =>
        if not is_call_ongoing
          event = @_fake_on_state_event response, call_et.id
          @logger.log @logger.levels.DEBUG, "Call in '#{call_et.id}' ended during while connectivity was lost", event
          @on_call_state event, true


  ###############################################################################
  # Call states
  ###############################################################################

  ###
  Handling of 'call.state' events.
  @param event [Object] Event payload
  @param client_joined_change [Boolean] Client joined state change triggered by client action
  ###
  on_call_state: (event, client_joined_change = false) ->
    participant_ids = @_get_remote_participant_ids event.participants
    self_user_joined = @_is_self_user_joined event.participants
    participants_count = participant_ids.length
    joined_count = @_get_joined_count participants_count, self_user_joined

    # Update existing call
    @call_center.get_call_by_id event.conversation
    .then (call_et) =>
      if event.self? and not call_et.self_client_joined()
        if event.self.state is z.calling.enum.ParticipantState.JOINED or event.self.reason is 'ended'
          client_joined_change = true

      event = @_should_ignore_state event, call_et, client_joined_change
      return if not event

      if joined_count >= 1
        @_update_call event, participant_ids
        @_update_self call_et, self_user_joined, client_joined_change
        # ...which has ended
      else
        @delete_call call_et.id
    .catch =>
      # Call with us joined
      if self_user_joined
        # ...from this device
        if client_joined_change and participants_count is 0
          @_create_outgoing_call event
          # ...from another device
        else
          @_create_ongoing_call event, participant_ids
          # ...with other participants
      # New call we are not joined
      else if participants_count > 0
        @_create_incoming_call event, participant_ids

  ###
  Create the payload for to be set as call state.

  @private
  @param state [z.calling.enum.ParticipantState] Self participant joined state
  @return [Object] State object
  ###
  _create_state_payload: (state) ->
    if state is z.calling.enum.ParticipantState.IDLE
      self_state =
        state: z.calling.enum.ParticipantState.IDLE
        muted: false
        screen_shared: false
        videod: false
    else
      self_state =
        state: z.calling.enum.ParticipantState.JOINED
        muted: @self_state.muted()
        screen_shared: @self_state.screen_shared()
        videod: @self_state.videod()

    return self_state

  ###
  Get the call state for a conversation.
  @private
  @param conversation_id [String] Conversation ID
  ###
  _get_state: (conversation_id) ->
    if not conversation_id
      error_description = 'GETting the call state not possible without conversation ID'
      Raygun.send new Error error_description
      @logger.log @logger.levels.ERROR, error_description
      return Promise.reject new Error error_description

    @logger.log @logger.levels.INFO, "GETting call state for '#{conversation_id}'"
    @call_center.call_service.get_state conversation_id, []
    .catch (error) =>
      @logger.log @logger.levels.ERROR, "GETting call state for '#{conversation_id}' failed: #{error.message}", error
      attributes = {cause: error.label or error.name, method: 'get', request: 'state'}
      @call_center.telemetry.track_event z.tracking.EventName.CALLING.FAILED_REQUEST, undefined, attributes
      throw error
    .then (response_array) =>
      [response, jqXHR] = response_array
      @call_center.telemetry.trace_request conversation_id, jqXHR
      @logger.log @logger.levels.DEBUG, "GETting call state for '#{conversation_id}' successful", response
      return response

  ###
  Put the clients call state for a conversation.

  @private
  @param conversation_id [String] Conversation ID
  @param payload [Object] Participant payload to be set
  ###
  _put_state: (conversation_id, payload) ->
    if not conversation_id
      error_description = "PUTting the state to '#{payload.state}' not possible without conversation ID"
      @call_center.telemetry.report_error error_description
      return Promise.reject new Error error_description

    @logger.log @logger.levels.INFO,
      "PUTting the state to '#{payload.state}' in '#{conversation_id}'", payload
    @call_center.call_service.put_state conversation_id, payload, []
    .catch (error) =>
      @_put_state_failure error, conversation_id, payload
    .then (response_array) =>
      [response, jqXHR] = response_array
      @call_center.telemetry.trace_request conversation_id, jqXHR
      @logger.log @logger.levels.DEBUG,
        "PUTting the state to '#{payload.state}' in '#{conversation_id}' successful", response
      return response

  ###
  Putting the clients call state for a conversation failed.

  @note Possible errors:
    - {max_members: 25, member_count: 26, code: 409, message: "too many members for calling", label: "conv-too-big"}
    - {"max_joined":9,"code":409,"message":"the voice channel is full","label":"voice-channel-full"}
    - {"code":404,"message":"conversation not found","label":"not-found"}

  @private
  @param error [JSON] Error object from the backend
  @param conversation_id [String] Conversation ID
  @param payload [Object] Participant payload to be set
  ###
  _put_state_failure: (error, conversation_id, payload) ->
    @logger.log @logger.levels.ERROR,
      "PUTting the state to '#{payload.state}' in '#{conversation_id}' failed: #{error.message}", error
    attributes = {cause: error.label or error.name, method: 'put', request: 'state', video: payload.videod}
    @call_center.telemetry.track_event z.tracking.EventName.CALLING.FAILED_REQUEST, undefined, attributes
    @call_center.media_stream_handler.release_media_streams()
    switch error.label
      when z.service.BackendClientError::LABEL.CONVERSATION_TOO_BIG
        amplify.publish z.event.WebApp.WARNINGS.MODAL, z.ViewModel.ModalType.CALL_FULL_CONVERSATION,
          data: error.max_members
        throw new z.calling.CallError error.message, z.calling.CallError::TYPE.CONVERSATION_TOO_BIG
      when z.service.BackendClientError::LABEL.INVALID_OPERATION
        amplify.publish z.event.WebApp.WARNINGS.MODAL, z.ViewModel.ModalType.CALL_EMPTY_CONVERSATION
        @delete_call conversation_id
        throw new z.calling.CallError error.message, z.calling.CallError::TYPE.CONVERSATION_EMPTY
      when z.service.BackendClientError::LABEL.VOICE_CHANNEL_FULL
        amplify.publish z.event.WebApp.WARNINGS.MODAL, z.ViewModel.ModalType.CALL_FULL_VOICE_CHANNEL,
          data: error.max_joined
        throw new z.calling.CallError error.message, z.calling.CallError::TYPE.VOICE_CHANNEL_FULL
      # User has been removed from conversation, call should be deleted
      else
        @call_center.telemetry.report_error "PUTting the state to '#{payload.state}' failed: #{error.message}", error
        @delete_call conversation_id
        throw error

  ###
  Put the clients call state for a conversation to z.calling.enum.ParticipantState.IDLE.
  @private
  @param conversation_id [String] Conversation ID
  ###
  _put_state_to_idle: (conversation_id) ->
    @_put_state conversation_id, @_create_state_payload z.calling.enum.ParticipantState.IDLE
    .then (response) =>
      @on_call_state @_fake_on_state_event(response, conversation_id), true
    .catch (error) =>
      @logger.log @logger.levels.ERROR, "Failed to change state for call '#{conversation_id}': #{error.message}"

  ###
  Put the clients call state for a conversation to z.calling.enum.ParticipantState.JOINED.

  @private
  @param conversation_id [String] Conversation ID
  @param self_state [Object] Self state to change into
  @param client_joined_change [Boolean] Did the self client joined state change
  ###
  _put_state_to_join: (conversation_id, self_state, client_joined_change = false) ->
    @_put_state conversation_id, self_state
    .then (response) =>
      @call_center.timings().time_step z.telemetry.calling.CallSetupSteps.STATE_PUT
      event = @_fake_on_state_event response, conversation_id
      event.session = @_fake_session_id() if not event.session

      @call_center.telemetry.track_session conversation_id, event
      @on_call_state event, client_joined_change
    .catch (error) =>
      @logger.log @logger.levels.ERROR, "Failed to change state for call '#{conversation_id}': #{error.message}"

  ###
  Check sequence number of event and decide if it will be processed.

  @private
  @param event [Object] Event payload
  @param call_et [z.calling.Call] Call entity
  @param client_joined_change [Boolean] Client state change
  @return [Object, undefined] Event or undefined if it should be ignored
  ###
  _should_ignore_state: (event, call_et, client_joined_change) ->
    if event.sequence > call_et.event_sequence
      @logger.log @logger.levels.INFO, "State processed: Sequence '#{event.sequence}' > '#{call_et.event_sequence}'"
      event.is_sequential = event.sequence is call_et.event_sequence + 1
      call_et.event_sequence = event.sequence
    else if client_joined_change
      @logger.log @logger.levels.INFO,
        "State processed: Contains self client change but '#{event.sequence}' <= '#{call_et.event_sequence}'"
      call_et.event_sequence = event.sequence
    else if event.sequence <= call_et.event_sequence
      @logger.log @logger.levels.WARN, "State ignored: Sequence '#{event.sequence}' <= '#{call_et.event_sequence}'"
      event = undefined
    return event


  ###############################################################################
  # Call actions
  ###############################################################################

  ###
  Delete a call entity.
  @param conversation_id [String] Conversation ID of call to be deleted
  ###
  delete_call: (conversation_id) =>
    @call_center.get_call_by_id conversation_id
    .then (call_et) =>
      @logger.log @logger.levels.INFO, "Delete call in conversation '#{conversation_id}'"
      # Reset call and delete it afterwards
      call_et.state z.calling.enum.CallState.DELETED
      call_et.reset_call()
      @calls.remove call_et
      @call_center.media_stream_handler.reset_media_streams()
    .catch (error) =>
      @logger.log @logger.levels.WARN, "No call found in conversation '#{conversation_id}' to delete", error

  ###
  User action to ignore incoming call.
  @param conversation_id [String] Conversation ID of call to be joined
  ###
  ignore_call: (conversation_id) =>
    @call_center.get_call_by_id conversation_id
    .then (call_et) =>
      call_et.ignore()
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.SessionEventName.INTEGER.INCOMING_CALL_MUTED
      @logger.log @logger.levels.INFO, "Call in '#{conversation_id}' ignored"
      @call_center.media_stream_handler.reset_media_streams()
    .catch (error) =>
      @logger.log @logger.levels.WARN, "No call found in conversation '#{conversation_id}' to ignore", error

  ###
  User action to join a call.
  @param conversation_id [String] Conversation ID of call to be joined
  @param is_videod [Boolean] Is this a video call
  ###
  join_call: (conversation_id, is_videod) =>
    @call_center.timings new z.telemetry.calling.CallSetupTimings conversation_id

    is_outgoing_call = false

    @call_center.get_call_by_id conversation_id
    .catch ->
      is_outgoing_call = true
    .then =>
      if is_outgoing_call and not z.calling.CallCenter.supports_calling()
        amplify.publish z.event.WebApp.WARNINGS.SHOW, z.ViewModel.WarningType.UNSUPPORTED_OUTGOING_CALL
      else
        @call_center.conversation_repository.get_conversation_by_id conversation_id, (conversation_et) =>
          @_already_joined_in_call conversation_id, is_videod, is_outgoing_call
          .then ->
            if is_outgoing_call
              amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.SessionEventName.INTEGER.VOICE_CALL_INITIATED
              media_action = if is_videod then 'audio_call' else 'video_call'
              amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.MEDIA.COMPLETED_MEDIA_ACTION,
                action: media_action, conversation_type: if conversation_et.is_one2one() then z.tracking.attribute.ConversationType.ONE_TO_ONE else z.tracking.attribute.ConversationType.GROUP
        return true

  ###
  User action to leave a call.
  @param conversation_id [String] Conversation ID of call to be joined
  @param has_call_dropped [Boolean] Optional information whether the call has dropped
  ###
  leave_call: (conversation_id, has_call_dropped = false) =>
    @call_center.media_stream_handler.release_media_streams()
    @call_center.get_call_by_id conversation_id
    .then (call_et) =>
      if has_call_dropped
        call_et.finished_reason = z.calling.enum.CallFinishedReason.CONNECTION_DROPPED
      else
        call_et.finished_reason = z.calling.enum.CallFinishedReason.SELF_USER
      @_put_state_to_idle conversation_id
    .catch (error) =>
      @logger.log @logger.levels.WARN, "No call found in conversation '#{conversation_id}' to leave", error

  ###
  Leave a call we are joined immediately in case the browser window is closed.
  @note Should only used by "window.onbeforeunload".
  ###
  leave_call_on_beforeunload: =>
    conversation_id = @_self_client_on_a_call()
    @leave_call conversation_id if conversation_id

  ###
  Remove a participant from a call if he was removed from the group.
  @param conversation_id [String] Conversation ID of call that the user should be removed from
  @param user_id [String] ID of user to be removed
  ###
  remove_participant: (conversation_id, user_id) =>
    @call_center.get_call_by_id conversation_id
    .then (call_et) ->
      if participant_et = call_et.get_participant_by_id user_id
        call_et.delete_participant participant_et, false
    .catch (error) =>
      @logger.log @logger.levels.WARN, "No call found in conversation '#{conversation_id}' to remove participant from", error

  ###
  User action to toggle the audio muted state of a call.
  @param conversation_id [String] Conversation ID of call
  ###
  toggle_audio: (conversation_id) =>
    @call_center.media_stream_handler.toggle_microphone_muted()
    .then =>
      return @_put_state_to_join conversation_id, @_create_state_payload z.calling.enum.ParticipantState.JOINED if conversation_id
    .catch (error) =>
      @logger.log @logger.levels.ERROR, "Failed to toggle video state: #{error.message}", error

  ###
  User action to toggle the call state.
  @param conversation_id [String] Conversation ID of call for which state will be toggled
  @param is_videod [Boolean] Is this a video call
  ###
  toggle_joined: (conversation_id, is_videod) =>
    if @_self_participant_on_a_call() is conversation_id
      @leave_call conversation_id if @_self_client_on_a_call()
    else
      @join_call conversation_id, is_videod

  ###
  User action to toggle the screen sharing state of a call.
  @param conversation_id [String] Conversation ID of call
  ###
  toggle_screen: (conversation_id) =>
    @call_center.media_stream_handler.toggle_screen_shared()
    .then =>
      return @_put_state_to_join conversation_id, @_create_state_payload z.calling.enum.ParticipantState.JOINED if conversation_id
    .catch (error) =>
      @logger.log @logger.levels.ERROR, "Failed to toggle screen sharing state: #{error.message}", error

  ###
  User action to toggle the video state of a call.
  @param conversation_id [String] Conversation ID of call
  ###
  toggle_video: (conversation_id) =>
    @call_center.media_stream_handler.toggle_camera_paused()
    .then =>
      return @_put_state_to_join conversation_id, @_create_state_payload z.calling.enum.ParticipantState.JOINED if conversation_id
    .catch (error) =>
      @logger.log @logger.levels.ERROR, "Failed to toggle audio state: #{error.message}", error

  ###
  Check whether we are actively participating in a call.

  @private
  @param new_call_id [String] Conversation ID of call about to be joined
  @param is_videod [Boolean] Is video enabled for this new call
  @param is_outgoing_call [Boolean] Is the new call outgoing
  @return [Promise] Promise that resolves when the new call was joined
  ###
  _already_joined_in_call: (new_call_id, is_videod, is_outgoing_call) =>
    return new Promise (resolve) =>
      ongoing_call_id = @_self_participant_on_a_call()
      if ongoing_call_id
        @logger.log @logger.levels.WARN, 'You cannot start a second call while already participating in another one.'
        amplify.publish z.event.WebApp.WARNINGS.MODAL, z.ViewModel.ModalType.CALL_START_ANOTHER,
          action: =>
            @leave_call ongoing_call_id
            window.setTimeout =>
              @_join_call new_call_id, is_videod
              .then -> resolve()
            , 1000
          close: ->
            amplify.publish z.event.WebApp.CALL.STATE.IGNORE, new_call_id if not is_outgoing_call
          data: is_outgoing_call
      else
        @_join_call new_call_id, is_videod
        .then -> resolve()

  ###
  Check whether a call is ongoing in a conversation.

  @private
  @param conversation_id [String] Conversation ID
  @return [Promise] Promise that resolves with an array whether a call was found and the current call state
  ###
  _is_call_ongoing: (conversation_id) =>
    @_get_state conversation_id
    .then (response) =>
      for id, participant of response.participants when participant.state is z.calling.enum.ParticipantState.JOINED
        @logger.log @logger.levels.DEBUG, "Detected ongoing call in '#{conversation_id}'"
        return [true, response]
      return [false, response]
    .catch (error) =>
      @logger.log @logger.levels.WARN, "Detecting ongoing call in '#{conversation_id}' failed: #{error.message}", error

  ###
  Join a call and get a MediaStream.

  @private
  @param conversation_id [String] ID of conversation to call in
  @param is_videod [Boolean] Is call a video call
  ###
  _join_call: (conversation_id, is_videod) ->
    @call_center.get_call_by_id conversation_id
    .catch (error) ->
      throw error if error.type isnt z.calling.CallError::TYPE.CALL_NOT_FOUND
    .then =>
      if @call_center.media_stream_handler.has_active_streams()
        @logger.log @logger.levels.INFO, 'MediaStream has already been initialized', @call_center.media_stream_handler.local_media_streams
      else
        return @call_center.media_stream_handler.initiate_media_stream conversation_id, is_videod
    .then =>
      return @_put_state_to_join conversation_id, @_create_state_payload(z.calling.enum.ParticipantState.JOINED), true
    .catch (error) =>
      @logger.log @logger.levels.ERROR, "Joining call in '#{conversation_id}' failed: #{error.name}", error

  ###
  Update a call with new state.

  @private
  @param event [Object] 'call.state' event containing info to update call
  @param joined_participant_ids [Array<String>] User IDs of joined participants
  ###
  _update_call: (event, joined_participant_ids) ->
    conversation_id = event.conversation

    @call_center.get_call_by_id conversation_id
    .then (call_et) =>
      @call_center.user_repository.get_users_by_id joined_participant_ids, (participant_ets) ->
        # This happens if we leave an ongoing call or if we accept a call on another device that we have ignored.
        limit = event.is_sequential and event.cause is z.calling.enum.CallStateEventCause.REQUESTED
        call_et.update_participants (new z.calling.entities.Participant user_et for user_et in participant_ets), limit
        call_et.update_remote_state event.participants
    .catch (error) =>
      @logger.log @logger.levels.WARN, "No call found in conversation '#{conversation_id}' to update", error

  ###
  Update the self states of the call.

  @private
  @param call_et [z.calling.Call] Call entity to update the self status off
  @param user_joined_change [Boolean] Is the self user joined in the call
  @param client_joined_change [Boolean] Was the state of the client changed
  ###
  _update_self: (call_et, self_user_joined, client_joined_change) ->
    call_et.self_user_joined self_user_joined
    if client_joined_change
      call_et.self_client_joined self_user_joined

    if call_et.self_user_joined() and not call_et.self_client_joined()
      call_et.state z.calling.enum.CallState.ONGOING
    else if call_et.state() in z.calling.enum.CallState.OUTGOING
      call_et.state z.calling.enum.CallState.CONNECTING if call_et.get_number_of_participants() > 0
    else if call_et.state() in z.calling.enum.CallStateGroups.CAN_CONNECT
      if call_et.self_client_joined() and client_joined_change
        call_et.state z.calling.enum.CallState.CONNECTING
    else if call_et.state() is z.calling.enum.CallState.CONNECTING
      call_et.state z.calling.enum.CallState.ONGOING if not call_et.self_client_joined()

    if call_et.is_remote_videod() and call_et.is_ongoing_on_another_client()
      @call_center.media_stream_handler.release_media_streams()


  ###############################################################################
  # Call entity creation
  ###############################################################################

  ###
  Constructs a call entity.

  @private
  @param event [Object] 'call.state' event containing info to create call
  @return [z.calling.Call] Call entity
  ###
  _create_call: (event) ->
    @call_center.get_call_by_id event.conversation
    .then (call_et) =>
      @logger.log @logger.levels.WARN, "Call entity for '#{event.conversation}' already exists", call_et
    .catch =>
      conversation_et = @call_center.conversation_repository.get_conversation_by_id event.conversation
      call_et = new z.calling.entities.Call conversation_et, @call_center.user_repository.self(), @call_center.telemetry
      call_et.local_audio_stream = @call_center.media_stream_handler.local_media_streams.audio
      call_et.local_video_stream = @call_center.media_stream_handler.local_media_streams.video
      call_et.session_id event.session or @_fake_session_id()
      call_et.event_sequence = event.sequence
      conversation_et.call call_et
      @calls.push call_et
      return call_et

  ###
  Constructs an incoming call entity.

  @private
  @param event [Object] 'call.state' event containing info to create call
  @param remote_participant_ids [Array<String>] User IDs of remote participants joined in call
  @return [z.calling.Call] Call entity
  ###
  _create_incoming_call: (event, remote_participant_ids) ->
    @_create_call event
    .then (call_et) =>
      creator_id = @call_center.get_creator_id event
      remote_participant_ids.push creator_id if creator_id not in remote_participant_ids
      @call_center.user_repository.get_users_by_id remote_participant_ids, (remote_user_ets) =>
        call_et.set_creator @call_center.user_repository.get_user_by_id creator_id
        participant_ets = (new z.calling.entities.Participant user_et for user_et in remote_user_ets)
        call_et.update_participants participant_ets
        call_et.update_remote_state event.participants
        call_et.state z.calling.enum.CallState.INCOMING
        @call_center.telemetry.track_event z.tracking.EventName.CALLING.RECEIVED_CALL, call_et
        @call_center.media_stream_handler.initiate_media_stream call_et.id, true if call_et.is_remote_videod()
        @logger.log @logger.levels.DEBUG,
          "Incoming '#{call_et.remote_media_type()}' call to '#{call_et.conversation_et.display_name()}'", call_et

  ###
  Constructs an ongoing call entity.

  @private
  @param event [Object] 'call.state' event containing info to create call
  @param remote_participant_ids [Array<String>, undefined] User IDs of remote participants joined in call
  @return [z.calling.Call] Call entity
  ###
  _create_ongoing_call: (event, remote_participant_ids = []) ->
    @_create_call event
    .then (call_et) =>
      call_et.state z.calling.enum.CallState.ONGOING
      call_et.self_user_joined true
      @call_center.user_repository.get_users_by_id remote_participant_ids, (remote_user_ets) =>
        participant_ets = (new z.calling.entities.Participant user_et for user_et in remote_user_ets)
        call_et.update_participants participant_ets
        call_et.update_remote_state event.participants
        conversation_name = call_et.conversation_et.display_name()
        @logger.log @logger.levels.DEBUG,
          "Ongoing '#{call_et.remote_media_type()}' call to '#{conversation_name}' from another client", call_et

  ###
  Constructs an outgoing call entity.

  @private
  @param event [Object] 'call.state' event containing info to create call
  @return [z.calling.Call] Call entity
  ###
  _create_outgoing_call: (event) ->
    @_create_call event
    .then (call_et) =>
      call_et.state z.calling.enum.CallState.OUTGOING
      call_et.self_client_joined true
      call_et.self_user_joined true
      call_et.set_creator @call_center.user_repository.self()
      @logger.log @logger.levels.DEBUG,
        "Outgoing '#{@call_center.media_stream_handler.local_media_type()}' call to '#{call_et.conversation_et.display_name()}'", call_et
      @call_center.telemetry.track_event z.tracking.EventName.CALLING.INITIATED_CALL, call_et
      return call_et


  ###############################################################################
  # Helper functions
  ###############################################################################

  ###
  Create a fake 'call.state' event from a request response.

  @private
  @param event [Object] Request response to be changed into 'call.state' event
  @param conversation_id [String] Conversation ID for request response
  ###
  _fake_on_state_event: (event, conversation_id) ->
    event.conversation = conversation_id
    event.type = z.event.Backend.CALL.STATE
    event.cause = z.calling.enum.CallStateEventCause.REQUESTED
    return event

  ###
  Create a fake session ID.

  @note Backend does not always provide a session ID, so we have to fake one
  @private
  @return [String] Random faked session ID
  ###
  _fake_session_id: ->
    @logger.log @logger.levels.WARN, 'There is no session ID. We faked one.'
    return "FAKE-#{z.util.create_random_uuid()}"

  ###
  Get the count of joined users.

  @private
  @param remote_participant_count [Number] Count of remote participants
  @param is_self_user_joined [Boolean] Is the self user joined in the call
  @return [Number] Number of users joined in the call
  ###
  _get_joined_count: (remote_participant_count, is_self_user_joined) ->
    remote_participant_count++ if is_self_user_joined
    return remote_participant_count

  ###
  Get the IDs of remote participants.

  @private
  @param participant_ets [Object] Object containing participants
  @return [Array<String>] Array user user IDs of joined, remote participants
  ###
  _get_remote_participant_ids: (participants) ->
    participant_ids = []
    for id, participant of participants when participant.state is z.calling.enum.ParticipantState.JOINED
      participant_ids.push id if id isnt @call_center.user_repository.self().id
    return participant_ids

  ###
  Check if self user is joined in call event.

  @private
  @param participants [Object] JSON object containing call participants
  @return [Boolean] Is the self user joined in the call
  ###
  _is_self_user_joined: (participants) ->
    self = participants[@call_center.user_repository.self().id]
    return self?.state is z.calling.enum.ParticipantState.JOINED


  ###
  Check if self client is participating in a call.
  @private
  @return [String, Boolean] Conversation ID of call or false
  ###
  _self_client_on_a_call: ->
    return call_et.id for call_et in @calls() when call_et.self_client_joined()

  ###
  Check if self participant is participating in a call.
  @private
  @return [String, Boolean] Conversation ID of call or false
  ###
  _self_participant_on_a_call: ->
    return call_et.id for call_et in @calls() when call_et.self_user_joined()
