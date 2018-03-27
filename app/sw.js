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

  importScripts('/worker/sw-toolbox.js');
  importScripts('/worker/lru-cache-strategy.js');

  const ASSET_CACHE_MAX_ITEMS = 1000;
  const CACHE_VERSION = 2;
  const CURRENT_CACHES = {
    asset: `asset: 'asset-cache-v${CACHE_VERSION}`,
  };

  global.toolbox.options.debug = false;
  global.toolbox.router.default = global.toolbox.networkOnly;
  global.toolbox.router.get(/forceCaching=true/, global.cacheLRU, {
    cache: {
      maxEntries: ASSET_CACHE_MAX_ITEMS,
      name: CURRENT_CACHES.asset,
    },
  });

  global.addEventListener('install', event => event.waitUntil(global.skipWaiting()));
  global.addEventListener('activate', event => {
    const expectedCacheNames = Object.keys(CURRENT_CACHES).map(key => CURRENT_CACHES[key]);

    return event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!expectedCacheNames.includes(cacheName)) {
              return caches.delete(cacheName);
            }
          })
        ).then(() => global.clients.claim());
      })
    );
  });
})(self);
