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
z.connect ?= {}

###
Connect Google Service for calls to the Google's REST API.

@see https://github.com/google/google-api-javascript-client
  https://developers.google.com/api-client-library/javascript/
  https://developers.google.com/google-apps/contacts/v3
  Use updated-min for newer updates
  max-results
###
class z.connect.ConnectGoogleService
  # Construct a new Connect Google Service.
  constructor: (@client) ->
    @logger = new z.util.Logger 'z.connect.ConnectGoogleService', z.config.LOGGER.OPTIONS
    @client_id = '481053726221-71f8tbhghg4ug5put5v3j5pluv0di2fc.apps.googleusercontent.com'
    @scopes = 'https://www.googleapis.com/auth/contacts.readonly'

  ###
  Retrieves the user's Google Contacts.
  @return [Promise] Promise that resolves with the Google contacts
  ###
  get_contacts: =>
    @_init_library()
    .then =>
      return @_get_access_token()
    .then (access_token) =>
      @_get_contacts access_token
    .catch (error) =>
      @logger.error "Failed to import contacts from Google: #{error.message}", error

  ###
  Authenticate before getting the contacts.
  @private
  @return [Promise] Promise that resolves when the user has been successfully authenticated
  ###
  _authenticate: =>
    return new Promise (resolve, reject) =>
      @logger.info 'Authenticating with Google for contacts access'

      on_response = (response) =>
        if not response?.error
          @logger.info 'Received access token from Google', response
          resolve response.access_token
        else
          @logger.error 'Failed to authenticate with Google', response
          reject response?.error

      window.gapi.auth.authorize {client_id: @client_id, scope: @scopes, immediate: false}, on_response

  ###
  Check for cached access token or authenticate with Google.
  @return [Promise] Promise that resolves with the access token
  ###
  _get_access_token: =>
    return new Promise (resolve, reject) =>
      if window.gapi.auth
        if auth_token = window.gapi.auth.getToken()
          @logger.info 'Using cached access token to access Google contacts', auth_token
          resolve auth_token.access_token
        else
          @_authenticate().then(resolve).catch reject
      else
        @logger.warn 'Google Auth Client for JavaScript not loaded'
        error = new z.connect.ConnectError z.connect.ConnectError::TYPE.GOOGLE_CLIENT
        Raygun.send error
        reject error

  ###
  Retrieve the user's Google Contacts using a call to their backend.
  @private
  @return [Promise] Promise that resolves with the user's contacts
  ###
  _get_contacts: (access_token) ->
    return new Promise (resolve, reject) =>
      @logger.info 'Fetching address book from Google'
      api_endpoint = 'https://www.google.com/m8/feeds/contacts/default/full'
      $.get "#{api_endpoint}?access_token=#{access_token}&alt=json&max-results=15000&v=3.0"
      .always (data_or_jqXHR, textStatus) =>
        if textStatus isnt 'error'
          @logger.info 'Received address book from Google', data_or_jqXHR
          resolve data_or_jqXHR
        else
          @logger.error 'Failed to fetch address book from Google', data_or_jqXHR
          reject data_or_jqXHR.responseJSON or new z.service.BackendClientError data_or_jqXHR.status

  ###
  Initialize Google Auth Client for JavaScript is loaded.
  @return [Promise] Promise that resolves when the authentication library is initialized
  ###
  _init_library: ->
    if window.gapi
      return Promise.resolve()
    return @_load_library()

  ###
  Lazy loading of the Google Auth Client for JavaScript.
  @return [Promise] Promise that resolves when the authentication library is loaded
  ###
  _load_library: ->
    return new Promise (resolve) =>
      window.gapi_loaded = resolve

      @logger.info 'Lazy loading Google Auth API'
      script_node = document.createElement 'script'
      script_node.src = 'https://apis.google.com/js/auth.js?onload=gapi_loaded'
      script_element = document.getElementsByTagName('script')[0]
      script_element.parentNode.insertBefore script_node, script_element
