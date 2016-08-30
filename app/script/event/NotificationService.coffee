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
z.event ?= {}

# Notification Service for all notification stream calls to the backend REST API.
class z.event.NotificationService
  PRIMARY_KEY_LAST_NOTIFICATION: 'z.storage.StorageKey.NOTIFICATION.LAST_ID'
  URL_NOTIFICATIONS: '/notifications'
  URL_NOTIFICATIONS_LAST: '/notifications/last'
  ###
  Construct a new Notification Service.
  @param client [z.service.Client] Client for the API calls
  ###
  constructor: (@client, @storage_service) ->
    @logger = new z.util.Logger 'z.event.NotificationService', z.config.LOGGER.OPTIONS

  ###
  Get notifications from the stream.

  @param size [Integer] Maximum number of notifications to return
  @param client_id [String] Only return notifications targeted at the given client
  @param since [String] Only return notifications more recent than this notification ID (like "7130304a-c839-11e5-8001-22000b0fe035")
  @return [Promise] Promise that resolves with the notifications
  ###
  get_notifications: (client_id, notification_id, size) ->
    @client.send_request
      url: @client.create_url @URL_NOTIFICATIONS
      type: 'GET'
      data:
        client: client_id
        since: notification_id
        size: size

  ###
  Get the last notification for a given client.
  @param client_id [String] Only return notifications targeted at the given client
  ###
  get_notifications_last: (client_id) ->
    @client.send_request
      url: @client.create_url @URL_NOTIFICATIONS_LAST
      type: 'GET'
      data:
        client: client_id

  ###
  Load last notifications id from storage.
  @return [Promise] Promise that resolves with the stored last notification ID.
  ###
  get_last_notification_id_from_db: =>
    return new Promise (resolve, reject) =>
      @storage_service.load @storage_service.OBJECT_STORE_AMPLIFY, @PRIMARY_KEY_LAST_NOTIFICATION
      .then (record) =>
        if record?.value
          resolve record.value
        else
          @logger.log @logger.levels.WARN, 'Last notification ID not found in storage'
          reject new z.event.EventError z.event.EventError::TYPE.NO_LAST_ID
      .catch (error) =>
        @logger.log @logger.levels.ERROR, "Failed to get last notification ID from storage: #{error.message}", error
        reject new z.event.EventError z.event.EventError::TYPE.DATABASE_FAILURE

  ###
  Load last notifications id from storage.
  @param notification_id [String] Notification ID to be stored
  @return [Promise] Promise that will resolve with the stored record
  ###
  save_last_notification_id_to_db: (notification_id) =>
    payload = value: notification_id
    return @storage_service.save @storage_service.OBJECT_STORE_AMPLIFY, @PRIMARY_KEY_LAST_NOTIFICATION, payload
