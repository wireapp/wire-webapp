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

# Search mapper to convert all server side JSON search results into usable entities.
class z.search.SearchResultMapper
  # Construct a new Search Result Mapper.
  constructor: ->
    @logger = new z.util.Logger 'z.search.SearchResultMapper', z.config.LOGGER.OPTIONS

  ###
  Converts JSON search results from other search modes into core entities.

  @param search_results [JSON] Search result data
  @param mode [z.search.SEARCH_MODE] Search mode to be mapped
  @return [Promise] Promise that will resolve with the mapped search results
  ###
  map_results: (search_results = [], mode) ->
    return new Promise (resolve) ->
      search_ets = []

      for search_result in search_results
        search_et = {}
        search_et.id = search_result.id
        search_et.mutual_friends_total = search_result.total_mutual_friends
        search_et.mutual_friend_ids = search_result.mutual_friends
        search_ets.push search_et
      resolve [search_ets, mode]
