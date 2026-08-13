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
  MEETING_TITLE_MAX_LENGTH,
  meetingTitleErrorKeys,
} from 'Components/meeting/shared/validation/meetingTitleValidation';

import {
  getDefaultMeetNowFormState,
  getMeetNowFormErrors,
  hasMeetNowFormErrors,
  useMeetNowModal,
} from './useMeetNowModal';

describe('useMeetNowModal', () => {
  beforeEach(() => {
    useMeetNowModal.getState().close();
    useMeetNowModal.getState().reset();
  });

  it('opens with a fresh form state', () => {
    useMeetNowModal.getState().open();

    expect(useMeetNowModal.getState().isOpen).toBe(true);
    expect(useMeetNowModal.getState().formState).toEqual(getDefaultMeetNowFormState());
  });

  it('requires a title before submit', () => {
    const errors = getMeetNowFormErrors(getDefaultMeetNowFormState());

    expect(errors.title).toBe(meetingTitleErrorKeys.required);
    expect(hasMeetNowFormErrors(errors)).toBe(true);
  });

  it('rejects a title longer than the maximum length', () => {
    const errors = getMeetNowFormErrors({
      ...getDefaultMeetNowFormState(),
      title: 'a'.repeat(MEETING_TITLE_MAX_LENGTH + 1),
    });

    expect(errors.title).toBe(meetingTitleErrorKeys.tooLong);
    expect(hasMeetNowFormErrors(errors)).toBe(true);
  });

  it('shows a titleTooLong error on the input while typing past the maximum length', () => {
    useMeetNowModal.getState().open();
    useMeetNowModal.getState().setTitle('a'.repeat(MEETING_TITLE_MAX_LENGTH + 1));

    expect(useMeetNowModal.getState().errors.title).toBe(meetingTitleErrorKeys.tooLong);
  });

  it('clears the titleTooLong error when the title is shortened', () => {
    useMeetNowModal.getState().open();
    useMeetNowModal.getState().setTitle('a'.repeat(MEETING_TITLE_MAX_LENGTH + 1));
    useMeetNowModal.getState().setTitle('a'.repeat(MEETING_TITLE_MAX_LENGTH));

    expect(useMeetNowModal.getState().errors.title).toBeUndefined();
  });
});
