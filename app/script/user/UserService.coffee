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
z.user ?= {}

###
User service for all user and connection calls to the backend REST API.
###
class z.user.UserService
  URL_CONNECTIONS: '/connections'
  URL_PROPERTIES: '/properties'
  URL_SELF: '/self'
  URL_USERS: '/users'
  ###
  Construct a new User Service.
  @param client [z.service.BackendClient] Client for the API calls
  ###
  constructor: (@client) ->
    @logger = new z.util.Logger 'z.user.UserService', z.config.LOGGER.OPTIONS


  ###############################################################################
  # Connections
  ###############################################################################

  ###
  Create a connection request to another user.
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/createConnection

  @param user_id [String] User ID of the user to request a connection with
  @param name [String] Name of the conversation being initiated (1 - 256 characters)
  @return [Promise] Promise that resolves when the connection request was created
  ###
  create_connection: (user_id, name) ->
    @client.send_json
      type: 'POST'
      url: @client.create_url @URL_CONNECTIONS
      data:
        user: user_id
        name: name
        message: ' '

  ###
  Retrieves a list of connections to other users.
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/connections
  @note The list is already pre-ordered by the backend, so in order to fetch more connections
    than the limit, you only have to pass the User ID (which is not from the self user)
    of the last connection item from the received list.

  @param limit [Integer] Number of results to return (default 100, max 500)
  @param user_id [String] User ID to start from
  @return [Promise] Promise that resolves with user connections
  ###
  get_own_connections: (limit = 500, user_id = undefined) ->
    @client.send_request
      type: 'GET'
      url: @client.create_url @URL_CONNECTIONS
      data:
        size: limit
        start: user_id

  ###
  Updates a connection to another user.
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/updateConnection
  @example status: ['accepted', 'blocked', 'pending', 'ignored', 'sent' or 'cancelled']

  @param user_id [String] User ID of the other user
  @param status [z.user.ConnectionStatus] New relation status
  @return [Promise] Promise that resolves when the status was updated
  ###
  update_connection_status: (user_id, status) ->
    @client.send_json
      type: 'PUT'
      url: @client.create_url "/connections/#{user_id}"
      data:
        status: status


  ###############################################################################
  # Password reset
  ###############################################################################

  ###
  Initiate a password reset.
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/beginPasswordReset

  @param email [String] Email address
  @param phone [String] E.164 formatted phone number
  @return [Promise] Promise that resolves when password reset process has been triggered
  ###
  initiate_password_reset: (email, phone_number) ->
    @client.send_json
      type: 'POST'
      url: @client.create_url '/password-reset'
      data:
        email: email
        phone: phone_number

  ###############################################################################
  # Profile
  ###############################################################################

  ###
  Get your profile.
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/self
  @return [Promise] Promise that will resolve with the self user
  ###
  get_own_user: ->
    @client.send_request
      type: 'GET'
      url: @client.create_url @URL_SELF

  ###
  Update your profile.
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/updateSelf

  @param data [Object] Updated user profile information
  @option data [Integer] accent_id
  @option data [String] name
  @option data [Array<z.assets.Asset>] picture
  ###
  update_own_user_profile: (data) ->
    @client.send_json
      type: 'PUT'
      url: @client.create_url @URL_SELF
      data: data

  ###
  Change user email.
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/changeEmail

  @param email [String] New email address for the user
  @return [Promise] Promise that resolves when email changing process has been started on backend
  ###
  change_own_email: (email) ->
    @client.send_json
      type: 'PUT'
      url: @client.create_url '/self/email'
      data:
        email: email

  ###
  Change username.

  @param username [String] New username for the user
  @return [Promise] Promise that resolves when username changing process has been started on backend
  ###
  change_own_username: (username) ->
    @client.send_json
      type: 'PUT'
      url: @client.create_url '/self/handle'
      data:
        handle: username

  ###
  Change user password.
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/changePassword

  @param new_password [String] New user password
  @param old_password [String] Old password of the user (optional)
  @return [Promise] Promise that resolves when password has been changed on backend
  ###
  change_own_password: (new_password, old_password) ->
    @client.send_json
      type: 'PUT'
      url: @client.create_url '/self/password'
      data:
        new_password: new_password
        old_password: old_password

  ###
  Change your phone number.
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/changePhone

  @param phone_number [String] Phone number in E.164 format
  @return [Promise] Promise that resolves when phone number change process has been started on backend
  ###
  change_own_phone_number: (phone_number) ->
    @client.send_json
      type: 'PUT'
      url: @client.create_url '/self/phone'
      data:
        phone: phone_number


  ###############################################################################
  # Users
  ###############################################################################

  ###
  Delete self user.
  @return [Promise] Promise that resolves when account deletion has been initiated
  ###
  delete_self: ->
    @client.send_json
      type: 'DELETE'
      url: @client.create_url @URL_SELF
      data:
        todo: 'Change this to normal request!'

  ###
  Check if a username exists.
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/checkUserHandle

  @param username [String]
  ###
  check_username: (username) ->
    @client.send_request
      type: 'HEAD'
      url: @client.create_url "/users/handles/#{username}"

  ###
  Get a set of users for the given usernames
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/checkUserHandles
  @example ['0bb84213-8cc2-4bb1-9e0b-b8dd522396d5', '15ede065-72b3-433a-9917-252f076ed031']
  @param usernames [Array]
  @param amount [Number] amount of usernames to return
  ###
  check_usernames: (usernames, amount = 1) ->
    @client.send_json
      type: 'POST'
      url: @client.create_url '/users/handles'
      data:
        handles: usernames
        'return': amount

  ###
  Get a set of users.
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/users
  @example ['0bb84213-8cc2-4bb1-9e0b-b8dd522396d5', '15ede065-72b3-433a-9917-252f076ed031']

  @param users [Array<String>] ID of users to be fetched
  ###
  get_users: (users) ->
    @client.send_request
      type: 'GET'
      url: @client.create_url @URL_USERS
      data:
        ids: users.join ','

  ###
  Get a user by ID.
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/user
  @param user_id [String] User ID
  ###
  get_user_by_id: (user_id) ->
    @client.send_request
      type: 'GET'
      url: @client.create_url "/users/#{user_id}"
