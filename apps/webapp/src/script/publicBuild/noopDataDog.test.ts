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

import {initializeDataDog, isDataDogEnabled} from './noopDataDog';
import {datadogLogs} from './noopDataDogBrowserLogs';
import {datadogRum} from './noopDataDogBrowserRum';

describe('public build DataDog no-ops', (): void => {
  it('keeps DataDog disabled', (): void => {
    expect(isDataDogEnabled()).toBe(false);
  });

  it('accepts the DataDog initialization calls used by the application', async (): Promise<void> => {
    await expect(
      initializeDataDog({} as never, {
        domain: 'example.com',
        id: 'user-id',
      }),
    ).resolves.toBeUndefined();

    expect((): void => {
      datadogRum.init({});
      datadogRum.setUser({id: 'user-id'});
      datadogLogs.init({});
      datadogLogs.setUser({id: 'user-id'});
      datadogLogs.logger.info('message', {field: 'value'});
    }).not.toThrow();
  });
});
