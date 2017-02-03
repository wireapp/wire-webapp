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
    type: z.event.Client.CONVERSATION.VERIFICATION
    from: conversation_et.self.id
    time: new Date().toISOString()
    data:
      type: z.message.VerificationMessageType.VERIFIED

  build_degraded = (conversation_et, user_ids, type) ->
    conversation: conversation_et.id
    id: z.util.create_random_uuid()
    type: z.event.Client.CONVERSATION.VERIFICATION
    from: conversation_et.self.id
    time: new Date().toISOString()
    data:
      type: type
      user_ids: user_ids

  build_unable_to_decrypt = (event, decrypt_error, error_code) ->
    conversation: event.conversation
    id: z.util.create_random_uuid()
    type: z.event.Client.CONVERSATION.UNABLE_TO_DECRYPT
    from: event.from
    time: event.time
    error: "#{decrypt_error.message} (#{event.data.sender})"
    error_code: "#{error_code} (#{event.data.sender})"

  return {
    build_all_verified: build_all_verified
    build_unable_to_decrypt: build_unable_to_decrypt
    build_degraded: build_degraded
  }
