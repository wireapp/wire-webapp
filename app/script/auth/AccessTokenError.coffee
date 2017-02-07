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
z.auth ?= {}

class z.auth.AccessTokenError
  constructor: (type) ->
    @name = @constructor.name
    @stack = (new Error()).stack
    @type = type or z.auth.AccessTokenError::UNKNOWN

    @message = switch @type
      when z.auth.AccessTokenError::TYPE.NOT_FOUND_IN_CACHE
        'No cached access token found in Local Storage'
      when z.auth.AccessTokenError::TYPE.REFRESH_IN_PROGRESS
        'Access Token request already in progress'
      when z.auth.AccessTokenError::TYPE.RETRIES_EXCEEDED
        'No. of retries to get Access Token exceeded'
      when z.auth.AccessTokenError::TYPE.REQUEST_FAILED
        'Request to POST for access token failed'
      when z.auth.AccessTokenError::TYPE.REQUEST_FORBIDDEN
        'Request to POST for access token forbidden'

  @:: = new Error()
  @::constructor = @
  @::TYPE =
    NOT_FOUND_IN_CACHE: 'z.auth.AccessTokenError::TYPE.NOT_FOUND_IN_CACHE'
    REFRESH_IN_PROGRESS: 'z.auth.AccessTokenError::TYPE.REFRESH_IN_PROGRESS'
    RETRIES_EXCEEDED: 'z.auth.AccessTokenError::TYPE.RETRIES_EXCEEDED'
    REQUEST_FAILED: 'z.auth.AccessTokenError::TYPE.REQUEST_FAILED'
    REQUEST_FORBIDDEN: 'z.auth.AccessTokenError::TYPE.REQUEST_FORBIDDEN'
