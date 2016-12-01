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
z.properties ?= {}

# Properties repository for all property interactions with the user property service.
class z.properties.PropertiesRepository
  ###
  Construct a new User properties repository.
  @param properties_service [z.properties.PropertiesService] Backend REST API properties service implementation
  @param self [ko.observable] Backend REST API user properties service implementation
  ###
  constructor: (@properties_service) ->
    @logger = new z.util.Logger 'z.properties.PropertiesRepository', z.config.LOGGER.OPTIONS

    @properties = new z.properties.Properties()
    @self = ko.observable()

    amplify.subscribe z.event.WebApp.PROPERTIES.UPDATED, @properties_updated

  # Initialize properties on app startup.
  init: (self_user_et) =>
    @properties_service.get_properties()
    .then (response) =>
      @self self_user_et
      if response.includes z.config.PROPERTIES_KEY
        @properties_service.get_properties_by_key z.config.PROPERTIES_KEY
        .then (response) =>
          $.extend true, @properties, response
          @logger.log @logger.levels.INFO, 'Loaded user properties', @properties
      else
        @logger.log @logger.levels.INFO, 'User has no saved properties, using defaults'
    .then =>
      amplify.publish z.event.WebApp.PROPERTIES.UPDATED, @properties
      amplify.publish z.event.WebApp.ANALYTICS.INIT, @properties
      return @properties

  properties_updated: (properties) ->
    if properties.enable_debugging
      amplify.publish z.util.Logger::LOG_ON_DEBUG, properties.enable_debugging
    return true

  ###
  Save timestamp for Google Contacts import.
  @param timestamp [String] Timestamp to be saved
  ###
  save_preference_contact_import_google: (timestamp) =>
    @properties.contact_import.google = timestamp
    @_save_properties 'contact_import.google', timestamp
    .then -> amplify.publish z.event.WebApp.PROPERTIES.UPDATE.CONTACTS_GOOGLE, timestamp

  ###
  Save timestamp for macOS Contacts import.
  @param timestamp [String] Timestamp to be saved
  ###
  save_preference_contact_import_macos: (timestamp) =>
    @properties.contact_import.macos = timestamp
    @_save_properties 'contact_import.macos', timestamp
    .then -> amplify.publish z.event.WebApp.PROPERTIES.UPDATE.CONTACTS_MACOS, timestamp

  ###
  Save data settings.
  @param is_enabled [String] Data setting to be saved
  ###
  save_preference_data: (is_enabled) =>
    return if @properties.settings.privacy.report_errors is is_enabled

    @properties.settings.privacy.report_errors = is_enabled
    @properties.settings.privacy.improve_wire = is_enabled
    @_save_properties 'settings.privacy', is_enabled
    .then -> amplify.publish z.event.WebApp.PROPERTIES.UPDATE.SEND_DATA, is_enabled

  ###
  Save debug logging setting.
  @param is_enabled [Boolean] Should debug logging be enabled despite domain
  ###
  save_preference_enable_debugging: (is_enabled) =>
    return if @properties.enable_debugging is is_enabled

    @properties.enable_debugging = is_enabled
    @_save_properties 'enable_debugging', is_enabled
    .then -> amplify.publish z.util.Logger::LOG_ON_DEBUG, is_enabled

  # Save when user has created a conversation.
  save_preference_has_created_conversation: =>
    @properties.has_created_conversation = true
    @_save_properties 'has_created_conversation', @properties.has_created_conversation
    .then -> amplify.publish z.event.WebApp.PROPERTIES.UPDATE.HAS_CREATED_CONVERSATION

  ###
  Save notifications preference.
  @param sound_alerts [String] Notification setting to be saved
  ###
  save_preference_notifications: (notifications_preference) =>
    return if @properties.settings.notifications is notifications_preference

    @properties.settings.notifications = notifications_preference
    @_save_properties 'settings.notifications', @properties.settings.notifications
    .then -> amplify.publish z.event.WebApp.PROPERTIES.UPDATE.NOTIFICATIONS, notifications_preference

  ###
  Save audio preference.
  @param sound_alerts [String] Audio setting to be saved
  ###
  save_preference_sound_alerts: (sound_alerts) =>
    return if @properties.settings.sound.alerts is sound_alerts

    @properties.settings.sound.alerts = sound_alerts
    @_save_properties 'settings.sound.alerts', @properties.settings.sound.alerts
    .then -> amplify.publish z.event.WebApp.PROPERTIES.UPDATE.SOUND_ALERTS, sound_alerts

  ###
  Save the user properties.

  @private
  @param key [String] User properties key name to update
  @param value
  ###
  _save_properties: (key, value) ->
    @properties_service.put_properties_by_key z.config.PROPERTIES_KEY, @properties
    .then =>
      @logger.log @logger.levels.INFO, "Saved updated settings: '#{key}' - '#{value}'"
