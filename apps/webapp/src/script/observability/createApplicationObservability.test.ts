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

import {asyncNoop} from 'noop-esm';

import type {ApplicationObservability} from './applicationObservability';
import {createApplicationObservability} from './createApplicationObservability';

describe('createApplicationObservability', () => {
  it('returns noop observability when Datadog config is missing', () => {
    const noopObservability: ApplicationObservability = {
      reportApplicationStartup: jest.fn(asyncNoop),
    };
    const datadogObservability: ApplicationObservability = {
      reportApplicationStartup: jest.fn(asyncNoop),
    };
    const createNoopObservability = jest.fn(() => {
      return noopObservability;
    });
    const createDataDogObservability = jest.fn(() => {
      return datadogObservability;
    });

    const applicationObservability = createApplicationObservability(
      {dataDog: {}},
      {createDataDogObservability, createNoopObservability},
    );

    expect(applicationObservability).toBe(noopObservability);
    expect(createNoopObservability).toHaveBeenCalledTimes(1);
    expect(createDataDogObservability).not.toHaveBeenCalled();
  });

  it('returns noop observability when Datadog config is incomplete', () => {
    const noopObservability: ApplicationObservability = {
      reportApplicationStartup: jest.fn(asyncNoop),
    };
    const datadogObservability: ApplicationObservability = {
      reportApplicationStartup: jest.fn(asyncNoop),
    };
    const createNoopObservability = jest.fn(() => {
      return noopObservability;
    });
    const createDataDogObservability = jest.fn(() => {
      return datadogObservability;
    });

    const applicationObservability = createApplicationObservability(
      {dataDog: {applicationId: 'application-id'}},
      {createDataDogObservability, createNoopObservability},
    );

    expect(applicationObservability).toBe(noopObservability);
    expect(createNoopObservability).toHaveBeenCalledTimes(1);
    expect(createDataDogObservability).not.toHaveBeenCalled();
  });

  it('returns Datadog observability when Datadog config is complete', () => {
    const noopObservability: ApplicationObservability = {
      reportApplicationStartup: jest.fn(asyncNoop),
    };
    const datadogObservability: ApplicationObservability = {
      reportApplicationStartup: jest.fn(asyncNoop),
    };
    const createNoopObservability = jest.fn(() => {
      return noopObservability;
    });
    const createDataDogObservability = jest.fn(() => {
      return datadogObservability;
    });

    const applicationObservability = createApplicationObservability(
      {dataDog: {applicationId: 'application-id', clientToken: 'client-token'}},
      {createDataDogObservability, createNoopObservability},
    );

    expect(applicationObservability).toBe(datadogObservability);
    expect(createDataDogObservability).toHaveBeenCalledTimes(1);
    expect(createNoopObservability).not.toHaveBeenCalled();
  });
});
