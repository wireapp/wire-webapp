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

# Participant entity.
class z.calling.entities.Participant
  ###
  Construct a new participant.
  @param user [z.entity.User] User entity to base the participant on
  ###
  constructor: (@user) ->
    @flow = ko.observable()
    @is_connected = ko.observable false
    @panning = ko.observable 0.0
    @was_connected = false

    @state =
      audio_send: ko.observable true
      screen_send: ko.observable false
      video_send: ko.observable false

    @is_connected.subscribe (is_connected) ->
      if is_connected and not @was_connected
        amplify.publish z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.READY_TO_TALK
        @was_connected = true

  ###
  Add a new flow to the participant.
  @param flow_et [z.calling.Flow] Flow entity to be added to the flow
  ###
  add_flow: (flow_et) =>
    @flow flow_et unless @flow()?.id is flow_et.id


  ###
  Get the flow of the participant.
  @return [z.calling.Flow] Flow entity of participant
  ###
  get_flow: =>
    return @flow()
