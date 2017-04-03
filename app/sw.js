(global => {
  'use strict';

  importScripts('/ext/js/sw-toolbox.js');
  importScripts('/worker/lru-cache-strategy');

  global.toolbox.options.debug = true;
  global.toolbox.router.default = global.toolbox.networkOnly;
  global.toolbox.router.get(/forceCaching=true/, global.cacheLRU, {
    cache: {
      name: 'asset-cache-v1',
      maxEntries: 1000,
    },
  });

  global.addEventListener('install', event => event.waitUntil(global.skipWaiting()));
  global.addEventListener('activate', event => event.waitUntil(global.clients.claim()));
})(self);
