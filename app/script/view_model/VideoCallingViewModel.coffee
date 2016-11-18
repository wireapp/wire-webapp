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
z.ViewModel ?= {}


class z.ViewModel.VideoCallingViewModel
  constructor: (element_id, @call_center, @conversation_repository, @media_repository, @user_repository, @multitasking) ->
    @logger = new z.util.Logger 'z.ViewModel.VideoCallingViewModel', z.config.LOGGER.OPTIONS

    @self_user = @user_repository.self

    @available_devices = @media_repository.devices_handler.available_devices
    @current_device_id = @media_repository.devices_handler.current_device_id
    @current_device_index = @media_repository.devices_handler.current_device_index

    @local_video_stream = @media_repository.stream_handler.local_media_streams.video
    @remote_video_stream = @media_repository.stream_handler.remote_media_streams.video

    @self_stream_state = @media_repository.stream_handler.self_stream_state

    @is_choosing_screen = ko.observable false

    @minimize_timeout = undefined

    @remote_video_element_contain = ko.observable false

    @number_of_screen_devices = ko.observable 0
    @number_of_video_devices = ko.observable 0

    @joined_call = @call_center.joined_call

    @videod_call = ko.pureComputed =>
      for call_et in @call_center.calls()
        is_active = call_et.state() in z.calling.enum.CallStateGroups.IS_ACTIVE
        is_self_videod = call_et.self_client_joined() and @self_stream_state.screen_shared() or @self_stream_state.videod()
        is_remote_videod = (call_et.is_remote_screen_shared() or call_et.is_remote_videod()) and not call_et.is_ongoing_on_another_client()
        return call_et if is_active and (is_self_videod or is_remote_videod or @is_choosing_screen())

    @is_ongoing = ko.pureComputed =>
      return @videod_call()? and @joined_call()?.state() is z.calling.enum.CallState.ONGOING

    @overlay_icon_class = ko.pureComputed =>
      if @is_ongoing()
        if @self_stream_state.muted()
          return 'icon-mute'
        else if not @self_stream_state.screen_shared() and not @self_stream_state.videod()
          return 'icon-video-off'

    @remote_user = ko.pureComputed =>
      return @joined_call()?.participants()[0]?.user

    @show_local = ko.pureComputed =>
      return (@show_local_video() or @overlay_icon_class()) and not @multitasking.is_minimized() and not @is_choosing_screen()
    @show_local_video = ko.pureComputed =>
      is_visible = @self_stream_state.screen_shared() or @self_stream_state.videod() or @videod_call()?.state() isnt z.calling.enum.CallState.ONGOING
      return is_visible and @local_video_stream()

    @show_remote = ko.pureComputed =>
      return @show_remote_video() or @show_remote_participant() or @is_choosing_screen()
    @show_remote_participant = ko.pureComputed =>
      is_visible = @remote_user() and not @multitasking.is_minimized() and not @is_choosing_screen()
      return @is_ongoing() and not @show_remote_video() and is_visible
    @show_remote_video = ko.pureComputed =>
      is_visible = (@joined_call()?.is_remote_screen_shared() or @joined_call()?.is_remote_videod()) and @remote_video_stream()
      return @is_ongoing() and is_visible

    @show_switch_camera = ko.pureComputed =>
      is_visible = @local_video_stream() and @available_devices.video_input().length > 1 and @self_stream_state.videod()
      return @is_ongoing() and is_visible
    @show_switch_screen = ko.pureComputed =>
      is_visible = @local_video_stream() and @available_devices.screen_input().length > 1 and @self_stream_state.screen_shared()
      return @is_ongoing() and is_visible

    @show_controls = ko.pureComputed =>
      is_visible = @show_remote_video() or @show_remote_participant() and not @multitasking.is_minimized()
      return @is_ongoing() and is_visible
    @show_toggle_screen = ko.pureComputed ->
      return z.calling.CallCenter.supports_screen_sharing()
    @disable_toggle_screen = ko.pureComputed =>
      return @joined_call()?.is_remote_screen_shared()

    @joined_call.subscribe (joined_call) =>
      if joined_call
        if @show_local_video() or @show_remote_video()
          @multitasking.is_minimized false
          @logger.log @logger.levels.INFO, "Displaying call '#{joined_call.id}' full-screen", joined_call
        else
          @multitasking.is_minimized true
        @logger.log @logger.levels.INFO, "Minimizing call '#{joined_call.id}' that is not videod", joined_call
      else
        @multitasking.auto_minimize true
        @multitasking.is_minimized false
        @logger.log @logger.levels.INFO, 'Resetting full-screen calling to maximize'

    @available_devices.screen_input.subscribe (media_devices) =>
      if _.isArray media_devices then @number_of_screen_devices media_devices.length else @number_of_screen_devices 0
    @available_devices.video_input.subscribe (media_devices) =>
      if _.isArray media_devices then @number_of_video_devices media_devices.length else @number_of_video_devices 0
    @show_remote_participant.subscribe (show_remote_participant) =>
      if @minimize_timeout
        window.clearTimeout @minimize_timeout
        @minimize_timeout = undefined

      if show_remote_participant and @multitasking.auto_minimize() and @videod_call() and not @is_choosing_screen()
        @logger.log @logger.levels.INFO, "Scheduled minimizing call '#{@videod_call().id}' on timeout as remote user '#{@remote_user()?.name()}' is not videod"
        @minimize_timeout = window.setTimeout =>
          @multitasking.is_minimized true if not @is_choosing_screen()
          @logger.log @logger.levels.INFO, "Minimizing call '#{@videod_call().id}' on timeout as remote user '#{@remote_user()?.name()}' is not videod"
        , 4000

    amplify.subscribe z.event.WebApp.CALL.STATE.TOGGLE_SCREEN, @choose_shared_screen

    ko.applyBindings @, document.getElementById element_id

  choose_shared_screen: (conversation_id) =>
    return if @disable_toggle_screen()

    if @self_stream_state.screen_shared() or z.util.Environment.browser.firefox
      @call_center.state_handler.toggle_screen conversation_id

    else if z.util.Environment.electron
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CALLING.SHARED_SCREEN,
        conversation_type: if @joined_call().is_group() then z.tracking.attribute.ConversationType.GROUP else z.tracking.attribute.ConversationType.ONE_TO_ONE
        kind_of_call_when_sharing: if @joined_call().is_remote_videod() then 'video' else 'audio'

      @media_repository.devices_handler.get_screen_sources()
      .then (screen_sources) =>
        if screen_sources.length > 1
          @is_choosing_screen true
          if @multitasking.is_minimized()
            @multitasking.reset_minimize true
            @multitasking.is_minimized false
        else
          @call_center.state_handler.toggle_screen conversation_id
      .catch (error) =>
        @logger.log @logger.levels.ERROR, 'Unable to get screens sources for sharing', error

  clicked_on_cancel_call: =>
    @call_center.state_handler.leave_call @joined_call()?.id

  clicked_on_cancel_screen: =>
    @is_choosing_screen false

  clicked_on_mute_audio: =>
    @call_center.state_handler.toggle_audio @joined_call()?.id

  clicked_on_share_screen: =>
    @choose_shared_screen @joined_call().id

  clicked_on_choose_screen: (screen_source) =>
    @current_device_id.screen_input ''
    @logger.log @logger.levels.INFO, "Selected '#{screen_source.name}' for screen sharing", screen_source
    @is_choosing_screen false
    @current_device_id.screen_input screen_source.id
    @call_center.state_handler.toggle_screen @joined_call().id
    if @multitasking.reset_minimize()
      @multitasking.is_minimized true
      @multitasking.reset_minimize false
      @logger.log @logger.levels.INFO, "Minimizing call '#{@joined_call().id}' on screen selection to return to previous state"

  clicked_on_stop_video: =>
    @call_center.state_handler.toggle_video @joined_call()?.id

  clicked_on_toggle_camera: =>
    @media_repository.devices_handler.toggle_next_camera()

  clicked_on_toggle_screen: =>
    @media_repository.devices_handler.toggle_next_screen()

  clicked_on_minimize: =>
    @multitasking.is_minimized true
    @logger.log @logger.levels.INFO, "Minimizing call '#{@videod_call().id}' on user click"

  clicked_on_maximize: =>
    @multitasking.is_minimized false
    @logger.log @logger.levels.INFO, "Maximizing call '#{@videod_call().id}' on user click"

  double_clicked_on_remote_video: =>
    @remote_video_element_contain not @remote_video_element_contain()
    @logger.log @logger.levels.INFO, "Switched remote video object-fit. Contain is '#{@remote_video_element_contain()}'"

  # Detect the aspect ratio of a MediaElement and set the video mode.
  on_loadedmetadata: (view_model, event) =>
    media_element = event.target
    if media_element.videoHeight > media_element.videoWidth
      @remote_video_element_contain true
      detected_video_mode = z.calling.enum.VideoOrientation.PORTRAIT
    else
      @remote_video_element_contain false
      detected_video_mode = z.calling.enum.VideoOrientation.LANDSCAPE
    @logger.log @logger.levels.INFO, "Remote video is in '#{detected_video_mode}' mode"


# http://stackoverflow.com/questions/28762211/unable-to-mute-html5-video-tag-in-firefox
ko.bindingHandlers.mute_media_element =
  update: (element, valueAccessor) ->
    element.muted = true if valueAccessor()


ko.bindingHandlers.source_stream =
  update: (element, valueAccessor) ->
    element.srcObject = valueAccessor()
