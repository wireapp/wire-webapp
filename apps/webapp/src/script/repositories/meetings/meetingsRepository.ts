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

import type {CreateMeeting} from '@wireapp/api-client/lib/meetings/createMeeting';
import type {Meeting} from '@wireapp/api-client/lib/meetings/meeting';
import type {UpdateMeeting} from '@wireapp/api-client/lib/meetings/updateMeeting';
import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {Task, task} from 'true-myth';

import type {MeetingsDataSource} from './meetingsDataSource';

export class MeetingsRepository {
  constructor(private readonly dataSource: MeetingsDataSource) {}

  createMeeting(payload: CreateMeeting): Task<Meeting, unknown> {
    return task.tryOrElse(
      error => error,
      () => this.dataSource.createMeeting(payload),
    );
  }

  getMeetingsList(): Task<Meeting[], unknown> {
    return task.tryOrElse(
      error => error,
      () => this.dataSource.getMeetingsList(),
    );
  }

  updateMeeting(meetingId: QualifiedId, payload: UpdateMeeting): Task<Meeting, unknown> {
    return task.tryOrElse(
      error => error,
      () => this.dataSource.updateMeeting(meetingId, payload),
    );
  }

  addMeetingInvitation(meetingId: QualifiedId, emails: string[]): Task<void, unknown> {
    return task.tryOrElse(
      error => error,
      () => this.dataSource.addMeetingInvitation(meetingId, emails),
    );
  }

  removeMeetingInvitation(meetingId: QualifiedId, emails: string[]): Task<void, unknown> {
    return task.tryOrElse(
      error => error,
      () => this.dataSource.removeMeetingInvitation(meetingId, emails),
    );
  }

  deleteMeeting(meetingId: QualifiedId): Task<void, unknown> {
    return task.tryOrElse(
      error => error,
      () => this.dataSource.deleteMeeting(meetingId),
    );
  }
}
