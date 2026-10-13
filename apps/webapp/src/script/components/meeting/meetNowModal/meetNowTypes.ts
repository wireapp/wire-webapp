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

import type {User} from '../../../repositories/entity/User';
import type {TranslationKey} from '../../../util/localizerUtil';
import type {MeetingPasswordErrorKey} from '../shared/validation/meetingPasswordValidation';

export type MeetNowFormState = {
  title: string;
  selectedUsers: User[];
  participantsFilter: string;
  password: string;
  passwordConfirmation: string;
};

export type MeetNowFormErrors = {
  title: TranslationKey | undefined;
  password: MeetingPasswordErrorKey | undefined;
  passwordConfirmation: MeetingPasswordErrorKey | undefined;
};

export const emptyMeetNowFormErrors = (): MeetNowFormErrors => {
  return {
    title: undefined,
    password: undefined,
    passwordConfirmation: undefined,
  };
};

export const meetNowSubmitResults = {
  creationFailed: 'creationFailed',
  setupFailed: 'setupFailed',
  joined: 'joined',
  linkConfirmationOpened: 'linkConfirmationOpened',
  joinBlocked: 'joinBlocked',
  joinFailed: 'joinFailed',
} as const;

export type MeetNowSubmitResult = (typeof meetNowSubmitResults)[keyof typeof meetNowSubmitResults];

export const wasMeetNowMeetingCreated = (result: MeetNowSubmitResult): boolean => {
  return result !== meetNowSubmitResults.creationFailed;
};
