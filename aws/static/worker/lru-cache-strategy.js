/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

(global => {
  'use strict';

  function cacheRequest(cache, request, response) {
    return cache
      .put(stripSearchParameters(request.url), response.clone())
      .catch(error => console.warn(`Failed to cache asset: ${error.message}`)) // eslint-disable-line
      .then(() => response);
  }

  function cacheRequestLRU(cache, request, response, maxEntries = 100) {
    return cache.keys().then(keys => {
      const cacheExceedsLimit = keys.length >= maxEntries;
      return cacheExceedsLimit
        ? cache.delete(keys[0]).then(() => cacheRequest(cache, request, response))
        : cacheRequest(cache, request, response);
    });
  }

  function stripSearchParameters(url) {
    const strippedUrl = new URL(url);
    strippedUrl.search = '';
    return strippedUrl.toString();
  }

  global.cacheLRU = function(request, values, options) {
    return global.caches.open(options.cache.name).then(cache => {
      return cache.match(stripSearchParameters(request.url)).then(response => {
        return response
          ? cacheRequest(cache, request, response)
          : global.fetch(request).then(_response => {
              if (_response.ok) {
                return cacheRequestLRU(cache, request, _response, options.cache.maxEntries);
              }
            });
      });
    });
  };
})(self);
