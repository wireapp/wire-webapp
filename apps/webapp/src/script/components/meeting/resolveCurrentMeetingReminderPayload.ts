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

import {isUndefined} from '@sindresorhus/is';
import {Maybe} from 'true-myth';

import type {MeetingReminderFirePayload} from 'Components/meeting/createMeetingReminderScheduler';
import {getFirstMeetingInstanceOnOrAfter} from 'Components/meeting/selectors/getMeetingInstancesInRange';
import type {MeetingSeries} from 'Components/meeting/types/meetingSeries';
import {matchQualifiedIds} from 'Util/qualifiedId';

export const resolveCurrentMeetingReminderPayload = (
  meetingSeries: readonly MeetingSeries[],
  payload: MeetingReminderFirePayload,
): Maybe<MeetingReminderFirePayload> => {
  const series = meetingSeries.find(meeting => {
    return matchQualifiedIds(meeting.qualified_id, payload.qualifiedId);
  });

  if (isUndefined(series)) {
    return Maybe.nothing();
  }

  const occurrenceStartMs = Date.parse(payload.meetingStartTime);

  if (Number.isNaN(occurrenceStartMs)) {
    return Maybe.nothing();
  }

  const instance = getFirstMeetingInstanceOnOrAfter(series, new Date(occurrenceStartMs));

  if (isUndefined(instance) || instance.start.getTime() !== occurrenceStartMs) {
    return Maybe.nothing();
  }

  return Maybe.just({
    qualifiedId: series.qualified_id,
    qualifiedConversationId: series.qualified_conversation,
    meetingTitle: series.title,
    meetingStartTime: instance.start.toISOString(),
    qualifiedCreator: series.qualified_creator,
  });
};
