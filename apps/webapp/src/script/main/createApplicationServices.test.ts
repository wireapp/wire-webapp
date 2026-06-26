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

import {FireAndForgetInvoker} from '@wireapp/core';

import {createDeterministicWallClock} from '@enormora/wall-clock/deterministic-wall-clock';

import type {MonotonicClock} from '../time/monotonicClock';

import {createApplicationServices} from './createApplicationServices';

describe('createApplicationServices', () => {
  it('creates application services through injected dependencies', () => {
    const deterministicWallClock = createDeterministicWallClock();
    const fireAndForgetInvoker = {
      fireAndForget: jest.fn(),
      waitUntilAllSettled: jest.fn(async () => {}),
    } as FireAndForgetInvoker;
    const monotonicClock: MonotonicClock = {
      nowMilliseconds: jest.fn(() => {
        return 0;
      }),
    };
    const createFireAndForgetInvoker = jest.fn(() => {
      return fireAndForgetInvoker;
    });
    const createMonotonicClock = jest.fn(() => {
      return monotonicClock;
    });
    const createWallClock = jest.fn(() => {
      return deterministicWallClock;
    });

    const applicationServices = createApplicationServices({
      createFireAndForgetInvoker,
      createMonotonicClock,
      createWallClock,
    });

    expect(applicationServices.fireAndForgetInvoker).toBe(fireAndForgetInvoker);
    expect(applicationServices.monotonicClock).toBe(monotonicClock);
    expect(applicationServices.wallClock).toBe(deterministicWallClock);
    expect(createFireAndForgetInvoker).toHaveBeenCalledTimes(1);
    expect(createMonotonicClock).toHaveBeenCalledTimes(1);
    expect(createWallClock).toHaveBeenCalledTimes(1);
  });
});
