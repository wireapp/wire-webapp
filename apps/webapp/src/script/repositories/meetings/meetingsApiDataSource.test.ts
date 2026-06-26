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
    });
    await dataSource.getMeetingsList();

    expect(createMeeting).toHaveBeenCalledTimes(1);
    expect(getMeetingsList).toHaveBeenCalledTimes(1);
  });

  it('delegates deleteMeeting to the injected MeetingsAPI', async () => {
    const meetingId = {id: 'meeting-id', domain: 'example.com'};
    const deleteMeeting = jest.fn().mockResolvedValue(undefined);
    const meetingsApi = {deleteMeeting} as unknown as MeetingsAPI;

    const dataSource = new MeetingsApiDataSource(meetingsApi);

    await dataSource.deleteMeeting(meetingId);

    expect(deleteMeeting).toHaveBeenCalledWith(meetingId);
  });
});
