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
z.extension ?= {}

# Giphy Service for all giphy calls to the backend REST API.
class z.extension.GiphyService
  ###
  Construct a new Giphy Service.
  @param client [z.service.Client] Client for the API calls
  ###
  constructor: (@client) ->
    @GIPHY_ENDPOINT_BASE = '/giphy/v1/gifs'

  ###
  Get GIFs for IDs.
  @param ids [String|Array] A single id or comma separated list of IDs to fetch GIF size data
  ###
  get_by_id: (ids) =>
    ids = if _.isArray ids then ids else [ids]
    url = "#{@GIPHY_ENDPOINT_BASE}/#{ids.join ','}"

    @client.send_json
      type: 'GET'
      url: @client.create_url url

  ###
  Search all Giphy GIFs for a word or phrase.
  @param tag [String] GIF tag to limit randomness by
  ###
  get_random: (tag) =>
    url = "#{@GIPHY_ENDPOINT_BASE}/random?tag=#{encodeURIComponent tag}"

    @client.send_json
      type: 'GET'
      url: @client.create_url url

  ###
  Search GIFs for a word or phrase.

  @param options [Object]
  @option options [String] query search query term or phrase
  @option options [Number] limit (optional) Number of results to return (maximum 100, default 25)
  @option options [Number] offset (optional) Results offset (defaults 0)
  @option options [String] sorting (optional) Relevant or recent
  ###
  get_search: (options) ->

    options = $.extend
      limit: 25
      offset: 0
      sorting: 'relevant'
    , options

    url = "#{@GIPHY_ENDPOINT_BASE}/search" +
      "?q=#{encodeURIComponent options.query}" +
      "&offset=#{options.offset}" +
      "&limit=#{options.limit}" +
      "&sort=#{options.sorting}"

    @client.send_json
      type: 'GET'
      url: @client.create_url url
