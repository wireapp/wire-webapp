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
  getDefaultMeetNowFormState,
  hasMeetNowFormErrors,
  useMeetNowModal,
  validateMeetNowForm,
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
    const errors = validateMeetNowForm(getDefaultMeetNowFormState());

    expect(errors.title).toBe('meetings.scheduleModal.error.titleRequired');
    expect(hasMeetNowFormErrors(errors)).toBe(true);
  });
});
