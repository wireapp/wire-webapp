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
z.service ?= {}

class z.service.BackendClientError
  constructor: (params) ->
    @name = @constructor.name
    @stack = (new Error()).stack

    if _.isObject params
      @code = params.code
      @label = params.label
      @message = params.message
    else if _.isNumber params
      @code = params
      @message = "#{params}"

  @:: = new Error()
  @::constructor = @
  @::STATUS_CODE =
    ACCEPTED: 202
    BAD_GATEWAY: 502
    BAD_REQUEST: 400
    CONFLICT: 409
    CONNECTIVITY_PROBLEM: 0
    CREATED: 201
    FORBIDDEN: 403
    INTERNAL_SERVER_ERROR: 500
    NO_CONTENT: 204
    NOT_FOUND: 404
    OK: 200
    REQUEST_TIMEOUT: 408
    PRECONDITION_FAILED: 412
    TOO_MANY_REQUESTS: 429
    UNAUTHORIZED: 401
    REQUEST_TOO_LARGE: 413

  @::LABEL =
    BAD_REQUEST: 'bad-request'
    BLACKLISTED_EMAIL: 'blacklisted-email'
    BLACKLISTED_PHONE: 'blacklisted-phone'
    CONNECTIVITY_PROBLEM: 'connectivity-problem'
    CONVERSATION_TOO_BIG: 'conv-too-big'
    IN_USE: 'in-use'
    INVALID_CREDENTIALS: 'invalid-credentials'
    INVALID_EMAIL: 'invalid-email'
    INVALID_INVITATION_CODE: 'invalid-invitation-code'
    INVALID_OPERATION: 'invalid-op'
    INVALID_PHONE: 'invalid-phone'
    KEY_EXISTS: 'key-exists'
    MISSING_AUTH: 'missing-auth'
    MISSING_IDENTITY: 'missing-identity'
    NOT_FOUND: 'not-found'
    PASSWORD_EXISTS: 'password-exists'
    PENDING_ACTIVATION: 'pending-activation'
    PENDING_LOGIN: 'pending-login'
    TOO_MANY_CLIENTS: 'too-many-clients'
    TOO_MANY_MEMBERS: 'too-many-members'
    UNAUTHORIZED: 'unauthorized'
    UNKNOWN_CLIENT: 'unknown-client'
    VOICE_CHANNEL_FULL: 'voice-channel-full'
