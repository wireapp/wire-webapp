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
      @fetch()
      @schedule_check()
    , CHECK_TIMEOUT

  fetch: =>
    @announce_service.fetch @process_announce_list

  schedule_check: =>
    window.setInterval @fetch, CHECK_INTERVAL

  process_announce_list: (announce_list) =>
    if announce_list
      for announce in announce_list
        if not z.util.Environment.frontend.is_localhost()
          continue if announce.version_max and z.util.Environment.version(false) > announce.version_max
          continue if announce.version_min and z.util.Environment.version(false) < announce.version_min
        key = "#{z.storage.StorageKey.ANNOUNCE.ANNOUNCE_KEY}@#{announce.key}"
        if not z.storage.get_value key
          z.storage.set_value key, 'read'
          return if not z.util.Environment.browser.supports.notifications
          return if window.Notification.permission is z.util.BrowserPermissionType.DENIED

          if not (z.localization.Localizer.locale is 'en')
            announce.title = announce["title_#{z.localization.Localizer.locale}"] or announce.title
            announce.message = announce["message_#{z.localization.Localizer.locale}"] or announce.message

          notification = new window.Notification announce.title,
            body: announce.message
            icon: if z.util.Environment.electron and z.util.Environment.os.mac then '' else window.notification_icon or '/image/logo/notification.png'
            sticky: true
            requireInteraction: true

          amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ANNOUNCE.SENT, campaign: announce.campaign
          @logger.log @logger.levels.INFO, "Announcement '#{announce.title}' shown"

          notification.onclick = =>
            amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ANNOUNCE.CLICKED, campaign: announce.campaign
            @logger.log @logger.levels.INFO, "Announcement '#{announce.title}' clicked"
            if announce.link
              z.util.safely_open_url_in_tab announce.link
            if announce.refresh
              window.location.reload true
            notification.close()
          break
