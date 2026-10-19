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

import {retireLegacyServiceWorker} from './retireLegacyServiceWorker';
import {Maybe} from 'true-myth';

const origin = 'https://local.zinfra.io:8081';

type RegistrationFixture = {
  readonly registration: ServiceWorkerRegistration;
  readonly unregister: jest.Mock<Promise<boolean>, []>;
};

function createRegistration(serviceWorkerScriptUrl: string, scope: string = `${origin}/`): RegistrationFixture {
  const unregister = jest.fn<Promise<boolean>, []>(async () => {
    return true;
  });
  const registration = {
    active: {scriptURL: serviceWorkerScriptUrl} as ServiceWorker,
    installing: null,
    scope,
    unregister,
    waiting: null,
  } as unknown as ServiceWorkerRegistration;

  return {registration, unregister};
}

describe('retireLegacyServiceWorker', () => {
  it('unregisters the legacy Wire worker with a version query', async () => {
    const {registration, unregister} = createRegistration(`${origin}/sw.js?dev-c842a67`);
    const serviceWorkerContainer = {
      async getRegistrations() {
        return [registration];
      },
    };

    await retireLegacyServiceWorker({
      origin,
      serviceWorkerContainer: Maybe.just(serviceWorkerContainer),
      cacheStorage: Maybe.nothing(),
    });

    expect(unregister).toHaveBeenCalled();
  });

  it('leaves unrelated workers and scopes registered', async () => {
    const unrelatedScript = createRegistration(`${origin}/other-worker.js`);
    const unrelatedScope = createRegistration(`${origin}/sw.js`, `${origin}/app/`);
    const unrelatedOrigin = createRegistration('https://example.com/sw.js');
    const serviceWorkerContainer = {
      async getRegistrations() {
        return [unrelatedScript.registration, unrelatedScope.registration, unrelatedOrigin.registration];
      },
    };

    await retireLegacyServiceWorker({
      origin,
      serviceWorkerContainer: Maybe.just(serviceWorkerContainer),
      cacheStorage: Maybe.nothing(),
    });

    expect(unrelatedScript.unregister).not.toHaveBeenCalled();
    expect(unrelatedScope.unregister).not.toHaveBeenCalled();
    expect(unrelatedOrigin.unregister).not.toHaveBeenCalled();
  });

  it('deletes only known Wire asset caches', async () => {
    const cacheNames = [
      'asset-cache-v3',
      'asset-cache-v2',
      "asset: 'asset-cache-v2",
      'wire-user-data',
      'unrelated-cache',
    ];
    const deleteCache = jest.fn<Promise<boolean>, [string]>(async () => {
      return true;
    });
    const cacheStorage = {
      async keys() {
        return cacheNames;
      },
      delete: deleteCache,
    };

    await retireLegacyServiceWorker({
      origin,
      serviceWorkerContainer: Maybe.nothing(),
      cacheStorage: Maybe.just(cacheStorage),
    });

    expect(
      deleteCache.mock.calls.map(call => {
        return call[0];
      }),
    ).toEqual(['asset-cache-v3', 'asset-cache-v2', "asset: 'asset-cache-v2"]);
  });

  it('continues when APIs are unavailable and callers can catch cleanup failures', async () => {
    await expect(
      retireLegacyServiceWorker({
        origin,
        serviceWorkerContainer: Maybe.nothing(),
        cacheStorage: Maybe.nothing(),
      }),
    ).resolves.toBeUndefined();

    const {registration, unregister} = createRegistration(`${origin}/sw.js`);
    const cleanupError = new Error('Cache deletion failed');
    const serviceWorkerContainer = {
      async getRegistrations() {
        return [registration];
      },
    };
    const deleteCache = jest.fn<Promise<boolean>, [string]>(async () => {
      throw cleanupError;
    });
    const cacheStorage = {
      async keys() {
        return ['asset-cache-v3'];
      },
      delete: deleteCache,
    };
    const recordCleanupFailure = jest.fn();

    await retireLegacyServiceWorker({
      origin,
      serviceWorkerContainer: Maybe.just(serviceWorkerContainer),
      cacheStorage: Maybe.just(cacheStorage),
    }).catch(recordCleanupFailure);

    expect(unregister).toHaveBeenCalled();
    expect(deleteCache).toHaveBeenCalledWith('asset-cache-v3');
    expect(recordCleanupFailure).toHaveBeenCalledWith(cleanupError);
  });
});
