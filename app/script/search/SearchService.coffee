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
z.search ?= {}

# Search service for all search calls to the backend REST API.
class z.search.SearchService
  ###
  Construct a new Search Service.
  @param client [z.service.Client] Client for the API calls
  ###
  constructor: (@client) ->
    @logger = new z.util.Logger 'z.search.SearchService', z.config.LOGGER.OPTIONS

  ###
  Search for a user.

  @param query [String] Query string (case insensitive)
  @param size [Integer] Number of requested user
  @return [Promise] Promise that resolves with the search results
  ###
  get_contacts: (query, size) ->
    @client.send_request
      type: 'GET'
      url: @client.create_url "/search/contacts?q=#{encodeURIComponent(query)}&size=#{size}"
