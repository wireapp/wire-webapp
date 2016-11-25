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
  constructor: (type) ->
    @name = @constructor.name
    @stack = (new Error()).stack
    @type = type or z.cryptography.CryptographyError::UNKNOWN

    @message = switch @type
      when z.cryptography.CryptographyError::TYPE.BROKEN_EXTERNAL
        'Failed to map external message'
      when z.cryptography.CryptographyError::TYPE.IGNORED_ASSET
        'Ignored asset preview'
      when z.cryptography.CryptographyError::TYPE.IGNORED_PREVIEW
        'Ignored image preview'
      when z.cryptography.CryptographyError::TYPE.NO_DATA_CONTENT
        'No message data content found'
      when z.cryptography.CryptographyError::TYPE.NO_GENERIC_MESSAGE
        'No GenericMessage found'
      when z.cryptography.CryptographyError::TYPE.PREVIOUSLY_STORED
        'Message was previously stored'
      when z.cryptography.CryptographyError::TYPE.UNHANDLED_TYPE
        'Unhandled event type'
      else
        'Unknown CryptographyError'

  @:: = new Error()
  @::constructor = @
  @::TYPE =
    BROKEN_EXTERNAL: 'z.cryptography.CryptographyError::TYPE.BROKEN_EXTERNAL'
    IGNORED_ASSET: 'z.cryptography.CryptographyError::TYPE.IGNORED_ASSET'
    IGNORED_PREVIEW: 'z.cryptography.CryptographyError::TYPE.IGNORED_PREVIEW'
    NO_DATA_CONTENT: 'z.cryptography.CryptographyError::TYPE.NO_DATA_CONTENT'
    NO_GENERIC_MESSAGE: 'z.cryptography.CryptographyError::TYPE.NO_GENERIC_MESSAGE'
    PREVIOUSLY_STORED: 'z.cryptography.CryptographyError::TYPE.PREVIOUSLY_STORED'
    UNHANDLED_TYPE: 'z.cryptography.CryptographyError::TYPE.UNHANDLED_TYPE'
    UNKNOWN: 'z.cryptography.CryptographyError::TYPE.UNKNOWN'
