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

import type {Meeting} from 'Components/Meeting/MeetingList/MeetingList';
import type {MeetingInstance} from 'Components/Meeting/types/meetingInstance';

import {seriesToLegacyMeetingFields} from './seriesToLegacyMeetingFields';

/** Maps a list row instance to the legacy Meeting shape still used by edit actions (Phase 4). */
export const meetingInstanceToLegacyMeeting = (instance: MeetingInstance): Meeting => ({
  ...seriesToLegacyMeetingFields(instance.series),
  start_date: instance.start.toISOString(),
  end_date: instance.end.toISOString(),
});
