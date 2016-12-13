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
z.media ?= {}

class z.media.MediaStreamInfo
  constructor: (@source, @flow_id, @stream, @call_et) ->
    @type = z.media.MediaType.NONE

    @conversation_id = @call_et?.id
    @update_stream_type()
    return @

  update_stream_type: =>
    @stream = z.media.MediaStreamHandler.detect_media_stream_type @stream
    @type = @stream.type
