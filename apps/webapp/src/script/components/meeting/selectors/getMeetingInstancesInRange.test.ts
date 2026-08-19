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

import type {MeetingSeries} from 'Components/meeting/types/meetingSeries';

import {
  getMeetingInstanceAt,
  getMeetingInstancesInRange,
  getUpcomingMeetingInstanceStart,
} from './getMeetingInstancesInRange';

const createMeetingSeries = (overrides: Partial<MeetingSeries> & Pick<MeetingSeries, 'recurrence'>): MeetingSeries => ({
  series_start_date: '2026-06-01T10:00:00.000Z',
  series_end_date: '2026-06-01T11:00:00.000Z',
  duration_ms: 3_600_000,
  conversation_id: 'conversation-id',
  qualified_conversation: {id: 'conversation-id', domain: 'example.com'},
  qualified_id: {id: 'meeting-id', domain: 'example.com'},
  qualified_creator: {id: 'creator-id', domain: 'example.com'},
  title: 'Weekly sync',
  ...overrides,
});

describe('getMeetingInstancesInRange', () => {
  const from = new Date('2026-06-15T00:00:00.000Z');
  const to = new Date('2026-06-29T00:00:00.000Z');

  it('expands weekly series with a past anchor into the visible window', () => {
    const meetingSeries = createMeetingSeries({recurrence: 'weekly'});

    const meetingInstances = getMeetingInstancesInRange(meetingSeries, from, to);

    expect(meetingInstances.map(meetingInstance => meetingInstance.start.toISOString())).toEqual([
      '2026-06-15T10:00:00.000Z',
      '2026-06-22T10:00:00.000Z',
    ]);
  });

  it('includes only instances whose start falls in [from, to)', () => {
    const midnightSpanningMeeting = createMeetingSeries({
      recurrence: 'doesNotRepeat',
      series_start_date: '2026-06-14T23:00:00.000Z',
      series_end_date: '2026-06-15T01:00:00.000Z',
      duration_ms: 2 * 3_600_000,
      qualified_id: {id: 'midnight-meeting', domain: 'example.com'},
      title: 'Late night sync',
    });
    const startsOnWindowBoundary = createMeetingSeries({
      recurrence: 'doesNotRepeat',
      series_start_date: '2026-06-15T00:00:00.000Z',
      series_end_date: '2026-06-15T01:00:00.000Z',
      duration_ms: 3_600_000,
      qualified_id: {id: 'boundary-meeting', domain: 'example.com'},
      title: 'Midnight start',
    });

    expect(getMeetingInstancesInRange(midnightSpanningMeeting, from, to)).toEqual([]);
    expect(getMeetingInstancesInRange(startsOnWindowBoundary, from, to)).toHaveLength(1);
  });

  it('excludes ended non-recurring meetings and includes future ones', () => {
    const pastMeetingSeries = createMeetingSeries({
      recurrence: 'doesNotRepeat',
      series_start_date: '2026-06-14T10:00:00.000Z',
      series_end_date: '2026-06-14T11:00:00.000Z',
      qualified_id: {id: 'past-meeting', domain: 'example.com'},
      title: 'Past one-off',
    });
    const futureMeetingSeries = createMeetingSeries({
      recurrence: 'doesNotRepeat',
      series_start_date: '2026-06-16T10:00:00.000Z',
      series_end_date: '2026-06-16T11:00:00.000Z',
      qualified_id: {id: 'future-meeting', domain: 'example.com'},
      title: 'Future one-off',
    });

    expect(getMeetingInstancesInRange(pastMeetingSeries, from, to)).toEqual([]);
    expect(getMeetingInstancesInRange(futureMeetingSeries, from, to)).toHaveLength(1);
    expect(getMeetingInstancesInRange(futureMeetingSeries, from, to)[0]?.meetingSeries.title).toBe('Future one-off');
  });

  it('respects everyTwoWeeks spacing', () => {
    const meetingSeries = createMeetingSeries({recurrence: 'everyTwoWeeks'});
    const windowStart = new Date('2026-06-01T00:00:00.000Z');
    const windowEnd = new Date('2026-07-01T00:00:00.000Z');

    const meetingInstances = getMeetingInstancesInRange(meetingSeries, windowStart, windowEnd);

    expect(meetingInstances.map(meetingInstance => meetingInstance.start.toISOString())).toEqual([
      '2026-06-01T10:00:00.000Z',
      '2026-06-15T10:00:00.000Z',
      '2026-06-29T10:00:00.000Z',
    ]);
  });

  it('stops generating instances after recurrence_until', () => {
    const meetingSeries = createMeetingSeries({
      recurrence: 'weekly',
      recurrence_until: '2026-06-16T23:59:59.000Z',
    });

    const meetingInstances = getMeetingInstancesInRange(meetingSeries, from, to);

    expect(meetingInstances.map(meetingInstance => meetingInstance.start.toISOString())).toEqual([
      '2026-06-15T10:00:00.000Z',
    ]);
  });

  it('sets instance end from series duration', () => {
    const meetingSeries = createMeetingSeries({
      recurrence: 'doesNotRepeat',
      series_start_date: '2026-06-16T10:00:00.000Z',
      series_end_date: '2026-06-16T11:30:00.000Z',
      duration_ms: 5_400_000,
    });

    const [meetingInstance] = getMeetingInstancesInRange(meetingSeries, from, to);

    expect(meetingInstance?.end.toISOString()).toBe('2026-06-16T11:30:00.000Z');
  });

  describe('everyFourWeeks recurrence', () => {
    it('advances by exactly 28 days across month boundaries', () => {
      const meetingSeries = createMeetingSeries({
        recurrence: 'everyFourWeeks',
        series_start_date: '2026-01-15T10:00:00.000Z',
      });
      const windowStart = new Date('2026-03-01T00:00:00.000Z');
      const windowEnd = new Date('2026-06-01T00:00:00.000Z');

      const meetingInstances = getMeetingInstancesInRange(meetingSeries, windowStart, windowEnd);

      expect(meetingInstances.map(meetingInstance => meetingInstance.start.toISOString())).toEqual([
        '2026-03-12T10:00:00.000Z',
        '2026-04-09T10:00:00.000Z',
        '2026-05-07T10:00:00.000Z',
      ]);
    });

    it('advances every-four-weeks series with a past anchor into the visible window', () => {
      const meetingSeries = createMeetingSeries({
        recurrence: 'everyFourWeeks',
        series_start_date: '2026-01-15T10:00:00.000Z',
      });
      const windowStart = new Date('2026-06-16T00:00:00.000Z');
      const windowEnd = new Date('2026-09-01T00:00:00.000Z');

      const meetingInstances = getMeetingInstancesInRange(meetingSeries, windowStart, windowEnd);

      expect(meetingInstances.map(meetingInstance => meetingInstance.start.toISOString())).toEqual([
        '2026-07-02T10:00:00.000Z',
        '2026-07-30T10:00:00.000Z',
        '2026-08-27T10:00:00.000Z',
      ]);
    });

    it('advances end-of-month anchors by 28 days without calendar-month clamping', () => {
      const meetingSeries = createMeetingSeries({
        recurrence: 'everyFourWeeks',
        series_start_date: '2026-01-31T10:00:00.000Z',
      });
      const windowStart = new Date('2026-02-01T00:00:00.000Z');
      const windowEnd = new Date('2026-07-01T00:00:00.000Z');

      const meetingInstances = getMeetingInstancesInRange(meetingSeries, windowStart, windowEnd);

      expect(meetingInstances.map(meetingInstance => meetingInstance.start.toISOString())).toEqual([
        '2026-02-28T10:00:00.000Z',
        '2026-03-28T10:00:00.000Z',
        '2026-04-25T10:00:00.000Z',
        '2026-05-23T10:00:00.000Z',
        '2026-06-20T10:00:00.000Z',
      ]);
    });

    it('stops every-four-weeks instances after recurrence_until', () => {
      const meetingSeries = createMeetingSeries({
        recurrence: 'everyFourWeeks',
        series_start_date: '2026-01-15T10:00:00.000Z',
        recurrence_until: '2026-07-31T23:59:59.000Z',
      });
      const windowStart = new Date('2026-06-01T00:00:00.000Z');
      const windowEnd = new Date('2026-10-01T00:00:00.000Z');

      const meetingInstances = getMeetingInstancesInRange(meetingSeries, windowStart, windowEnd);

      expect(meetingInstances.map(meetingInstance => meetingInstance.start.toISOString())).toEqual([
        '2026-06-04T10:00:00.000Z',
        '2026-07-02T10:00:00.000Z',
        '2026-07-30T10:00:00.000Z',
      ]);
    });

    it('advances across a year boundary', () => {
      const meetingSeries = createMeetingSeries({
        recurrence: 'everyFourWeeks',
        series_start_date: '2026-12-15T10:00:00.000Z',
      });
      const windowStart = new Date('2026-12-01T00:00:00.000Z');
      const windowEnd = new Date('2027-02-01T00:00:00.000Z');

      const meetingInstances = getMeetingInstancesInRange(meetingSeries, windowStart, windowEnd);

      expect(meetingInstances.map(meetingInstance => meetingInstance.start.toISOString())).toEqual([
        '2026-12-15T10:00:00.000Z',
        '2027-01-12T10:00:00.000Z',
      ]);
    });
  });
});

