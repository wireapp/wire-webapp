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
z.user_properties ?= {}

# User properties service for all user property calls to the backend REST API.
class z.user_properties.UserPropertiesService
  URL_PROPERTIES: '/properties'

  ###
  Construct a new User Service.
  @param client [z.service.Client] Client for the API calls
  ###
  constructor: (@client) ->
    @logger = new z.util.Logger 'z.user_properties.UserPropertiesService', z.config.LOGGER.OPTIONS

  ###
  List all property keys stored for the user.
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/listPropertyKeys
  @return [Promise] Promise that resolves with a list of the property keys stored for the user
  ###
  get_user_properties: ->
    @client.send_request
      type: 'GET'
      url: @client.create_url @URL_PROPERTIES

  ###
  Clear all properties store for the user.
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/clearProperties
  @return [Promise] Promise that resolves when properties for user have been cleared
  ###
  clear_user_properties: ->
    @client.send_request
      type: 'DELETE'
      url: @client.create_url @URL_PROPERTIES

  ###
  Get a property value stored for a key.
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getProperty

  @param key [String] Key used to store user properties
  @return [Promise] Promise that resolves with the properties for the given key
  ###
  get_user_properties_by_key: (key) ->
    @client.send_request
      type: 'GET'
      url: @client.create_url "/properties/#{key}"


  ###
  Set a property value for a key.
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/setProperty

  @param key [String] Key used to store user properties
  @param properties [Object] Payload to be stored
  ###
  change_user_properties_by_key: (key, properties) ->
    @client.send_json
      type: 'PUT'
      url: @client.create_url "/properties/#{key}"
      data: properties

  ###
  Delete a property.
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/deleteProperty

  @param key [String] Key used to store user properties
  @param callback [Function] Function to be called on server return
  ###
  delete_user_properties_by_key: (key) ->
    @client.send_request
      type: 'DELETE'
      url: @client.create_url "/properties/#{key}"
      callback: callback
