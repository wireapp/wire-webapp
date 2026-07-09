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

import {mapApiMeetingToSeries} from 'Components/Meeting/mapApiMeetingToSeries';
import type {MeetingSeries} from 'Components/Meeting/types/meetingSeries';
import type {MeetingsRepository} from 'Repositories/meetings/meetingsRepository';
import {getLogger} from 'Util/logger';

export type LoadMeetingsListResult = {meetingSeries: MeetingSeries[]; hasLoadError: boolean};

const logger = getLogger('loadMeetingsList');

export const loadMeetingsList = async (meetingsRepository: MeetingsRepository): Promise<LoadMeetingsListResult> => {
  const listResult = await meetingsRepository.getMeetingsList();

  if (listResult.isErr) {
    logger.warn('Failed to load meetings list', listResult.error);
    return {meetingSeries: [], hasLoadError: true};
  }

  const meetingSeries = listResult.value.flatMap(apiMeeting => {
    const mapResult = mapApiMeetingToSeries(apiMeeting);

    if (mapResult.isErr) {
      logger.warn('Skipping invalid meeting from API response', {
        error: mapResult.error,
        qualifiedId: apiMeeting.qualified_id,
      });
      return [];
    }

    return [mapResult.value];
  });

  return {meetingSeries, hasLoadError: false};
};
