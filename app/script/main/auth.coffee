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
z.main ?= {}

class z.main.Auth
  ###
  Constructs objects needed for app authentication.

  @param [Object] settings Collection of URL settings
  @option settings [String] environment Handle of the backend environment (staging, edge, etc.)
  @option settings [String] web_socket_url URL to the backend's WebSocket
  @option settings [String] rest_url URL to the backend's REST service
  @option settings [String] parameter Additional parameters for the webapp's login URL
  ###
  constructor: (@settings) ->
    @audio = new z.audio.AudioRepository()
    @client = new z.service.Client @settings
    @service = new z.auth.AuthService @client
    @repository = new z.auth.AuthRepository @service
