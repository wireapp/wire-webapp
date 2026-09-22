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

import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {type Maybe, Result, result} from 'true-myth';

import {ScheduleFormErrors} from 'Components/meeting/scheduleFormErrors';
import {requireScheduleMeetingTimesForUpdate} from 'Components/meeting/scheduleMeetingModal/requireScheduleMeetingTimes';
import type {
  ScheduleMeetingFormState,
  ScheduleMeetingRecurrenceOption,
} from 'Components/meeting/scheduleMeetingModal/scheduleMeetingTypes';
import type {UpdateMeetingCommand} from 'Components/meeting/shared/types/meetingCommandTypes';
import type {User} from 'Repositories/entity/User';

export type MapScheduleFormToUpdateMeetingCommandParams = {
  formState: ScheduleMeetingFormState;
  meetingId: QualifiedId;
  qualifiedConversation: Maybe<QualifiedId>;
  originalTitle: string;
  originalStart: Date;
  originalEnd: Date;
  originalRecurrence: ScheduleMeetingRecurrenceOption;
  originalSelectedUsers: User[];
};

export const mapScheduleFormToUpdateMeetingCommand = ({
  formState,
  meetingId,
  qualifiedConversation,
  originalTitle,
  originalStart,
  originalEnd,
  originalRecurrence,
  originalSelectedUsers,
}: MapScheduleFormToUpdateMeetingCommandParams): Result<UpdateMeetingCommand, ScheduleFormErrors> => {
  const timesResult = requireScheduleMeetingTimesForUpdate(formState);

  if (timesResult.isErr) {
    return result.err(timesResult.error);
  }

  const {start, end} = timesResult.value;

  return result.ok({
    meetingId,
    title: formState.title.trim(),
    start,
    end,
    recurrence: formState.recurrence,
    originalTitle,
    originalStart,
    originalEnd,
    originalRecurrence,
    selectedUsers: formState.selectedUsers,
    originalSelectedUsers,
    qualifiedConversation,
  });
};
