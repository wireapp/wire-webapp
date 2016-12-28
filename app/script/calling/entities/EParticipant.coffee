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
  @param e_call_message [z.calling.entities.ECallMessage] E-call setup message entity
  ###
  constructor: (@e_call_et, @user, e_call_message) ->
    @id = @user.id

    @is_connected = ko.observable false
    @panning = ko.observable 0.0
    @was_connected = false

    @state =
      audio_send: ko.observable true
      screen_send: ko.observable false
      video_send: ko.observable false

    @e_flow = new z.calling.entities.EFlow @e_call_et, @, e_call_message
    @update_properties e_call_message.props if e_call_message

    @is_connected.subscribe (is_connected) ->
      if is_connected and not @was_connected
        amplify.publish z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.READY_TO_TALK
        @was_connected = true

  update_state: (e_call_message) =>
    @update_properties e_call_message.props
    if e_call_message.type is z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
      @e_flow.save_remote_sdp e_call_message

  update_properties: (properties) =>
    if properties
      @state.audio_send properties.audiosend in [true, 'true'] if properties.audiosend?
      @state.screen_send properties.screensend in [true, 'true'] if properties.screensend?
      @state.video_send properties.videosend in [true, 'true'] if properties.videosend?
