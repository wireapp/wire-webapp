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

# Cryptography service for all cryptography related calls to the backend REST API.
class z.cryptography.CryptographyService
  ###
  Construct a new Cryptography Service.
  @param client [z.service.Client] Client for the API calls
  ###
  constructor: (@client) ->
    @logger = new z.util.Logger 'z.cryptography.CryptographyService', z.config.LOGGER.OPTIONS

  ###
  Gets a pre-key for each client of a user client map
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getMultiPrekeyBundles

  @param user_client_map [Object] User client map to request pre-keys for
  @return [Promise] Promise that resolves with a pre-key for each client of the given map
  ###
  get_users_pre_keys: (user_client_map) ->
    @client.send_json
      type: 'POST'
      url: @client.create_url '/users/prekeys'
      data: user_client_map
