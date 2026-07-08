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

import {maybe} from 'true-myth';

import type {Meeting} from 'Components/Meeting/MeetingList/MeetingList';
import type {ScheduleMeetingFormState} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingTypes';
import {User} from 'Repositories/entity/User';

export const mapMeetingToScheduleFormState = (meeting: Meeting, selectedUsers: User[]): ScheduleMeetingFormState => ({
  title: meeting.title,
  start: maybe.just(new Date(meeting.start_date)),
  end: maybe.just(new Date(meeting.end_date)),
  recurrence: meeting.recurrence,
  selectedUsers,
  participantsFilter: '',
});
