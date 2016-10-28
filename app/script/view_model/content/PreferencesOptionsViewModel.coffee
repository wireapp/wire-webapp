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
z.ViewModel.content ?= {}


class z.ViewModel.content.PreferencesOptionsViewModel
  constructor: (element_id, @call_center, @user_properties_repository) ->
    @logger = new z.util.Logger 'z.ViewModel.content.PreferencesOptionsViewModel', z.config.LOGGER.OPTIONS

    @media_devices_handler = @call_center.media_devices_handler
    @available_devices = @media_devices_handler.available_devices
    @current_device_id = @media_devices_handler.current_device_id

    @media_stream_handler = @call_center.media_stream_handler
    @audio_stream = @media_stream_handler.local_media_streams.audio
    @video_stream = @media_stream_handler.local_media_streams.video

    @audio_stream.subscribe (audio_stream) =>
      @initiate_audio_meter audio_stream if audio_stream

    @audio_context = undefined
    @audio_level = ko.observable 0
    @audio_script = undefined

    @option_data = ko.observable()
    @option_data.subscribe (data_preference) => @user_properties_repository.save_preference_data data_preference

    @option_audio = ko.observable()
    @option_audio.subscribe (audio_preference) =>
      tracking_value = switch audio_preference
        when z.audio.AudioPreference.ALL then 'alwaysPlay'
        when z.audio.AudioPreference.SOME then 'firstMessageOnly'
        when z.audio.AudioPreference.NONE then 'neverPlay'

      @user_properties_repository.save_preference_sound_alerts audio_preference
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SOUND_SETTINGS_CHANGED, value: tracking_value

    @option_notifications = ko.observable()
    @option_notifications.subscribe (notifications_preference) => @user_properties_repository.save_preference_notifications notifications_preference

    amplify.subscribe z.event.WebApp.PROPERTIES.UPDATED, @update_properties

  connect_google: ->
    amplify.publish z.event.WebApp.CONNECT.IMPORT_CONTACTS, z.connect.ConnectSource.GMAIL, z.connect.ConnectTrigger.SETTINGS
    amplify.publish z.event.WebApp.SEARCH.SHOW

  connect_macos_contacts: ->
    amplify.publish z.event.WebApp.CONNECT.IMPORT_CONTACTS, z.connect.ConnectSource.ICLOUD, z.connect.ConnectTrigger.SETTINGS
    amplify.publish z.event.WebApp.SEARCH.SHOW

  # Initiate the MediaStream.
  initiate_media_stream: =>
    return Promise.resolve @audio_stream() if @audio_stream() and @video_stream()

    @media_stream_handler.get_media_stream_constraints @available_devices.audio_input().length, @available_devices.video_input().length
    .then ([media_type, media_stream_constraints]) =>
      return @media_stream_handler.request_media_stream media_type, media_stream_constraints
    .then (media_stream_info) =>
      @media_stream_handler.local_media_type z.calling.enum.MediaType.VIDEO if @available_devices.video_input().length
      @media_stream_handler.set_local_media_stream media_stream_info
      return @audio_stream()
    .catch (error) =>
      @logger.log @logger.levels.ERROR, "Requesting MediaStream failed: #{error.name}", error
      throw error

  initiate_audio_meter: (audio_stream) =>
    @audio_context = @call_center.audio_repository.get_audio_context()
    @audio_script = @audio_context.createScriptProcessor 2048, 1, 1

    @audio_script.onaudioprocess = (audio_processing_event) =>
      inputs = audio_processing_event.inputBuffer.getChannelData 0
      level = 0.0
      for input in inputs
        level += input * input
      @audio_level (Math.sqrt level / inputs.length) * 3

    @audio_source = @audio_context.createMediaStreamSource audio_stream
    @audio_source.connect @audio_script
    @audio_script.connect @audio_context.destination

  release_audio_meter: =>
    @audio_source.disconnect()
    @audio_script.disconnect()

  release_media_streams: =>
    @release_audio_meter()
    @media_stream_handler.reset_media_streams()

  update_properties: (properties) =>
    @option_audio properties.settings.sound.alerts
    @option_data properties.settings.privacy.report_errors
    @option_notifications properties.settings.notifications
