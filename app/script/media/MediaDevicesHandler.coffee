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

# MediaDevices handler
class z.media.MediaDevicesHandler
  ###
  Construct a new MediaDevices handler.
  @param media_repository [z.media.MediaRepository] Media repository referencing the other handlers
  ###
  constructor: (@media_repository) ->
    @logger = new z.util.Logger 'z.media.MediaDevicesHandler', z.config.LOGGER.OPTIONS

    @available_devices =
      audio_input: ko.observableArray []
      audio_output: ko.observableArray []
      screen_input: ko.observableArray []
      video_input: ko.observableArray []

    @current_device_id =
      audio_input: ko.observable()
      audio_output: ko.observable()
      screen_input: ko.observable()
      video_input: ko.observable()

    @current_device_index =
      audio_input: ko.observable 0
      audio_output: ko.observable 0
      screen_input: ko.observable 0
      video_input: ko.observable 0

    @has_camera = ko.pureComputed => return @available_devices.video_input().length > 0
    @has_microphone = ko.pureComputed => return @available_devices.audio_input().length > 0

    @initialize_media_devices()

  # Initialize the list of MediaDevices and subscriptions
  initialize_media_devices: =>
    return if not z.media.MediaRepository.supports_media_devices()

    @get_media_devices()
    .then =>
      @_set_current_devices()
      @_subscribe_to_observables()
      @_subscribe_to_devices()

  # Set current media device IDs.
  _set_current_devices: =>
    @current_device_id.audio_input z.util.StorageUtil.get_value(z.media.MediaDeviceType.AUDIO_INPUT) or 'default'
    @current_device_id.audio_output z.util.StorageUtil.get_value(z.media.MediaDeviceType.AUDIO_OUTPUT) or 'default'
    @current_device_id.video_input z.util.StorageUtil.get_value z.media.MediaDeviceType.VIDEO_INPUT

    if not @current_device_id.video_input() and @available_devices.video_input().length
      default_device_index = @available_devices.video_input().length - 1
      @current_device_id.video_input @available_devices.video_input()[default_device_index].deviceId
      @current_device_index.video_input default_device_index

    @logger.log @logger.levels.INFO, 'Set selected MediaDevice IDs'

  # Subscribe to MediaDevices updates if available.
  _subscribe_to_devices: =>
    if navigator.mediaDevices.ondevicechange?
      navigator.mediaDevices.ondevicechange = =>
        @logger.log @logger.levels.INFO, 'List of available MediaDevices has changed'
        @get_media_devices()

  # Subscribe to Knockout observables.
  _subscribe_to_observables: =>
    @available_devices.audio_input.subscribe (media_devices) =>
      @_update_current_index_from_devices z.media.MediaDeviceType.AUDIO_INPUT, media_devices if media_devices

    @available_devices.audio_output.subscribe (media_devices) =>
      @_update_current_index_from_devices z.media.MediaDeviceType.AUDIO_OUTPUT, media_devices if media_devices

    @available_devices.screen_input.subscribe (media_devices) =>
      @_update_current_index_from_devices z.media.MediaDeviceType.SCREEN_INPUT, media_devices if media_devices

    @available_devices.video_input.subscribe (media_devices) =>
      @_update_current_index_from_devices z.media.MediaDeviceType.VIDEO_INPUT, media_devices if media_devices

    @current_device_id.audio_input.subscribe (media_device_id) =>
      z.util.StorageUtil.set_value z.media.MediaDeviceType.AUDIO_INPUT, media_device_id
      if media_device_id and @media_repository.stream_handler.local_media_streams.audio()
        @media_repository.stream_handler.replace_input_source z.media.MediaType.AUDIO
        @_update_current_index_from_id z.media.MediaDeviceType.AUDIO_INPUT, media_device_id

    @current_device_id.audio_output.subscribe (media_device_id) =>
      z.util.StorageUtil.set_value z.media.MediaDeviceType.AUDIO_OUTPUT, media_device_id
      if media_device_id
        @media_element_handler.switch_media_element_output media_device_id
        @_update_current_index_from_id z.media.MediaDeviceType.AUDIO_OUTPUT, media_device_id

    @current_device_id.screen_input.subscribe (media_device_id) =>
      if media_device_id and @media_repository.stream_handler.local_media_streams.video() and @media_repository.stream_handler.local_media_type() is z.media.MediaType.SCREEN
        @media_repository.stream_handler.replace_input_source z.media.MediaType.SCREEN
        @_update_current_index_from_id z.media.MediaDeviceType.SCREEN_INPUT, media_device_id

    @current_device_id.video_input.subscribe (media_device_id) =>
      z.util.StorageUtil.set_value z.media.MediaDeviceType.VIDEO_INPUT, media_device_id
      if media_device_id and @media_repository.stream_handler.local_media_streams.video() and @media_repository.stream_handler.local_media_type() is z.media.MediaType.VIDEO
        @media_repository.stream_handler.replace_input_source z.media.MediaType.VIDEO
        @_update_current_index_from_id z.media.MediaDeviceType.VIDEO_INPUT, media_device_id

  ###
  Update list of available MediaDevices.
  @return [Promise] Promise that resolves with all MediaDevices when the list has been updated
  ###
  get_media_devices: =>
    navigator.mediaDevices.enumerateDevices()
    .then (media_devices) =>
      if media_devices
        @_remove_all_devices()
        for media_device in media_devices
          switch media_device.kind
            when z.media.MediaDeviceType.AUDIO_INPUT
              @available_devices.audio_input.push media_device
            when z.media.MediaDeviceType.AUDIO_OUTPUT
              @available_devices.audio_output.push media_device
            when z.media.MediaDeviceType.VIDEO_INPUT
              @available_devices.video_input.push media_device

        @logger.log @logger.levels.INFO, 'Updated MediaDevice list', media_devices
        return media_devices
      throw new z.media.MediaError z.media.MediaError::TYPE.NO_MEDIA_DEVICES_FOUND
    .catch (error) =>
      @logger.log @logger.levels.ERROR, "Failed to update MediaDevice list: #{error.message}", error

  ###
  Update list of available Screens.
  @return [Promise] Promise that resolves with all screen sources when the list has been updated
  ###
  get_screen_sources: ->
    return new Promise (resolve, reject) =>
      options =
        types: ['screen']
        thumbnailSize:
          width: 312
          height: 176

      window.desktopCapturer.getSources options, (error, screen_sources) =>
        if error
          reject error
        else
          @logger.log @logger.levels.INFO, "Found '#{screen_sources.length}' possible sources for screen sharing on Electron", screen_sources
          @available_devices.screen_input screen_sources
          if screen_sources.length is 1
            @current_device_id.screen_input ''
            @logger.log @logger.levels.INFO, "Selected '#{screen_sources[0].name}' for screen sharing", screen_sources[0]
            @current_device_id.screen_input screen_sources[0].id
          resolve screen_sources

  # Toggle between the available cameras.
  toggle_next_camera: =>
    @get_media_devices()
    .then =>
      [current_device, current_index] = @_get_current_device @available_devices.video_input(), @current_device_id.video_input()
      next_device = @available_devices.video_input()[z.util.iterate_array_index(@available_devices.video_input(), @current_device_index.video_input()) or 0]
      @current_device_id.video_input next_device.deviceId
      @logger.log @logger.levels.INFO, "Switching the active camera from '#{current_device.label or current_device.deviceId}' to '#{next_device.label or next_device.deviceId}'"

  # Toggle between the available screens.
  toggle_next_screen: =>
    @get_screen_sources()
    .then =>
      [current_device, current_index] = @_get_current_device @available_devices.screen_input(), @current_device_id.screen_input()
      next_device = @available_devices.screen_input()[z.util.iterate_array_index(@available_devices.screen_input(), @current_device_index.screen_input()) or 0]
      @current_device_id.screen_input next_device.id
      @logger.log @logger.levels.INFO, "Switching the active screen from '#{current_device.name or current_device.id}' to '#{next_device.name or next_device.id}'"

  ###
  Check for availability of selected devices.
  @param is_videod [Boolean] Also check for video devices
  ###
  update_current_devices: (is_videod) =>
    @get_media_devices()
    .then =>
      _check_device = (media_type, device_type) =>
        device_type = @_type_conversion device_type
        device_id_observable = @current_device_id["#{device_type}"]
        media_devices = @available_devices["#{device_type}"]()
        [media_device, media_device_index] = @_get_current_device media_devices, device_id_observable()
        if not media_device.deviceId
          if updated_device = @available_devices["#{device_type}"]()[0]
            device_id_observable updated_device.deviceId
            @logger.log @logger.levels.WARN,
              "Current '#{media_type}' device '#{device_id_observable()}' not found and replaced by '#{updated_device.label or updated_device.deviceId}'", media_devices
          else
            @logger.log @logger.levels.WARN, "Current '#{media_type}' device '#{device_id_observable()}' not found and reset'", media_devices
            device_id_observable ''

      _check_device z.media.MediaType.AUDIO, z.media.MediaDeviceType.AUDIO_INPUT
      _check_device z.media.MediaType.VIDEO, z.media.MediaDeviceType.VIDEO_INPUT if is_videod

  ###
  Get the currently selected MediaDevice.

  @param media_devices [Array] Array of MediaDevices
  @param current_device_id [String] ID of selected MediaDevice
  @return [Array] Selected MediaDevice and its array index
  ###
  _get_current_device: (media_devices, current_device_id) ->
    for media_device, index in media_devices when media_device.deviceId is current_device_id or media_device.id is current_device_id
      return [media_device, index]
    return [{}, 0]

  ###
  Remove all known MediaDevices from the lists.
  @private
  ###
  _remove_all_devices: ->
    @available_devices.audio_input.removeAll()
    @available_devices.audio_output.removeAll()
    @available_devices.video_input.removeAll()

  ###
  Add underscore to MediaDevice types.
  @private
  @param device_type [String] Device type string to update
  @return [String]
  ###
  _type_conversion: (device_type) ->
    device_type = device_type.replace('input', '_input').replace 'output', '_output'

  ###
  Update the current index by searching for the current device.

  @private
  @param index_observable [ko.obserable] Observable containing the current index
  @param available_devices [Array] Array of MediaDevices
  @param current_device_id [String] Current device ID to look for
  ###
  _update_current_device_index: (index_observable, available_devices, current_device_id) ->
    [media_device, current_device_index] = @_get_current_device available_devices, current_device_id
    index_observable current_device_index if _.isNumber current_device_index

  ###
  Update the index for current device after the list of devices changed.
  @private
  @param device_type [z.media.MediaDeviceType] MediaDeviceType to be updates
  @param available_devices [Array] Array of MediaDevices
  ###
  _update_current_index_from_devices: (device_type, available_devices) =>
    device_type = @_type_conversion device_type
    @_update_current_device_index @current_device_index["#{device_type}"], available_devices, @current_device_id["#{device_type}"]()

  ###
  Update the index for current device after the current device changed.
  @private
  @param device_type [z.media.MediaDeviceType] MediaDeviceType to be updates
  @param selected_input_device_id [String] ID of selected input device
  ###
  _update_current_index_from_id: (device_type, selected_input_device_id) ->
    device_type = @_type_conversion device_type
    @_update_current_device_index @current_device_index["#{device_type}"], @available_devices["#{device_type}"](), selected_input_device_id
