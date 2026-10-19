/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {isNullOrUndefined} from '@sindresorhus/is';
import {Maybe} from 'true-myth';

type RetireLegacyServiceWorkerOptions = {
  readonly serviceWorkerContainer: Maybe<Pick<ServiceWorkerContainer, 'getRegistrations'>>;
  readonly cacheStorage: Maybe<Pick<CacheStorage, 'keys' | 'delete'>>;
  readonly origin: string;
};

const legacyAssetCacheNames = new Set(['asset-cache-v3', 'asset-cache-v2', "asset: 'asset-cache-v2"]);

export async function retireLegacyServiceWorker(options: RetireLegacyServiceWorkerOptions): Promise<void> {
  const {serviceWorkerContainer, cacheStorage, origin} = options;
  const unregisterPromise = serviceWorkerContainer.match({
    Just: availableServiceWorkerContainer => {
      return unregisterLegacyServiceWorker(availableServiceWorkerContainer, origin);
    },
    Nothing: () => {
      return Promise.resolve();
    },
  });
  const deleteCachesPromise = cacheStorage.match({
    Just: availableCacheStorage => {
      return deleteLegacyAssetCaches(availableCacheStorage);
    },
    Nothing: () => {
      return Promise.resolve();
    },
  });

  await Promise.all([unregisterPromise, deleteCachesPromise]);
}

async function unregisterLegacyServiceWorker(
  serviceWorkerContainer: Pick<ServiceWorkerContainer, 'getRegistrations'>,
  origin: string,
): Promise<void> {
  const registrations = await serviceWorkerContainer.getRegistrations();
  const legacyRegistrations = registrations.filter(registration => {
    return isLegacyWireRegistration(registration, origin);
  });

  await Promise.all(
    legacyRegistrations.map(registration => {
      return registration.unregister();
    }),
  );
}

async function deleteLegacyAssetCaches(cacheStorage: Pick<CacheStorage, 'keys' | 'delete'>): Promise<void> {
  const cacheNames = await cacheStorage.keys();
  const matchingCacheNames = cacheNames.filter(cacheName => {
    return legacyAssetCacheNames.has(cacheName);
  });

  await Promise.all(
    matchingCacheNames.map(cacheName => {
      return cacheStorage.delete(cacheName);
    }),
  );
}

function isLegacyWireRegistration(registration: ServiceWorkerRegistration, origin: string): boolean {
  if (registration.scope !== `${origin}/`) {
    return false;
  }

  return [registration.active, registration.waiting, registration.installing].some(worker => {
    if (isNullOrUndefined(worker)) {
      return false;
    }

    const workerUrl = new URL(worker.scriptURL);

    return workerUrl.origin === origin && workerUrl.pathname === '/sw.js';
  });
}
