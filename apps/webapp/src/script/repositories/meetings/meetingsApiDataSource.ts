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

import type {MeetingsAPI} from '@wireapp/api-client/lib/meetings/meetingsApi';

import type {MeetingsDataSource} from './meetingsDataSource';

export class MeetingsApiDataSource implements MeetingsDataSource {
  constructor(private readonly meetingsApi: MeetingsAPI) {}

  createMeeting(...args: Parameters<MeetingsDataSource['createMeeting']>) {
    return this.meetingsApi.createMeeting(...args);
  }

  getMeetingsList(...args: Parameters<MeetingsDataSource['getMeetingsList']>) {
    return this.meetingsApi.getMeetingsList(...args);
  }

  updateMeeting(...args: Parameters<MeetingsDataSource['updateMeeting']>) {
    return this.meetingsApi.updateMeeting(...args);
  }

  addMeetingInvitation(meetingId: Parameters<MeetingsDataSource['addMeetingInvitation']>[0], emails: string[]) {
    return this.meetingsApi.addMeetingInvitation(meetingId, {emails});
  }

  removeMeetingInvitation(meetingId: Parameters<MeetingsDataSource['removeMeetingInvitation']>[0], emails: string[]) {
    return this.meetingsApi.removeMeetingInvitation(meetingId, {emails});
  }
}
