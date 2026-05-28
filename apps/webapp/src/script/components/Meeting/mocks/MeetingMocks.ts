/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

// This whole file is just for mocking purposes, so we can use the MeetingList component
// Once the backend is ready, we can remove this file

import {Meeting} from 'Components/Meeting/MeetingList/MeetingList';

const now = new Date();
const toISO = (d: Date) => d.toISOString();

const addMinutes = (d: Date, m: number) => {
  const copy = new Date(d);
  copy.setMinutes(copy.getMinutes() + m);
  return copy;
};

const addSeconds = (d: Date, s: number) => {
  const copy = new Date(d);
  copy.setSeconds(copy.getSeconds() + s);
  return copy;
};

const addHours = (d: Date, s: number) => {
  const copy = new Date(d);
  copy.setHours(copy.getHours() + s);
  return copy;
};

const addDay = (d: Date, s: number) => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + s);
  return copy;
};

export const MEETINGS_TODAY: Meeting[] = [
  {
    start_date: toISO(addSeconds(now, 5)),
    end_date: toISO(addMinutes(now, 33)),
    schedule: 'Single',
    conversation_id: '1',
    title: 'Daily stand‑up',
  },
  {
    start_date: toISO(addHours(now, -2)),
    end_date: toISO(addMinutes(now, 28)),
    schedule: 'Single',
    conversation_id: '2',
    title: 'Sprint planning',
    attending: true,
  },
  {
    start_date: toISO(addHours(now, 2)),
    end_date: toISO(addHours(now, 3)),
    schedule: 'Single',
    conversation_id: '3',
    title: 'Client sync',
  },
  {
    start_date: toISO(addHours(now, -3)),
    end_date: toISO(addHours(now, -2)),
    schedule: 'Single',
    conversation_id: '4',
    title: 'Retrospective passed Today',
  },
];

export const MEETINGS_TOMORROW: Meeting[] = [
  {
    start_date: toISO(addDay(addMinutes(now, -120), 1)),
    end_date: toISO(addDay(addMinutes(now, -30), 1)),
    schedule: 'Single',
    conversation_id: '4',
    title: 'Meetings 4',
  },
  {
    start_date: toISO(addDay(now, 1)),
    end_date: toISO(addDay(addMinutes(now, 20), 1)),
    schedule: 'Monthly',
    conversation_id: '5',
    title: 'Meetings 5',
  },
  {
    start_date: toISO(addDay(addMinutes(now, 180), 1)),
    end_date: toISO(addDay(addMinutes(now, 240), 1)),
    schedule: 'Monthly',
    conversation_id: '6',
    title: 'Meetings 6',
  },
  {
    start_date: toISO(addDay(addMinutes(now, 300), 1)),
    end_date: toISO(addDay(addMinutes(now, 460), 1)),
    schedule: 'Monthly',
    conversation_id: '7',
    title: 'Meetings 7',
  },
];

export const MEETINGS_PAST: Meeting[] = [
  {
    start_date: toISO(addDay(addMinutes(now, -120), -1)),
    end_date: toISO(addDay(addMinutes(now, -20), -1)),
    schedule: 'Single',
    conversation_id: '4',
    title: 'Retrospective passed Yesterday',
  },
  {
    start_date: toISO(addDay(addMinutes(now, -60), -1)),
    end_date: toISO(addDay(now, -1)),
    schedule: 'Monthly',
    conversation_id: '5',
    title: 'All‑hands',
  },
];
