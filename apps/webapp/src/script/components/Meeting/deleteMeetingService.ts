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
import {Result, result} from 'true-myth';

import {deleteMeetingErrors, type DeleteMeetingErrorCode} from 'Components/Meeting/DeleteMeetingErrors';
import type {MeetingsRepository} from 'Repositories/meetings/meetingsRepository';

export type TryDeleteMeetingDependencies = {
  meetingsRepository: MeetingsRepository;
  fetchMeetings: () => Promise<void>;
};

export type TryDeleteMeetingParams = {
  meetingId: QualifiedId;
  dependencies: TryDeleteMeetingDependencies;
};

export async function tryDeleteMeeting({
  meetingId,
  dependencies,
}: TryDeleteMeetingParams): Promise<Result<void, DeleteMeetingErrorCode>> {
  const {meetingsRepository, fetchMeetings} = dependencies;
  const deleteResult = await meetingsRepository.deleteMeeting(meetingId);

  if (deleteResult.isErr) {
    return result.err(deleteMeetingErrors.deleteFailed);
  }

  await fetchMeetings();
  return result.ok(undefined);
}
