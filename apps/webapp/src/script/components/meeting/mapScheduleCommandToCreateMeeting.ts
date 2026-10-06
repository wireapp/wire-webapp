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

import {isNonEmptyString} from '@sindresorhus/is';

import type {DeviceTimeZone} from './deviceTimeZone';
import {mapRecurrenceOptionToMeetingRecurrence} from './scheduleMeetingModal/scheduleMeetingRecurrence';
import type {ScheduleMeetingCommand} from './shared/types/meetingCommandTypes';

import {type CreateMeeting, MeetingType} from '../../apiClient/meetings/createMeeting';

export const mapScheduleCommandToCreateMeeting = (
  command: ScheduleMeetingCommand,
  deviceTimeZone: DeviceTimeZone,
): CreateMeeting => {
  const recurrence = mapRecurrenceOptionToMeetingRecurrence(command.recurrence);

  return {
    title: command.title,
    start_time: command.start.toISOString(),
    end_time: command.end.toISOString(),
    type: MeetingType.SCHEDULED,
    tzid: deviceTimeZone.ianaTimeZoneId,
    ...(recurrence !== undefined && {recurrence}),
    ...(isNonEmptyString(command.password?.trim()) && {
      password: command.password,
    }),
  };
};
