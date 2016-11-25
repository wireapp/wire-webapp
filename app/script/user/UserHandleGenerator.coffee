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
Client side user handle generation.
###
z.user.UserHandleGenerator = do ->

  ###
  Create handle  based on the users name.
  @param name [String]
  ###
  normalize_name = (name) ->
    generated_username = window.getSlug name
    .replace /[^a-zA-Z0-9_]/, ''
    .substring 0, 17

    # if generated_username.length is 0
      # TODO add random characters

    return generated_username

  ###
  Create user handle variations.
  @param name [String]
  ###
  create_handle_variations = (name) ->


  return {} =
    normalize_name: normalize_name
    create_handle_variations: create_handle_variations
