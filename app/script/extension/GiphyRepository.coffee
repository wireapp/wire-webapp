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

# Giphy repository for all interactions with the giphy service.
class z.extension.GiphyRepository
  ###
  Construct a new Giphy Repository.

  @param giphy_service [z.extension.GiphyService] Giphy REST API implementation
  ###
  constructor: (@giphy_service) ->
    @logger = new z.util.Logger 'z.extension.GiphyRepository', z.config.LOGGER.OPTIONS
    @gif_query_cache = {}

  ###
  Get random GIF for a word or phrase.

  @param options [Object]
  @option options [String] tag search query term or phrase
  @option options [Number] retry (optional) How many retries to get the correct size. (default 3)
  @option options [Number] max_size (optional) Maximum gif size in bytes (default 3MB)
  ###
  get_random_gif: (options) ->
    return new Promise (resolve, reject) =>
      options = $.extend
        retry: 3
        max_size: 3 * 1024 * 1024
      , options

      _get_random_gif = (retries = 0) =>
        if options.retry is retries
          reject new Error "Unable to fetch a proper gif within #{options.retry} retries"

        @giphy_service.get_random tag: options.tag
        .then (response) =>
          @giphy_service.get_by_id ids: response.data.id
        .then (response) =>
          images = response.data.images
          static_gif = images[z.extension.GiphyContentSizes.FIXED_WIDTH_STILL]
          animation_gif = images[z.extension.GiphyContentSizes.DOWNSIZED]

          if animation_gif.size > options.max_size
            @logger.log "Gif size (#{animation_gif.size}) is over maximum size (#{animation_gif.size})"
            _get_random_gif retries + 1
          else
            resolve
              url: response.data.url
              static: static_gif.url
              animated: animation_gif.url
        .catch (error) ->
          reject error

      _get_random_gif()

  ###
  Get random GIFs for a word or phrase.

  @param options [Object]
  @option options [String] query search query term or phrase
  @option options [Number] number amount of GIFs to receive
  @option options [Number] max_size (optional) Maximum gif size in bytes (default 3MB)
  @option options [Boolean] random (optional) will return an randomized result (default true)
  @option options [String] sorting (optional) specify sorting ('relevant' or 'recent' default 'relevant')
  ###
  get_gifs: (options) =>
    return new Promise (resolve, reject) =>
      offset = 0
      result = []

      options = $.extend
        number: 6
        max_size: 3 * 1024 * 1024
        random: true
        sorting: 'relevant'
      , options

      if not options.query
        error = new Error 'No query specified'
        @logger.log @logger.levels.ERROR, error.message, error
        reject error

      if options.random
        options.sorting = z.util.ArrayUtil.random_element ['recent', 'relevant']

        total = @gif_query_cache[options.query]
        if total?
          if options.number >= total
            offset = 0
          else
            range = total - options.number
            offset = Math.floor Math.random() * range

      @giphy_service.get_search
        query: options.query
        limit: 100
        sorting: options.sorting
        offset: offset
      .then (response) =>

        gifs = response.data
        if options.random
          gifs = gifs.sort -> .5 - Math.random()

        @gif_query_cache[options.query] = response.pagination.total_count

        for n in [0...options.number]
          break if n is gifs.length

          gif = gifs[n]
          images = gif.images
          static_gif = images[z.extension.GiphyContentSizes.FIXED_WIDTH_STILL]
          animation_gif = images[z.extension.GiphyContentSizes.DOWNSIZED]

          if animation_gif.size > options.max_size
            continue
          else
            result.push
              url: gif.url
              static: static_gif.url
              animated: animation_gif.url

        resolve result
      .catch (error) =>
        @logger.log "Unable to fetch gif for query: #{options.query}", error
        reject error
