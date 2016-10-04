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

SETTING =
  ALL: '0'
  NONE: '2'
  SOME: '1'

LOCALYTICS_SOUND_SETTING =
  ALL: 'alwaysPlay'
  SOME: 'FirstMessageOnly'
  NONE: 'neverPlay'


class z.ViewModel.content.PreferencesOptionsViewModel
  constructor: (element_id) ->
    @logger = new z.util.Logger 'z.ViewModel.content.PreferencesOptionsViewModel', z.config.LOGGER.OPTIONS

    @data_setting = ko.observable()
    @data_setting.subscribe (setting) => @user_repository.save_property_data_settings setting

    @sound_setting = ko.observable()
    @sound_setting.subscribe (setting) =>
      audio_setting = z.audio.AudioSetting.ALL
      tracking_value = LOCALYTICS_SOUND_SETTING.ALL

      if setting is SETTING.SOME
        audio_setting = z.audio.AudioSetting.SOME
        tracking_value = LOCALYTICS_SOUND_SETTING.SOME
      else if setting is SETTING.NONE
        audio_setting = z.audio.AudioSetting.NONE
        tracking_value = LOCALYTICS_SOUND_SETTING.NONE

      @user_repository.save_property_sound_alerts audio_setting
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SOUND_SETTINGS_CHANGED, value: tracking_value

    amplify.subscribe z.event.WebApp.PROPERTIES.UPDATED, @update_properties

  connect_google: ->
    amplify.publish z.event.WebApp.CONNECT.IMPORT_CONTACTS, z.connect.ConnectSource.GMAIL, z.connect.ConnectTrigger.SETTINGS
    amplify.publish z.event.WebApp.SEARCH.SHOW

  connect_osx_contacts: ->
    amplify.publish z.event.WebApp.CONNECT.IMPORT_CONTACTS, z.connect.ConnectSource.ICLOUD, z.connect.ConnectTrigger.SETTINGS
    amplify.publish z.event.WebApp.SEARCH.SHOW

  update_properties: (properties) =>
    if properties.settings.sound.alerts is z.audio.AudioSetting.ALL
      @sound_setting SETTING.ALL
    else if properties.settings.sound.alerts is z.audio.AudioSetting.SOME
      @sound_setting SETTING.SOME
    else if properties.settings.sound.alerts is z.audio.AudioSetting.NONE
      @sound_setting SETTING.NONE

    @data_setting properties.settings.privacy.report_errors
