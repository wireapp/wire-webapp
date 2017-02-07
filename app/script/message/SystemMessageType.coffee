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
z.message ?= {}

###
Enum for different system message types.

@todo Refactor to use member-join and member-leave instead of normal. It duplicates "z.message.SuperType".
###
z.message.SystemMessageType =
  NORMAL: 'normal'
  MEMBER_JOIN: 'join'
  MEMBER_LEAVE: 'leave'
  CONVERSATION_CREATE: 'created-group'
  CONVERSATION_RENAME: 'rename'
  CONVERSATION_RESUME: 'resume'
  CONNECTION_ACCEPTED: 'created-one-to-one'
  CONNECTION_CONNECTED: 'connected'
  CONNECTION_REQUEST: 'connecting'
