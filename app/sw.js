(global => {
  'use strict';

  importScripts('/ext/js/sw-toolbox.js');

  function stripSearchParameters(url) {
    const strippedUrl = new URL(url);
    strippedUrl.search = '';
    return strippedUrl.toString();
  }

  function cacheRequest(cache, request, response) {
    return cache.put(stripSearchParameters(request.url), response.clone()).then(() => response);
  }

  function assetFetchHandler(request, value, options) {
    return global.caches.open(options.cache.name).then((cache) => {
      return cache.match(stripSearchParameters(request.url)).then((response) => {
        if (response) {
          return cacheRequest(cache, request, response);
        }
        return global.fetch(request).then((response) => {
          if (response.ok) {
            return global.caches.open(options.cache.name).then((cache) => {
              return cache.keys().then((keys) => {
                if (keys.length < options.cache.maxEntries) {
                  return cacheRequest(cache, request, response);
                }
                return cache.delete(keys[0]).then(() => cacheRequest(cache, request, response));
              });
            });
          }
        });
      });
    });
  }

  global.toolbox.options.debug = true;
  global.toolbox.router.default = global.toolbox.networkOnly;
  global.toolbox.router.get(/forceCaching=true/, assetFetchHandler, {
    cache: {
      name: 'asset-cache-v1',
      maxEntries: 1000
    },
  });

  global.addEventListener('install', event => event.waitUntil(global.skipWaiting()));
  global.addEventListener('activate', event => event.waitUntil(global.clients.claim()));
})(self);
