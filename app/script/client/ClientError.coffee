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
z.client ?= {}

class z.client.ClientError
  constructor: (type) ->
    @name = @constructor.name
    @stack = (new Error()).stack
    @type = type or z.client.ClientError::TYPE.UNKNOWN

    @message = switch @type
      when z.client.ClientError::TYPE.CLIENT_NOT_SET
        'Local client is not yet set'
      when z.client.ClientError::TYPE.DATABASE_FAILURE
        'Client related database transaction failed'
      when z.client.ClientError::TYPE.MISSING_ON_BACKEND
        'Local client does not exist on backend'
      when z.client.ClientError::TYPE.NO_CLIENT_ID
        'Client ID is not defined'
      when z.client.ClientError::TYPE.NO_LOCAL_CLIENT
        'No local client found in database'
      when z.client.ClientError::TYPE.NO_USER_ID
        'User ID is not defined'
      when z.client.ClientError::TYPE.REQUEST_FAILURE
        'Client related backend request failed'
      when z.client.ClientError::TYPE.REQUEST_FORBIDDEN
        'Client related backend request forbidden'
      when z.client.ClientError::TYPE.TOO_MANY_CLIENTS
        'User has reached the maximum of allowed clients'
      else
        'Unknown ClientError'

  @:: = new Error()
  @::constructor = @
  @::TYPE =
    CLIENT_NOT_SET: 'z.client.ClientError::TYPE.CLIENT_NOT_SET'
    DATABASE_FAILURE: 'z.client.ClientError::TYPE.DATABASE_FAILURE'
    MISSING_ON_BACKEND: 'z.client.ClientError::TYPE.MISSING_ON_BACKEND'
    NO_CLIENT_ID: 'z.client.ClientError::TYPE.NO_CLIENT_ID'
    NO_LOCAL_CLIENT: 'z.client.ClientError::TYPE.NO_LOCAL_CLIENT'
    NO_USER_ID: 'z.client.ClientError::TYPE.NO_USER_ID'
    REQUEST_FAILURE: 'z.client.ClientError::TYPE.REQUEST_FAILURE'
    REQUEST_FORBIDDEN: 'z.client.ClientError::TYPE.REQUEST_FORBIDDEN'
    TOO_MANY_CLIENTS: 'z.client.ClientError::TYPE.TOO_MANY_CLIENTS'
    UNKNOWN: 'z.client.ClientError::TYPE.UNKNOWN'
