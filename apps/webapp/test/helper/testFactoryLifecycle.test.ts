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

import {Cookie} from '@wireapp/api-client/lib/auth/cookie';
import {CookieStore} from '@wireapp/api-client/lib/auth/cookieStore';
import {container} from 'tsyringe';

import {APIClient} from '../../src/script/service/apiClientSingleton';

import {TestFactory} from './TestFactory';

describe('TestFactory resource ownership', () => {
  const factories: TestFactory[] = [];
  const refreshedCookie = new Cookie('session-cookie', '2099-01-01T00:00:00.000Z');
  let previousCookie: Cookie | undefined;

  beforeEach(() => {
    previousCookie = CookieStore.getCookie();
  });

  afterEach(() => {
    factories.forEach(factory => {
      factory.dispose();
    });
    factories.length = 0;
    container.clearInstances();
    CookieStore.setCookie(previousCookie);
  });

  function createFactory(): TestFactory {
    const factory = new TestFactory();
    factories.push(factory);

    return factory;
  }

  it('disposes its own client after another factory replaces the container registrations', () => {
    const firstFactory = createFactory();
    const firstClient = container.resolve(APIClient);
    const onFirstCookieRefresh = jest.fn();
    firstClient.on(APIClient.TOPIC.COOKIE_REFRESH, onFirstCookieRefresh);
    const secondFactory = createFactory();
    const secondClient = container.resolve(APIClient);
    const onSecondCookieRefresh = jest.fn();
    secondClient.on(APIClient.TOPIC.COOKIE_REFRESH, onSecondCookieRefresh);

    CookieStore.setCookie(refreshedCookie);
    firstFactory.dispose();
    firstFactory.dispose();
    CookieStore.setCookie(refreshedCookie);
    secondFactory.dispose();
    CookieStore.deleteCookie();

    expect(onFirstCookieRefresh.mock.calls).toEqual([[refreshedCookie]]);
    expect(onSecondCookieRefresh.mock.calls).toEqual([[refreshedCookie], [refreshedCookie]]);
  });

  it('releases clients across repeated factory creation and disposal', () => {
    const onCookieRefresh = jest.fn();
    const lifecycleRepetitions = 50;

    for (let repetition = 0; repetition < lifecycleRepetitions; repetition++) {
      const factory = createFactory();
      container.resolve(APIClient).on(APIClient.TOPIC.COOKIE_REFRESH, onCookieRefresh);
      factory.dispose();
    }
    CookieStore.setCookie(refreshedCookie);

    expect(onCookieRefresh).not.toHaveBeenCalled();
  });
});
