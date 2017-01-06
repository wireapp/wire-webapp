(function() {
  var ASSET_CACHE_MAX_ITEMS, CACHE_VERSION, CURRENT_CACHES, add_to_lru, cache_add, should_cache_request;

  CACHE_VERSION = 1;

  CURRENT_CACHES = {
    asset: 'asset-cache-v' + CACHE_VERSION
  };

  ASSET_CACHE_MAX_ITEMS = 1000;

  cache_add = function(cache, request) {
    return fetch(request.clone()).then(function(response) {
      if (!response.ok) {
        throw new TypeError('bad response status');
      }
      return cache.put(request, response.clone()).then(function() {
        return response;
      });
    });
  };

  should_cache_request = function(request) {
    return request.url.includes('forceCaching=true');
  };

  add_to_lru = function(cache, maxItems, request) {
    return cache.keys().then(function(keys) {
      if (keys.length < maxItems) {
        return cache_add(cache, request);
      }
      return cache["delete"](keys[0]).then(function() {
        return cache_add(cache, request);
      });
    });
  };

  self.addEventListener('install', function(event) {
    console.debug('service worker installed');
    return event.waitUntil(self.skipWaiting());
  });

  self.addEventListener('activate', function(event) {
    var expectedCacheNames;
    console.debug('service worker activated');
    expectedCacheNames = Object.keys(CURRENT_CACHES).map(function(key) {
      return CURRENT_CACHES[key];
    });
    return event.waitUntil(caches.keys().then(function(cacheNames) {
      return Promise.all(cacheNames.map(function(cacheName) {
        if (expectedCacheNames.indexOf(cacheName) === -1) {
          console.debug('Deleting out of date cache:', cacheName);
          return caches["delete"](cacheName);
        }
      })).then(function() {
        return self.clients.claim();
      });
    }));
  });

  self.addEventListener('fetch', function(event) {
    if (should_cache_request(event.request)) {
      return event.respondWith(caches.open(CURRENT_CACHES.asset).then(function(cache) {
        return cache.match(event.request, {
          ignoreSearch: true
        }).then(function(response) {
          if (response) {
            cache.put(event.request, response.clone());
            return response;
          }
          return add_to_lru(cache, ASSET_CACHE_MAX_ITEMS, event.request);
        });
      }));
    }
  });

}).call(this);
