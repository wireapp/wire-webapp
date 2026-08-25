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
import {isUndefined} from '@sindresorhus/is';
import type {Maybe, Result} from 'true-myth';
import {result} from 'true-myth';

import {getMeetingTitleError} from 'Components/meeting/shared/validation/meetingTitleValidation';

import {type ScheduleMeetingFormErrors, ScheduleMeetingMode} from './scheduleMeetingTypes';

export interface ScheduleMeetingValidationInput {
  title: string;
  start: Maybe<Date>;
  end: Maybe<Date>;
  wallClock: WallClock;
  mode: ScheduleMeetingMode;
}

export const getScheduleMeetingFormErrors = ({
  title,
  start,
  end,
  wallClock,
  mode,
}: ScheduleMeetingValidationInput): ScheduleMeetingFormErrors => {
  const currentTimestampInMilliseconds = wallClock.currentTimestampInMilliseconds;
  const missingTimes = start.isNothing || end.isNothing ? 'meetings.scheduleModal.error.missingTimes' : undefined;
  const allowPastTimes = mode === 'edit';
  const endInPast =
    !allowPastTimes && isUndefined(missingTimes) && end.isJust && end.value.getTime() <= currentTimestampInMilliseconds
      ? 'meetings.schedule.errors.endInPast'
      : undefined;

  return {
    title: getMeetingTitleError(title),
    missingTimes,
    startInPast:
      !allowPastTimes &&
      isUndefined(missingTimes) &&
      start.isJust &&
      start.value.getTime() <= currentTimestampInMilliseconds
        ? 'meetings.schedule.errors.startInPast'
        : undefined,
    endInPast,
    endBeforeStart:
      isUndefined(missingTimes) &&
      start.isJust &&
      end.isJust &&
      isUndefined(endInPast) &&
      end.value.getTime() <= start.value.getTime()
        ? 'meetings.scheduleModal.error.endBeforeStart'
        : undefined,
  };
};

export const hasScheduleMeetingFormErrors = (errors: ScheduleMeetingFormErrors): boolean =>
  errors.title !== undefined ||
  errors.missingTimes !== undefined ||
  errors.startInPast !== undefined ||
  errors.endInPast !== undefined ||
  errors.endBeforeStart !== undefined;

export const validateScheduleMeetingForm = (
  input: ScheduleMeetingValidationInput,
): Result<ScheduleMeetingValidationInput, ScheduleMeetingFormErrors> => {
  const errors = getScheduleMeetingFormErrors(input);

  if (hasScheduleMeetingFormErrors(errors)) {
    return result.err(errors);
  }

  return result.ok(input);
};
