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
z.audio ?= {}

# Enum of sounds playing for different sound settings.
z.audio.AudioPlayingType =
  NONE: [
    z.audio.AudioType.CALL_DROP
    z.audio.AudioType.NETWORK_INTERRUPTION
    z.audio.AudioType.OUTGOING_CALL
    z.audio.AudioType.READY_TO_TALK
    z.audio.AudioType.TALK_LATER
  ]
  SOME: [
    z.audio.AudioType.CALL_DROP
    z.audio.AudioType.INCOMING_CALL
    z.audio.AudioType.INCOMING_PING
    z.audio.AudioType.NETWORK_INTERRUPTION
    z.audio.AudioType.OUTGOING_CALL
    z.audio.AudioType.OUTGOING_PING
    z.audio.AudioType.READY_TO_TALK
    z.audio.AudioType.TALK_LATER
  ]
