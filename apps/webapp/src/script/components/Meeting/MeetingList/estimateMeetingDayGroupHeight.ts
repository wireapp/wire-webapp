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

import {
  MEETING_DAY_GROUP_HEADER_HEIGHT,
  MEETING_DAY_GROUP_SECTION_TOP_PADDING,
  MEETING_LIST_ITEM_HEIGHT,
} from 'Components/Meeting/MeetingList/meetingListConstants';

export const estimateMeetingDayGroupHeight = (meetingInstanceCount: number): number =>
  MEETING_DAY_GROUP_SECTION_TOP_PADDING +
  MEETING_DAY_GROUP_HEADER_HEIGHT +
  meetingInstanceCount * MEETING_LIST_ITEM_HEIGHT;
