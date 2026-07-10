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
    const dataDogLogsObservability: ApplicationObservability = {
      reportApplicationStartup: jest.fn(asyncNoop),
    };
    const createNoopObservability = jest.fn(() => {
      return noopObservability;
    });
    const createDataDogLogsObservability = jest.fn(() => {
      return dataDogLogsObservability;
    });

    const applicationObservability = createApplicationObservability(
      {dataDog: {}},
      {createDataDogLogsObservability, createNoopObservability},
    );

    expect(applicationObservability).toBe(noopObservability);
    expect(createNoopObservability).toHaveBeenCalledTimes(1);
    expect(createDataDogLogsObservability).not.toHaveBeenCalled();
  });

  it('returns noop observability when Datadog Logs config is missing', () => {
    const noopObservability: ApplicationObservability = {
      reportApplicationStartup: jest.fn(asyncNoop),
    };
    const dataDogLogsObservability: ApplicationObservability = {
      reportApplicationStartup: jest.fn(asyncNoop),
    };
    const createNoopObservability = jest.fn(() => {
      return noopObservability;
    });
    const createDataDogLogsObservability = jest.fn(() => {
      return dataDogLogsObservability;
    });

    const applicationObservability = createApplicationObservability(
      {dataDog: {applicationId: 'application-id'}},
      {createDataDogLogsObservability, createNoopObservability},
    );

    expect(applicationObservability).toBe(noopObservability);
    expect(createNoopObservability).toHaveBeenCalledTimes(1);
    expect(createDataDogLogsObservability).not.toHaveBeenCalled();
  });

  it('returns Datadog Logs observability when Datadog Logs config is available', () => {
    const noopObservability: ApplicationObservability = {
      reportApplicationStartup: jest.fn(asyncNoop),
    };
    const dataDogLogsObservability: ApplicationObservability = {
      reportApplicationStartup: jest.fn(asyncNoop),
    };
    const createNoopObservability = jest.fn(() => {
      return noopObservability;
    });
    const createDataDogLogsObservability = jest.fn(() => {
      return dataDogLogsObservability;
    });

    const applicationObservability = createApplicationObservability(
      {dataDog: {applicationId: 'application-id', clientToken: 'client-token'}},
      {createDataDogLogsObservability, createNoopObservability},
    );

    expect(applicationObservability).toBe(dataDogLogsObservability);
    expect(createDataDogLogsObservability).toHaveBeenCalledTimes(1);
    expect(createNoopObservability).not.toHaveBeenCalled();
  });

  it('returns Datadog Logs observability without Datadog RUM config', () => {
    const noopObservability: ApplicationObservability = {
      reportApplicationStartup: jest.fn(asyncNoop),
    };
    const dataDogLogsObservability: ApplicationObservability = {
      reportApplicationStartup: jest.fn(asyncNoop),
    };
    const createNoopObservability = jest.fn(() => {
      return noopObservability;
    });
    const createDataDogLogsObservability = jest.fn(() => {
      return dataDogLogsObservability;
    });

    const applicationObservability = createApplicationObservability(
      {dataDog: {clientToken: 'client-token'}},
      {createDataDogLogsObservability, createNoopObservability},
    );

    expect(applicationObservability).toBe(dataDogLogsObservability);
    expect(createDataDogLogsObservability).toHaveBeenCalledTimes(1);
    expect(createNoopObservability).not.toHaveBeenCalled();
  });
});
