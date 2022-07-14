/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {skipWaiting, clientsClaim} from 'workbox-core';
import {ExpirationPlugin} from 'workbox-expiration';
import {registerRoute} from 'workbox-routing';
import {CacheFirst} from 'workbox-strategies';

skipWaiting();
clientsClaim();

// Even without using precaching bundled files yet we need to include this in order to satisfy workbox.
// eslint-disable-next-line
self.__WB_MANIFEST;

const ASSET_CACHE_MAX_ITEMS = 1000;
const CACHE_VERSION = 3;
const ASSET_CACHE_NAME = `asset-cache-v${CACHE_VERSION}`;

// Clear old caches
const DEPRECATED_ASSET_CACHE_NAME = `asset: 'asset-cache-v2`;
caches.delete(DEPRECATED_ASSET_CACHE_NAME).then(isDeprecatedCacheDeleted => {
  if (isDeprecatedCacheDeleted) {
    console.info(`Deprecated asset cache "${DEPRECATED_ASSET_CACHE_NAME}" got deleted`);
  }
});

registerRoute(
  ({url}) => {
    return url.search.includes('forceCaching=true');
  },
  new CacheFirst({
    cacheName: ASSET_CACHE_NAME,
    cacheableResponse: {
      statuses: [200],
    },
    matchOptions: {
      ignoreSearch: true,
    },
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 7 * 24 * 60 * 60, // One week
        maxEntries: ASSET_CACHE_MAX_ITEMS,
      }),
    ],
  }),
);
