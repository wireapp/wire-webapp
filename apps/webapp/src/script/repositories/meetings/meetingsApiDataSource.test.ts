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

import {MeetingsAPI} from '@wireapp/api-client/lib/meetings/meetingsApi';
import {MeetingsApiDataSource} from './meetingsApiDataSource';

describe('MeetingsApiDataSource', () => {
  it('delegates createMeeting and getMeetingsList to the injected MeetingsAPI', async () => {
    const createMeeting = jest.fn().mockResolvedValue({});
    const getMeetingsList = jest.fn().mockResolvedValue([]);
    const meetingsApi = {
      createMeeting,
      getMeetingsList,
    } as unknown as MeetingsAPI;

    const dataSource = new MeetingsApiDataSource(meetingsApi);

    await dataSource.createMeeting({
      title: 'Weekly sync',
      start_time: '2026-06-16T10:00:00.000Z',
      end_time: '2026-06-16T11:00:00.000Z',
      tzid: 'Europe/Berlin',
    });
    await dataSource.getMeetingsList();

    expect(createMeeting).toHaveBeenCalledTimes(1);
    expect(getMeetingsList).toHaveBeenCalledTimes(1);
  });

  it('delegates getMeeting to the injected MeetingsAPI', async () => {
    const meetingId = {id: 'meeting-id', domain: 'example.com'};
    const meeting = {
      created_at: '2026-06-15T09:00:00.000Z',
      updated_at: '2026-06-15T09:00:00.000Z',
      start_time: '2026-06-16T10:00:00.000Z',
      end_time: '2026-06-16T11:00:00.000Z',
      title: 'Weekly sync',
      qualified_conversation: {id: 'conversation-id', domain: 'example.com'},
      qualified_creator: {id: 'creator-id', domain: 'example.com'},
      qualified_id: meetingId,
      tzid: 'Europe/Berlin',
    };
    const getMeeting = jest.fn().mockResolvedValue(meeting);
    const meetingsApi = {
      getMeeting,
    } as unknown as MeetingsAPI;

    const dataSource = new MeetingsApiDataSource(meetingsApi);

    const result = await dataSource.getMeeting(meetingId);

    expect(getMeeting).toHaveBeenCalledTimes(1);
    expect(getMeeting).toHaveBeenCalledWith(meetingId);
    expect(result).toBe(meeting);
  });
});
