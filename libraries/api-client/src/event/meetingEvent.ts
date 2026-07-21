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

import {QualifiedId} from '../user';

export enum MEETING_EVENT {
  CREATE = 'meeting.create',
  DELETE = 'meeting.delete',
  UPDATE = 'meeting.update',
}

/**
 * Meeting lifecycle events carry the meeting id at the top level as `qualified_id`
 * (no `data` wrapper), matching the backend Meeting event schema.
 */
export interface BaseMeetingEvent {
  conversation?: string;
  from?: string;
  qualified_conversation?: QualifiedId;
  qualified_from?: QualifiedId;
  qualified_id: QualifiedId;
  time: string;
  type: MEETING_EVENT;
  via?: string;
}

export interface MeetingCreateEvent extends BaseMeetingEvent {
  type: MEETING_EVENT.CREATE;
}

export interface MeetingDeleteEvent extends BaseMeetingEvent {
  type: MEETING_EVENT.DELETE;
}

export interface MeetingUpdateEvent extends BaseMeetingEvent {
  type: MEETING_EVENT.UPDATE;
}

export type MeetingEvent = MeetingCreateEvent | MeetingDeleteEvent | MeetingUpdateEvent;