describe('getUpcomingMeetingInstanceStart', () => {
  it('returns the series anchor for non-repeating meetings', () => {
    const meetingSeries = createMeetingSeries({
      recurrence: 'doesNotRepeat',
      series_start_date: '2026-06-16T10:00:00.000Z',
      series_end_date: '2026-06-16T11:00:00.000Z',
    });

    expect(getUpcomingMeetingInstanceStart(meetingSeries, new Date('2026-06-10T12:00:00.000Z')).toISOString()).toBe(
      '2026-06-16T10:00:00.000Z',
    );
  });

  it('returns the first recurring instance on or after now', () => {
    const meetingSeries = createMeetingSeries({recurrence: 'weekly'});

    expect(getUpcomingMeetingInstanceStart(meetingSeries, new Date('2026-06-10T12:00:00.000Z')).toISOString()).toBe(
      '2026-06-15T10:00:00.000Z',
    );
  });
});

describe('getMeetingInstanceAt', () => {
  it('returns a one-shot meeting while it is ongoing, including at its end time', () => {
    const meetingSeries = createMeetingSeries({recurrence: 'doesNotRepeat'});
    const meetingInstance = getMeetingInstanceAt(meetingSeries, new Date('2026-06-01T11:00:00.000Z'));

    expect(meetingInstance?.start.toISOString()).toBe('2026-06-01T10:00:00.000Z');
    expect(meetingInstance?.end.toISOString()).toBe('2026-06-01T11:00:00.000Z');
  });

  it('returns the current occurrence for a recurring meeting', () => {
    const meetingSeries = createMeetingSeries({recurrence: 'weekly'});
    const meetingInstance = getMeetingInstanceAt(meetingSeries, new Date('2026-06-08T10:30:00.000Z'));

    expect(meetingInstance?.start.toISOString()).toBe('2026-06-08T10:00:00.000Z');
    expect(meetingInstance?.end.toISOString()).toBe('2026-06-08T11:00:00.000Z');
  });

  it('returns undefined when there is no ongoing instance', () => {
    const meetingSeries = createMeetingSeries({recurrence: 'doesNotRepeat'});

    expect(getMeetingInstanceAt(meetingSeries, new Date('2026-06-01T09:59:59.999Z'))).toBeUndefined();
    expect(getMeetingInstanceAt(meetingSeries, new Date('2026-06-01T11:00:00.001Z'))).toBeUndefined();
  });
});
