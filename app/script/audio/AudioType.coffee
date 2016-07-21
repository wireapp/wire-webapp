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

# Enum of different supported sounds.
z.audio.AudioType =
  ALERT: 'alert'
  CALL_DROP: 'call-drop'
  INCOMING_CALL: 'ringing-from-them'
  INCOMING_PING: 'ping-from-them'
  NETWORK_INTERRUPTION: 'network-interruption'
  NEW_MESSAGE: 'new-message'
  OUTGOING_CALL: 'ringing-from-me'
  OUTGOING_PING: 'ping-from-me'
  READY_TO_TALK: 'ready-to-talk'
  TALK_LATER: 'talk-later'
