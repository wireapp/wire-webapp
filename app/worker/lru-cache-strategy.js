/*
 * Wire
 * Copyright (C) 2016 Wire Swiss GmbH
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

((global) => {
  'use strict';

  function cacheRequest(cache, request, response) {
    return cache.put(stripSearchParameters(request.url), response.clone()).then(() => response);
  }

  function cacheRequestLRU(cache, request, response, maxEntries = 100) {
    return cache.keys().then((keys) => {
      if (keys.length < maxEntries) {
        return cacheRequest(cache, request, response);
      }
      return cache.delete(keys[0]).then(() => cacheRequest(cache, request, response));
    });
  }

  function stripSearchParameters(url) {
    const strippedUrl = new URL(url);
    strippedUrl.search = '';
    return strippedUrl.toString();
  }

  global.cacheLRU = function (request, values, options) {
    return global.caches.open(options.cache.name).then((cache) => {
      return cache.match(stripSearchParameters(request.url)).then((response) => {
        if (response) {
          return cacheRequest(cache, request, response);
        }
        return global.fetch(request).then((response) => {
          if (response.ok) {
            return cacheRequestLRU(cache, request, response, options.cache.maxEntries)
          }
        });
      });
    });
  }

})(self);
