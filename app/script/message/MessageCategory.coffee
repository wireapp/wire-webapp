#
# Wire
# Copyright (C) 2017 Wire Swiss GmbH
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

z.message.MessageCategory =
  NONE: 0
  UNDEFINED: 1 << 0
  EXCLUDED: 1 << 1
  KNOCK: 1 << 2
  SYSTEM: 1 << 3
  TEXT: 1 << 4
  LINK: 1 << 5
  LINK_PREVIEW: 1 << 6
  IMAGE: 1 << 7
  GIF: 1 << 8
  FILE: 1 << 9
  AUDIO: 1 << 10
  VIDEO: 1 << 11
  LOCATION: 1 << 12
  LIKED: 1 << 13
