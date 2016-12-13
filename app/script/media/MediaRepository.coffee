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

# Media Repository
class z.media.MediaRepository
  ###
  Extended check for MediaDevices support of browser.
  @param conversation_id [String] Conversation ID
  @return [Boolean] True if MediaDevices are supported
  ###
  @supports_media_devices: ->
    return z.util.Environment.browser.supports.media_devices

  # Construct a new MediaDevices repository.
  constructor: (@audio_repository) ->
    @logger = new z.util.Logger 'z.media.MediaRepository', z.config.LOGGER.OPTIONS

    @devices_handler = new z.media.MediaDevicesHandler @
    @element_handler = new z.media.MediaElementHandler()
    @stream_handler = new z.media.MediaStreamHandler @, @audio_repository
