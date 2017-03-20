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

CACHE_VERSION = 1
CURRENT_CACHES =
  asset: 'asset-cache-v' + CACHE_VERSION

ASSET_CACHE_MAX_ITEMS = 1000

cache_add = (cache, request) ->
  fetch request.clone()
  .then (response) ->
    if not response.ok
      throw new TypeError 'bad response status'
    return cache.put(request, response.clone()).then -> response

should_cache_request = (request) ->
  return request.url.includes 'forceCaching=true'

add_to_lru = (cache, maxItems, request) ->
  return cache.keys().then (keys) ->
    if keys.length < maxItems
      return cache_add cache, request

    return cache.delete(keys[0]).then ->
      return cache_add cache, request

self.addEventListener 'install', (event) ->
  # coffeelint: disable
  console.debug 'service worker installed'
  # coffeelint: enable

  event.waitUntil(self.skipWaiting())

self.addEventListener 'activate', (event) ->
  # coffeelint: disable
  console.debug 'service worker activated'
  # coffeelint: enable

  expectedCacheNames = Object.keys(CURRENT_CACHES).map (key) -> CURRENT_CACHES[key]

  event.waitUntil caches.keys().then((cacheNames) ->
    Promise.all(cacheNames.map((cacheName) ->
      if expectedCacheNames.indexOf(cacheName) is -1
        # coffeelint: disable
        console.debug 'Deleting out of date cache:', cacheName
        # coffeelint: enable
        return caches.delete(cacheName)
    )).then ->
      self.clients.claim()
  )

self.addEventListener 'fetch', (event) ->
  if should_cache_request event.request
    event.respondWith(
      caches.open(CURRENT_CACHES.asset).then (cache) ->
        cache.match(event.request)
        .then (response) ->

          if response
            cache.put event.request, response.clone()
            return response

          return add_to_lru cache, ASSET_CACHE_MAX_ITEMS, event.request
    )
