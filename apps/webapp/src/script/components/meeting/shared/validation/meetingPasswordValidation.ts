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

import {ValidationError} from 'src/script/auth/module/action/validationError';
import type {TranslationKey} from 'Util/localizerUtil';
import {isValidPassword} from 'Util/stringUtil';

export const meetingPasswordErrorKey = ValidationError.FIELD.PASSWORD.PATTERN_MISMATCH as TranslationKey;
export const meetingPasswordConfirmationErrorKey = ValidationError.FIELD.CONFIRM_PASSWORD.PATTERN_MISMATCH as TranslationKey;

export type MeetingPasswordErrorKey = typeof meetingPasswordErrorKey | typeof meetingPasswordConfirmationErrorKey;

export type MeetingPasswordErrors = {
  password: typeof meetingPasswordErrorKey | undefined;
  passwordConfirmation: typeof meetingPasswordConfirmationErrorKey | undefined;
};

export const getMeetingPasswordErrors = (
  password?: string,
  passwordConfirmation?: string,
): MeetingPasswordErrors => {
  const hasPassword = Boolean(password?.trim());
  const hasPasswordConfirmation = Boolean(passwordConfirmation?.trim());

  return {
    password: hasPassword && !isValidPassword(password ?? '') ? meetingPasswordErrorKey : undefined,
    passwordConfirmation:
      hasPasswordConfirmation && (!hasPassword || password !== passwordConfirmation)
        ? meetingPasswordConfirmationErrorKey
        : undefined,
  };
};
