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
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import {maybe, task} from 'true-myth';

import {meetingSubmitErrors} from 'Components/Meeting/MeetingSubmitErrors';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import type {MeetingsRepository} from 'Repositories/meetings/meetingsRepository';
import {translateForTest} from 'Util/test/translateForTest';
import {unwrapErr} from 'Util/test/resultTestSupport';

import {createMeetingStore} from './createMeetingStore';
import type {MeetingStoreDeps} from './meetingStoreDeps';

jest.mock('Components/Meeting/ScheduleMeetingModal/scheduleMeetingService', () => ({
  scheduleMeeting: jest.fn(),
  updateMeeting: jest.fn(),
}));

import {scheduleMeeting as scheduleMeetingTask, updateMeeting as updateMeetingTask} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingService';

const mockedScheduleMeetingTask = scheduleMeetingTask as jest.MockedFunction<typeof scheduleMeetingTask>;
const mockedUpdateMeetingTask = updateMeetingTask as jest.MockedFunction<typeof updateMeetingTask>;

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

  const listMeeting = {
    title: 'Weekly sync',
    start_date: '2026-06-16T10:00:00.000Z',
    end_date: '2026-06-16T11:00:00.000Z',
    conversation_id: 'conversation-id',
    qualified_id: {id: 'meeting-id', domain: 'example.com'},
    qualified_conversation: {id: 'conversation-id', domain: 'example.com'},
    qualified_creator: {id: 'creator-id', domain: 'example.com'},
    recurrence: 'doesNotRepeat' as const,
  };

  const createDeps = ({
    getMeetingsList = jest.fn().mockReturnValue(task.resolve([apiMeeting])),
    safeGetConversationById = jest.fn(),
  }: {
    getMeetingsList?: jest.Mock;
    safeGetConversationById?: jest.Mock;
  } = {}): MeetingStoreDeps => ({
    meetingsRepository: {getMeetingsList} as unknown as MeetingsRepository,
    conversationRepository: {safeGetConversationById} as unknown as ConversationRepository,
    wallClock: createWallClock(),
  });

  beforeEach(() => {
    mockedScheduleMeetingTask.mockReset();
    mockedUpdateMeetingTask.mockReset();
  });

  it('loads meetings successfully', async () => {
    const getMeetingsList = jest.fn().mockReturnValue(task.resolve([apiMeeting]));
    const store = createMeetingStore(createDeps({getMeetingsList}));

    await store.getState().loadMeetings();

    expect(getMeetingsList).toHaveBeenCalledTimes(1);
    expect(store.getState()).toMatchObject({
      isLoading: false,
      hasLoadError: false,
    });
    expect(store.getState().meetings).toHaveLength(1);
    expect(store.getState().meetings[0]?.title).toBe('Weekly sync');
  });

  it('sets hasLoadError when loading meetings fails', async () => {
    const getMeetingsList = jest.fn().mockReturnValue(task.reject(new Error('network error')));
    const store = createMeetingStore(createDeps({getMeetingsList}));

    await store.getState().loadMeetings();

    expect(getMeetingsList).toHaveBeenCalledTimes(1);
    expect(store.getState()).toMatchObject({
      meetings: [],
      isLoading: false,
      hasLoadError: true,
    });
  });

  it('refreshes the list after scheduleMeeting succeeds', async () => {
    mockedScheduleMeetingTask.mockReturnValue(task.resolve({failedToAdd: []}));
    const getMeetingsList = jest.fn().mockReturnValue(task.resolve([apiMeeting]));
    const store = createMeetingStore(createDeps({getMeetingsList}));

    const result = await store.getState().scheduleMeeting({
      title: 'Weekly sync',
      start: maybe.just(new Date('2026-06-16T10:00:00.000Z')),
      end: maybe.just(new Date('2026-06-16T11:00:00.000Z')),
      recurrence: 'doesNotRepeat',
      selectedUsers: [],
      participantsFilter: '',
    });

    expect(result.isOk).toBe(true);
    expect(mockedScheduleMeetingTask).toHaveBeenCalled();
    expect(getMeetingsList).toHaveBeenCalledTimes(1);
  });

  it('returns refreshFailed when list refresh fails after a successful schedule', async () => {
    mockedScheduleMeetingTask.mockReturnValue(task.resolve({failedToAdd: []}));
    const getMeetingsList = jest.fn().mockReturnValue(task.reject(new Error('network error')));
    const store = createMeetingStore(createDeps({getMeetingsList}));

    const result = await store.getState().scheduleMeeting({
      title: 'Weekly sync',
      start: maybe.just(new Date('2026-06-16T10:00:00.000Z')),
      end: maybe.just(new Date('2026-06-16T11:00:00.000Z')),
      recurrence: 'doesNotRepeat',
      selectedUsers: [],
      participantsFilter: '',
    });

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(meetingSubmitErrors.refreshFailed);
  });

  it('loads meeting data for edit via safeGetConversationById', async () => {
    const conversation = new Conversation(
      'conversation-id',
      'example.com',
      CONVERSATION_PROTOCOL.MLS,
      translateForTest,
    );
    const safeGetConversationById = jest.fn().mockReturnValue(task.resolve(conversation));
    const store = createMeetingStore(createDeps({safeGetConversationById}));

    const result = await store.getState().loadMeetingForEdit(listMeeting);

    expect(result.isOk).toBe(true);
    expect(safeGetConversationById).toHaveBeenCalledWith(listMeeting.qualified_conversation);
  });
});
