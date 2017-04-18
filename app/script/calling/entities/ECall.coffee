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

E_CALL_CONFIG =
  STATE_TIMEOUT: 30000

# E-call entity.
class z.calling.entities.ECall
  ###
  Construct a new e-call entity.
  @param conversation_et [z.entity.Conversation] Conversation the call takes place in
  @param creating_user [z.entity.User] Entity of user starting the call
  @param session_id [String] Session ID to identify call
  @param v3_call_center [z.calling.v3.CallCenter] V3 call center
  ###
  constructor: (@conversation_et, @creating_user, @session_id, @v3_call_center) ->
    @logger = new z.util.Logger "z.calling.entities.ECall (#{@conversation_et.id})", z.config.LOGGER.OPTIONS

    # IDs and references
    @id = @conversation_et.id
    @timings = undefined

    @media_repository = @v3_call_center.media_repository
    @config = @v3_call_center.calling_config
    @self_user = @v3_call_center.user_repository.self()
    @self_state = @v3_call_center.self_state
    @telemetry = @v3_call_center.telemetry

    # States
    @call_timer_interval = undefined
    @timer_start = undefined
    @duration_time = ko.observable 0
    @data_channel_opened = false
    @termination_reason = undefined

    @is_connected = ko.observable false
    @is_group = @conversation_et.is_group

    @self_client_joined = ko.observable false
    @self_user_joined = ko.observable false
    @state = ko.observable z.calling.enum.CallState.UNKNOWN
    @previous_state = undefined
    @state_timer = undefined

    @participants = ko.observableArray []
    @max_number_of_participants = 0
    @interrupted_participants = ko.observableArray []

    # Media
    @local_media_stream = @v3_call_center.media_stream_handler.local_media_stream
    @local_media_type = @v3_call_center.media_stream_handler.local_media_type
    @remote_media_type = ko.observable z.media.MediaType.NONE

    # Statistics
    @_reset_timer()

    # Computed values
    @is_declined = ko.pureComputed => @state() is z.calling.enum.CallState.REJECTED

    @is_ongoing_on_another_client = ko.pureComputed =>
      return @self_user_joined() and not @self_client_joined()

    @is_remote_screen_send = ko.pureComputed =>
      return @remote_media_type() is z.media.MediaType.SCREEN
    @is_remote_video_send = ko.pureComputed =>
      return @remote_media_type() is z.media.MediaType.VIDEO

    @network_interruption = ko.pureComputed =>
      if @is_connected() and not @is_group()
        return @interrupted_participants().length > 0
      return false

    @participants_count = ko.pureComputed =>
      return @get_number_of_participants @self_user_joined()

    # Observable subscriptions
    @is_connected.subscribe (is_connected) =>
      return unless is_connected
      @telemetry.track_event z.tracking.EventName.CALLING.ESTABLISHED_CALL, @
      @timer_start = Date.now() - 100
      @call_timer_interval = window.setInterval =>
        @update_timer_duration()
      , 1000

    @is_declined.subscribe (is_declined) => @_stop_call_sound true if is_declined

    @network_interruption.subscribe (is_interrupted) ->
      if is_interrupted
        return amplify.publish z.event.WebApp.AUDIO.PLAY_IN_LOOP, z.audio.AudioType.NETWORK_INTERRUPTION
      amplify.publish z.event.WebApp.AUDIO.STOP, z.audio.AudioType.NETWORK_INTERRUPTION

    @participants_count.subscribe (users_in_call) =>
      @max_number_of_participants = Math.max users_in_call, @max_number_of_participants

    @self_client_joined.subscribe (is_joined) =>
      return if is_joined
      @is_connected false
      amplify.publish z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.TALK_LATER if @state() in [z.calling.enum.CallState.DISCONNECTING, z.calling.enum.CallState.ONGOING]
      @telemetry.track_duration @ if @termination_reason
      @_reset_timer()
      @_reset_e_flows()

    @state.subscribe (state) =>
      @logger.debug "E-call state '#{@id}' changed to '#{state}'"

      @_clear_state_timeout()

      if state in z.calling.enum.CallStateGroups.STOP_RINGING
        @_on_state_stop_ringing()
      else if state in z.calling.enum.CallStateGroups.IS_RINGING
        @_on_state_start_ringing state is z.calling.enum.CallState.INCOMING

      if state is z.calling.enum.CallState.CONNECTING
        attributes = direction: if @previous_state is z.calling.enum.CallState.OUTGOING then z.calling.enum.CallState.OUTGOING else z.calling.enum.CallState.INCOMING
        @telemetry.track_event z.tracking.EventName.CALLING.JOINED_CALL, @, attributes

      @previous_state = state

    @conversation_et.call @

  update_timer_duration: =>
    @duration_time Math.floor (Date.now() - @timer_start) / 1000


  ###############################################################################
  # Call states
  ###############################################################################

  check_group_activity: (termination_reason) =>
    @leave_call termination_reason unless @participants().length

  deactivate_call: (e_call_message_et, termination_reason = z.calling.enum.TERMINATION_REASON.SELF_USER) =>
    return if @participants().length

    reason = if @state() in z.calling.enum.CallStateGroups.WAS_MISSED then z.calling.enum.TERMINATION_REASON.MISSED else z.calling.enum.TERMINATION_REASON.COMPLETED
    @termination_reason = termination_reason
    @v3_call_center.inject_deactivate_event e_call_message_et, @creating_user, reason
    @v3_call_center.delete_call @id

  delete_call: =>
    @state z.calling.enum.CallState.ENDED
    @reset_call()

  join_call: =>
    @set_self_state true

    if @state() is z.calling.enum.CallState.INCOMING
      @state z.calling.enum.CallState.CONNECTING

    if @is_group()
      additional_payload = @v3_call_center.create_payload_prop_sync z.media.MediaType.AUDIO, false, @v3_call_center.create_additional_payload(@id)
      @send_e_call_event z.calling.mapper.ECallMessageMapper.build_group_start @state() is z.calling.enum.CallState.CONNECTING, @session_id, additional_payload
    else
      @add_e_participant undefined, @conversation_et.participating_user_ets()[0]

  leave_call: (termination_reason) =>
    if @state() is z.calling.enum.CallState.ONGOING and not @is_group()
      @state z.calling.enum.CallState.DISCONNECTING

    event_promises = []
    e_call_message_et = undefined

    for e_flow_et in @get_flows()
      additional_payload = @v3_call_center.create_additional_payload @id, e_flow_et.remote_user_id, e_flow_et.remote_client_id
      if @is_connected()
        e_call_message_et = z.calling.mapper.ECallMessageMapper.build_hangup false, @session_id, additional_payload
      else
        e_call_message_et = z.calling.mapper.ECallMessageMapper.build_cancel false, @session_id, additional_payload

      event_promises.push @send_e_call_event e_call_message_et

    Promise.all event_promises
    .then =>
      return Promise.all (@delete_e_participant e_participant_et.id for e_participant_et in @participants())
    .then =>
      if @is_group()
        additional_payload = @v3_call_center.create_additional_payload @id
        e_call_message_et = z.calling.mapper.ECallMessageMapper.build_group_leave false, @session_id, additional_payload
        @send_e_call_event e_call_message_et

      @set_self_state false, termination_reason
      @deactivate_call e_call_message_et, termination_reason

  reject_call: =>
    @state z.calling.enum.CallState.REJECTED
    @send_e_call_event z.calling.mapper.ECallMessageMapper.build_reject false, @session_id, @v3_call_center.create_additional_payload @id

  set_self_state: (joined_state, termination_reason) =>
    @self_user_joined joined_state
    @self_client_joined joined_state
    @termination_reason = termination_reason if termination_reason and not @termination_reason

  toggle_media: (media_type) =>
    send_promises = []

    for e_flow_et in @get_flows()
      additional_payload = @v3_call_center.create_payload_prop_sync media_type, true, @v3_call_center.create_additional_payload @id, e_flow_et.remote_user_id, e_flow_et.remote_client_id
      send_promises.push @send_e_call_event z.calling.mapper.ECallMessageMapper.build_prop_sync false, @session_id, additional_payload

    return Promise.all send_promises


  ###############################################################################
  # Call states
  ###############################################################################

  confirm_message: (incoming_e_call_message_et) =>
    additional_payload = @v3_call_center.create_additional_payload @id, incoming_e_call_message_et.user_id, incoming_e_call_message_et.client_id

    switch incoming_e_call_message_et.type
      when z.calling.enum.E_CALL_MESSAGE_TYPE.HANGUP
        e_call_message_et = z.calling.mapper.ECallMessageMapper.build_hangup true, @session_id, additional_payload
      when z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC
        e_call_message_et = z.calling.mapper.ECallMessageMapper.build_prop_sync true, @session_id, @v3_call_center.create_payload_prop_sync(z.media.MediaType.VIDEO, additional_payload)

    @send_e_call_event e_call_message_et

  send_e_call_event: (e_call_message_et) =>
    @v3_call_center.send_e_call_event @conversation_et, e_call_message_et

  set_remote_version: (e_call_message_et) =>
    if e_call_message_et.sdp
      @telemetry.set_remote_version z.calling.mapper.SDPMapper.get_tool_version e_call_message_et.sdp

  _on_state_start_ringing: (is_incoming) =>
    @_play_call_sound is_incoming
    @_set_state_timeout is_incoming

  _on_state_stop_ringing: =>
    if @previous_state in z.calling.enum.CallStateGroups.IS_RINGING
      @_stop_call_sound @previous_state is z.calling.enum.CallState.INCOMING

  _clear_state_timeout: =>
    window.clearTimeout @state_timeout
    @state_timeout = undefined

  _play_call_sound: (is_incoming) ->
    sound_id = if is_incoming then z.audio.AudioType.INCOMING_CALL else z.audio.AudioType.OUTGOING_CALL
    amplify.publish z.event.WebApp.AUDIO.PLAY_IN_LOOP, sound_id

  _set_state_timeout: (is_incoming) =>
    @state_timeout = window.setTimeout =>
      @_stop_call_sound is_incoming
      if is_incoming
        return @state z.calling.enum.CallState.REJECTED if @is_group()
        amplify.publish z.event.WebApp.CALL.STATE.DELETE, @id
      else
        amplify.publish z.event.WebApp.CALL.STATE.LEAVE, @id
    , E_CALL_CONFIG.STATE_TIMEOUT

  _stop_call_sound: (is_incoming) ->
    sound_id = if is_incoming then z.audio.AudioType.INCOMING_CALL else z.audio.AudioType.OUTGOING_CALL
    amplify.publish z.event.WebApp.AUDIO.STOP, sound_id

  _update_remote_state: ->
    media_type_changed = false

    for e_participant_et in @participants()
      if e_participant_et.state.screen_send()
        @remote_media_type z.media.MediaType.SCREEN
        media_type_changed = true
      else if e_participant_et.state.video_send()
        @remote_media_type z.media.MediaType.VIDEO
        media_type_changed = true
    @remote_media_type z.media.MediaType.AUDIO unless media_type_changed


  ###############################################################################
  # Participants
  ###############################################################################

  ###
  Add an e-participant to the e-call.
  @param e_call_message_et [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
  @param user_et [z.entities.User] User entity to be added to the e-call
  @param negotiate [Boolean] Should negotiation be started
  ###
  add_e_participant: (e_call_message_et, user_et, negotiate = true) =>
    @get_e_participant_by_id user_et.id
    .then =>
      # we do not always have an e call message
      @update_e_participant e_call_message_et, negotiate, user_et.id
    .catch (error) =>
      throw error unless error.type is z.calling.v3.CallError::TYPE.NOT_FOUND

      e_participant_et = new z.calling.entities.EParticipant @, user_et, @timings, e_call_message_et
      @participants.push e_participant_et
      e_participant_et.start_negotiation() if negotiate
      @logger.debug "Adding e-call participant '#{user_et.name()}'", e_participant_et
      @_update_remote_state()
      return e_participant_et

  ###
  Remove an e-participant from the call.
  @param user_id [String] ID of user to be removed from the e-call
  @param client_id [String] ID of client that requested the removal from the e-call
  @return [z.calling.entities.ECall] E-call entity
  ###
  delete_e_participant: (user_id, client_id, termination_reason) =>
    @get_e_participant_by_id user_id
    .then (e_participant_et) =>
      if client_id
        e_participant_et.verify_client_id client_id
      e_participant_et.reset_participant()
      @interrupted_participants.remove e_participant_et
      @participants.remove e_participant_et
      @_update_remote_state()
      @v3_call_center.media_element_handler.remove_media_element user_id

      switch termination_reason
        when z.calling.enum.TERMINATION_REASON.OTHER_USER
          amplify.publish z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.TALK_LATER
        when z.calling.enum.TERMINATION_REASON.CONNECTION_DROP, z.calling.enum.TERMINATION_REASON.MEMBER_LEAVE
          amplify.publish z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.CALL_DROP

      @logger.debug "Removed e-call participant '#{e_participant_et.user.name()}'"
      return @
    .catch (error) ->
      throw error unless error.type is z.calling.v3.CallError::TYPE.NOT_FOUND

  ###
  Get the number of participants in the call.
  @param add_self_user [Boolean] Add self user to count
  @return [Number] Number of participants in call
  ###
  get_number_of_participants: (add_self_user) =>
    if add_self_user
      return @participants().length + 1
    return @participants().length

  ###
  Get a call participant by his id.
  @param user_id [String] User ID of participant to be returned
  @return [z.calling.entities.EParticipant] E-call participant that matches given user ID
  ###
  get_e_participant_by_id: (user_id) =>
    for e_participant_et in @participants() when e_participant_et.id is user_id
      return Promise.resolve e_participant_et
    return Promise.reject new z.calling.v3.CallError z.calling.v3.CallError::TYPE.NOT_FOUND, 'No participant for given user ID found'

  ###
  Update e-call participant with e-call message.
  @param e_call_message_et [z.calling.entities.ECallMessage] E-call message to update user with
  @param negotiate [Boolean] Should negotiation be started
  ###
  update_e_participant: (e_call_message_et, negotiate = false, user_et) =>
    @get_e_participant_by_id e_call_message_et.user_id or user_et.id
    .then (e_participant_et) =>
      if e_call_message_et.client_id
        e_participant_et.verify_client_id e_call_message_et.client_id
      @logger.debug "Updating e-call participant '#{e_participant_et.user.name()}'", e_call_message_et
      e_participant_et.update_state e_call_message_et
      .then =>
        e_participant_et.start_negotiation() if negotiate
        @_update_remote_state()
        return e_participant_et
    .catch (error) ->
      throw error unless error.type is z.calling.v3.CallError::TYPE.NOT_FOUND

  ###
  Verify e-call message belongs to e-call by session id.

  @private
  @param e_call_message_et [z.calling.entities.ECallMessage] E-call message entity
  @return [Undefined] Returns if verification is passed, otherwise throws an error
  ###
  verify_session_id: (e_call_message_et) =>
    return @ if e_call_message_et.session_id is @session_id

    return @get_e_participant_by_id e_call_message_et.user_id
    .then (e_participant_et) =>
      return @ if e_call_message_et.session_id is e_participant_et.session_id
      throw new z.calling.v3.CallError z.calling.v3.CallError::TYPE.WRONG_SENDER, 'Session IDs not matching'


  ###############################################################################
  # Misc
  ###############################################################################

  ###
  Get all flows of the call.
  @return [Array<z.calling.Flow>] Array of flows
  ###
  get_flows: =>
    return (e_participant_et.e_flow_et for e_participant_et in @participants() when e_participant_et.e_flow_et)

  ###
  Get full flow telemetry report of the call.
  @return [Array<Object>] Array of flow telemetry reports for calling service automation
  ###
  get_flow_telemetry: =>
    return (e_participant_et.e_flow_et.get_telemetry() for e_participant_et in @participants() when e_participant_et.e_flow_et)

  initiate_telemetry: (video_send = false) =>
    @telemetry.set_media_type video_send
    @timings = new z.telemetry.calling.CallSetupTimings @id

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

    for e_participant_et, i in @participants()
      panning = @_calculate_panning i, @participants().length
      @logger.info "Panning for '#{e_participant_et.user.name()}' recalculated to '#{panning}'"
      e_participant_et.panning panning

    @logger.info "New panning order: #{(e_participant_et.user.name() for e_participant_et in @participants()).join ', '}"


  ###############################################################################
  # Reset
  ###############################################################################

  ###
  Reset the call states.
  @private
  ###
  reset_call: =>
    @set_self_state false
    @is_connected false
    @session_id = undefined
    @termination_reason = undefined
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
  _reset_e_flows: ->
    e_participant_et.e_flow_et.reset_flow() for e_participant_et in @participants() when e_participant_et.e_flow_et


  ###############################################################################
  # Logging
  ###############################################################################

  # Log flow status to console.
  log_status: =>
    flow_et.log_status() for flow_et in @get_flows()

  # Log flow setup step timings to console.
  log_timings: =>
    flow_et.log_timings() for flow_et in @get_flows()
