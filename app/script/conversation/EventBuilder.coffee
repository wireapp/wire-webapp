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

z.conversation.EventBuilder = do ->

  build_all_verified = (conversation_et) ->
    conversation: conversation_et.id
    id: z.util.create_random_uuid()
    type: z.event.Client.CONVERSATION.ALL_VERIFIED
    from: conversation_et.self.id
    time: new Date().toISOString()

  build_degraded = (conversation_et, user_ids) ->
    conversation: conversation_et.id
    id: z.util.create_random_uuid()
    type: z.event.Client.CONVERSATION.DEGRADED
    from: conversation_et.self.id
    time: new Date().toISOString()
    data:
      user_ids: user_ids

  return {
    build_all_verified: build_all_verified
  build_degraded: build_degraded
  }
