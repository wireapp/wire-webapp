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
import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {result, Result, type Maybe} from 'true-myth';

import {ScheduleFormErrors} from 'Components/Meeting/ScheduleFormErrors';
import {requireScheduleMeetingTimes} from 'Components/Meeting/ScheduleMeetingModal/requireScheduleMeetingTimes';
import type {
  ScheduleMeetingFormState,
  ScheduleMeetingRecurrenceOption,
} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingTypes';
import type {UpdateMeetingCommand} from 'Components/Meeting/shared/types/meetingCommandTypes';
import type {User} from 'Repositories/entity/User';

export type MapScheduleFormToUpdateMeetingCommandParams = {
  formState: ScheduleMeetingFormState;
  meetingId: QualifiedId;
  qualifiedConversation: Maybe<QualifiedId>;
  originalRecurrence: ScheduleMeetingRecurrenceOption;
  originalSelectedUsers: User[];
  wallClock: WallClock;
};

export const mapScheduleFormToUpdateMeetingCommand = ({
  formState,
  meetingId,
  qualifiedConversation,
  originalRecurrence,
  originalSelectedUsers,
  wallClock,
}: MapScheduleFormToUpdateMeetingCommandParams): Result<UpdateMeetingCommand, ScheduleFormErrors> => {
  const timesResult = requireScheduleMeetingTimes(formState, wallClock);

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
    originalRecurrence,
    selectedUsers: formState.selectedUsers,
    originalSelectedUsers,
    qualifiedConversation,
  });
};
