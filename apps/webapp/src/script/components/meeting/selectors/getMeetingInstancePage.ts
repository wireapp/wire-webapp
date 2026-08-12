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

import type {MeetingInstance} from 'Components/meeting/types/meetingInstance';
import type {MeetingSeries} from 'Components/meeting/types/meetingSeries';

import {getFirstMeetingInstanceOnOrAfter, getNextMeetingInstance} from './getMeetingInstancesInRange';

export type MeetingInstancePage = {
  meetingInstances: MeetingInstance[];
  hasMore: boolean;
  cursor: MeetingInstancePageCursor;
};

export type MeetingInstancePageCursor = {
  candidates: MeetingInstance[];
};

const compareMeetingInstances = (left: MeetingInstance, right: MeetingInstance): number => {
  const timeDifference = left.start.getTime() - right.start.getTime();

  if (timeDifference !== 0) {
    return timeDifference;
  }

  const leftId = `${left.meetingSeries.qualified_id.domain}/${left.meetingSeries.qualified_id.id}`;
  const rightId = `${right.meetingSeries.qualified_id.domain}/${right.meetingSeries.qualified_id.id}`;

  return leftId.localeCompare(rightId);
};

const BINARY_SEARCH_DIVISOR = 2;

const insertChronologically = (candidates: MeetingInstance[], meetingInstance: MeetingInstance): MeetingInstance[] => {
  let lowerBound = 0;
  let upperBound = candidates.length;

  while (lowerBound < upperBound) {
    const middleIndex = Math.floor((lowerBound + upperBound) / BINARY_SEARCH_DIVISOR);

    if (compareMeetingInstances(candidates[middleIndex]!, meetingInstance) <= 0) {
      lowerBound = middleIndex + 1;
    } else {
      upperBound = middleIndex;
    }
  }

  return candidates.toSpliced(lowerBound, 0, meetingInstance);
};

export const getNextMeetingInstancePage = (cursor: MeetingInstancePageCursor, limit: number): MeetingInstancePage => {
  let candidates = [...cursor.candidates];
  const meetingInstances: MeetingInstance[] = [];

  while (meetingInstances.length < limit && candidates.length > 0) {
    const meetingInstance = candidates.shift()!;
    meetingInstances.push(meetingInstance);

    const nextMeetingInstance = getNextMeetingInstance(meetingInstance);

    if (nextMeetingInstance !== undefined) {
      candidates = insertChronologically(candidates, nextMeetingInstance);
    }
  }

  return {
    meetingInstances,
    hasMore: candidates.length > 0,
    cursor: {candidates},
  };
};

export const getMeetingInstancePage = (
  meetingSeriesList: MeetingSeries[],
  from: Date,
  limit: number,
): MeetingInstancePage => {
  const candidates = meetingSeriesList
    .map(meetingSeries => getFirstMeetingInstanceOnOrAfter(meetingSeries, from))
    .filter((meetingInstance): meetingInstance is MeetingInstance => meetingInstance !== undefined)
    .toSorted(compareMeetingInstances);

  return getNextMeetingInstancePage({candidates}, limit);
};
