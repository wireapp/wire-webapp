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

import type {Maybe} from 'true-myth';

import type {ScheduleMeetingFormErrors} from './scheduleMeetingTypes';

export interface ScheduleMeetingValidationInput {
  title: string;
  start: Maybe<Date>;
  end: Maybe<Date>;
}

export const validateScheduleMeetingForm = ({
  title,
  start,
  end,
}: ScheduleMeetingValidationInput): ScheduleMeetingFormErrors => {
  const errors: ScheduleMeetingFormErrors = {};

  if (!title.trim()) {
    errors.title = 'meetings.scheduleModal.error.titleRequired';
  }

  if (start.isJust && start.value.getTime() <= Date.now()) {
    errors.startInPast = 'meetings.schedule.errors.startInPast';
  }

  if (end.isJust && end.value.getTime() <= Date.now()) {
    errors.endInPast = 'meetings.schedule.errors.endInPast';
  }

  if (start.isJust && end.isJust && !errors.endInPast && end.value.getTime() <= start.value.getTime()) {
    errors.endBeforeStart = 'meetings.scheduleModal.error.endBeforeStart';
  }

  return errors;
};

export const hasScheduleMeetingFormErrors = (errors: ScheduleMeetingFormErrors): boolean =>
  Boolean(errors.title || errors.startInPast || errors.endInPast || errors.endBeforeStart);
