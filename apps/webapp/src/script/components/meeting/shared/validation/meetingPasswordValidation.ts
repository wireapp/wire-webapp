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

import {Config} from '../../../../Config';
import type {Translate} from '../../../../util/localizerUtil';
import {isValidPassword} from '../../../../util/stringUtil';

export const meetingPasswordErrorKey = 'ValidationError.FIELD.PASSWORD.PATTERN_MISMATCH';
export const meetingPasswordConfirmationErrorKey = 'meetings.password.mismatch';
export const meetingPasswordConfirmationRequiredKey = 'meetings.password.confirmationRequired';

export type MeetingPasswordErrorKey =
  | typeof meetingPasswordErrorKey
  | typeof meetingPasswordConfirmationErrorKey
  | typeof meetingPasswordConfirmationRequiredKey;

export type MeetingPasswordErrors = {
  password: typeof meetingPasswordErrorKey | undefined;
  passwordConfirmation:
    typeof meetingPasswordConfirmationErrorKey | typeof meetingPasswordConfirmationRequiredKey | undefined;
};

export const translateMeetingPasswordError = (
  translate: Translate,
  error: MeetingPasswordErrorKey | undefined,
): string | undefined => {
  return error === undefined
    ? undefined
    : translate(error, {minPasswordLength: Config.getConfig().MINIMUM_PASSWORD_LENGTH});
};

export const getMeetingPasswordErrors = (
  password?: string,
  passwordConfirmation?: string,
  requireConfirmation = true,
): MeetingPasswordErrors => {
  const hasPassword = Boolean(password?.trim());
  const hasPasswordConfirmation = Boolean(passwordConfirmation?.trim());
  let passwordConfirmationError: MeetingPasswordErrors['passwordConfirmation'];
  if (hasPassword && requireConfirmation && !hasPasswordConfirmation) {
    passwordConfirmationError = meetingPasswordConfirmationRequiredKey;
  } else if (hasPasswordConfirmation && password !== passwordConfirmation) {
    passwordConfirmationError = meetingPasswordConfirmationErrorKey;
  }

  return {
    password: hasPassword && !isValidPassword(password ?? '') ? meetingPasswordErrorKey : undefined,
    passwordConfirmation: passwordConfirmationError,
  };
};
