#
# Wire
# Copyright (C) 2017 Wire Swiss GmbH
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

# Connect Service for all addressbook calls to the backend REST API.
class z.connect.ConnectService
  ###
  Construct a new Connect Service.
  @param client [z.service.Client] Client for the API calls
  ###
  constructor: (@client) ->
    @logger = new z.util.Logger 'z.connect.ConnectService', z.config.LOGGER.OPTIONS

  ###
  Upload address book data for matching.
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/addressbook/onboardingV3

  @param phone_book [Object] Phone book containing the address cards
  @return [Promise] Promise that resolves with the matched contacts from the user's phone book
  ###
  post_onboarding: (phone_book) ->
    @client.send_json
      type: 'POST'
      url: @client.create_url '/onboarding/v3'
      data: phone_book
