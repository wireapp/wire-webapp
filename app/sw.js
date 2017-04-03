(global => {
  'use strict';

  importScripts('/ext/js/sw-toolbox.js');

  const ASSET_CACHE_NAME = 'asset-cache-v1';
  const MAX_ENTRIES = 1000;

  function stripSearchParameters(url) {
    const strippedUrl = new URL(url);
    strippedUrl.search = '';
    return strippedUrl.toString();
  }

  function cacheRequest(cache, request, response) {
    return cache.put(stripSearchParameters(request.url), response.clone()).then(() => response);
  }

  function cacheRequestLRU(cache, request, response) {
    return cache.keys().then((keys) => {
      if (keys.length < MAX_ENTRIES) {
        return cacheRequest(cache, request, response);
      }
      return cache.delete(keys[0]).then(() => cacheRequest(cache, request, response));
    });
  }

  function assetGetHandler(request) {
    return global.caches.open(ASSET_CACHE_NAME).then((cache) => {
      return cache.match(stripSearchParameters(request.url)).then((response) => {
        if (response) {
          return cacheRequest(cache, request, response);
        }
        return global.fetch(request).then((response) => {
          if (response.ok) {
            return cacheRequestLRU(cache, request, response)
          }
        });
      });
    });
  }

  global.toolbox.options.debug = true;
  global.toolbox.router.default = global.toolbox.networkOnly;
  global.toolbox.router.get(/forceCaching=true/, assetGetHandler);

  global.addEventListener('install', event => event.waitUntil(global.skipWaiting()));
  global.addEventListener('activate', event => event.waitUntil(global.clients.claim()));
})(self);
