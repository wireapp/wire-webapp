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

import type {WallClock} from '@enormora/wall-clock/wall-clock';
import {maybe} from 'true-myth';

import type {ScheduleMeetingFormState} from 'Components/meeting/scheduleMeetingModal/scheduleMeetingTypes';
import {getEditAnchorMeetingInstance} from 'Components/meeting/selectors/getMeetingInstancesInRange';
import type {MeetingInstance} from 'Components/meeting/types/meetingInstance';
import type {User} from 'Repositories/entity/User';

/**
 * Builds edit-form state from the selected list row.
 *
 * For recurring series, start/end come from today's not-yet-ended occurrence when one
 * exists, otherwise the next instance on or after now — not the selected list row.
 * Series metadata (title, recurrence, id) comes from `meetingSeries`.
 */
export const mapMeetingInstanceToScheduleFormState = (
  meetingInstance: MeetingInstance,
  selectedUsers: User[],
  wallClock: WallClock,
): ScheduleMeetingFormState => {
  const {meetingSeries} = meetingInstance;
  const anchorInstance = getEditAnchorMeetingInstance(meetingSeries, wallClock.currentDate);

  return {
    title: meetingSeries.title,
    start: maybe.just(anchorInstance.start),
    end: maybe.just(anchorInstance.end),
    recurrence: meetingSeries.recurrence,
    selectedUsers,
    participantsFilter: '',
  };
};
