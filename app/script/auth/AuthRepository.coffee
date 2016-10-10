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

# Authentication Repository for all authentication and registration interactions with the authentication service.
class z.auth.AuthRepository
  ###
  Construct a new Authentication Repository.
  @param auth_service [z.auth.AuthService] Backend REST API service implementation
  ###
  constructor: (@auth_service) ->
    @logger = new z.util.Logger 'z.auth.AuthRepository', z.config.LOGGER.OPTIONS

    @access_token_refresh = undefined

    amplify.subscribe z.event.WebApp.CONNECTION.ACCESS_TOKEN.RENEW, @renew_access_token

  # Print all cookies for a user in the console.
  list_cookies: ->
    @auth_service.get_cookies()
    .then (cookies) =>
      @logger.force_log 'Backend cookies:'
      for cookie, index in cookies
        expiration = z.util.format_timestamp cookie.time, false
        log = "Label: #{cookie.label} | Type: #{cookie.type} |  Expiration: #{expiration}"
        @logger.force_log "Cookie No. #{index + 1} | #{log}"
    .catch (error) =>
      @logger.force_log 'Could not list user cookies', error

  ###
  Login (with email or phone) in order to obtain an access-token and cookie.

  @param login [Object] Containing sign in information
  @option login [String] email The email address for a password login
  @option login [String] phone The phone number for a password or SMS login
  @option login [String] password The password for a password login
  @option login [String] code The login code for an SMS login
  @param persist [Boolean] Request a persistent cookie instead of a session cookie
  @return [Promise] Promise that resolves with the received access token
  ###
  login: (login, persist) =>
    return new Promise (resolve, reject) =>
      @auth_service.post_login login, persist
      .then (response) =>
        @save_access_token response
        z.storage.set_value z.storage.StorageKey.AUTH.PERSIST, persist
        z.storage.set_value z.storage.StorageKey.AUTH.SHOW_LOGIN, true
        resolve response
      .catch (error) -> reject error

  ###
  Logout the user on the backend.
  @return [Promise] Promise that will always resolve
  ###
  logout: =>
    return new Promise (resolve) =>
      @auth_service.post_logout()
      .then =>
        @logger.log @logger.levels.INFO, 'Log out on backend successful'
        resolve()
      .catch (error) =>
        @logger.log @logger.levels.WARN, "Log out on backend failed: #{error.message}", error
        resolve()

  ###
  Register a new user (with email).

  @param new_user [Object] Containing the email, username and password needed for account creation
  @option new_user [String] name
  @option new_user [String] email
  @option new_user [String] password
  @option new_user [String] label Cookie label
  @return [Promise] Promise that will resolve on success
  ###
  register: (new_user) =>
    @auth_service.post_register new_user
    .then (response) =>
      z.storage.set_value z.storage.StorageKey.AUTH.PERSIST, true
      z.storage.set_value z.storage.StorageKey.AUTH.SHOW_LOGIN, true
      z.storage.set_value new_user.label_key, new_user.label
      @logger.log @logger.levels.INFO,
        "COOKIE::'#{new_user.label}' Saved cookie label with key '#{new_user.label_key}' in Local Storage",
          key: new_user.label_key,
          value: new_user.label
      return response

  ###
  Resend an email or phone activation code.

  @param send_activation_code [Object] Containing the email or phone number needed to resend activation email
  @option send_activation_code [String] email
  @return [Promise] Promise that resolves on success
  ###
  resend_activation: (send_activation_code) =>
    @auth_service.post_activate_send send_activation_code

  ###
  Retrieve personal invite information.
  @param invite [String] Invite code
  @return [Promise] Promise that resolves with the invite data
  ###
  retrieve_invite: (invite) =>
    @auth_service.get_invitations_info invite

  ###
  Request SMS validation code.
  @param request_code [Object] Containing the phone number in E.164 format and whether a code should be forced
  @return [Promise] Promise that resolve on success
  ###
  request_login_code: (request_code) =>
    @auth_service.post_login_send request_code

  ###
  Renew access-token provided a valid cookie.
  ###
  renew_access_token: =>
    @get_access_token()
    .then =>
      @logger.log @logger.levels.INFO, 'Refreshed Access Token successfully.'
      amplify.publish z.event.WebApp.CONNECTION.ACCESS_TOKEN.RENEWED
    .catch (error) =>
      if error.type is z.auth.AccessTokenError::TYPE.REQUEST_FORBIDDEN
        @logger.log @logger.levels.WARN, "Session expired on access token refresh: #{error.message}", error
        Raygun.send error
        amplify.publish z.event.WebApp.SIGN_OUT, z.auth.SignOutReasion.SESSION_EXPIRED, false, true
      else if error.type isnt z.auth.AccessTokenError::TYPE.REFRESH_IN_PROGRESS
        @logger.log @logger.levels.ERROR, "Refreshing access token failed: '#{error.type}'", error
        # @todo What do we do in this case?
        amplify.publish z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.CONNECTIVITY_RECONNECT

  # Get the cached access token from the Amplify store.
  get_cached_access_token: ->
    return new Promise (resolve, reject) =>
      access_token = z.storage.get_value z.storage.StorageKey.AUTH.ACCESS_TOKEN.VALUE
      access_token_type = z.storage.get_value z.storage.StorageKey.AUTH.ACCESS_TOKEN.TYPE

      if access_token
        @logger.log @logger.levels.INFO, 'Cached access token found in Local Storage', {access_token: access_token}
        @auth_service.save_access_token_in_client access_token_type, access_token
        @_schedule_token_refresh z.storage.get_value z.storage.StorageKey.AUTH.ACCESS_TOKEN.EXPIRATION
        resolve()
      else
        reject new z.auth.AccessTokenError z.auth.AccessTokenError::TYPE.NOT_FOUND_IN_CACHE

  ###
  Initially get access-token provided a valid cookie.
  @return [Promise] Returns a Promise that resolve with the access token data
  ###
  get_access_token: =>
    return new Promise (resolve, reject) =>
      if @auth_service.client.is_requesting_access_token()
        error = new z.auth.AccessTokenError z.auth.AccessTokenError::TYPE.REFRESH_IN_PROGRESS
        @logger.log @logger.levels.WARN, error.message
        reject error
      else
        @auth_service.post_access()
        .then (access_token) =>
          @save_access_token access_token
          resolve access_token
        .catch (error) ->
          reject error

  ###
  Store the access token using Amplify.

  @example Access Token data we expect:
    access_token: Lt-IRHxkY9JLA5UuBR3Exxj5lCUf...
    access_token_expiration: 1424951321067 => Thu, 26 Feb 2015 11:48:41 GMT
    access_token_type: Bearer
    access_token_ttl: 900000 => 900s/15min

  @param access_token_data [Object, String] Access Token
  @option access_token_data [String] access_token
  @option access_token_data [String] expires_in
  @option access_token_data [String] type
  ###
  save_access_token: (access_token_data) =>
    expires_in_millis = 1000 * access_token_data.expires_in
    expiration_timestamp = Date.now() + expires_in_millis

    z.storage.set_value z.storage.StorageKey.AUTH.ACCESS_TOKEN.VALUE, access_token_data.access_token, access_token_data.expires_in
    z.storage.set_value z.storage.StorageKey.AUTH.ACCESS_TOKEN.EXPIRATION, expiration_timestamp, access_token_data.expires_in
    z.storage.set_value z.storage.StorageKey.AUTH.ACCESS_TOKEN.TTL, expires_in_millis, access_token_data.expires_in
    z.storage.set_value z.storage.StorageKey.AUTH.ACCESS_TOKEN.TYPE, access_token_data.token_type, access_token_data.expires_in

    @logger.log @logger.levels.LEVEL_1, 'Saved access token.', access_token_data
    @_log_access_token_expiration expiration_timestamp
    @_schedule_token_refresh expiration_timestamp

    @auth_service.save_access_token_in_client access_token_data.token_type, access_token_data.access_token

  # Deletes all access token data stored on the client.
  delete_access_token: ->
    z.storage.reset_value z.storage.StorageKey.AUTH.ACCESS_TOKEN.VALUE
    z.storage.reset_value z.storage.StorageKey.AUTH.ACCESS_TOKEN.EXPIRATION
    z.storage.reset_value z.storage.StorageKey.AUTH.ACCESS_TOKEN.TTL
    z.storage.reset_value z.storage.StorageKey.AUTH.ACCESS_TOKEN.TYPE

  ###
  Logs the expiration time of the access token.
  @private
  @param expiration_timestamp [Integer] Timestamp when access token expires
  ###
  _log_access_token_expiration: (expiration_timestamp) =>
    expiration_log = z.util.format_timestamp expiration_timestamp, false
    @logger.log @logger.levels.INFO, "Your access token will expire on: #{expiration_log}"

  ###
  Refreshes the access token in time before it expires.

  @note Access token will be refreshed 1 minute (60000ms) before it expires
  @private
  @param expiration_timestamp [Integer] The expiration date (and time) as timestamp
  ###
  _schedule_token_refresh: (expiration_timestamp) =>
    window.clearTimeout @access_token_refresh if @access_token_refresh
    callback_timestamp = expiration_timestamp - 60000

    if callback_timestamp < Date.now()
      @logger.log @logger.levels.INFO, 'Immediately executing access token refresh'
      @renew_access_token()
    else
      time = z.util.format_timestamp callback_timestamp, false
      @logger.log @logger.levels.INFO, "Scheduling next access token refresh for '#{time}'"

      @access_token_refresh = window.setTimeout =>
        if callback_timestamp > (Date.now() + 15000)
          @logger.log @logger.levels.INFO, "Access token refresh scheduled for '#{time}' skipped because it was executed late"
        else if navigator.onLine
          @logger.log @logger.levels.INFO, "Access token refresh scheduled for '#{time}' executed"
          @renew_access_token()
        else
          @logger.log @logger.levels.INFO, "Access token refresh scheduled for '#{time}' skipped because we are offline"
      , callback_timestamp - Date.now()
