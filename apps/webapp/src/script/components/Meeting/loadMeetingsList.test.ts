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

import type {MeetingsRepository} from 'Repositories/meetings/meetingsRepository';

import {loadMeetingsList} from './loadMeetingsList';

describe('loadMeetingsList', () => {
  const apiMeeting = {
    created_at: '2026-06-15T09:00:00.000Z',
    updated_at: '2026-06-15T09:00:00.000Z',
    start_time: '2026-06-16T10:00:00.000Z',
    end_time: '2026-06-16T11:00:00.000Z',
    title: 'Weekly sync',
    invited_emails: [],
    qualified_conversation: {id: 'conversation-id', domain: 'example.com'},
    qualified_creator: {id: 'creator-id', domain: 'example.com'},
    qualified_id: {id: 'meeting-id', domain: 'example.com'},
    trial: false,
  };

  const createRepository = (getMeetingsList: jest.Mock) => ({getMeetingsList}) as unknown as MeetingsRepository;

  it('returns an empty list after a successful response with no meetings', async () => {
    const getMeetingsList = jest.fn().mockResolvedValue([]);
    const result = await loadMeetingsList(createRepository(getMeetingsList));

    expect(getMeetingsList).toHaveBeenCalledTimes(1);
    expect(result).toEqual({meetings: []});
  });

  it('maps successful API meetings to list meetings', async () => {
    const getMeetingsList = jest.fn().mockResolvedValue([apiMeeting]);
    const result = await loadMeetingsList(createRepository(getMeetingsList));

    expect(result.meetings).toHaveLength(1);
    expect(result.meetings[0]?.title).toBe('Weekly sync');
  });
});
