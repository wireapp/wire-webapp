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

class z.calling.entities.FlowAudio
  constructor: (@flow_et, @audio_context) ->
    @logger = new z.util.Logger "z.calling.FlowAudio (#{@flow_et.id})", z.config.LOGGER.OPTIONS

    # Panning
    @panning = @flow_et.participant_et?.panning or @flow_et.e_participant_et.panning
    @panning.subscribe (new_value) =>
      @logger.info "Panning of #{@flow_et.remote_user.name()} changed to '#{new_value}'"
      @set_pan new_value

    @pan_node = undefined
    @gain_node = undefined
    @audio_source = undefined
    @audio_remote = undefined

    amplify.subscribe z.event.WebApp.CALL.MEDIA.MUTE_AUDIO, @set_gain_node

  ###
  @param is_active [Boolean] Whether the flow is active
  ###
  hookup: (is_active) =>
    if is_active is true
      return @_hookup_audio()
    @audio_source.disconnect() if @audio_source?

  set_gain_node: (is_muted) =>
    if @gain_node
      if is_muted
        @gain_node.gain.value = 0
      else
        @gain_node.gain.value = 1
      @logger.info "Outgoing audio on flow muted '#{is_muted}'"

  set_pan: (panning_value) =>
    if @pan_node
      @pan_node.pan.value = panning_value

  wrap_microphone_stream: (media_stream) =>
    if @audio_context
      @audio_source = @audio_context.createMediaStreamSource media_stream
      @gain_node = @audio_context.createGain()
      @audio_remote = @audio_context.createMediaStreamDestination()
      @_hookup_audio()
      $.extend true, media_stream, @audio_remote.stream
      @logger.info 'Wrapped audio stream from microphone', media_stream
    return media_stream

  wrap_speaker_stream: (media_stream) =>
    if z.util.Environment.browser.firefox
      if @audio_context
        remote_source = @audio_context.createMediaStreamSource media_stream
        @pan_node = @audio_context.createStereoPanner()
        @pan_node.pan.value = @panning()
        speaker = @audio_context.createMediaStreamDestination()
        remote_source.connect @pan_node
        @pan_node.connect speaker
        $.extend true, media_stream, speaker.stream
        @logger.info "Wrapped audio stream to speaker to create stereo. Initial panning set to '#{@panning()}'.", media_stream
    return media_stream

  _hookup_audio: =>
    @audio_source.connect @gain_node if @audio_source
    @gain_node.connect @audio_remote if @gain_node
