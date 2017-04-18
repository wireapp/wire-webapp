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
  constructor: (element_id, @properties_repository) ->
    @logger = new z.util.Logger 'z.ViewModel.content.PreferencesOptionsViewModel', z.config.LOGGER.OPTIONS

    @option_privacy = ko.observable()
    @option_privacy.subscribe (privacy_preference) =>
      @properties_repository.save_preference z.properties.PROPERTIES_TYPE.PRIVACY, privacy_preference

    @option_audio = ko.observable()
    @option_audio.subscribe (audio_preference) =>
      tracking_value = switch audio_preference
        when z.audio.AudioPreference.ALL then 'alwaysPlay'
        when z.audio.AudioPreference.SOME then 'firstMessageOnly'
        when z.audio.AudioPreference.NONE then 'neverPlay'

      @properties_repository.save_preference z.properties.PROPERTIES_TYPE.SOUND_ALERTS, audio_preference
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SOUND_SETTINGS_CHANGED, value: tracking_value

    @option_notifications = ko.observable()
    @option_notifications.subscribe (notifications_preference) =>
      @properties_repository.save_preference z.properties.PROPERTIES_TYPE.NOTIFICATIONS, notifications_preference

    amplify.subscribe z.event.WebApp.PROPERTIES.UPDATED, @update_properties

  connect_google_contacts: ->
    amplify.publish z.event.WebApp.CONNECT.IMPORT_CONTACTS, z.connect.ConnectSource.GMAIL

  connect_macos_contacts: ->
    amplify.publish z.event.WebApp.CONNECT.IMPORT_CONTACTS, z.connect.ConnectSource.ICLOUD

  update_properties: (properties) =>
    @option_audio properties.settings.sound.alerts
    @option_privacy properties.settings.privacy.report_errors
    @option_notifications properties.settings.notifications
