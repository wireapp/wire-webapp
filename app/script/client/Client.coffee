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
z.client ?= {}

class z.client.Client
  constructor: (payload) ->
    # Preserved data from the backend
    @[member] = payload[member] for member of payload
    @model = payload.model or '?'

    # Maintained meta data by us
    @meta =
      is_verified: ko.observable false
      primary_key: undefined

    @session = {}

    return @

  ###
  Splits an ID into user ID & client ID.
  @param id [String] ID
  @return [Object] Object containing the user ID & client ID
  ###
  @dismantle_user_client_id: (id) ->
    id_parts = id?.split('@') or []
    return {
      user_id: id_parts[0]
      client_id: id_parts[1]
    }

  ###
  @return [Boolean] True, if the client is the self user's permanent client.
  ###
  is_permanent: ->
    return @type is z.client.ClientType.PERMANENT

  ###
  @return [Boolean] True, if it is NOT the client of the self user.
  ###
  is_remote: ->
    return not @is_permanent() and not @is_temporary()

  ###
  @return [Boolean] True, if the client is the self user's temporary client.
  ###
  is_temporary: ->
    return @type is z.client.ClientType.TEMPORARY

  ###
  This method returns a JSON object which can be stored in our local database.

  @return [JSON] JSON object
  ###
  to_json: ->
    json = ko.toJSON @
    real_json = JSON.parse json
    delete real_json.session
    return real_json
