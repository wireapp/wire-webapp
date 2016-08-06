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

class z.event.EventError
  constructor: (message, type) ->
    @name = @constructor.name
    @message = message
    @stack = (new Error()).stack
    @type = type

  @:: = new Error()
  @::constructor = @
  @::TYPE =
    DATABASE_FAILURE: 'z.event.EventError::TYPE.DATABASE_FAILURE'
    DATABASE_NOT_FOUND: 'z.event.EventError::TYPE.DATABASE_NOT_FOUND'
    LAST_ID_NOT_SPECIFIED: 'z.event.EventError::TYPE.LAST_ID_NOT_SPECIFIED'
    MISSING_CLIENT_ID: 'z.event.EventError::TYPE.MISSING_CLIENT_ID'
    NO_NOTIFICATIONS: 'z.event.EventError::TYPE.NO_NOTIFICATIONS'
    REQUEST_FAILURE: 'z.event.EventError::TYPE.REQUEST_FAILURE'
    UNSUPPORTED_TYPE: 'Unsupported type'
