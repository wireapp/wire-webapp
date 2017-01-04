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

# E-call entity.
class z.calling.entities.ECall
  ###
  Construct a new e-call entity.
  @param conversation_et [z.entity.Conversation] Conversation the call takes place in
  @param self_user [z.entity.User] Self user entity
  ###
  constructor: (@conversation_et, @creating_user, @session_id, @e_call_center) ->
    @logger = new z.util.Logger "z.calling.entities.ECall (#{@conversation_et.id})", z.config.LOGGER.OPTIONS

    # IDs and references
    @id = @conversation_et.id
    @timings = undefined

    @audio_repository = @e_call_center.media_repository.audio_repository
    @config = @e_call_center.calling_config
    @self_user = @e_call_center.user_repository.self()
    @self_state = @e_call_center.self_state

    # States
    @call_timer_interval = undefined
    @timer_start = undefined
    @duration_time = ko.observable 0
    @remote_media_type = ko.observable z.media.MediaType.NONE
    @data_channel_opened = false

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
    @local_audio_stream = ko.observable @e_call_center.media_stream_handler.local_media_streams.audio
    @local_video_stream = ko.observable @e_call_center.media_stream_handler.local_media_streams.video

    # Statistics
    @_reset_timer()

    # Computed values
    @is_declined = ko.pureComputed => @state() is z.calling.enum.CallState.IGNORED

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
      if @self_user_joined()
        return @get_number_of_participants() + 1
      return @get_number_of_participants()

    # Observable subscriptions
    @is_connected.subscribe (is_connected) =>
      return unless is_connected
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
      amplify.publish z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.CALL_DROP if @state() in [z.calling.enum.CallState.DISCONNECTING, z.calling.enum.CallState.ONGOING]
      @_reset_timer()
      @_reset_e_flows()

    @state.subscribe (state) =>
      @logger.debug "E-call state '#{@id}' changed to '#{state}'"

      @_clear_state_timeout()

      if state in z.calling.enum.CallStateGroups.STOP_RINGING
        @_on_state_stop_ringing()
      else if state in z.calling.enum.CallStateGroups.IS_RINGING
        @_on_state_start_ringing state is z.calling.enum.CallState.INCOMING

      @previous_state = state

    @conversation_et.call @

  update_timer_duration: =>
    @duration_time Math.floor (Date.now() - @timer_start) / 1000


  ###############################################################################
  # Call states
  ###############################################################################

  send_e_call_event: (e_call_message) =>
    @e_call_center.send_e_call_event @conversation_et, e_call_message

  start_negotiation: =>
    @self_client_joined true
    @self_user_joined true
    e_participant_et.e_flow_et.start_negotiation() for e_participant_et in @participants() when e_participant_et.e_flow_et

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
        return @state z.calling.enum.CallState.IGNORED if @is_group()
        amplify.publish z.event.WebApp.CALL.STATE.DELETE, @id
      else
        amplify.publish z.event.WebApp.CALL.STATE.LEAVE, @id
    , 30000

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
  @param e_participant_et [z.calling.entities.EParticipant] E-participant entity to be added to the e-call
  @param e_call_message [z.calling.entities.ECallSetupMessage] E-call setup message entity
  ###
  add_participant: (user_et, e_call_message) =>
    @get_participant_by_id user_et.id
    .catch (error) =>
      throw error unless error.type is z.calling.e_call.ECallError::TYPE.PARTICIPANT_NOT_FOUND

      @logger.debug "Adding e-call participant '#{user_et.name()}'"
      @participants.push new z.calling.entities.EParticipant @, user_et, @timings, e_call_message
      @_update_remote_state()
      return @

  ###
  Remove an e-participant from the call.
  @param e_participant_et [z.calling.entities.EParticipant] E-Participant entity to be removed from the e-call
  @return [z.calling.entities.ECall] E-call entity
  ###
  delete_participant: (e_participant_et) =>
    @get_participant_by_id e_participant_et.id
    .then (e_participant_et) =>
      @interrupted_participants.remove e_participant_et
      @participants.remove e_participant_et
      @_update_remote_state()
      @logger.debug "Removed e-call participant '#{e_participant_et.user.name()}'"
      return @
    .catch (error) ->
      throw error unless error.type is z.calling.e_call.ECallError::TYPE.PARTICIPANT_NOT_FOUND


  ###
  Get the number of participants in the call.
  @return [Number] Number of participants in call excluding the self user
  ###
  get_number_of_participants: =>
    return @participants().length

  ###
  Get a call participant by his id.
  @param user_id [String] User ID of participant to be returned
  @return [z.calling.entities.EParticipant] E-call participant that matches given user ID
  ###
  get_participant_by_id: (user_id) =>
    for e_participant_et in @participants() when e_participant_et.id is user_id
      return Promise.resolve e_participant_et
    return Promise.reject new z.calling.e_call.ECallError z.calling.e_call.ECallError::TYPE.PARTICIPANT_NOT_FOUND

  ###
  Update e-call participant with e-call message.
  @param user_et [z.entity.User] User to be updated
  @param e_call_message [z.calling.entities.ECallMessage] E-call message to update user with
  ###
  update_participant: (user_et, e_call_message) =>
    @get_participant_by_id user_et.id
    .then (e_participant_et) =>
      @logger.debug "Updating e-call participant '#{user_et.name()}'", e_call_message
      e_participant_et.update_state e_call_message
      @_update_remote_state()
      return @
    .catch (error) ->
      throw error unless error.type is z.calling.e_call.ECallError::TYPE.PARTICIPANT_NOT_FOUND


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
    return (e_participant_et.e_flow_et.get_telemetry() for e_participant_et in @participants() when participant.e_flow_et)

  start_timings: =>
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
    @self_client_joined false
    @self_user_joined false
    @is_connected false
    @session_id = undefined
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
