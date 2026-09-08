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

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export const roundDateDownToFifteenMinutes = (date: Date): Date => {
  const rounded = new Date(date);
  rounded.setMilliseconds(0);
  rounded.setSeconds(0);
  rounded.setMinutes(Math.floor(rounded.getMinutes() / 15) * 15);
  return rounded;
};

export const roundDateUpToFifteenMinutes = (date: Date): Date => {
  const rounded = new Date(date);
  rounded.setMilliseconds(0);
  rounded.setSeconds(0);
  const remainder = rounded.getMinutes() % 15;
  if (remainder !== 0) {
    rounded.setMinutes(rounded.getMinutes() + (15 - remainder));
  }
  return rounded;
};

export const formatMeetingTimeLabel = (date: Date): string =>
  date.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', hour12: true});

export const formatMeetingDateIso = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const createOngoingMeetingWindow = (now = new Date()) => {
  const start = roundDateDownToFifteenMinutes(new Date(now.getTime() - 30 * 60 * 1000));
  const end = roundDateUpToFifteenMinutes(new Date(now.getTime() + 2 * 60 * 60 * 1000));

  return {start, end};
};

export const createEndedMeetingWindow = (now = new Date()) => {
  const end = roundDateDownToFifteenMinutes(new Date(now.getTime() - 15 * 60 * 1000));
  const start = roundDateDownToFifteenMinutes(new Date(end.getTime() - 60 * 60 * 1000));

  return {start, end};
};

export const meetingWindowWithinPastEditPeriod = (start: Date, now = new Date()): boolean =>
  now.getTime() - start.getTime() <= TWENTY_FOUR_HOURS_MS + FIFTEEN_MINUTES_MS;
