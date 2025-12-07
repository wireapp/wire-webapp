/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {TaskParams} from '@wireapp/core/lib/util/RecurringTaskScheduler';
import {container} from 'tsyringe';
import {getLogger} from 'Util/Logger';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {Config} from '../Config';
import {Core} from '../service/CoreSingleton';

let core: Core | undefined = undefined;
export const updateRemoteConfigLogger = getLogger('updateRemoteConfigs');

export const scheduleRecurringTask = async (params: TaskParams) => {
  if (!core) {
    core = container.resolve(Core);
  }
  return core.recurringTaskScheduler.registerTask(params);
};

export const updateApiVersion = async () => {
  if (!core) {
    core = container.resolve(Core);
  }
  const {
    SUPPORTED_API_RANGE: [min, max],
    ENABLE_DEV_BACKEND_API,
  } = Config.getConfig();

  updateRemoteConfigLogger.info('Updating api-version and info');
  return core.useAPIVersion(min, max, ENABLE_DEV_BACKEND_API);
};

export const scheduleApiVersionUpdate = async () => {
  // Schedule the task to run every day and add it to the window focus event
  await scheduleRecurringTask({
    every: TIME_IN_MILLIS.DAY,
    task: updateApiVersion,
    key: 'try-api-version-backend-sync',
    addTaskOnWindowFocusEvent: true,
  });
};
