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

z.event.EventTypeHandling =
  CONFIRM: [
    z.event.Backend.CONVERSATION.ASSET_ADD
    z.event.Backend.CONVERSATION.KNOCK
    z.event.Backend.CONVERSATION.MESSAGE_ADD
    z.event.Client.CONVERSATION.LOCATION
    z.event.Client.CONVERSATION.REACTION
  ]
  DECRYPT: [
    z.event.Backend.CONVERSATION.OTR_ASSET_ADD
    z.event.Backend.CONVERSATION.OTR_MESSAGE_ADD
  ]
  IGNORE: [
    z.event.Backend.CONVERSATION.ASSET_ADD
    z.event.Backend.CONVERSATION.KNOCK
    z.event.Backend.CONVERSATION.MESSAGE_ADD
    z.event.Backend.CONVERSATION.TYPING
  ]
  STORE: [
    z.event.Backend.CONVERSATION.ASSET_ADD
    z.event.Backend.CONVERSATION.KNOCK
    z.event.Backend.CONVERSATION.MEMBER_JOIN
    z.event.Backend.CONVERSATION.MEMBER_LEAVE
    z.event.Backend.CONVERSATION.MESSAGE_ADD
    z.event.Backend.CONVERSATION.RENAME
    z.event.Backend.CONVERSATION.VOICE_CHANNEL_ACTIVATE
    z.event.Backend.CONVERSATION.VOICE_CHANNEL_DEACTIVATE
    z.event.Client.CONVERSATION.ALL_VERIFIED
    z.event.Client.CONVERSATION.ASSET_META
    z.event.Client.CONVERSATION.DELETE_EVERYWHERE
    z.event.Client.CONVERSATION.LOCATION
    z.event.Client.CONVERSATION.DEGRADED
    z.event.Client.CONVERSATION.UNABLE_TO_DECRYPT
  ]
