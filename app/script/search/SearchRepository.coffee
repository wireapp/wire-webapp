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

# Search repository for all interactions with the search service.
class z.search.SearchRepository
  ###
  Trim and remove @.
  @param query [String] Search string
  ###
  @normalize_query: (query) ->
    return '' unless _.isString query
    return query.trim().replace /^[@]/, ''

  ###
  Construct a new Conversation Repository.
  @param search_service [z.search.SearchService] Backend REST API search service implementation
  @param user_repository [z.user.UserRepository] Repository for all user and connection interactions
  ###
  constructor: (@search_service, @user_repository) ->
    @logger = new z.util.Logger 'z.search.SearchRepository', z.config.LOGGER.OPTIONS

    @search_result_mapper = new z.search.SearchResultMapper @user_repository

    amplify.subscribe z.event.WebApp.SEARCH.ONBOARDING, @show_onboarding

  ###
  Get common contacts for given user.
  @param user_id [String] User ID
  @return [Promise<Array<z.entity.User>>] Promise that will resolve with an array containing the users common contacts
  ###
  get_common_contacts: (user_id) =>
    @search_service.get_common(user_id).then (response) -> response.returned

  ###
  Get top people.
  @return [Function] Promise that resolves with the top connections
  ###
  get_top_people: ->
    @search_service.get_top z.config.TOP_PEOPLE_FETCH_LIMIT
    .then (response) =>
      return @search_result_mapper.map_results response.documents, z.search.SEARCH_MODE.TOP_PEOPLE
    .then ([search_ets, mode]) =>
      return @_prepare_search_result search_ets, mode

  ###
  Ignore suggested user.
  @param user_id [String] User ID
  @return [Promise] Promise that resolves when a suggestion has been ignored
  ###
  ignore_suggestion: (user_id) ->
    @search_service.put_suggestions_ignore user_id

  ###
  Search for users on the backend by name.
  @param name [String] Search query
  @return [Promise] Promise that resolves with the search results
  ###
  search_by_name: (name) ->
    @search_service.get_contacts name, 30, z.search.SEARCH_LEVEL.INDIRECT_CONTACT, 1
    .then (response) =>
      return @search_result_mapper.map_results response?.documents, z.search.SEARCH_MODE.CONTACTS
    .then ([search_ets, mode]) =>
      return @_prepare_search_result search_ets, mode

  ###
  Show on-boarding results.
  @param response [Object] Server response
  @return [Promise] Promise that resolves with the connections found through on-boarding
  ###
  show_onboarding: (response) =>
    @search_result_mapper.map_results response.results, z.search.SEARCH_MODE.ONBOARDING
    .then ([search_ets, mode]) =>
      return @_prepare_search_result search_ets, mode

  ###
  Preparing the search results for display.

  @note We skip a few results as connection changes need a while to reflect on the graph.
  @private

  @param search_ets [Array<Object>] An array of mapped search result entities
  @param mode [z.search.SEARCH_MODE] Search mode
  @return [Promise] Promise that will resolve with search results
  ###
  _prepare_search_result: (search_ets, mode) ->
    return new Promise (resolve) =>
      user_ids = (user_et.id for user_et in search_ets)

      @user_repository.get_users_by_id user_ids, (user_ets) ->
        result_user_ets = []
        for user_et in user_ets

          search_et = ko.utils.arrayFirst search_ets, (search_et) -> search_et.id is user_et.id
          user_et.mutual_friends_total search_et.mutual_friends_total

          ###
          Skipping some results to adjust for slow graph updates.

          Only show connected people among your top people.
          Do not show already connected people when uploading address book.
          Only show unknown or cancelled people in suggestions.
          ###
          switch mode
            when z.search.SEARCH_MODE.CONTACTS
              if not user_et.connected()
                user_et.connection_level z.user.ConnectionLevel.NO_CONNECTION
                result_user_ets.push user_et
            when z.search.SEARCH_MODE.ONBOARDING
              result_user_ets.push user_et if not user_et.connected()
            when z.search.SEARCH_MODE.TOP_PEOPLE
              result_user_ets.push user_et if user_et.connected()
            else
              result_user_ets.push user_et

        resolve result_user_ets
