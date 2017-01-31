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
  constructor: (type) ->
    @name = @constructor.name
    @type = type or z.event.EventError::TYPE.UNKNOWN
    @stack = (new Error()).stack

    @message = switch @type
      when z.event.EventError::TYPE.DATABASE_FAILURE
        'Event related database transaction failure'
      when z.event.EventError::TYPE.DEPRECATED_SCHEMA
        'Event type is deprecated'
      when z.event.EventError::TYPE.NO_CLIENT_ID
        'Missing client id'
      when z.event.EventError::TYPE.NO_LAST_ID
        'Last notification ID not found in storage'
      when z.event.EventError::TYPE.NO_NOTIFICATIONS
        'No notifications found'
      when z.event.EventError::TYPE.OUTDATED_E_CALL_EVENT
        'Ignoring outdated e-call event'
      when z.event.EventError::TYPE.REQUEST_FAILURE
        'Event related backend request failure'
      else
        'Unknown EventError'

  @:: = new Error()
  @::constructor = @
  @::TYPE =
    DATABASE_FAILURE: 'z.event.EventError::TYPE.DATABASE_FAILURE'
    DEPRECATED_SCHEMA: 'z.event.EventError::TYPE.DEPRECATED_SCHEMA'
    NO_CLIENT_ID: 'z.event.EventError::TYPE.NO_CLIENT_ID'
    NO_LAST_ID: 'z.event.EventError::TYPE.NO_LAST_ID'
    NO_NOTIFICATIONS: 'z.event.EventError::TYPE.NO_NOTIFICATIONS'
    OUTDATED_E_CALL_EVENT: 'z.event.EventError::OUTDATED_E_CALL_EVENT'
    REQUEST_FAILURE: 'z.event.EventError::TYPE.REQUEST_FAILURE'
