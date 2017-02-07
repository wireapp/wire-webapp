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
z.conversation ?= {}

z.conversation.ConversationUpdateType =
  ARCHIVED_STATE: 'archived_state'
  ARCHIVED_TIMESTAMP: 'archived_timestamp'
  CLEARED_TIMESTAMP: 'cleared_timestamp'
  EPHEMERAL_TIMER: 'ephemeral_timer'
  LAST_EVENT_TIMESTAMP: 'last_event_timestamp'
  LAST_READ_TIMESTAMP: 'last_read_timestamp'
  MUTED_STATE: 'mute_state'
  MUTED_TIMESTAMP: 'muted_timestamp'
  VERIFICATION_STATE: 'verification_state'
