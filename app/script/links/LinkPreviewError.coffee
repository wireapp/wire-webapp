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
z.links ?= {}

class z.links.LinkPreviewError
  constructor: (type) ->
    @name = @constructor.name
    @stack = (new Error()).stack
    @type = type

    switch @type
      when z.links.LinkPreviewError::TYPE.NOT_SUPPORTED
        @message = 'Your client cannot render link previews using Open Graph data.'
      when z.links.LinkPreviewError::TYPE.UNSUPPORTED_TYPE
        @message = 'Open Graph data from the given link does not provide necessary attributes.'
      when z.links.LinkPreviewError::TYPE.NO_DATA_AVAILABLE
        @message = 'Link does not provide Open Graph data.'

  @:: = new Error()
  @::constructor = @
  @::TYPE =
    NOT_SUPPORTED: 'z.links.LinkPreviewError::TYPE.NOT_SUPPORTED'
    UNSUPPORTED_TYPE: 'z.links.LinkPreviewError::TYPE.UNSUPPORTED_TYPE'
    NO_DATA_AVAILABLE: 'z.links.LinkPreviewError::TYPE.NO_DATA_AVAILABLE'
