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
 */

import {
  getMeetingPasswordErrors,
  meetingPasswordConfirmationErrorKey,
  meetingPasswordConfirmationRequiredKey,
  meetingPasswordErrorKey,
} from './meetingPasswordValidation';

describe('getMeetingPasswordError', () => {
  it('allows both optional password fields to be empty', () => {
    expect(getMeetingPasswordErrors('', '')).toEqual({password: undefined, passwordConfirmation: undefined});
  });

  it('rejects a confirmation when the password is empty', () => {
    expect(getMeetingPasswordErrors('', 'ValidConfirmation1!')).toEqual({
      password: undefined,
      passwordConfirmation: meetingPasswordConfirmationErrorKey,
    });
  });

  it('requires a confirmation when a password is provided', () => {
    expect(getMeetingPasswordErrors('ValidPassword1!', '')).toEqual({
      password: undefined,
      passwordConfirmation: meetingPasswordConfirmationRequiredKey,
    });
  });

  it('waits until submit to require an empty confirmation', () => {
    expect(getMeetingPasswordErrors('ValidPassword1!', '', false).passwordConfirmation).toBeUndefined();
    expect(getMeetingPasswordErrors('ValidPassword1!', 'DifferentPassword1!', false).passwordConfirmation).toBe(
      meetingPasswordConfirmationErrorKey,
    );
  });

  it('allows a valid matching password and confirmation', () => {
    expect(getMeetingPasswordErrors('ValidPassword1!', 'ValidPassword1!')).toEqual({
      password: undefined,
      passwordConfirmation: undefined,
    });
  });

  it('rejects a mismatched confirmation', () => {
    expect(getMeetingPasswordErrors('ValidPassword1!', 'DifferentPassword1!')).toEqual({
      password: undefined,
      passwordConfirmation: meetingPasswordConfirmationErrorKey,
    });
  });

  it('reports an invalid password separately from the confirmation', () => {
    expect(getMeetingPasswordErrors('invalid', 'invalid')).toEqual({
      password: meetingPasswordErrorKey,
      passwordConfirmation: undefined,
    });
  });
});
