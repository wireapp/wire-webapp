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

ANNOUNCE_SERVICE_URL = 'api/v1/announce/'

class z.announce.AnnounceService
  constructor: ->
    @logger = new z.util.Logger 'z.announce.AnnounceService', z.config.LOGGER.OPTIONS
    @url = "#{z.util.Environment.backend.website_url()}#{ANNOUNCE_SERVICE_URL}?order=created&active=true"
    @url += '&production=true' if z.util.Environment.frontend.is_production()
    return @

  get_announcements: ->
    return new Promise (resolve, reject) =>
      $.get @url
      .done (data) ->
        resolve data['result']
      .fail (jqXHR, textStatus, errorThrown) ->
        reject new Error errorThrown

  get_version: ->
    return new Promise (resolve, reject) ->
      $.get 'version/'
      .done (data) ->
        resolve data.version
      .fail (jqXHR, textStatus, errorThrown) ->
        reject new Error errorThrown
