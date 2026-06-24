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

import {result, Result} from 'true-myth';

import type {WallClock} from 'src/script/clock/wallClock';

import type {ScheduleMeetingFormState} from './scheduleMeetingTypes';

import {ScheduleFormErrors, scheduleFormErrors} from '../ScheduleFormErrors';

export const requireScheduleMeetingTimes = (
  formState: ScheduleMeetingFormState,
  wallClock: WallClock,
): Result<{start: Date; end: Date}, ScheduleFormErrors> => {
  if (formState.start.isNothing || formState.end.isNothing) {
    return result.err(scheduleFormErrors.missingTimes);
  }

  const start = formState.start.value;
  const end = formState.end.value;
  const currentTimestampInMilliseconds = wallClock.currentTimestampInMilliseconds;

  if (start.getTime() <= currentTimestampInMilliseconds) {
    return result.err(scheduleFormErrors.startInPast);
  }

  if (end.getTime() <= currentTimestampInMilliseconds) {
    return result.err(scheduleFormErrors.endInPast);
  }

  return result.ok({start, end});
};
