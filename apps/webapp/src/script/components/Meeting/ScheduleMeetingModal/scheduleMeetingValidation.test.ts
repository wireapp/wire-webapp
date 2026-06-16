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
  hasScheduleMeetingFormErrors,
  validateScheduleMeetingForm,
} from './scheduleMeetingValidation';

describe('scheduleMeetingValidation', () => {
  const start = new Date('2026-06-15T10:00:00');
  const end = new Date('2026-06-15T11:00:00');

  it('returns titleRequired when title is empty', () => {
    const errors = validateScheduleMeetingForm({title: '   ', start, end});

    expect(errors.title).toBe('meetings.scheduleModal.error.titleRequired');
    expect(errors.endBeforeStart).toBeUndefined();
  });

  it('returns endBeforeStart when end is not after start', () => {
    const errors = validateScheduleMeetingForm({
      title: 'Weekly sync',
      start,
      end: new Date('2026-06-15T10:00:00'),
    });

    expect(errors.endBeforeStart).toBe('meetings.scheduleModal.error.endBeforeStart');
  });

  it('returns no errors for valid input', () => {
    const errors = validateScheduleMeetingForm({title: 'Weekly sync', start, end});

    expect(hasScheduleMeetingFormErrors(errors)).toBe(false);
  });

  it('skips end validation when start or end is missing', () => {
    const errors = validateScheduleMeetingForm({title: 'Weekly sync', start: null, end});

    expect(errors.endBeforeStart).toBeUndefined();
  });
});
