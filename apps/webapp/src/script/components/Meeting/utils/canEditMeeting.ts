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

import type {MeetingInstance} from 'Components/Meeting/types/meetingInstance';
import type {MeetingSeries} from 'Components/Meeting/types/meetingSeries';
import type {User} from 'Repositories/entity/User';
import {matchQualifiedIds} from 'Util/qualifiedId';

export const isMeetingHost = (meetingSeries: MeetingSeries, selfUser: User): boolean =>
  matchQualifiedIds(meetingSeries.qualified_creator, selfUser.qualifiedId);

/**
 * Edit is allowed per list row: the host may edit an instance until it starts.
 *
 * The edit form is prefilled from the same instance's start/end
 * ({@link mapMeetingInstanceToScheduleFormState}); the series `qualified_id` is used for the update.
 */
export const canEditMeeting = (meetingInstance: MeetingInstance, selfUser: User, nowMs: number): boolean => {
  const instanceHasNotStarted = nowMs < meetingInstance.start.getTime();

  return isMeetingHost(meetingInstance.meetingSeries, selfUser) && instanceHasNotStarted;
};
