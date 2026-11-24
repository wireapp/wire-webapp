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

import type {Task} from 'true-myth';

import type {MeetingSubmitErrors} from '../meetingSubmitErrors';
import type {DeleteMeetingCommand} from '../shared/service/deleteMeeting';
import type {
  CreateMeetingSuccess,
  MeetingSubmitSuccess,
  ScheduleMeetingSuccess,
} from '../shared/service/meetingService';
import type {
  MeetNowMeetingCommand,
  ScheduleMeetingCommand,
  UpdateMeetingCommand,
} from '../shared/types/meetingCommandTypes';
import type {MeetingServiceDeps} from '../shared/types/meetingServiceDeps';

export type {MeetingServiceDeps};

export type MeetingStoreServiceTasks = {
  scheduleMeeting: (command: ScheduleMeetingCommand) => Task<ScheduleMeetingSuccess, MeetingSubmitErrors>;
  meetNowMeeting: (command: MeetNowMeetingCommand) => Task<CreateMeetingSuccess, MeetingSubmitErrors>;
  updateMeeting: (command: UpdateMeetingCommand) => Task<MeetingSubmitSuccess, MeetingSubmitErrors>;
  deleteMeetingForMe: (command: DeleteMeetingCommand) => Task<void, MeetingSubmitErrors>;
  deleteMeetingForAll: (command: DeleteMeetingCommand) => Task<void, MeetingSubmitErrors>;
};

export type MeetingStoreDeps = MeetingServiceDeps & {
  serviceTasks: MeetingStoreServiceTasks;
};
