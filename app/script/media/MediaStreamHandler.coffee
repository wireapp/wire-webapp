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
z.media ?= {}

# MediaStream handler
class z.media.MediaStreamHandler
  ###
  Detect whether a MediaStream has a video MediaStreamTrack attached
  @param media_stream [MediaStream] MediaStream to detect the type off
  @return [MediaStream] MediaStream with new type information
  ###
  @detect_media_stream_type: (media_stream) ->
    if media_stream.getVideoTracks()?.length
      if media_stream.getAudioTracks()?.length
        media_stream.type = z.media.MediaType.AUDIO_VIDEO
      else
        media_stream.type = z.media.MediaType.VIDEO
    else if media_stream.getAudioTracks()?.length
      media_stream.type = z.media.MediaType.AUDIO
    else
      media_stream.type = z.media.MediaType.NONE
    return media_stream

  ###
  Get MediaStreamTracks from a MediaStream.

  @param media_stream [MediaStream] MediaStream to get tracks from
  @param media_type [z.media.MediaType.AUDIO_VIDEO]
  @return [Array] Array of MediaStreamTracks optionally matching the requested type
  ###
  @get_media_tracks: (media_stream, media_type = z.media.MediaType.AUDIO_VIDEO) ->
    switch media_type
      when z.media.MediaType.AUDIO
        media_stream_tracks = media_stream.getAudioTracks()
      when z.media.MediaType.AUDIO_VIDEO
        media_stream_tracks = media_stream.getTracks()
      when z.media.MediaType.VIDEO
        media_stream_tracks = media_stream.getVideoTracks()
    return media_stream_tracks

  ###
  Construct a new MediaStream handler.
  @param media_repository [z.media.MediaRepository] Media repository with with references to all other handlers
  ###
  constructor: (@media_repository) ->
    @logger = new z.util.Logger 'z.media.MediaDevicesHandler', z.config.LOGGER.OPTIONS

    @calls = -> return []
    @joined_call = -> return undefined

    @local_media_stream = ko.observable()

    @remote_media_streams =
      audio: ko.observableArray []
      video: ko.observable()

    @self_stream_state =
      audio_send: ko.observable true
      screen_send: ko.observable false
      video_send: ko.observable false

    @local_media_type = ko.observable z.media.MediaType.AUDIO

    @request_hint_timeout = undefined

    @current_device_id = @media_repository.devices_handler.current_device_id

    amplify.subscribe z.event.WebApp.CALL.MEDIA.ADD_STREAM, @add_remote_media_stream


  ###############################################################################
  # MediaStream constraints
  ###############################################################################

  ###
  Get the MediaStreamConstraints to be used for MediaStream creation.

  @private
  @param request_audio [Boolean] Request audio in the constraints
  @param request_video [Boolean] Request video in the constraints
  @return [Object] MediaStreamConstraints
  ###
  get_media_stream_constraints: (request_audio = false, request_video = false) ->
    Promise.resolve()
    .then =>
      constraints =
        audio: if request_audio then @_get_audio_stream_constraints @current_device_id.audio_input() else undefined
        video: if request_video then @_get_video_stream_constraints @current_device_id.video_input() else undefined
      media_type = if request_video then z.media.MediaType.VIDEO else z.media.MediaType.AUDIO
      return [media_type, constraints]

  ###
  Get the MediaStreamConstraints to be used for screen sharing.
  @return [Object] MediaStreamConstraints
  ###
  get_screen_stream_constraints: =>
    return new Promise (resolve, reject) =>
      if window.desktopCapturer
        @logger.info 'Enabling screen sharing from Electron'

        constraints =
          audio: false
          video:
            mandatory:
              chromeMediaSource: 'desktop'
              chromeMediaSourceId: @current_device_id.screen_input()
              maxHeight: 720
              maxWidth: 1280
              minWidth: 1280
              minHeight: 720

        resolve [z.media.MediaType.SCREEN, constraints]

      else if z.util.Environment.browser.firefox
        @logger.info 'Enabling screen sharing from Firefox'

        constraints =
          audio: false
          video:
            mediaSource: 'screen'

        resolve [z.media.MediaType.SCREEN, constraints]
      else
        reject new z.media.MediaError z.media.MediaError::TYPE.SCREEN_NOT_SUPPORTED

  ###
  Get the video constraints to be used for MediaStream creation.
  @private
  @param media_device_id [String] Optional ID of MediaDevice to be used
  @return [Object] Video stream constraints
  ###
  _get_audio_stream_constraints: (media_device_id) ->
    if _.isString media_device_id
      media_stream_constraints =
        deviceId:
          exact: media_device_id
    else
      media_stream_constraints = true

    return media_stream_constraints

  ###
  Get the video constraints to be used for MediaStream creation.
  @private
  @param media_device_id [String] Optional ID of MediaDevice to be used
  @return [Object] Video stream constraints
  ###
  _get_video_stream_constraints: (media_device_id) ->
    media_stream_constraints =
      facingMode: 'user'
      frameRate: 30
      width:
        min: 640
        ideal: 640
        max: 1280
      height:
        min: 360
        ideal: 360
        max: 720

    if _.isString media_device_id
      media_stream_constraints.deviceId =
        exact: media_device_id

    return media_stream_constraints


  ###############################################################################
  # Local MediaStream handling
  ###############################################################################

  ###
  Initiate the MediaStream.
  @param conversation_id [String] Conversation ID of call
  @param video_send [Boolean] Should MediaStream contain video
  @return [Promise] Promise that resolve when the MediaStream has been initiated
  ###
  initiate_media_stream: (conversation_id, video_send = false) =>
    @media_repository.devices_handler.update_current_devices video_send
    .then =>
      return @get_media_stream_constraints true, video_send
    .then ([media_type, media_stream_constraints]) =>
      return @request_media_stream media_type, media_stream_constraints
    .then (media_stream_info) =>
      @self_stream_state.video_send video_send
      @local_media_type z.media.MediaType.VIDEO if video_send
      @_initiate_media_stream_success media_stream_info
    .catch (error) =>
      if _.isArray error
        [error, media_type] = error
        @_initiate_media_stream_failure error, media_type, conversation_id
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CALLING.FAILED_REQUESTING_MEDIA, {cause: error.name or error.message, video: video_send}
      throw error

  # Release the MediaStream.
  release_media_stream: =>
    @local_media_stream undefined if @_release_media_stream @local_media_stream()

  ###
  Replace the MediaStream after a change of the selected input device.
  @param media_stream_info [z.media.MediaStreamInfo] Info about new MediaStream
  ###
  replace_media_stream: (media_stream_info) =>
    @logger.debug "Received new MediaStream with '#{media_stream_info.stream.getTracks().length}' MediaStreamTrack(s)",
      {stream: media_stream_info.stream, audio_tracks: media_stream_info.stream.getAudioTracks(), video_tracks: media_stream_info.stream.getVideoTracks()}

    if @joined_call()
      @_set_stream_state media_stream_info
      update_promise = Promise.all (flow_et.update_media_stream media_stream_info for flow_et in @joined_call().get_flows())
    else
      update_promise = Promise.resolve media_stream_info

    update_promise.then (resolve_array) =>
      update_media_stream_info = resolve_array[0]
      @_set_stream_state update_media_stream_info
      @_release_media_stream @local_media_stream()
      @local_media_stream update_media_stream_info.stream

  ###
  Update the used MediaStream after a new input device was selected.
  @param type [z.media.MediaType] Media type of device that was replaced
  ###
  replace_input_source: (media_type) =>
    switch media_type
      when z.media.MediaType.AUDIO
        constraints_promise = @get_media_stream_constraints true, false
      when z.media.MediaType.SCREEN
        constraints_promise = @get_screen_stream_constraints()
      when z.media.MediaType.VIDEO
        constraints_promise = @get_media_stream_constraints false, true

    constraints_promise.then ([media_type, media_stream_constraints]) =>
      return @request_media_stream media_type, media_stream_constraints
    .then (media_stream_info) =>
      @_set_self_stream_state media_type
      return @replace_media_stream media_stream_info
    .catch (error) =>
      [error, media_type] = error if _.isArray error
      if media_type is z.media.MediaType.SCREEN
        return @logger.error "Failed to enable screen sharing: #{error.message}", error
      @logger.error "Failed to replace '#{media_type}' input source: #{error.message}", error

  ###
  Request a MediaStream.

  @param media_type [z.media.MediaType] Type of MediaStream to be requested
  @param media_stream_constraints [RTCMediaStreamConstraints] Constraints for the MediaStream to be requested
  @return [Promise] Promise that will resolve with an array of the stream type and the stream
  ###
  request_media_stream: (media_type, media_stream_constraints) =>
    return new Promise (resolve, reject) =>
      if not @media_repository.devices_handler.has_microphone()
        reject [new z.media.MediaError(z.media.MediaError::TYPE.MEDIA_STREAM_DEVICE), z.media.MediaType.AUDIO]
      else if not @media_repository.devices_handler.has_camera() and media_type is z.media.MediaType.VIDEO
        reject [new z.media.MediaError(z.media.MediaError::TYPE.MEDIA_STREAM_DEVICE), z.media.MediaType.VIDEO]
      else
        @logger.info "Requesting MediaStream access for '#{media_type}'", media_stream_constraints
        @request_hint_timeout = window.setTimeout =>
          @_hide_permission_failed_hint media_type
          @_show_permission_request_hint media_type
          @request_hint_timeout = undefined
        , 200

        navigator.mediaDevices.getUserMedia media_stream_constraints
        .then (media_stream) =>
          @_clear_permission_request_hint media_type
          resolve new z.media.MediaStreamInfo z.media.MediaStreamSource.LOCAL, 'self', media_stream
        .catch (error) =>
          @logger.warn "MediaStream request failed: #{error.name} #{error.message}"
          @_clear_permission_request_hint media_type
          if error.name in z.calling.rtc.MediaStreamErrorTypes.DEVICE
            error = new z.media.MediaError z.media.MediaError::TYPE.MEDIA_STREAM_DEVICE
          else if error.name in z.calling.rtc.MediaStreamErrorTypes.MISC
            error = new z.media.MediaError z.media.MediaError::TYPE.MEDIA_STREAM_MISC
          else if error.name in z.calling.rtc.MediaStreamErrorTypes.PERMISSION
            error = new z.media.MediaError z.media.MediaError::TYPE.MEDIA_STREAM_PERMISSION
          reject [error, media_type]

  set_local_media_stream: (media_stream) =>
    @local_media_stream media_stream

  ###
  Clear the permission request hint timeout or hide the warning.
  @private
  @param media_type [z.media.MediaType] Type of requested stream
  ###
  _clear_permission_request_hint: (media_type) ->
    if @request_hint_timeout
      return window.clearTimeout @request_hint_timeout
    return @_hide_permission_request_hint media_type

  ###
  Hide the permission denied hint banner.
  @private
  @param media_type [z.media.MediaType] Type of requested stream
  ###
  _hide_permission_failed_hint: (media_type) ->
    switch media_type
      when z.media.MediaType.AUDIO
        amplify.publish z.event.WebApp.WARNING.DISMISS, z.ViewModel.WarningType.DENIED_MICROPHONE
      when z.media.MediaType.SCREEN
        amplify.publish z.event.WebApp.WARNING.DISMISS, z.ViewModel.WarningType.DENIED_SCREEN
      when z.media.MediaType.VIDEO
        amplify.publish z.event.WebApp.WARNING.DISMISS, z.ViewModel.WarningType.DENIED_CAMERA

  ###
  Hide the permission request hint banner.
  @private
  @param media_type [z.media.MediaType] Type of requested stream
  ###
  _hide_permission_request_hint: (media_type) ->
    return if z.util.Environment.electron
    switch media_type
      when z.media.MediaType.AUDIO
        amplify.publish z.event.WebApp.WARNING.DISMISS, z.ViewModel.WarningType.REQUEST_MICROPHONE
      when z.media.MediaType.SCREEN
        amplify.publish z.event.WebApp.WARNING.DISMISS, z.ViewModel.WarningType.REQUEST_SCREEN
      when z.media.MediaType.VIDEO
        amplify.publish z.event.WebApp.WARNING.DISMISS, z.ViewModel.WarningType.REQUEST_CAMERA

  ###
  Initial request for local MediaStream was successful.
  @private
  @param media_stream_info [z.media.MediaStreamInfo] Type of requested MediaStream
  ###
  _initiate_media_stream_success: (media_stream_info) =>
    return if not media_stream_info
    @logger.debug "Received initial MediaStream with '#{media_stream_info.stream.getTracks().length}' MediaStreamTrack(s)",
      {stream: media_stream_info.stream, audio_tracks: media_stream_info.stream.getAudioTracks(), video_tracks: media_stream_info.stream.getVideoTracks()}
    @_set_stream_state media_stream_info
    @local_media_stream media_stream_info.stream

  ###
  Local MediaStream creation failed.

  @private
  @param error [MediaStreamError] Error message from navigator.MediaDevices.getUserMedia()
  @param media_type [z.media.MediaType] Type of requested MediaStream
  @param conversation_id [String] Conversation ID
  ###
  _initiate_media_stream_failure: (error, media_type, conversation_id) =>
    if error.type is z.media.MediaError::TYPE.MEDIA_STREAM_DEVICE
      @_show_device_not_found_hint media_type, conversation_id
    else if error.type is z.media.MediaError::TYPE.MEDIA_STREAM_PERMISSION
      @_show_permission_denied_hint media_type
    else
      @_show_permission_denied_hint media_type

  ###
  Release the MediaStream.

  @private
  @param stream [MediaStream] MediaStream to be released
  @param media_type [z.media.MediaType] Type of MediaStreamTracks to be released
  ###
  _release_media_stream: (media_stream, media_type = z.media.MediaType.AUDIO_VIDEO) =>
    return false if not media_stream

    media_stream_tracks = z.media.MediaStreamHandler.get_media_tracks media_stream, media_type

    if media_stream_tracks.length
      for media_stream_track in media_stream_tracks
        media_stream.removeTrack media_stream_track
        media_stream_track.stop()
        @logger.info "Stopping MediaStreamTrack of kind '#{media_stream_track.kind}' successful", media_stream_track
      return true
    @logger.warn 'No MediaStreamTrack found to stop', media_stream
    return false

  ###
  Show microphone not found hin banner.

  @private
  @param media_type [z.media.MediaType] Type of device not found
  @param conversation_id [String] Optional conversation ID
  ###
  _show_device_not_found_hint: (media_type, conversation_id) ->
    if media_type is z.media.MediaType.AUDIO
      amplify.publish z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.NOT_FOUND_MICROPHONE
    else if media_type is z.media.MediaType.VIDEO
      amplify.publish z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.NOT_FOUND_CAMERA
    amplify.publish z.event.WebApp.CALL.STATE.REJECT, conversation_id if conversation_id

  ###
  Show permission denied hint banner.
  @private
  @param media_type [z.media.MediaType] Type of media access request
  ###
  _show_permission_denied_hint: (media_type) ->
    switch media_type
      when z.media.MediaType.AUDIO
        amplify.publish z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.DENIED_MICROPHONE
      when z.media.MediaType.SCREEN
        amplify.publish z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.DENIED_SCREEN
      when z.media.MediaType.VIDEO
        amplify.publish z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.DENIED_CAMERA

  ###
  Show permission request hint banner.
  @private
  @param media_type [z.media.MediaType] Type of requested MediaStream
  ###
  _show_permission_request_hint: (media_type) ->
    return if z.util.Environment.electron
    switch media_type
      when z.media.MediaType.AUDIO
        amplify.publish z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.REQUEST_MICROPHONE
      when z.media.MediaType.SCREEN
        amplify.publish z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.REQUEST_SCREEN
      when z.media.MediaType.VIDEO
        amplify.publish z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.REQUEST_CAMERA


  ###############################################################################
  # Remote MediaStream handling
  ###############################################################################

  ###
  Add a remote MediaStream.
  @param media_stream_info [z.media.MediaStreamInfo] MediaStream information
  ###
  add_remote_media_stream: (media_stream_info) =>
    switch media_stream_info.type
      when z.media.MediaType.AUDIO
        @remote_media_streams.audio.push media_stream_info.stream
      when z.media.MediaType.AUDIO_VIDEO, z.media.MediaType.VIDEO
        @remote_media_streams.video media_stream_info.stream
    @media_repository.element_handler.add_media_element media_stream_info


  ###############################################################################
  # Media handling
  ###############################################################################

  ###
  Check for active calls that need a MediaStream.
  @return [Boolean] Returns true if an active media stream is needed for at least one call
  ###
  needs_media_stream: ->
    for call_et in @calls()
      return true if call_et.is_remote_video_send() and call_et.state() is z.calling.enum.CallState.INCOMING
      return true if call_et.self_client_joined()
    return false

  # Toggle the camera.
  toggle_video_send: =>
    if @local_media_stream() and @local_media_type() is z.media.MediaType.VIDEO
      return @_toggle_video_send()
    return @replace_input_source z.media.MediaType.VIDEO

  # Toggle the mute state of the microphone.
  toggle_audio_send: =>
    return @_toggle_audio_send() if @local_media_stream()
    return Promise.reject new z.media.MediaError z.media.MediaError::TYPE.NO_AUDIO_STREAM_FOUND

  # Toggle the screen.
  toggle_screen_send: =>
    if @local_media_stream() and @local_media_type() is z.media.MediaType.SCREEN
      return @_toggle_screen_send()
    return @replace_input_source z.media.MediaType.SCREEN

  # Reset the enabled states of media types.
  reset_self_states: =>
    @self_stream_state.audio_send true
    @self_stream_state.screen_send false
    @self_stream_state.video_send false
    @local_media_type z.media.MediaType.AUDIO

  # Reset the MediaStream and states.
  reset_media_stream: =>
    if not @needs_media_stream()
      @release_media_stream()
      @reset_self_states()
      @media_repository.close_audio_context()

  ###
  Set the self stream state to reflect current media type.
  @param media_type [z.media.MediaType] Type of state to enable
  ###
  _set_self_stream_state: (media_type) ->
    switch media_type
      when z.media.MediaType.AUDIO
        @self_stream_state.audio_send true
      when z.media.MediaType.SCREEN
        @self_stream_state.video_send false
        @self_stream_state.screen_send true
        @local_media_type z.media.MediaType.SCREEN
      when z.media.MediaType.VIDEO
        @self_stream_state.video_send true
        @self_stream_state.screen_send false
        @local_media_type z.media.MediaType.VIDEO

  ###
  Set the enabled state of a new MediaStream.
  @private
  @param media_stream_info [z.media.MediaStreamInfo] Info about MediaStream to set state off
  ###
  _set_stream_state: (media_stream_info) ->
    if media_stream_info.type in [z.media.MediaType.AUDIO, z.media.MediaType.AUDIO_VIDEO]
      audio_stream_tracks = z.media.MediaStreamHandler.get_media_tracks media_stream_info.stream, z.media.MediaType.AUDIO
      audio_stream_tracks[0].enabled = @self_stream_state.audio_send()

    if media_stream_info.type in [z.media.MediaType.AUDIO_VIDEO, z.media.MediaType.VIDEO]
      video_stream_tracks = z.media.MediaStreamHandler.get_media_tracks media_stream_info.stream, z.media.MediaType.VIDEO
      video_stream_tracks[0].enabled = @self_stream_state.screen_send() or @self_stream_state.video_send()

  ###
  Toggle the audio stream.
  @private
  ###
  _toggle_audio_send: ->
    @_toggle_stream_enabled z.media.MediaType.AUDIO, @local_media_stream(), @self_stream_state.audio_send
    .then (audio_track) =>
      @logger.info "Microphone enabled: #{@self_stream_state.audio_send()}", audio_track
      return @self_stream_state.audio_send()

  ###
  Toggle the screen stream.
  @private
  ###
  _toggle_screen_send: ->
    @_toggle_stream_enabled z.media.MediaType.VIDEO, @local_media_stream(), @self_stream_state.screen_send
    .then (video_track) =>
      @logger.info "Screen enabled: #{@self_stream_state.screen_send()}", video_track
      return @self_stream_state.screen_send()

  ###
  Toggle the video stream.
  @private
  ###
  _toggle_video_send: ->
    @_toggle_stream_enabled z.media.MediaType.VIDEO, @local_media_stream(), @self_stream_state.video_send
    .then (video_track) =>
      @logger.info "Camera enabled: #{@self_stream_state.video_send()}", video_track
      return @self_stream_state.video_send()

  ###
  Toggle the enabled state of a MediaStream.

  @private
  @param media_type [z.media.MediaType] Media type to toggle
  @param media_stream [MediaStream] MediaStream to toggle enabled state off
  @param state_observable [ko.observable] State observable to invert
  @return [MediaStreamTrack] Updated MediaStreamTrack with new enabled state
  ###
  _toggle_stream_enabled: (media_type, media_stream, state_observable) ->
    Promise.resolve()
    .then ->
      state_observable not state_observable()
      media_stream_track = (z.media.MediaStreamHandler.get_media_tracks media_stream, media_type)[0]
      if media_type is z.media.MediaType.AUDIO
        amplify.publish z.event.WebApp.CALL.MEDIA.MUTE_AUDIO, not state_observable()
      enabled_state = state_observable()
      media_stream_track.enabled = enabled_state
      return media_stream_track
