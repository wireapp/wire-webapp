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
  @param v2_call_center [z.calling.v2.CallCenter] Call center with references to all other handlers
  ###
  constructor: (@v2_call_center) ->
    @logger = new z.util.Logger 'z.calling.handler.CallStateHandler', z.config.LOGGER.OPTIONS

    @calls = ko.observableArray []
    @joined_call = ko.pureComputed =>
      return if not @self_client_joined()
      return call_et for call_et in @calls() when call_et.self_client_joined()

    @self_state = @v2_call_center.media_stream_handler.self_stream_state
    @self_client_joined = ko.observable false

    @block_event_handling = true
    @subscribe_to_events()
    return

  # Subscribe to amplify topics.
  subscribe_to_events: =>
    amplify.subscribe z.event.WebApp.CALL.STATE.CHECK, @check_state
    amplify.subscribe z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE, @set_notification_handling_state


  ###############################################################################
  # Notification stream handling
  ###############################################################################

  ###
  Check for ongoing call in conversation.
  @param conversation_id [String] Conversation ID
  ###
  check_state: (conversation_id) =>
    @v2_call_center.conversation_repository.get_conversation_by_id_async conversation_id
    .then (conversation_et) =>
      return if conversation_et.removed_from_conversation()
      return @_is_call_ongoing conversation_id
      .then ([is_call_ongoing, response]) =>
        if is_call_ongoing
          @on_call_state @_fake_on_state_event(response, conversation_id), true
          @v2_call_center.conversation_repository.unarchive_conversation conversation_et if conversation_et.is_archived()
    .catch (error) ->
      throw error unless error.type is z.conversation.ConversationError::TYPE.NOT_FOUND

  ###
  Set the notification handling state.
  @note Temporarily ignore call related events when handling notifications from the stream
  @param handling_state [z.event.NOTIFICATION_HANDLING_STATE] State of the notifications stream handling
  ###
  set_notification_handling_state: (handling_state) =>
    @block_event_handling = handling_state isnt z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET
    @_update_ongoing_calls() if not @block_event_handling
    @logger.info "Block handling of call events: #{@block_event_handling}"

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
          @logger.debug "Call in '#{call_et.id}' ended during while connectivity was lost", event
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
    @logger.debug "Handling call state event with self client change: #{client_joined_change}", event
    participant_ids = @_get_remote_participant_ids event.participants
    self_user_joined = @_is_self_user_joined event.participants
    participants_count = participant_ids.length
    joined_count = @_get_joined_count participants_count, self_user_joined

    # Update existing call
    @v2_call_center.get_call_by_id event.conversation
    .then (call_et) =>
      if event.self? and not call_et.self_client_joined()
        if event.self.state is z.calling.enum.ParticipantState.JOINED or event.self.reason is 'ended'
          client_joined_change = true

      event = @_should_ignore_state event, call_et, client_joined_change
      return if not event

      if joined_count >= 1
        @_update_participants event, participant_ids
        .then =>
          @_update_state call_et, self_user_joined, client_joined_change
      else
        # ...which has ended
        @delete_call call_et.id
    .catch (error) =>
      if error.type is z.calling.v2.CallError::TYPE.CALL_NOT_FOUND
        # Call with us joined
        if self_user_joined
          # ...from this device
          if client_joined_change
            if participants_count > 0
              # ...with other participants
              @_create_connecting_call event, participant_ids
            else
              @_create_outgoing_call event
          # ...from another device
          else
            @_create_ongoing_call event, participant_ids
        # New call we are not joined
        else if participants_count > 0
          @_create_incoming_call event, participant_ids
      else
        @logger.error "Failed to handle state event: #{error.message}", error

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
        muted: not @self_state.audio_send()
        screen_shared: @self_state.screen_send()
        videod: @self_state.video_send()

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
      @logger.error error_description
      return Promise.reject new Error error_description

    @v2_call_center.call_service.get_state conversation_id
    .catch (error) =>
      @logger.error "GETting call state for '#{conversation_id}' failed: #{error.message}", error
      attributes = {cause: error.label or error.name, method: 'get', request: 'state'}
      @v2_call_center.telemetry.track_event z.tracking.EventName.CALLING.FAILED_REQUEST, undefined, attributes
      throw error

  ###
  Put the clients call state for a conversation.

  @private
  @param conversation_id [String] Conversation ID
  @param payload [Object] Participant payload to be set
  ###
  _put_state: (conversation_id, payload) ->
    if not conversation_id
      error_description = "PUTting the state to '#{payload.state}' not possible without conversation ID"
      @v2_call_center.telemetry.report_error error_description
      return Promise.reject new Error error_description

    @logger.info "PUTting the state to '#{payload.state}' in '#{conversation_id}'", payload
    @v2_call_center.call_service.put_state conversation_id, payload
    .catch (error) =>
      @_put_state_failure error, conversation_id, payload
    .then (response) =>
      @logger.debug "PUTting the state to '#{payload.state}' in '#{conversation_id}' successful", response
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
    @logger.error "PUTting the state to '#{payload.state}' in '#{conversation_id}' failed: #{error.message}", error
    attributes = {cause: error.label or error.name, method: 'put', request: 'state', video: payload.videod}
    @v2_call_center.telemetry.track_event z.tracking.EventName.CALLING.FAILED_REQUEST, undefined, attributes
    @v2_call_center.media_stream_handler.release_media_stream()
    switch error.label
      when z.service.BackendClientError.LABEL.CONVERSATION_TOO_BIG
        amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.CALL_FULL_CONVERSATION,
          data: error.max_members
        throw new z.calling.v2.CallError z.calling.v2.CallError::TYPE.CONVERSATION_TOO_BIG
      when z.service.BackendClientError.LABEL.INVALID_OPERATION
        amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.CALL_EMPTY_CONVERSATION
        @delete_call conversation_id
        throw new z.calling.v2.CallError z.calling.v2.CallError::TYPE.CONVERSATION_EMPTY
      when z.service.BackendClientError.LABEL.VOICE_CHANNEL_FULL
        amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.CALL_FULL_VOICE_CHANNEL,
          data: error.max_joined
        throw new z.calling.v2.CallError z.calling.v2.CallError::TYPE.VOICE_CHANNEL_FULL
      # User has been removed from conversation, call should be deleted
      else
        @v2_call_center.telemetry.report_error "PUTting the state to '#{payload.state}' failed: #{error.message}", error
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
      @logger.error "Failed to change state for call '#{conversation_id}': #{error.message}"

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
      event = @_fake_on_state_event response, conversation_id
      event.session = @_fake_session_id() if not event.session

      @v2_call_center.telemetry.track_session conversation_id, event
      @on_call_state event, client_joined_change
    .catch (error) =>
      @logger.error "Failed to change state for call '#{conversation_id}': #{error.message}"

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
      @logger.info "State processed: Sequence '#{event.sequence}' > '#{call_et.event_sequence}'"
      event.is_sequential = event.sequence is call_et.event_sequence + 1
      call_et.event_sequence = event.sequence
    else if client_joined_change
      @logger.info "State processed: Contains self client change but '#{event.sequence}' <= '#{call_et.event_sequence}'"
      call_et.event_sequence = event.sequence
    else if event.sequence <= call_et.event_sequence
      @logger.warn "State ignored: Sequence '#{event.sequence}' <= '#{call_et.event_sequence}'"
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
    @v2_call_center.get_call_by_id conversation_id
    .then (call_et) =>
      @logger.info "Delete call in conversation '#{conversation_id}'"
      # Reset call and delete it afterwards
      if call_et.self_client_joined() and call_et.state() in [z.calling.enum.CallState.DISCONNECTING, z.calling.enum.CallState.ONGOING]
        amplify.publish z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.CALL_DROP
      call_et.state z.calling.enum.CallState.ENDED
      call_et.reset_call()
      @_remove_call call_et.id
      @v2_call_center.media_stream_handler.reset_media_stream()
    .catch (error) =>
      @logger.warn "No call found in conversation '#{conversation_id}' to delete", error

  ###
  User action to join a call.
  @param conversation_id [String] Conversation ID of call to be joined
  @param is_videod [Boolean] Is this a video call
  ###
  join_call: (conversation_id, is_videod) =>
    @v2_call_center.get_call_by_id conversation_id
    .catch (error) =>
      throw error unless error.type is z.calling.v2.CallError::TYPE.CALL_NOT_FOUND

      @v2_call_center.conversation_repository.get_conversation_by_id_async conversation_id
      .then (conversation_et) ->
        amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.MEDIA.COMPLETED_MEDIA_ACTION,
          action: if is_videod then 'video_call' else 'audio_call'
          conversation_type: z.tracking.helpers.get_conversation_type conversation_et
          is_ephemeral: false
          with_bot: conversation_et.is_with_bot()
    .then =>
      @v2_call_center.timings = new z.telemetry.calling.CallSetupTimings conversation_id
      if @v2_call_center.media_stream_handler.local_media_stream()
        @logger.info 'MediaStream has already been initialized', @v2_call_center.media_stream_handler.local_media_stream
      else
        return @v2_call_center.media_stream_handler.initiate_media_stream conversation_id, is_videod
    .then =>
      @v2_call_center.timings.time_step z.telemetry.calling.CallSetupSteps.STREAM_RECEIVED
      return @_put_state_to_join conversation_id, @_create_state_payload(z.calling.enum.ParticipantState.JOINED), true
    .catch (error) =>
      @logger.error "Joining call in '#{conversation_id}' failed: #{error.name}", error

  ###
  User action to leave a call.
  @param conversation_id [String] Conversation ID of call to be joined
  @param termination_reason [z.calling.enum.TERMINATION_REASON] Optional on reason for call termination
  ###
  leave_call: (conversation_id, termination_reason) =>
    @v2_call_center.media_stream_handler.release_media_stream()
    @v2_call_center.get_call_by_id conversation_id
    .then (call_et) =>
      call_et.state z.calling.enum.CallState.DISCONNECTING
      call_et.termination_reason = termination_reason if termination_reason
      @_put_state_to_idle conversation_id
    .catch (error) =>
      @logger.warn "No call found in conversation '#{conversation_id}' to leave", error

  ###
  Remove a participant from a call if he was removed from the group.
  @param conversation_id [String] Conversation ID of call that the user should be removed from
  @param user_id [String] ID of user to be removed
  ###
  participant_left: (conversation_id, user_id) =>
    @v2_call_center.get_call_by_id conversation_id
    .then (call_et) ->
      if participant_et = call_et.get_participant_by_id user_id
        call_et.delete_participant participant_et, false
    .catch (error) =>
      @logger.warn "No call found in conversation '#{conversation_id}' to remove participant from", error

  ###
  User action to reject incoming call.
  @param conversation_id [String] Conversation ID of call to be joined
  ###
  reject_call: (conversation_id) =>
    @v2_call_center.get_call_by_id conversation_id
    .then (call_et) =>
      call_et.reject()
      @logger.info "Call in '#{conversation_id}' rejected"
      @v2_call_center.media_stream_handler.reset_media_stream()
    .catch (error) =>
      @logger.warn "No call found in conversation '#{conversation_id}' to reject", error

  ###
  User action to toggle a media state of a call.
  @param conversation_id [String] Conversation ID of call
  @param media_type [z.media.MediaType] MediaType of requested change
  ###
  toggle_media: (conversation_id, media_type) =>
    toggle_promise = switch media_type
      when z.media.MediaType.AUDIO
        @v2_call_center.media_stream_handler.toggle_audio_send()
      when z.media.MediaType.SCREEN
        @v2_call_center.media_stream_handler.toggle_screen_send()
      when z.media.MediaType.VIDEO
        @v2_call_center.media_stream_handler.toggle_video_send()

    toggle_promise.then =>
      return @_put_state_to_join conversation_id, @_create_state_payload z.calling.enum.ParticipantState.JOINED if conversation_id
    .catch (error) =>
      @logger.error "Failed to toggle '#{media_type}' state: #{error.message}", error

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
        @logger.debug "Detected ongoing call in '#{conversation_id}'"
        return [true, response]
      return [false, response]
    .catch (error) =>
      @logger.warn "Detecting ongoing call in '#{conversation_id}' failed: #{error.message}", error

  ###
  Remove a call from the list.
  @param conversation_id [String] ID of conversation for which to remove call
  ###
  _remove_call: (conversation_id) ->
    @calls.remove (call_et) -> call_et.id is conversation_id

  ###
  Update a call with new state.

  @private
  @param event [Object] 'call.state' event containing info to update call
  @param joined_participant_ids [Array<String>] User IDs of joined participants
  ###
  _update_participants: (event, joined_participant_ids) ->
    @v2_call_center.get_call_by_id event.conversation
    .then (call_et) =>
      @v2_call_center.user_repository.get_users_by_id joined_participant_ids
      .then (participant_ets) ->
        # This happens if we leave an ongoing call or if we accept a call on another device that we have ignored.
        limit = event.is_sequential and event.cause is z.calling.enum.CallStateEventCause.REQUESTED
        call_et.update_participants (new z.calling.entities.Participant user_et for user_et in participant_ets), limit
        call_et.update_remote_state event.participants
    .catch (error) =>
      @logger.warn "No call found in conversation '#{event.conversation}' to update", error

  ###
  Update the self states of the call.

  @private
  @param call_et [z.calling.Call] Call entity to update the self status off
  @param user_joined_change [Boolean] Is the self user joined in the call
  @param client_joined_change [Boolean] Was the state of the client changed
  ###
  _update_state: (call_et, self_user_joined, client_joined_change) ->
    call_et.self_user_joined self_user_joined
    if client_joined_change
      @self_client_joined self_user_joined
      call_et.self_client_joined self_user_joined

    if call_et.self_user_joined() and not call_et.self_client_joined()
      call_et.state z.calling.enum.CallState.ONGOING
    else if call_et.state() is z.calling.enum.CallState.OUTGOING
      call_et.state z.calling.enum.CallState.CONNECTING if call_et.get_number_of_participants()
    else if call_et.state() in z.calling.enum.CallStateGroups.CAN_CONNECT
      if call_et.self_client_joined() and client_joined_change
        call_et.state z.calling.enum.CallState.CONNECTING
    else if call_et.state() is z.calling.enum.CallState.CONNECTING
      call_et.state z.calling.enum.CallState.ONGOING if not call_et.self_client_joined()
    else if call_et.state() is z.calling.enum.CallState.DISCONNECTING
      call_et.state z.calling.enum.CallState.ONGOING if call_et.participants_count() >= 2

    if call_et.is_remote_video_send() and call_et.is_ongoing_on_another_client()
      @v2_call_center.media_stream_handler.release_media_stream()


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
    @v2_call_center.get_call_by_id event.conversation
    .then (call_et) =>
      @logger.warn "Call entity for '#{event.conversation}' already exists", call_et
      return call_et
    .catch =>
      @v2_call_center.conversation_repository.get_conversation_by_id_async event.conversation
      .then (conversation_et) =>
        call_et = new z.calling.entities.Call conversation_et, @v2_call_center
        call_et.session_id = event.session or @_fake_session_id()
        call_et.event_sequence = event.sequence
        conversation_et.call call_et
        @calls.push call_et
        return call_et

  ###
  Constructs an connecting call entity.

  @private
  @param event [Object] 'call.state' event containing info to create call
  @param remote_participant_ids [Array<String>, undefined] User IDs of remote participants joined in call
  @return [z.calling.Call] Call entity
  ###
  _create_connecting_call: (event, remote_participant_ids = []) ->
    @_create_call event
    .then (call_et) =>
      call_et.state z.calling.enum.CallState.CONNECTING
      @v2_call_center.user_repository.get_users_by_id remote_participant_ids
      .then (remote_user_ets) =>
        participant_ets = (new z.calling.entities.Participant user_et for user_et in remote_user_ets)
        call_et.update_participants participant_ets
        call_et.update_remote_state event.participants
        @self_client_joined true
        call_et.self_client_joined true
        call_et.self_user_joined true
        @logger.debug "Connecting '#{call_et.remote_media_type()}' call to '#{call_et.conversation_et.display_name()}' from this client", call_et

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
      creator_id = @v2_call_center.get_creator_id event
      remote_participant_ids.push creator_id if creator_id not in remote_participant_ids
      @v2_call_center.user_repository.get_users_by_id remote_participant_ids
      .then (remote_user_ets) =>
        @v2_call_center.user_repository.find_user_by_id(creator_id).then call_et.set_creator
        participant_ets = (new z.calling.entities.Participant user_et for user_et in remote_user_ets)
        call_et.update_participants participant_ets
        call_et.update_remote_state event.participants
        call_et.state z.calling.enum.CallState.INCOMING
        call_et.telemetry.track_event z.tracking.EventName.CALLING.RECEIVED_CALL, call_et
        @logger.debug "Incoming '#{call_et.remote_media_type()}' call to '#{call_et.conversation_et.display_name()}'", call_et
        if call_et.is_remote_video_send()
          @v2_call_center.media_stream_handler.initiate_media_stream call_et.id, true
          .catch (error) =>
            @logger.error "Failed to start self video for incoming call: #{error.message}", error

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
      @v2_call_center.user_repository.get_users_by_id remote_participant_ids
      .then (remote_user_ets) =>
        participant_ets = (new z.calling.entities.Participant user_et for user_et in remote_user_ets)
        call_et.update_participants participant_ets
        call_et.update_remote_state event.participants
        @logger.debug "Ongoing '#{call_et.remote_media_type()}' call to '#{call_et.conversation_et.display_name()}' from another client", call_et

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
      @self_client_joined true
      call_et.self_client_joined true
      call_et.self_user_joined true
      call_et.set_creator @v2_call_center.user_repository.self()
      @logger.debug "Outgoing '#{@v2_call_center.media_stream_handler.local_media_type()}' call to '#{call_et.conversation_et.display_name()}'", call_et
      call_et.telemetry.set_media_type @self_state.video_send()
      call_et.telemetry.track_event z.tracking.EventName.CALLING.INITIATED_CALL, call_et
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
    @logger.warn 'There is no session ID. We faked one.'
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
      participant_ids.push id if id isnt @v2_call_center.user_repository.self().id
    return participant_ids

  ###
  Check if self user is joined in call event.

  @private
  @param participants [Object] JSON object containing call participants
  @return [Boolean] Is the self user joined in the call
  ###
  _is_self_user_joined: (participants) ->
    self = participants[@v2_call_center.user_repository.self().id]
    return self?.state is z.calling.enum.ParticipantState.JOINED
