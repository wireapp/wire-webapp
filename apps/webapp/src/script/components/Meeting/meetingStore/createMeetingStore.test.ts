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

import {createWallClock} from '@enormora/wall-clock/wall-clock';
import {task} from 'true-myth';

import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import type {MeetingsRepository} from 'Repositories/meetings/meetingsRepository';

import {createMeetingStore} from './createMeetingStore';
import type {MeetingStoreDeps} from './meetingStoreDeps';

describe('createMeetingStore', () => {
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

  const createDeps = (getMeetingsList: jest.Mock): MeetingStoreDeps => ({
    meetingsRepository: {getMeetingsList} as unknown as MeetingsRepository,
    conversationRepository: {} as ConversationRepository,
    wallClock: createWallClock(),
  });

  it('loads meetings successfully', async () => {
    const getMeetingsList = jest.fn().mockReturnValue(task.resolve([apiMeeting]));
    const store = createMeetingStore(createDeps(getMeetingsList));

    await store.getState().loadMeetings();

    expect(getMeetingsList).toHaveBeenCalledTimes(1);
    expect(store.getState()).toMatchObject({
      isLoading: false,
      errorKey: undefined,
    });
    expect(store.getState().meetings).toHaveLength(1);
    expect(store.getState().meetings[0]?.title).toBe('Weekly sync');
  });

  it('sets errorKey when loading meetings fails', async () => {
    const getMeetingsList = jest.fn().mockReturnValue(task.reject(new Error('network error')));
    const store = createMeetingStore(createDeps(getMeetingsList));

    await store.getState().loadMeetings();

    expect(getMeetingsList).toHaveBeenCalledTimes(1);
    expect(store.getState()).toMatchObject({
      meetings: [],
      isLoading: false,
      errorKey: 'meetings.list.loadError',
    });
  });
});
