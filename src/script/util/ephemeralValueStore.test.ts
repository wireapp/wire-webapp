/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {getEphemeralValue, saveEphemeralValue} from './ephemeralValueStore';

describe('ephemeralValueStore', () => {
  describe('ServiceWorker is not available', () => {
    let originalServiceWorker: ServiceWorkerContainer;
    beforeEach(() => {
      originalServiceWorker = window.navigator.serviceWorker;
      (window.navigator as any).__defineGetter__('serviceWorker', (): void => undefined);
    });

    afterEach(() => {
      (window.navigator as any).__defineGetter__('serviceWorker', (): ServiceWorkerContainer => originalServiceWorker);
    });
  });

  it('is initialized with an empty value', async () => {
    const storedValue = await getEphemeralValue();

    expect(storedValue).not.toBeDefined();
  });

  it('allows storing a single value', async () => {
    const value1 = 'first value';
    const value2 = 'second value';

    await saveEphemeralValue(value1);
    const storedValue1 = await getEphemeralValue();

    expect(storedValue1).toBe(value1);

    await saveEphemeralValue(value2);
    const storedValue2 = await getEphemeralValue();

    expect(storedValue2).toBe(value2);
  });

  it('deletes the value after it is read for the very first time', async () => {
    const value = 'first value';
    await saveEphemeralValue(value);

    const firstRead = await getEphemeralValue();

    expect(firstRead).toBe(value);

    const secondRead = await getEphemeralValue();

    expect(secondRead).toBeUndefined();
  });
});
