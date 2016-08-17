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

class z.audio.AudioError
  constructor: (message, type) ->
    @name = @constructor.name
    @message = message
    @type = type
    @stack = (new Error()).stack

  @:: = new Error()
  @::constructor = @
  @::TYPE = {
    ALREADY_PLAYING: 'z.audio.AudioError::TYPE.ALREADY_PLAYING'
    FAILED_TO_PLAY: 'z.audio.AudioError::TYPE.FAILED_TO_PLAY'
    IGNORED_SOUND: 'z.audio.AudioError::TYPE.IGNORED_SOUND'
    NOT_FOUND: 'z.audio.AudioError::TYPE.NOT_FOUND'
  }
