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
  @param level [Integer] How deep to search (friends, friends of friends, friends of friends or friends)...
  @param directory [Integer] Fall back to directory if graph search does not find the size of people (0 or 1)
  @return [Promise] Promise that resolves with the search results
  ###
  get_contacts: (query, size, level = z.search.SEARCH_LEVEL.DIRECT_CONTACT, directory = 1) ->
    @client.send_request
      type: 'GET'
      url: @client.create_url "/search/contacts?q=#{encodeURIComponent(query)}&size=#{size}&l=#{level}&d=#{directory}"
