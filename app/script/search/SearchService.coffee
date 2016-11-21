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
  Get common contacts for given user.
  @param user_id [String] User ID
  @return [Promise] Promise that resolves with the common contacts
  ###
  get_common: (user_id) ->
    @client.send_request
      type: 'GET'
      url: @client.create_url "/search/common/#{user_id}"

  ###
  Search for a user.

  @param query [String] Query string (case insensitive)
  @param size [Integer] Number of requested user
  @param level [Integer] How deep to search (friends, friends of friends, friends of friends or friends)...
  @param directory [Integer] Fall back to directory if graph search does not find the size of people (0 or 1)
  @return [Promise] Promise that resolves with the search results
  ###
  get_contacts: (query, size, level, directory) ->
    @client.send_request
      type: 'GET'
      url: @client.create_url "/search/contacts?q=#{encodeURIComponent(query)}&size=#{size}&l=#{level}&d=#{directory}"

  ###
  Get top people.
  @param [Integer] size number of requested user
  @return [Promise] Promise that resolves with the top connections
  ###
  get_top: (size) ->
    @client.send_request
      type: 'GET'
      url: @client.create_url "/search/top?size=#{size}"

  ###
  Ignore suggested user.
  @param user_id [String] User ID
  @return [Promise] Promise that resolves when a suggestion has been ignored
  ###
  put_suggestions_ignore: (user_id) ->
    @client.send_request
      type: 'PUT'
      url: @client.create_url "/search/suggestions/#{user_id}/ignore"
