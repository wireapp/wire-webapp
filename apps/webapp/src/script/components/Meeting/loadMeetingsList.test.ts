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

import {task} from 'true-myth';

import type {MeetingsRepository} from 'Repositories/meetings/meetingsRepository';

import {loadMeetingsList} from './loadMeetingsList';

describe('loadMeetingsList', () => {
  const apiMeeting = {
    created_at: '2026-06-15T09:00:00.000Z',
    updated_at: '2026-06-15T09:00:00.000Z',
    start_time: '2026-06-16T10:00:00.000Z',
    end_time: '2026-06-16T11:00:00.000Z',
    title: 'Weekly sync',
    qualified_conversation: {id: 'conversation-id', domain: 'example.com'},
    qualified_creator: {id: 'creator-id', domain: 'example.com'},
    qualified_id: {id: 'meeting-id', domain: 'example.com'},
    trial: false,
  };

  const createRepository = (getMeetingsList: jest.Mock) => ({getMeetingsList}) as unknown as MeetingsRepository;

  it('returns an empty list after a successful response with no meetings', async () => {
    const getMeetingsList = jest.fn().mockReturnValue(task.resolve([]));
    const result = await loadMeetingsList(createRepository(getMeetingsList));

    expect(getMeetingsList).toHaveBeenCalledTimes(1);
    expect(result).toEqual({meetingSeries: [], hasLoadError: false});
  });

  it('maps successful API meetings to meeting series', async () => {
    const getMeetingsList = jest.fn().mockReturnValue(task.resolve([apiMeeting]));
    const result = await loadMeetingsList(createRepository(getMeetingsList));

    expect(result.meetingSeries).toHaveLength(1);
    expect(result.meetingSeries[0]?.title).toBe('Weekly sync');
    expect(result.meetingSeries[0]?.series_start_date).toBe('2026-06-16T10:00:00.000Z');
    expect(result.meetingSeries[0]?.duration_ms).toBe(3_600_000);
  });

  it('drops invalid meetings from a successful response without failing the load', async () => {
    const getMeetingsList = jest.fn().mockReturnValue(
      task.resolve([
        apiMeeting,
        {
          ...apiMeeting,
          qualified_id: {id: 'invalid-meeting', domain: 'example.com'},
          start_time: '2026-06-16T11:00:00.000Z',
          end_time: '2026-06-16T10:00:00.000Z',
        },
      ]),
    );
    const result = await loadMeetingsList(createRepository(getMeetingsList));

    expect(result).toEqual({
      meetingSeries: [
        expect.objectContaining({
          title: 'Weekly sync',
          qualified_id: {id: 'meeting-id', domain: 'example.com'},
        }),
      ],
      hasLoadError: false,
    });
  });
});
