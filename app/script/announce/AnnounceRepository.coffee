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

CHECK_TIMEOUT = 5 * 60 * 1000
CHECK_INTERVAL = 3 * 60 * 60 * 1000

class z.announce.AnnounceRepository
  PRIMARY_KEY_CURRENT_announce: 'local_identity'
  constructor: (@announce_service) ->
    @logger = new z.util.Logger 'z.announce.AnnounceRepository', z.config.LOGGER.OPTIONS
    return @

  init: ->
    window.setTimeout =>
      @fetch_announcements()
      @schedule_check()
    , CHECK_TIMEOUT

  fetch_announcements: =>
    @announce_service.get_announcements()
    .then @process_announce_list
    .catch (error) =>
      @logger.log @logger.levels.ERROR, "Failed to fetch announcements: #{error}"



  schedule_check: =>
    window.setInterval @fetch_announcements, CHECK_INTERVAL

  process_announce_list: (announcements_list) =>
    if announcements_list
      for announcement in announcements_list
        if not z.util.Environment.frontend.is_localhost()
          continue if announcement.version_max and z.util.Environment.version(false) > announcement.version_max
          continue if announcement.version_min and z.util.Environment.version(false) < announcement.version_min
        key = "#{z.storage.StorageKey.ANNOUNCE.ANNOUNCE_KEY}@#{announcement.key}"
        if not z.storage.get_value key
          z.storage.set_value key, 'read'
          return if not z.util.Environment.browser.supports.notifications
          return if window.Notification.permission is z.util.BrowserPermissionType.DENIED

          if not (z.localization.Localizer.locale is 'en')
            announcement.title = announcement["title_#{z.localization.Localizer.locale}"] or announcement.title
            announcement.message = announcement["message_#{z.localization.Localizer.locale}"] or announcement.message

          notification = new window.Notification announcement.title,
            body: announcement.message
            icon: if z.util.Environment.electron and z.util.Environment.os.mac then '' else window.notification_icon or '/image/logo/notification.png'
            sticky: true
            requireInteraction: true

          amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ANNOUNCE.SENT, campaign: announcement.campaign
          @logger.log @logger.levels.INFO, "Announcement '#{announcement.title}' shown"

          notification.onclick = =>
            amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ANNOUNCE.CLICKED, campaign: announcement.campaign
            @logger.log @logger.levels.INFO, "Announcement '#{announcement.title}' clicked"
            if announcement.link
              z.util.safe_window_open announcement.link
            if announcement.refresh
              window.location.reload true
              window.focus()
            notification.close()
          break
