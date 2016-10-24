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
z.auth ?= {}

# Authentication Service for all authentication and registration calls to the backend REST API.
class z.auth.AuthService
  URL_ACCESS: '/access'
  URL_ACTIVATE: '/activate'
  URL_COOKIES: '/cookies'
  URL_INVITATIONS: '/invitations'
  URL_LOGIN: '/login'
  URL_REGISTER: '/register'

  ###
  Construct a new Authentication Service.
  @param client [z.service.Client] Client for the API calls
  ###
  constructor: (@client) ->
    @logger = new z.util.Logger 'z.auth.AuthService', z.config.LOGGER.OPTIONS


  ###############################################################################
  # Authentication
  ###############################################################################

  ###
  Get all cookies for a user.
  @return [Promise] Promise that resolves with an array of cookies
  ###
  get_cookies: ->
    @client.send_request
      url: @client.create_url "#{@URL_COOKIES}"
      type: 'GET'
    .then (data) ->
      return data.cookies

  ###
  Get invite information.
  @param code [String] Invite code
  @return [Promise] Promise that resolves with invitations information
  ###
  get_invitations_info: (code) ->
    @client.send_request
      url: @client.create_url "#{@URL_INVITATIONS}/info?code=#{code}"
      type: 'GET'

  ###
  Get access-token if a valid cookie is provided.

  @note Don't use our client wrapper here, because to query "/access" we need to set "withCredentials" to "true" in order to send the cookie.
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/auth/authenticate

  @param options [Object]
  @option options [Boolean] should_retry Should we retry on error
  @option options [Boolean] retry_limit Should we retry on error
  ###
  post_access: (options) ->
    return new Promise (resolve, reject) =>
      @client.request_queue_blocked_state z.service.RequestQueueBlockedState.ACCESS_TOKEN_REFRESH

      options = $.extend
        should_retry: true
        retries: 0
        retry_limit: 10
      , options

      settings =
        crossDomain: true
        type: 'POST'
        url: @client.create_url "#{@URL_ACCESS}"
        xhrFields:
          withCredentials: true
        success: (data) =>
          @logger.log @logger.levels.INFO,
            "Requesting access token successful after #{options.retries + 1} attempt(s)", data
          @save_access_token_in_client data.token_type, data.access_token
          resolve data
        error: (jqXHR, textStatus, errorThrown) =>
          options.retries++
          should_retry = options.should_retry and options.retries < options.retry_limit
          if not navigator.onLine
            @logger.log @logger.levels.WARN, 'Access token refresh paused due to lack of internet connectivity'
            $(window).on 'online', =>
              @logger.log @logger.levels.INFO, 'Internet connectivity regained. Continuing access token refresh.'
              $.ajax settings
          else if should_retry and jqXHR.status isnt z.service.BackendClientError::STATUS_CODE.FORBIDDEN
            window.setTimeout =>
              @logger.log @logger.levels.INFO,
                "Trying to get a new access token - attempt '#{options.retries}'"
              $.ajax settings
            , 500
          else
            error_description = "Requesting access token failed: #{errorThrown}"

            if jqXHR.responseJSON or jqXHR.responseText?.startsWith '{'
              error = jqXHR.responseJSON or JSON.parse jqXHR.responseText
              if error.code is z.service.BackendClientError::STATUS_CODE.FORBIDDEN
                error = new z.auth.AccessTokenError z.auth.AccessTokenError::TYPE.REQUEST_FORBIDDEN
            else
              error = new z.auth.AccessTokenError z.auth.AccessTokenError::TYPE.REQUEST_FAILED
              Raygun.send error

            @save_access_token_in_client()
            @logger.log @logger.levels.ERROR, "#{error_description} - '#{options.retries}' attempt(s)", jqXHR
            reject error

      if @client.access_token
        settings.headers =
          Authorization: "Bearer #{window.decodeURIComponent(@client.access_token)}"

      $.ajax settings

  ###
  Resend an email or phone activation code.

  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/sendActivationCode

  @param send_activation_code [Object] Containing the email or phone number needed to resend activation email
  @option send_activation_code [String] email
  @return [Promise] Promise that resolves on successful code resend
  ###
  post_activate_send: (send_activation_code) ->
    @client.send_json
      url: @client.create_url "#{@URL_ACTIVATE}/send"
      type: 'POST'
      data: send_activation_code

  ###
  Delete all cookies on the backend.

  @param email [String] The user's e-mail address
  @param password [String] The user's password
  @param labels [Array] A list of cookie labels to remove from the system (optional)
  ###
  post_cookies_remove: (email, password, labels) ->
    @client.send_json
      url: @client.create_url "#{@URL_COOKIES}/remove"
      type: 'POST'
      data:
        email: email
        password: password
        labels: labels

  ###
  Login in order to obtain an access-token and cookie.

  @note Don't use our client wrapper here. On cookie requests we need to use plain jQuery AJAX.
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/auth/login

  @param login [Object] Containing sign in information
  @option login [String] email The email address for a password login
  @option login [String] phone The phone number for a password or SMS login
  @option login [String] password The password for a password login
  @option login [String] code The login code for an SMS login
  @param persist [Boolean] Request a persistent cookie instead of a session cookie
  @return [Promise] Promise that resolves with access token
  ###
  post_login: (login, persist) ->
    return new Promise (resolve, reject) =>
      $.ajax
        contentType: 'application/json; charset=utf-8'
        crossDomain: true
        data: pako.gzip JSON.stringify login
        headers:
          'Content-Encoding': 'gzip'
        processData: false
        type: 'POST'
        url: @client.create_url "#{@URL_LOGIN}?persist=#{persist}"
        xhrFields:
          withCredentials: true
      .done (data) ->
        resolve data
      .fail (jqXHR, textStatus, errorThrown) =>
        if jqXHR.status is z.service.BackendClientError::STATUS_CODE.TOO_MANY_REQUESTS and login.email
          # Backend blocked our user account from login, so we have to reset our cookies
          @post_cookies_remove login.email, login.password, undefined
          .then -> reject jqXHR.responseJSON or errorThrown
        else
          reject jqXHR.responseJSON or errorThrown

  ###
  A login code can be used only once and times out after 10 minutes.

  @note Only one login code may be pending at a time.
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/sendLoginCode

  @param request_code [Object] Containing the phone number in E.164 format and whether a code should be forced
  @return [Promise] Promise that resolves on successful login code request
  ###
  post_login_send: (request_code) ->
    @client.send_json
      url: @client.create_url "#{@URL_LOGIN}/send"
      type: 'POST'
      data: request_code

  ###
  Logout on the backend side.
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/auth/logout
  ###
  post_logout: ->
    @client.send_json
      url: @client.create_url "#{@URL_ACCESS}/logout"
      type: 'POST'
      withCredentials: true

  ###
  Register a new user.

  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/register

  @param new_user [Object] Containing the email, username and password needed for account creation
  @option new_user [String] name
  @option new_user [String] email
  @option new_user [String] password
  @option new_user [String] locale
  @return [Promise] Promise that will resolve on success
  ###
  post_register: (new_user) ->
    return new Promise (resolve, reject) =>
      $.ajax
        contentType: 'application/json; charset=utf-8'
        crossDomain: true
        data: pako.gzip JSON.stringify new_user
        headers:
          'Content-Encoding': 'gzip'
        processData: false
        type: 'POST'
        url: @client.create_url "#{@URL_REGISTER}?challenge_cookie=true"
        xhrFields:
          withCredentials: true
      .done (data) ->
        resolve data
      .fail (jqXHR, textStatus, errorThrown) ->
        reject jqXHR.responseJSON or errorThrown

  ###
  Save the access token date in the client.
  @param type [String] Access token type
  @param value [String] Access token
  ###
  save_access_token_in_client: (type = '', value = '') =>
    @client.access_token_type = type
    @client.access_token = value
    @client.request_queue_blocked_state z.service.RequestQueueBlockedState.NONE
