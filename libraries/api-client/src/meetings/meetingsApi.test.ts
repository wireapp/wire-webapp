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

import {ZodError} from 'zod';

import {APIClient} from '../apiClient';
import {Config, MINIMUM_API_VERSION} from '../config';
import {MeetingRecurrenceFrequency} from './meetingRecurrence';

describe('MeetingsAPI', () => {
  const testConfig: Config = {urls: {rest: 'https://test.zinfra.io', ws: '', name: 'test'}};

  const validMeeting = {
    created_at: '2026-06-15T09:00:00.000Z',
    updated_at: '2026-06-15T09:00:00.000Z',
    start_time: '2026-06-16T10:00:00.000Z',
    end_time: '2026-06-16T11:00:00.000Z',
    title: 'Weekly sync',
    qualified_conversation: {id: 'conversation-id', domain: 'example.com'},
    qualified_creator: {id: 'creator-id', domain: 'example.com'},
    qualified_id: {id: 'meeting-id', domain: 'example.com'},
    trial: false,
    recurrence: {frequency: MeetingRecurrenceFrequency.WEEKLY},
  };

  it('sends meeting requests through the versioned HTTP client', async () => {
    const client = new APIClient(testConfig);
    jest.spyOn(client.transport.http, 'sendRequest').mockResolvedValue({
      data: {supported: [MINIMUM_API_VERSION, 16], domain: 'test.zinfra.io'},
    } as never);

    await client.useVersion(MINIMUM_API_VERSION, 16);

    const sendJSONSpy = jest.spyOn(client.transport.http, 'sendJSON').mockResolvedValue({data: []} as never);

    await client.api.meetings.getMeetingsList();

    expect(client.transport.http.getBaseUrl()).toBe('https://test.zinfra.io/v16');
    expect(sendJSONSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'get',
        url: '/meetings/list',
      }),
    );
  });

  it('throws when meeting responses fail schema validation', async () => {
    const client = new APIClient(testConfig);
    jest.spyOn(client.transport.http, 'sendRequest').mockResolvedValue({
      data: {supported: [MINIMUM_API_VERSION, 16], domain: 'test.zinfra.io'},
    } as never);

    await client.useVersion(MINIMUM_API_VERSION, 16);

    jest.spyOn(client.transport.http, 'sendJSON').mockResolvedValue({data: [{title: 'invalid'}]} as never);

    await expect(client.api.meetings.getMeetingsList()).rejects.toBeInstanceOf(ZodError);
  });

  it('returns parsed meeting responses for valid payloads', async () => {
    const client = new APIClient(testConfig);
    jest.spyOn(client.transport.http, 'sendRequest').mockResolvedValue({
      data: {supported: [MINIMUM_API_VERSION, 16], domain: 'test.zinfra.io'},
    } as never);

    await client.useVersion(MINIMUM_API_VERSION, 16);

    jest.spyOn(client.transport.http, 'sendJSON').mockResolvedValue({data: validMeeting} as never);

    const meeting = await client.api.meetings.getMeeting({id: 'meeting-id', domain: 'example.com'});

    expect(meeting).toEqual(validMeeting);
  });
});
