(global => {
  'use strict';

  function stripSearchParameters(url) {
    const strippedUrl = new URL(url);
    strippedUrl.search = '';
    return strippedUrl.toString();
  }

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
