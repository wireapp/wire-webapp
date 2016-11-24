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
    @panning = @flow_et.participant_et.panning
    @panning.subscribe (new_value) =>
      @logger.log @logger.levels.INFO, "Panning of #{@flow_et.remote_user.name()} changed to '#{new_value}'"
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
      @_hookup_audio()
    else
      @audio_source.disconnect() if @audio_source?

  inject_audio_file: (audio_file_path, callback) =>
    return if not @audio_context?

    # Load audio file
    request = new XMLHttpRequest()
    request.open 'GET', audio_file_path, true
    request.responseType = 'arraybuffer'
    request.onload = =>
      load = (buffer) =>
        @logger.log @logger.levels.INFO, "Loaded audio from '#{audio_file_path}'"
        # Play audio file
        audio_buffer = buffer
        file_source = @audio_context.createBufferSource()
        file_source.buffer = audio_buffer
        @audio_source.disconnect()
        file_source.connect @audio_remote
        file_source.onended = =>
          @logger.log @logger.levels.INFO, 'Finished playing audio file'
          file_source.disconnect @audio_remote
          @_hookup_audio()

          if callback?
            @logger.log @logger.levels.INFO, 'Invoking callback after playing audio file'
            callback()

        @logger.log @logger.levels.INFO, 'Playing audio file'
        file_source.start()
      fail = =>
        @logger.log @logger.levels.ERROR, "Failed to load audio from '#{audio_file_path}'"
      @audio_context.decodeAudioData request.response, load, fail
    request.send()

  set_gain_node: (is_muted) =>
    if @gain_node
      if is_muted
        @gain_node.gain.value = 0
      else
        @gain_node.gain.value = 1
      @logger.log @logger.levels.INFO, "Outgoing audio on flow muted '#{is_muted}'"

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
      @logger.log @logger.levels.INFO, 'Wrapped audio stream from microphone', media_stream
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
        @logger.log @logger.levels.INFO, "Wrapped audio stream to speaker to create stereo. Initial panning set to '#{@panning()}'.", media_stream
    return media_stream

  _hookup_audio: =>
    @audio_source.connect @gain_node if @audio_source
    @gain_node.connect @audio_remote if @gain_node
