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
z.calling.entities ?= {}

# Call entity.
class z.calling.entities.Call
  ###
  Construct a new call entity.
  @param conversation_et [z.entity.Conversation] Conversation the call takes place in
  @param self_user [z.entity.User] Self user entity
  ###
  constructor: (@conversation_et, @self_user, @telemetry) ->
    @logger = new z.util.Logger "z.calling.Call (#{@conversation_et.id})", z.config.LOGGER.OPTIONS

    # IDs and references
    @id = @conversation_et.id
    @session_id = ko.observable undefined
    @event_sequence = 0

    # States
    @call_timer_interval = undefined
    @timer_start = undefined
    @duration_time = ko.observable 0
    @finished_reason = z.calling.enum.CallFinishedReason.UNKNOWN
    @remote_media_type = ko.observable z.media.MediaType.NONE

    @is_connected = ko.observable false
    @is_group = @conversation_et.is_group
    @is_remote_screen_shared = ko.pureComputed =>
      return @remote_media_type() is z.media.MediaType.SCREEN
    @is_remote_videod = ko.pureComputed =>
      return @remote_media_type() is z.media.MediaType.VIDEO

    @self_client_joined = ko.observable false
    @self_user_joined = ko.observable false
    @state = ko.observable z.calling.enum.CallState.UNKNOWN
    @previous_state = undefined
    @is_declined_timer = undefined

    # user declined group call
    @is_declined = ko.observable false
    @is_declined.subscribe (is_declined) =>
      @_stop_call_sound true if is_declined

    @self_user_joined.subscribe (is_joined) =>
      @is_declined false if is_joined

    # User entities
    @creator = ko.observable undefined

    # @todo Calculate panning on participants update
    @participants = ko.observableArray []
    @participants_count = ko.pureComputed =>
      if @self_user_joined()
        @get_number_of_participants() + 1
      else
        @get_number_of_participants()
    @max_number_of_participants = 0

    @interrupted_participants = ko.observableArray []

    # Media
    @local_audio_stream = ko.observable()
    @local_video_stream = ko.observable()

    # Statistics
    @_reset_timer()

    # Observable subscriptions
    @is_connected.subscribe (is_connected) =>
      if is_connected
        @telemetry.track_event z.tracking.EventName.CALLING.ESTABLISHED_CALL, @
        @timer_start = Date.now() - 100
        @call_timer_interval = window.setInterval =>
          @update_timer_duration()
        , 1000

    @participants_count.subscribe (users_in_call) =>
      @max_number_of_participants = Math.max users_in_call, @max_number_of_participants

    @self_client_joined.subscribe (is_joined) =>
      if is_joined
        amplify.publish z.event.WebApp.CALL.SIGNALING.POST_FLOWS, @id if @get_number_of_participants()
      else
        @is_connected false
        amplify.publish z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.CALL_DROP
        @telemetry.track_duration @
        @_reset_timer()
        @_reset_flows()

    @is_ongoing_on_another_client = ko.pureComputed =>
      return @self_user_joined() and not @self_client_joined()

    @network_interruption = ko.pureComputed =>
      if @is_connected() and not @is_group()
        return @interrupted_participants().length > 0
      return false

    @network_interruption.subscribe (is_interrupted) ->
      if is_interrupted
        amplify.publish z.event.WebApp.AUDIO.PLAY_IN_LOOP, z.audio.AudioType.NETWORK_INTERRUPTION
      else
        amplify.publish z.event.WebApp.AUDIO.STOP, z.audio.AudioType.NETWORK_INTERRUPTION

    @state.subscribe (state) =>
      @logger.log @logger.levels.DEBUG, "Call state changed to '#{state}'"

      @_clear_join_timer() if @is_group()

      switch state
        when z.calling.enum.CallState.CONNECTING
          @_on_state_connecting()
        when z.calling.enum.CallState.INCOMING
          @_on_state_incoming()
        when z.calling.enum.CallState.ENDED
          @_on_state_ended()
        when z.calling.enum.CallState.IGNORED
          @_on_state_ignored()
        when z.calling.enum.CallState.ONGOING
          @_on_state_ongoing()
        when z.calling.enum.CallState.OUTGOING
          @_on_state_outgoing()

      @previous_state = state

  update_timer_duration: =>
    @duration_time Math.floor (Date.now() - @timer_start) / 1000


  ###############################################################################
  # Call states
  ###############################################################################

  _on_state_connecting: =>
    attributes = direction: if @previous_state is z.calling.enum.CallState.OUTGOING then z.calling.enum.CallState.OUTGOING else z.calling.enum.CallState.INCOMING
    @telemetry.track_event z.tracking.EventName.CALLING.JOINED_CALL, @, attributes
    @_stop_call_sound @previous_state is z.calling.enum.CallState.INCOMING
    @is_declined false

  _on_state_ended: =>
    if @previous_state in z.calling.enum.CallStateGroups.IS_RINGING
      @_stop_call_sound @previous_state is z.calling.enum.CallState.INCOMING
    @is_declined false

  _on_state_incoming: =>
    @_play_call_sound true
    @_group_call_timeout true if @is_group()

  _on_state_ignored: =>
    if @previous_state in z.calling.enum.CallStateGroups.IS_RINGING
      @_stop_call_sound @previous_state is z.calling.enum.CallState.INCOMING

  _on_state_ongoing: =>
    if @previous_state in z.calling.enum.CallStateGroups.IS_RINGING
      @_stop_call_sound @previous_state is z.calling.enum.CallState.INCOMING

  _on_state_outgoing: =>
    @_play_call_sound false
    @_group_call_timeout false if @is_group()

  _clear_join_timer: =>
    window.clearTimeout @is_declined_timer
    @is_declined_timer = undefined

  _group_call_timeout: (is_incoming) =>
    @is_declined_timer = window.setTimeout =>
      @_stop_call_sound is_incoming
      @is_declined true if is_incoming
    , 30000

  _play_call_sound: (is_incoming) ->
    if is_incoming
      amplify.publish z.event.WebApp.AUDIO.PLAY_IN_LOOP, z.audio.AudioType.INCOMING_CALL
    else
      amplify.publish z.event.WebApp.AUDIO.PLAY_IN_LOOP, z.audio.AudioType.OUTGOING_CALL

  _stop_call_sound: (is_incoming) ->
    if is_incoming
      amplify.publish z.event.WebApp.AUDIO.STOP, z.audio.AudioType.INCOMING_CALL
    else
      amplify.publish z.event.WebApp.AUDIO.STOP, z.audio.AudioType.OUTGOING_CALL


  ###############################################################################
  # State handling
  ###############################################################################

  # Check whether this call is a video call
  update_remote_state: (participants) ->
    media_type_updated = false
    for participant_id, state of participants when participant_id isnt @self_user.id
      participant_et = @get_participant_by_id participant_id
      if participant_et
        participant_et.state.muted state.muted if state.muted?
        participant_et.state.screen_shared state.screen_shared if state.screen_shared?
        participant_et.state.videod state.videod if state.videod?

        if state.screen_shared
          @remote_media_type z.media.MediaType.SCREEN
          media_type_updated = true
        else if state.videod
          @remote_media_type z.media.MediaType.VIDEO
          media_type_updated = true

    @remote_media_type z.media.MediaType.AUDIO if not media_type_updated

  # Ignore a call.
  ignore: =>
    @state z.calling.enum.CallState.IGNORED
    @is_declined true


  ###############################################################################
  # Participants
  ###############################################################################

  ###
  Add a participant to the call.
  @param participant_et [z.calling.Participant] Participant entity to be added to the call
  @return [Boolean] Has the participant been added
  ###
  add_participant: (participant_et) =>
    if not @get_participant_by_id participant_et.user.id
      @participants.push participant_et
      @logger.log @logger.levels.DEBUG, "Participants updated: '#{participant_et.user.name()}' added'"
      return true
    return false

  ###
  Remove a participant from the call.

  @param participant_et [z.calling.Participant] Participant entity to be removed from the call
  @param delete_on_backend [Boolean] Should the flow with the participant be removed on the backend
  @return [Boolean] Has the participant been removed
  ###
  delete_participant: (participant_et, delete_on_backend = true) =>
    @interrupted_participants.remove @participant_et
    return false if not @get_participant_by_id participant_et.user.id

    # Delete participant
    @participants.remove participant_et
    # Delete flows from participant (if any left)
    flow_et = participant_et.get_flow()
    if flow_et
      @_delete_flow_by_id flow_et, delete_on_backend

    @logger.log @logger.levels.DEBUG, "Participants updated: '#{participant_et.user.name()}' removed"
    if not @get_number_of_participants()
      amplify.publish z.event.WebApp.CALL.STATE.DELETE, @id
    return true

  ###
  Get the number of participants in the call.
  @return [Number] Number of participants in call excluding the self user
  ###
  get_number_of_participants: =>
    return @participants().length

  ###
  Get a call participant by his id.
  @param user_id [String] User ID of participant to be returned
  @return [z.calling.Participant] Participant that matches given user ID
  ###
  get_participant_by_id: (user_id) =>
    return participant for participant in @participants() when participant.user.id is user_id

  ###
  Set a user as the creator of the call.
  @param user_et [z.entity.User] User entity to be set as call creator
  ###
  set_creator: (user_et) =>
    if not @creator()
      @logger.log @logger.levels.INFO, "Call created by: #{user_et.name()}"
      @creator user_et

  ###
  Update the remote participants of a call.

  @param participants_ets [Array<z.calling.Participant>] Array joined call participants
  @param sequential_event [Boolean] Should the update be limited to one change only

  @note Some backend 'call-state' events contain false information
    If a call event is sequential to the previous one (meaning the sequence number is increased by one) and the
    'event.cause' of the call state event is 'requested' (as it was triggered by another client PUTting its state)
    then the delta in participants can only be one. If we have added a user, we cannot add or remove another one.
  ###
  update_participants: (participant_ets = [], sequential_event = false) =>
    sequential_event = false if @state() in z.calling.enum.CallStateGroups.IS_RINGING
    if sequential_event
      @logger.log @logger.levels.INFO, 'Sequential event by request: Only one participant change will be applied'

    # Add active participants
    for participant_et in participant_ets when @add_participant participant_et
      participant_joined = true
      break if sequential_event

    # Find inactive participants
    if participant_ets.length isnt @get_number_of_participants() and (not sequential_event or not participant_joined)
      active_participant_ids = (participant_et.user.id for participant_et in participant_ets)
      delete_participants_ets = (
        participant_et for participant_et in @participants() when participant_et.user.id not in active_participant_ids
      )

    # Remove inactive participants
    if delete_participants_ets?.length > 0
      for participant_et in delete_participants_ets when @delete_participant participant_et
        participant_left = true
        break if sequential_event
      if participant_left and @self_client_joined()
        amplify.publish z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.CALL_DROP

    @_sort_participants_by_panning()


  ###############################################################################
  # Flows
  ###############################################################################

  ###
  Construct and add a flow to a call participant.

  @param flow_id [String] ID of flow to be constructed
  @param user_et [z.entity.User] User that the flow is with
  @param audio_context [AudioContext] Audio context for the flow audio
  @param call_timings [z.telemetry.calling.CallSetupTimings] Optional object to track duration of call setup
  ###
  construct_flow: (flow_id, user_et, audio_context, call_timings) =>
    participant_et = @get_participant_by_id user_et.id

    create_flow = (flow_id, participant_et) =>
      if call_timings
        flow_timings = $.extend new z.telemetry.calling.CallSetupTimings(@id), call_timings.get()
        flow_timings.time_step z.telemetry.calling.CallSetupSteps.FLOW_RECEIVED
        flow_timings.flow_id = flow_id
      flow_et = new z.calling.entities.Flow flow_id, @, participant_et, audio_context, flow_timings
      participant_et.add_flow flow_et
      return flow_et

    if participant_et
      # We have to update the user info
      if @get_flow_by_id flow_id
        @logger.log @logger.levels.WARN, "Not adding flow '#{flow_id}' as it already exists"
      else
        @logger.log @logger.levels.DEBUG, "Adding flow '#{flow_id}' to participant '#{participant_et.user.name()}'"
        create_flow flow_id, participant_et
    else
      participant_et = new z.calling.entities.Participant user_et
      @add_participant participant_et
      @logger.log @logger.levels.DEBUG, "Adding flow '#{flow_id}' to new participant '#{participant_et.user.name()}'"
      create_flow flow_id, participant_et

  ###
  Get the flow that matches the given ID.
  @param flow_id [String] ID of flow to be returned
  @return [z.calling.Flow] Matching flow entity
  ###
  get_flow_by_id: (flow_id) =>
    return flow_et for flow_et in @get_flows() when flow_et.id is flow_id

  ###
  Get all flows of the call.
  @return [Array<z.calling.Flow>] Array of flows
  ###
  get_flows: =>
    return (participant_et.get_flow() for participant_et in @participants() when participant_et.get_flow())

  ###
  Get the flow to a specific user.
  @param user_id [String] User ID that the flow connects to
  @return [z.calling.Flow] Flow to given user
  ###
  get_flows_by_user_id: (user_id) =>
    return @get_participant_by_id(user_id).flows()

  ###
  Get full flow telemetry report of the call.
  @return [Array<z.calling.Flow>] Array of flows
  ###
  get_flow_telemetry: =>
    return (participant.get_flow()?.get_telemetry() for participant in @participants() when participant.get_flow())

  ###
  Get the number of flows of the call.
  @return [Number] Number of flows
  ###
  get_number_of_flows: =>
    return @get_flows().length

  ###
  Get the number of active flows of the call.
  @return [Number] Number of active flows
  ###
  get_number_of_active_flows: =>
    return (flow_et for flow_et in @get_flows() when flow_et.is_active).length or 0

  ###
  Delete a flow with a given ID.

  @private
  @param flow_et [z.calling.Flow] Flow entity to be deleted
  @param delete_on_backend [Boolean] Should the flow with the participant be removed on the backend
  ###
  _delete_flow_by_id: (flow_et, delete_on_backend = true) =>
    return if not flow_et
    flow_et.reset_flow()

    return if not delete_on_backend
    # Delete flow on backend
    flow_deletion_info = new z.calling.payloads.FlowDeletionInfo @id, flow_et.id
    amplify.publish z.event.WebApp.CALL.SIGNALING.DELETE_FLOW, flow_deletion_info

  ###############################################################################
  # Panning
  ###############################################################################

  ###
  Calculates the panning (from left to right) to position a user in a group call.

  @note The deal is to calculate Jenkins' one-at-a-time hash (JOAAT) for each participant and then
    sort all participants in an array by their JOAAT hash. After that the array index of each user
    is used to allocate the position with the return value of this function.

  @param index [Number] Index of a user in a sorted array
  @param total [Number] Number of users
  @return [Number] Panning in the range of -1 to 1 with -1 on the left
  ###
  _calculate_panning: (index, total) ->
    return 0.0 if total is 1

    pos = -(total - 1.0) / (total + 1.0)
    delta = (-2.0 * pos) / (total - 1.0)

    return pos + delta * index

  # Sort the call participants by their audio panning.
  _sort_participants_by_panning: ->
    return if @participants().length < 2

    # Sort by JOOAT Hash and calculate panning
    @participants.sort (participant_a, participant_b) ->
      return participant_a.user.joaat_hash - participant_b.user.joaat_hash

    for participant_et, i in @participants()
      panning = @_calculate_panning i, @participants().length
      @logger.log @logger.levels.INFO,
        "Panning for '#{participant_et.user.name()}' recalculated to '#{panning}'"
      participant_et.panning panning

    panning_info = (participant_et.user.name() for participant_et in @participants()).join ', '
    @logger.log @logger.levels.INFO, "New panning order: #{panning_info}"


  ###############################################################################
  # Reset
  ###############################################################################

  ###
  Reset the call states.
  @private
  ###
  reset_call: =>
    @self_client_joined false
    @event_sequence = 0
    @finished_reason = z.calling.enum.CallFinishedReason.UNKNOWN
    @is_connected false
    @session_id undefined
    @self_user_joined false
    @is_declined false
    amplify.publish z.event.WebApp.AUDIO.STOP, z.audio.AudioType.NETWORK_INTERRUPTION

  ###
  Reset the call timers.
  @private
  ###
  _reset_timer: ->
    window.clearInterval @call_timer_interval if @call_timer_interval
    @timer_start = undefined
    @duration_time 0

  ###
  Reset all flows of the call.
  @private
  ###
  _reset_flows: ->
    @_delete_flow_by_id flow_et for flow_et in @get_flows()


  ###############################################################################
  # Logging
  ###############################################################################

  # Log flow status to console.
  log_status: =>
    flow_et.log_status() for flow_et in @get_flows()

  # Log flow setup step timings to console.
  log_timings: =>
    flow_et.log_timings() for flow_et in @get_flows()
