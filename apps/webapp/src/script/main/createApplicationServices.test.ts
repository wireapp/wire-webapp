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

import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import type {FireAndForgetInvoker} from '@enormora/fire-and-forget';

import {asyncNoop} from 'noop-esm';

import type {ApplicationObservability} from '../observability/applicationObservability';
import {createApplicationServices} from './createApplicationServices';

describe('createApplicationServices', () => {
  it('creates application services through injected dependencies', () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const applicationObservability: ApplicationObservability = {
      reportApplicationStartup: jest.fn(asyncNoop),
    };
    const fireAndForgetInvoker = {
      fireAndForget: jest.fn(),
      waitUntilAllSettled: jest.fn(asyncNoop),
    } as FireAndForgetInvoker;
    const createApplicationObservability = jest.fn(() => {
      return applicationObservability;
    });
    const createFireAndForgetInvoker = jest.fn(() => {
      return fireAndForgetInvoker;
    });
    const applicationServices = createApplicationServices({
      createApplicationObservability,
      clock,
      createFireAndForgetInvoker,
    });

    expect(applicationServices.applicationObservability).toBe(applicationObservability);
    expect(applicationServices.clock).toBe(clock);
    expect(applicationServices.fireAndForgetInvoker).toBe(fireAndForgetInvoker);
    expect(createApplicationObservability).toHaveBeenCalledTimes(1);
    expect(createFireAndForgetInvoker).toHaveBeenCalledTimes(1);
  });
});
