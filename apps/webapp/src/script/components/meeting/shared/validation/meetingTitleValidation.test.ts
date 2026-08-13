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

import {
  getMeetingTitleError,
  getMeetingTitleInputError,
  MEETING_TITLE_MAX_LENGTH,
  meetingTitleErrorKeys,
} from './meetingTitleValidation';

const titleAtMaxLength = 'a'.repeat(MEETING_TITLE_MAX_LENGTH);
const titleOverMaxLength = `${titleAtMaxLength}x`;

describe('getMeetingTitleError', () => {
  it('returns titleRequired when the title is empty or whitespace', () => {
    expect(getMeetingTitleError('')).toBe(meetingTitleErrorKeys.required);
    expect(getMeetingTitleError('   ')).toBe(meetingTitleErrorKeys.required);
  });

  it('returns titleTooLong when the trimmed title exceeds the max length', () => {
    expect(getMeetingTitleError(titleOverMaxLength)).toBe(meetingTitleErrorKeys.tooLong);
    expect(getMeetingTitleError(`  ${titleOverMaxLength}  `)).toBe(meetingTitleErrorKeys.tooLong);
  });

  it('returns no error for a title at the max length', () => {
    expect(getMeetingTitleError(titleAtMaxLength)).toBeUndefined();
    expect(getMeetingTitleError(`  ${titleAtMaxLength}  `)).toBeUndefined();
  });
});

describe('getMeetingTitleInputError', () => {
  it('shows titleTooLong while typing past the max length', () => {
    expect(getMeetingTitleInputError(titleOverMaxLength)).toBe(meetingTitleErrorKeys.tooLong);
  });

  it('does not show titleRequired while the title is still empty', () => {
    expect(getMeetingTitleInputError('')).toBeUndefined();
    expect(getMeetingTitleInputError('   ')).toBeUndefined();
  });
});
