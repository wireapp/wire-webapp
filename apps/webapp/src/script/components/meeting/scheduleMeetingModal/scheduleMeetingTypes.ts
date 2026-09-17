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

import type {MeetingPasswordErrorKey} from 'Components/meeting/shared/validation/meetingPasswordValidation';
import type {User} from 'Repositories/entity/User';

export const scheduleMeetingModes = {
  create: 'create',
  edit: 'edit',
} as const;

export type ScheduleMeetingMode = (typeof scheduleMeetingModes)[keyof typeof scheduleMeetingModes];

export type ScheduleMeetingRecurrenceOption = 'doesNotRepeat' | 'daily' | 'weekly' | 'everyTwoWeeks' | 'everyFourWeeks';

export interface ScheduleMeetingFormState {
  title: string;
  start: Maybe<Date>;
  end: Maybe<Date>;
  recurrence: ScheduleMeetingRecurrenceOption;
  selectedUsers: User[];
  participantsFilter: string;
  password: string;
  passwordConfirmation: string;
}

export type ScheduleMeetingFormErrorKey =
  | 'meetings.scheduleModal.error.titleRequired'
  | 'meetings.scheduleModal.error.titleTooLong'
  | 'meetings.scheduleModal.error.missingTimes'
  | 'meetings.scheduleModal.error.endBeforeStart'
  | 'meetings.schedule.errors.startInPast'
  | 'meetings.schedule.errors.endInPast';

export interface ScheduleMeetingFormErrors {
  title: ScheduleMeetingFormErrorKey | undefined;
  missingTimes: ScheduleMeetingFormErrorKey | undefined;
  startInPast: ScheduleMeetingFormErrorKey | undefined;
  endInPast: ScheduleMeetingFormErrorKey | undefined;
  endBeforeStart: ScheduleMeetingFormErrorKey | undefined;
  password: MeetingPasswordErrorKey | undefined;
}

export const emptyScheduleMeetingFormErrors = (): ScheduleMeetingFormErrors => ({
  title: undefined,
  missingTimes: undefined,
  startInPast: undefined,
  endInPast: undefined,
  endBeforeStart: undefined,
  password: undefined,
});

export interface ScheduleMeetingFormDisplayErrors {
  title: string | undefined;
  missingTimes: string | undefined;
  startInPast: string | undefined;
  endInPast: string | undefined;
  endBeforeStart: string | undefined;
  password: string | undefined;
}

export const scheduleMeetingSubmitResults = {
  submitFailed: 'submitFailed',
  setupFailed: 'setupFailed',
  succeeded: 'succeeded',
} as const;

export type ScheduleMeetingSubmitResult =
  (typeof scheduleMeetingSubmitResults)[keyof typeof scheduleMeetingSubmitResults];

export const wasScheduleMeetingPersisted = (result: ScheduleMeetingSubmitResult): boolean =>
  result !== scheduleMeetingSubmitResults.submitFailed;
