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

# E-Participant entity.
class z.calling.entities.EParticipant
  ###
  Construct a new e-participant.
  @param e_call [z.calling.entities.ECall] E-call entity
  @param user [z.entity.User] User entity to base the participant on
  @param timings [z.telemetry.calling.CallSetupTimings] Timing statistics of call setup steps
  @param e_call_message_et [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
  ###
  constructor: (@e_call_et, @user, timings, e_call_message_et) ->
    @id = @user.id
    @session_id = undefined

    @is_connected = ko.observable false
    @panning = ko.observable 0.0
    @was_connected = false

    @state =
      audio_send: ko.observable true
      screen_send: ko.observable false
      video_send: ko.observable false

    @e_flow_et = new z.calling.entities.EFlow @e_call_et, @, timings, e_call_message_et
    @update_properties e_call_message_et.props if e_call_message_et

    @is_connected.subscribe (is_connected) ->
      if is_connected and not @was_connected
        amplify.publish z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.READY_TO_TALK
        @was_connected = true

  reset_participant: =>
    if @e_flow_et
      @e_flow_et.reset_flow()

  start_negotiation: =>
    @e_flow_et.start_negotiation()

  update_state: (e_call_message_et) =>
    @update_properties e_call_message_et.props
    .then =>
      @session_id = e_call_message_et.session_id
      unless e_call_message_et.type is z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC
        @e_flow_et.save_remote_sdp e_call_message_et

  update_properties: (properties) =>
    Promise.resolve()
    .then =>
      if properties
        @state.audio_send properties.audiosend is 'true' if properties.audiosend?
        @state.screen_send properties.screensend is 'true' if properties.screensend?
        @state.video_send properties.videosend is 'true' if properties.videosend?

  verify_client_id: (client) =>
    throw new z.calling.v3.CallError z.calling.v3.CallError::TYPE.WRONG_SENDER, 'Sender ID missing' unless client

    if @e_flow_et.remote_client_id
      throw new z.calling.v3.CallError z.calling.v3.CallError::TYPE.WRONG_SENDER unless client is @e_flow_et.remote_client_id
    @e_flow_et.remote_client_id = client
