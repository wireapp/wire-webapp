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

import {
  createDataDogApplicationObservability,
  dataDogApplicationStartupActionName,
} from './createDataDogApplicationObservability';

describe('createDataDogApplicationObservability', () => {
  it('sends one startup action with allow-listed fields', async () => {
    const addAction = jest.fn();
    const applicationObservability = createDataDogApplicationObservability({
      isDataDogAvailable: () => true,
      importBrowserRum: async () => {
        return {datadogRum: {addAction}};
      },
    });

    await applicationObservability.reportApplicationStartup({
      result: 'success',
      lastStep: 'app_loaded',
      timings: {
        app_bootstrap_started_ms: 0,
        app_usable_ms: 120,
        total_startup_duration_ms: 120,
        unsafe_timing_ms: 1,
      },
      statistics: {
        result: 'success',
        last_step: 'app_loaded',
        notification_count: 3,
        client_type: 'permanent',
        user_id: 'must-not-be-sent',
        backend_url: 'https://example.invalid',
      },
    });

    expect(addAction).toHaveBeenCalledTimes(1);
    expect(addAction).toHaveBeenCalledWith(dataDogApplicationStartupActionName, {
      result: 'success',
      last_step: 'app_loaded',
      timings: {
        app_bootstrap_started_ms: 0,
        app_usable_ms: 120,
        total_startup_duration_ms: 120,
      },
      statistics: {
        result: 'success',
        last_step: 'app_loaded',
        notification_count: 3,
        client_type: 'permanent',
      },
    });
  });

  it('does nothing when Datadog is disabled', async () => {
    const importBrowserRum = jest.fn();
    const applicationObservability = createDataDogApplicationObservability({
      isDataDogAvailable: () => false,
      importBrowserRum,
    });

    await expect(
      applicationObservability.reportApplicationStartup({
        result: 'success',
        timings: {},
        statistics: {},
      }),
    ).resolves.toBeUndefined();
    expect(importBrowserRum).not.toHaveBeenCalled();
  });

  it('omits last step when it was not reported', async () => {
    const addAction = jest.fn();
    const applicationObservability = createDataDogApplicationObservability({
      isDataDogAvailable: () => true,
      importBrowserRum: async () => {
        return {datadogRum: {addAction}};
      },
    });

    await applicationObservability.reportApplicationStartup({
      result: 'failure',
      timings: {},
      statistics: {result: 'failure'},
    });

    expect(addAction).toHaveBeenCalledWith(dataDogApplicationStartupActionName, {
      result: 'failure',
      timings: {},
      statistics: {
        result: 'failure',
      },
    });
  });

  it('does not throw when importing Datadog fails', async () => {
    const applicationObservability = createDataDogApplicationObservability({
      isDataDogAvailable: () => true,
      importBrowserRum: async () => {
        throw new Error('unavailable');
      },
    });

    await expect(
      applicationObservability.reportApplicationStartup({
        result: 'failure',
        timings: {},
        statistics: {result: 'failure'},
      }),
    ).resolves.toBeUndefined();
  });
});
