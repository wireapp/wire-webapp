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

import type {Meeting} from 'Components/Meeting/MeetingList/MeetingList';
import type {MeetingSeries} from 'Components/Meeting/types/meetingSeries';

export const seriesToLegacyMeetingFields = (series: MeetingSeries): Meeting => ({
  start_date: series.series_start_date,
  end_date: series.series_end_date,
  conversation_id: series.conversation_id,
  qualified_conversation: series.qualified_conversation,
  title: series.title,
  recurrence: series.recurrence,
  qualified_id: series.qualified_id,
  qualified_creator: series.qualified_creator,
  attending: series.attending,
});
