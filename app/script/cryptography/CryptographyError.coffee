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
z.cryptography ?= {}

class z.cryptography.CryptographyError
  constructor: (message, type) ->
    @name = @constructor.name
    @message = message
    @stack = (new Error()).stack
    @type = type

  @:: = new Error()
  @::constructor = @
  @::TYPE =
    BROKEN_EXTERNAL: 'z.cryptography.CryptographyError::TYPE.BROKEN_EXTERNAL'
    IGNORED_ASSET: 'z.cryptography.CryptographyError::TYPE.IGNORED_ASSET'
    IGNORED_HOT_KNOCK: 'z.cryptography.CryptographyError::TYPE.IGNORED_HOT_KNOCK'
    IGNORED_PREVIEW: 'z.cryptography.CryptographyError::TYPE.IGNORED_PREVIEW'
    MISSING_MESSAGE: 'z.cryptography.CryptographyError::TYPE.MISSING_MESSAGE'
    PREVIOUSLY_STORED: 'z.cryptography.CryptographyError::TYPE.PREVIOUSLY_STORED'
    UNHANDLED_TYPE: 'z.cryptography.CryptographyError::TYPE.UNHANDLED_TYPE'
