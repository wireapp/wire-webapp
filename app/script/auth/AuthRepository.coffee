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
    @auth_service.post_login login, persist
    .then (response) =>
      @save_access_token response
      z.util.StorageUtil.set_value z.storage.StorageKey.AUTH.PERSIST, persist
      z.util.StorageUtil.set_value z.storage.StorageKey.AUTH.SHOW_LOGIN, true
      return response

  ###
  Logout the user on the backend.
  @return [Promise] Promise that will always resolve
  ###
  logout: =>
    @auth_service.post_logout()
    .then =>
      @logger.info 'Log out on backend successful'
    .catch (error) =>
      @logger.warn "Log out on backend failed: #{error.message}", error

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
      z.util.StorageUtil.set_value z.storage.StorageKey.AUTH.PERSIST, true
      z.util.StorageUtil.set_value z.storage.StorageKey.AUTH.SHOW_LOGIN, true
      z.util.StorageUtil.set_value new_user.label_key, new_user.label
      @logger.info "COOKIE::'#{new_user.label}' Saved cookie label with key '#{new_user.label_key}' in Local Storage",
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

  # Renew access-token provided a valid cookie.
  renew_access_token: (trigger) =>
    @logger.info "Access token renewal started. Source: #{trigger}"
    @get_access_token()
    .then =>
      @auth_service.client.execute_request_queue()
      amplify.publish z.event.WebApp.CONNECTION.ACCESS_TOKEN.RENEWED
    .catch (error) =>
      if error.type is z.auth.AccessTokenError::TYPE.REQUEST_FORBIDDEN or z.util.Environment.frontend.is_localhost()
        @logger.warn "Session expired on access token refresh: #{error.message}", error
        Raygun.send error
        amplify.publish z.event.WebApp.LIFECYCLE.SIGN_OUT, z.auth.SignOutReasion.SESSION_EXPIRED, false, true
      else if error.type isnt z.auth.AccessTokenError::TYPE.REFRESH_IN_PROGRESS
        @logger.error "Refreshing access token failed: '#{error.type}'", error
        amplify.publish z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.CONNECTIVITY_RECONNECT

  # Get the cached access token from the Amplify store.
  get_cached_access_token: ->
    return new Promise (resolve, reject) =>
      access_token = z.util.StorageUtil.get_value z.storage.StorageKey.AUTH.ACCESS_TOKEN.VALUE
      access_token_type = z.util.StorageUtil.get_value z.storage.StorageKey.AUTH.ACCESS_TOKEN.TYPE

      if access_token
        @logger.info 'Cached access token found in Local Storage', {access_token: access_token}
        @auth_service.save_access_token_in_client access_token_type, access_token
        @_schedule_token_refresh z.util.StorageUtil.get_value z.storage.StorageKey.AUTH.ACCESS_TOKEN.EXPIRATION
        resolve()
      else
        reject new z.auth.AccessTokenError z.auth.AccessTokenError::TYPE.NOT_FOUND_IN_CACHE

  ###
  Initially get access-token provided a valid cookie.
  @return [Promise] Returns a Promise that resolve with the access token data
  ###
  get_access_token: =>
    if @auth_service.client.request_queue_blocked_state() is z.service.RequestQueueBlockedState.ACCESS_TOKEN_REFRESH
      return Promise.reject new z.auth.AccessTokenError z.auth.AccessTokenError::TYPE.REFRESH_IN_PROGRESS

    return @auth_service.post_access()
    .then (access_token) =>
      @save_access_token access_token
      return access_token

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

    z.util.StorageUtil.set_value z.storage.StorageKey.AUTH.ACCESS_TOKEN.VALUE, access_token_data.access_token, access_token_data.expires_in
    z.util.StorageUtil.set_value z.storage.StorageKey.AUTH.ACCESS_TOKEN.EXPIRATION, expiration_timestamp, access_token_data.expires_in
    z.util.StorageUtil.set_value z.storage.StorageKey.AUTH.ACCESS_TOKEN.TTL, expires_in_millis, access_token_data.expires_in
    z.util.StorageUtil.set_value z.storage.StorageKey.AUTH.ACCESS_TOKEN.TYPE, access_token_data.token_type, access_token_data.expires_in

    @auth_service.save_access_token_in_client access_token_data.token_type, access_token_data.access_token

    @_log_access_token_update access_token_data, expiration_timestamp
    @_schedule_token_refresh expiration_timestamp

  # Deletes all access token data stored on the client.
  delete_access_token: ->
    z.util.StorageUtil.reset_value z.storage.StorageKey.AUTH.ACCESS_TOKEN.VALUE
    z.util.StorageUtil.reset_value z.storage.StorageKey.AUTH.ACCESS_TOKEN.EXPIRATION
    z.util.StorageUtil.reset_value z.storage.StorageKey.AUTH.ACCESS_TOKEN.TTL
    z.util.StorageUtil.reset_value z.storage.StorageKey.AUTH.ACCESS_TOKEN.TYPE

  ###
  Logs the update of the access token.

  @private
  @param access_token_data [Object, String] Access Token
  @option access_token_data [String] access_token
  @option access_token_data [String] expires_in
  @option access_token_data [String] type
  @param expiration_timestamp [Integer] Timestamp when access token expires
  ###
  _log_access_token_update: (access_token_data, expiration_timestamp) =>
    expiration_log = z.util.format_timestamp expiration_timestamp, false
    @logger.info "Saved updated access token. It will expire on: #{expiration_log}", access_token_data

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
      @renew_access_token 'Immediate on scheduling'
    else
      time = z.util.format_timestamp callback_timestamp, false
      @logger.info "Scheduling next access token refresh for '#{time}'"

      @access_token_refresh = window.setTimeout =>
        if callback_timestamp > (Date.now() + 15000)
          @logger.info "Access token refresh scheduled for '#{time}' skipped because it was executed late"
        else if navigator.onLine
          @renew_access_token "Schedule for '#{time}'"
        else
          @logger.info "Access token refresh scheduled for '#{time}' skipped because we are offline"
      , callback_timestamp - Date.now()
