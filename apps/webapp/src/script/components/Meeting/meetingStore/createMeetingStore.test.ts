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

import assert from 'node:assert';

import {createDeterministicWallClock} from '@enormora/wall-clock/deterministic-wall-clock';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import {maybe, task} from 'true-myth';

import type {CallingRepository} from 'Repositories/calling/CallingRepository';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import type {MeetingsRepository} from 'Repositories/meetings/meetingsRepository';
import {translateForTest} from 'Util/test/translateForTest';

import {createMeetingStore} from './createMeetingStore';
import type {MeetingStoreDeps, MeetingStoreServiceTasks} from './meetingStoreDeps';

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

  const meetingSeriesEntry = {
    title: 'Weekly sync',
    series_start_date: '2026-06-16T10:00:00.000Z',
    series_end_date: '2026-06-16T11:00:00.000Z',
    duration_ms: 3_600_000,
    conversation_id: 'conversation-id',
    qualified_id: {id: 'meeting-id', domain: 'example.com'},
    qualified_conversation: {id: 'conversation-id', domain: 'example.com'},
    qualified_creator: {id: 'creator-id', domain: 'example.com'},
    recurrence: 'doesNotRepeat' as const,
  };

  const listMeetingInstance = {
    meetingSeries: meetingSeriesEntry,
    start: new Date('2026-06-16T10:00:00.000Z'),
    end: new Date('2026-06-16T11:00:00.000Z'),
  };

  const wallClock = createDeterministicWallClock({
    initialCurrentTimestampInMilliseconds: Date.parse('2026-06-15T13:00:00.000Z'),
  });

  const createServiceTasks = (overrides: Partial<MeetingStoreServiceTasks> = {}): MeetingStoreServiceTasks => ({
    scheduleMeeting: jest.fn().mockReturnValue(task.resolve({failedToAdd: []})),
    meetNowMeeting: jest
      .fn()
      .mockReturnValue(
        task.resolve({failedToAdd: [], qualifiedConversation: {id: 'conversation-id', domain: 'example.com'}}),
      ),
    updateMeeting: jest.fn().mockReturnValue(task.resolve({failedToAdd: []})),
    deleteMeetingForMe: jest.fn().mockReturnValue(task.resolve(undefined)),
    deleteMeetingForAll: jest.fn().mockReturnValue(task.resolve(undefined)),
    ...overrides,
  });

  const createDeps = ({
    getMeetingsList = jest.fn().mockReturnValue(task.resolve([apiMeeting])),
    safeGetConversationById = jest.fn(),
    serviceTasks = createServiceTasks(),
  }: {
    getMeetingsList?: jest.Mock;
    safeGetConversationById?: jest.Mock;
    serviceTasks?: MeetingStoreServiceTasks;
  } = {}): MeetingStoreDeps => ({
    meetingsRepository: {getMeetingsList} as unknown as MeetingsRepository,
    conversationRepository: {safeGetConversationById} as unknown as ConversationRepository,
    callingRepository: {findCall: jest.fn(), leaveCall: jest.fn()} as unknown as CallingRepository,
    wallClock,
    serviceTasks,
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
    expect(store.getState().meetingSeries).toHaveLength(1);
    expect(store.getState().meetingSeries[0]?.title).toBe('Weekly sync');
    expect(store.getState().meetingSeries[0]).toMatchObject(meetingSeriesEntry);
  });

  it('sets hasLoadError when loading meetings fails', async () => {
    const getMeetingsList = jest.fn().mockReturnValue(task.reject(new Error('network error')));
    const store = createMeetingStore(createDeps({getMeetingsList}));

    await store.getState().loadMeetings();

    expect(getMeetingsList).toHaveBeenCalledTimes(1);
    expect(store.getState()).toMatchObject({
      meetingSeries: [],
      isLoading: false,
      hasLoadError: true,
    });
  });

  it('schedules a meeting without refreshing the meetings list', async () => {
    const scheduleMeeting = jest.fn().mockReturnValue(task.resolve({failedToAdd: []}));
    const getMeetingsList = jest.fn().mockReturnValue(task.resolve([apiMeeting]));
    const store = createMeetingStore(
      createDeps({getMeetingsList, serviceTasks: createServiceTasks({scheduleMeeting})}),
    );
    const scheduleCommand = {
      title: 'Weekly sync',
      start: new Date('2026-06-16T10:00:00.000Z'),
      end: new Date('2026-06-16T11:00:00.000Z'),
      recurrence: 'doesNotRepeat' as const,
      selectedUsers: [],
    };

    const result = await store.getState().scheduleMeeting(scheduleCommand);

    expect(result.isOk).toBe(true);
    expect(scheduleMeeting).toHaveBeenCalledTimes(1);
    expect(scheduleMeeting).toHaveBeenCalledWith(scheduleCommand);
    expect(getMeetingsList).not.toHaveBeenCalled();
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

    const result = await store.getState().loadMeetingForEdit(listMeetingInstance);

    expect(result.isOk).toBe(true);
    expect(safeGetConversationById).toHaveBeenCalledWith(listMeetingInstance.meetingSeries.qualified_conversation);

    if (!result.isOk) {
      throw new Error('Expected loadMeetingForEdit to succeed');
    }

    assert(maybe.isJust(result.value.formState.start));
    expect(result.value.formState.start.value).toEqual(new Date('2026-06-16T10:00:00.000Z'));
    assert(maybe.isJust(result.value.formState.end));
    expect(result.value.formState.end.value).toEqual(new Date('2026-06-16T11:00:00.000Z'));
  });

  it('prefills edit form with the upcoming instance times for recurring meetings', async () => {
    const conversation = new Conversation(
      'conversation-id',
      'example.com',
      CONVERSATION_PROTOCOL.MLS,
      translateForTest,
    );
    const safeGetConversationById = jest.fn().mockReturnValue(task.resolve(conversation));
    const store = createMeetingStore(createDeps({safeGetConversationById}));
    const recurringMeetingInstance = {
      meetingSeries: {
        ...meetingSeriesEntry,
        series_start_date: '2026-06-01T10:00:00.000Z',
        series_end_date: '2026-06-01T11:00:00.000Z',
        recurrence: 'weekly' as const,
      },
      start: new Date('2026-06-29T10:00:00.000Z'),
      end: new Date('2026-06-29T11:00:00.000Z'),
    };

    const result = await store.getState().loadMeetingForEdit(recurringMeetingInstance);

    expect(result.isOk).toBe(true);

    if (!result.isOk) {
      throw new Error('Expected loadMeetingForEdit to succeed');
    }

    assert(maybe.isJust(result.value.formState.start));
    expect(result.value.formState.start.value).toEqual(new Date('2026-06-22T10:00:00.000Z'));
    assert(maybe.isJust(result.value.formState.end));
    expect(result.value.formState.end.value).toEqual(new Date('2026-06-22T11:00:00.000Z'));
  });
});
