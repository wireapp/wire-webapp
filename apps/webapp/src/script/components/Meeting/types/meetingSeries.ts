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

import type {ScheduleMeetingRecurrenceOption} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingTypes';

export type MeetingSeries = {
  series_start_date: string;
  series_end_date: string;
  duration_ms: number;
  recurrence: ScheduleMeetingRecurrenceOption;
  recurrence_until?: string;
  conversation_id: string;
  qualified_conversation: QualifiedId;
  qualified_id: QualifiedId;
  qualified_creator: QualifiedId;
  title: string;
  attending?: boolean;
};
