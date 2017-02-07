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
z.announce ?= {}

ANNOUNCE_CONFIG =
  CHECK_TIMEOUT: 5 * 60 * 1000
  CHECK_INTERVAL: 3 * 60 * 60 * 1000
  UPDATE_INTERVAL: 6 * 60 * 60 * 1000

class z.announce.AnnounceRepository
  constructor: (@announce_service) ->
    @logger = new z.util.Logger 'z.announce.AnnounceRepository', z.config.LOGGER.OPTIONS
    return @

  init: ->
    window.setTimeout =>
      @check_announcements()
      @schedule_checks()
    , ANNOUNCE_CONFIG.CHECK_TIMEOUT

  check_announcements: =>
    @announce_service.get_announcements()
    .then @process_announce_list
    .catch (error) =>
      @logger.error "Failed to fetch announcements: #{error}"

  check_version: =>
    @announce_service.get_version()
    .then (server_version) =>
      @logger.info "Found new version #{server_version}"
      amplify.publish z.event.WebApp.LIFECYCLE.UPDATE, z.announce.UPDATE_SOURCE.WEBAPP if server_version > z.util.Environment.version false, true
    .catch (error) =>
      @logger.error "Failed to fetch version: #{error}"

  schedule_checks: =>
    window.setInterval @check_announcements, ANNOUNCE_CONFIG.CHECK_INTERVAL
    window.setInterval @check_version, ANNOUNCE_CONFIG.UPDATE_INTERVAL

  process_announce_list: (announcements_list) =>
    if announcements_list
      for announcement in announcements_list
        if not z.util.Environment.frontend.is_localhost()
          continue if announcement.version_max and z.util.Environment.version(false) > announcement.version_max
          continue if announcement.version_min and z.util.Environment.version(false) < announcement.version_min
        key = "#{z.storage.StorageKey.ANNOUNCE.ANNOUNCE_KEY}@#{announcement.key}"
        if not z.util.StorageUtil.get_value key
          z.util.StorageUtil.set_value key, 'read'
          return if not z.util.Environment.browser.supports.notifications
          return if window.Notification.permission is z.system_notification.PermissionStatusState.DENIED

          if z.localization.Localizer.locale isnt 'en'
            announcement.title = announcement["title_#{z.localization.Localizer.locale}"] or announcement.title
            announcement.message = announcement["message_#{z.localization.Localizer.locale}"] or announcement.message

          notification = new window.Notification announcement.title,
            body: announcement.message
            icon: if z.util.Environment.electron and z.util.Environment.os.mac then '' else '/image/logo/notification.png'
            sticky: true
            requireInteraction: true

          amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ANNOUNCE.SENT, campaign: announcement.campaign
          @logger.info "Announcement '#{announcement.title}' shown"

          notification.onclick = =>
            amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ANNOUNCE.CLICKED, campaign: announcement.campaign
            @logger.info "Announcement '#{announcement.title}' clicked"
            if announcement.link
              z.util.safe_window_open announcement.link
            if announcement.refresh
              amplify.publish z.event.WebApp.LIFECYCLE.REFRESH
            notification.close()
          break
