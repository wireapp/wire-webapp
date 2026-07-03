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

import {mapApiMeetingToListMeeting} from 'Components/Meeting/mapApiMeetingToListMeeting';
import type {Meeting} from 'Components/Meeting/MeetingList/MeetingList';
import type {MeetingsRepository} from 'Repositories/meetings/meetingsRepository';
import {getLogger} from 'Util/logger';

export type LoadMeetingsListResult = {meetings: Meeting[]; hasLoadError: boolean};

const logger = getLogger('loadMeetingsList');

export const loadMeetingsList = async (meetingsRepository: MeetingsRepository): Promise<LoadMeetingsListResult> => {
  const listResult = await meetingsRepository.getMeetingsList();

  if (listResult.isErr) {
    logger.warn('Failed to load meetings list', listResult.error);
    return {meetings: [], hasLoadError: true};
  }

  return {meetings: listResult.value.map(mapApiMeetingToListMeeting), hasLoadError: false};
};
