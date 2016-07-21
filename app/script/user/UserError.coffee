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
z.user ?= {}

class z.user.UserError
  constructor: (message, type) ->
    @name = @constructor.name
    @message = message
    @type = type
    @stack = (new Error()).stack

  @:: = new Error()
  @::constructor = @
  @::TYPE = {
    NO_CLIENTS: 'z.user.UserError::TYPE.NO_CLIENTS'
    PRE_KEY_NOT_FOUND: 'z.user.UserError::TYPE.PRE_KEY_NOT_FOUND'
    REQUEST_FAILURE: 'z.user.UserError::TYPE.REQUEST_FAILURE'
  }
