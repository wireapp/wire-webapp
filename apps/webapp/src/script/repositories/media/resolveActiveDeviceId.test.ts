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

import {resolveActiveDeviceId} from './resolveActiveDeviceId';

describe('resolveActiveDeviceId', () => {
  it('uses the preferred device when it is available', () => {
    const actualActiveDeviceId = resolveActiveDeviceId({
      availableIds: ['default-device-id', 'preferred-device-id'],
      defaultId: 'default-device-id',
      fallbackIds: ['default-device-id'],
      preferredId: 'preferred-device-id',
    });

    const expectedActiveDeviceId = 'preferred-device-id';
    expect(actualActiveDeviceId).toBe(expectedActiveDeviceId);
  });

  it('uses an available fallback when the preferred device is unavailable', () => {
    const actualActiveDeviceId = resolveActiveDeviceId({
      availableIds: ['fallback-device-id'],
      defaultId: 'default-device-id',
      fallbackIds: ['fallback-device-id'],
      preferredId: 'preferred-device-id',
    });

    const expectedActiveDeviceId = 'fallback-device-id';
    expect(actualActiveDeviceId).toBe(expectedActiveDeviceId);
  });

  it('respects the fallback order when multiple fallbacks are available', () => {
    const actualActiveDeviceId = resolveActiveDeviceId({
      availableIds: ['second-fallback-id', 'first-fallback-id'],
      defaultId: 'default-device-id',
      fallbackIds: ['first-fallback-id', 'second-fallback-id'],
      preferredId: 'preferred-device-id',
    });

    const expectedActiveDeviceId = 'first-fallback-id';
    expect(actualActiveDeviceId).toBe(expectedActiveDeviceId);
  });

  it('uses the first available device when no preferred or fallback device is available', () => {
    const actualActiveDeviceId = resolveActiveDeviceId({
      availableIds: ['first-device', 'second-device'],
      defaultId: 'default',
      fallbackIds: ['missing-fallback'],
      preferredId: 'missing-preference',
    });

    const expectedActiveDeviceId = 'first-device';
    expect(actualActiveDeviceId).toBe(expectedActiveDeviceId);
  });

  it('uses the configured default when no device is available', () => {
    const actualActiveDeviceId = resolveActiveDeviceId({
      availableIds: [],
      defaultId: 'default',
      fallbackIds: ['missing-fallback'],
      preferredId: 'missing-preference',
    });

    const expectedActiveDeviceId = 'default';
    expect(actualActiveDeviceId).toBe(expectedActiveDeviceId);
  });
});
