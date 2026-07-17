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
import type {CreateMeeting} from '@wireapp/api-client/lib/meetings/createMeeting';

import type {MeetNowFormState} from 'Components/Meeting/MeetNowModal/meetNowTypes';
import {getMeetNowMeetingTimes} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingDefaults';

export const mapMeetNowFormToCreateMeeting = (formState: MeetNowFormState, wallClock: WallClock): CreateMeeting => {
  const {start, end} = getMeetNowMeetingTimes(wallClock);

  return {
    title: formState.title.trim(),
    start_time: start.toISOString(),
    end_time: end.toISOString(),
  };
};
