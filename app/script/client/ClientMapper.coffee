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

class z.client.ClientMapper

  ###
  Maps a JSON into a Client entity.
  @param client_payload [JSON] Client payload
  @return [z.client.Client] Client entity
  ###
  map_client: (client_payload) ->
    client_et = new z.client.Client client_payload

    if client_payload.meta
      client_et.meta.is_verified client_payload.meta.is_verified
      client_et.meta.primary_key = client_payload.meta.primary_key
      client_et.meta.user_id = (z.client.Client.dismantle_user_client_id client_payload.meta.primary_key).user_id

    return client_et

  ###
  Maps an object of client IDs with their payloads to client entities.
  @param clients_payload [Array<JSON>] Client payloads
  @return [Array<z.client.Client>] Array of client entities
  ###
  map_clients: (clients_payload) ->
    return (@map_client client_payload for client_payload in clients_payload)

  ###
  Update a client entity or object from JSON.

  @param client [z.client.Client or Object] Client
  @param update_payload [JSON] JSON possibly containing updates
  @return [Array<z.client.Client|Object, Boolean>] An array that contains the client and whether there was a change
  ###
  update_client: (client, update_payload) ->
    contains_update = false
    for member of update_payload when JSON.stringify(client[member]) isnt JSON.stringify update_payload[member]
      contains_update = true
      client[member] = update_payload[member]
    return [client, contains_update]
