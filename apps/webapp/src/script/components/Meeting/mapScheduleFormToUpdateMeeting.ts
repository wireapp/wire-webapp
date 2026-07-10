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

import type {WallClock} from '@enormora/wall-clock/wall-clock';
import type {UpdateMeeting} from '@wireapp/api-client/lib/meetings/updateMeeting';
import {Result, result} from 'true-myth';

import {requireScheduleMeetingTimes} from 'Components/Meeting/ScheduleMeetingModal/requireScheduleMeetingTimes';
import {buildUpdateMeetingRecurrence} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingRecurrence';
import type {
  ScheduleMeetingFormState,
  ScheduleMeetingRecurrenceOption,
} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingTypes';

import {ScheduleFormErrors} from './ScheduleFormErrors';

export type MapScheduleFormToUpdateMeetingResult = {
  payload: UpdateMeeting;
};

export const mapScheduleFormToUpdateMeeting = (
  formState: ScheduleMeetingFormState,
  wallClock: WallClock,
  originalRecurrence: ScheduleMeetingRecurrenceOption,
): Result<MapScheduleFormToUpdateMeetingResult, ScheduleFormErrors> => {
  const timesResult = requireScheduleMeetingTimes(formState, wallClock);
  if (timesResult.isErr) {
    return result.err(timesResult.error);
  }
  const {start, end} = timesResult.value;

  return result.ok({
    payload: {
      title: formState.title.trim(),
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      ...buildUpdateMeetingRecurrence(formState.recurrence, originalRecurrence),
    },
  });
};
