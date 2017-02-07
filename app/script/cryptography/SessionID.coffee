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

z.cryptography.SessionID =

  ###
  Build a session ID.
  @param user_id [String]
  @param client_id [String]
  @return [String]
  ###
  compose: (user_id, client_id) ->
    if user_id? and client_id?
      return "#{user_id}@#{client_id}"
    throw new TypeError 'Missing argument. Unable to compose session id.'

  ###
  Decompose session id into user_id and client_id.
  @param user_id [String]
  @param client_id [String]
  @return [String]
  ###
  decompose: (session_id) ->
    parts = session_id.split '@'
    return {
      user_id: parts[0]
      client_id: parts[1]
    }
