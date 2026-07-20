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
import {result, Result} from 'true-myth';

import {ScheduleFormErrors, scheduleFormErrors} from 'Components/Meeting/ScheduleFormErrors';
import {requireScheduleMeetingTimes} from 'Components/Meeting/ScheduleMeetingModal/requireScheduleMeetingTimes';
import type {
  ScheduleMeetingFormErrors,
  ScheduleMeetingFormState,
} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingTypes';
import {
  hasScheduleMeetingFormErrors,
  validateScheduleMeetingForm,
} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingValidation';
import type {ScheduleMeetingCommand} from 'Components/Meeting/shared/types/meetingCommandTypes';

const mapScheduleFormErrorToFormErrors = (error: ScheduleFormErrors): ScheduleMeetingFormErrors => {
  switch (error) {
    case scheduleFormErrors.missingTimes:
      return {endBeforeStart: 'meetings.scheduleModal.error.endBeforeStart'};
    case scheduleFormErrors.startInPast:
      return {startInPast: 'meetings.schedule.errors.startInPast'};
    case scheduleFormErrors.endInPast:
      return {endInPast: 'meetings.schedule.errors.endInPast'};
    default:
      return {endBeforeStart: 'meetings.scheduleModal.error.endBeforeStart'};
  }
};

export const mapScheduleFormToMeetingCommand = (
  formState: ScheduleMeetingFormState,
  wallClock: WallClock,
): Result<ScheduleMeetingCommand, ScheduleMeetingFormErrors> => {
  const validationErrors = validateScheduleMeetingForm({
    title: formState.title,
    start: formState.start,
    end: formState.end,
    wallClock,
  });

  if (hasScheduleMeetingFormErrors(validationErrors)) {
    return result.err(validationErrors);
  }

  const timesResult = requireScheduleMeetingTimes(formState, wallClock);

  if (timesResult.isErr) {
    return result.err(mapScheduleFormErrorToFormErrors(timesResult.error));
  }

  const {start, end} = timesResult.value;

  return result.ok({
    title: formState.title.trim(),
    start,
    end,
    recurrence: formState.recurrence,
    selectedUsers: formState.selectedUsers,
  });
};
