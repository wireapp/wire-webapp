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
import {MEETING_EVENT} from '@wireapp/api-client/lib/event';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';
import {noop} from 'noop-esm';
import {maybe, task} from 'true-myth';

import type {CallingRepository} from 'Repositories/calling/CallingRepository';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {EventRepository} from 'Repositories/event/EventRepository';
import {EventSource} from 'Repositories/event/EventSource';
import type {MeetingsRepository} from 'Repositories/meetings/meetingsRepository';
import {unwrap, unwrapErr} from 'Util/test/resultTestSupport';
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
    scheduleMeeting: jest
      .fn()
      .mockReturnValue(task.resolve({failedToAdd: [], qualifiedMeetingId: apiMeeting.qualified_id})),
    meetNowMeeting: jest.fn().mockReturnValue(
      task.resolve({
        failedToAdd: [],
        qualifiedConversation: {id: 'conversation-id', domain: 'example.com'},
        qualifiedMeetingId: apiMeeting.qualified_id,
      }),
    ),
    updateMeeting: jest.fn().mockReturnValue(task.resolve({failedToAdd: []})),
    deleteMeetingForMe: jest.fn().mockReturnValue(task.resolve(undefined)),
    deleteMeetingForAll: jest.fn().mockReturnValue(task.resolve(undefined)),
    ...overrides,
  });

  const createDeps = ({
    getMeetingsList = jest.fn().mockReturnValue(task.resolve([apiMeeting])),
    getMeeting = jest.fn().mockReturnValue(task.resolve(apiMeeting)),
    safeGetConversationById = jest.fn(),
    serviceTasks = createServiceTasks(),
    wallClock: wallClockOverride = wallClock,
  }: {
    getMeetingsList?: jest.Mock;
    getMeeting?: jest.Mock;
    safeGetConversationById?: jest.Mock;
    serviceTasks?: MeetingStoreServiceTasks;
    wallClock?: typeof wallClock;
  } = {}): MeetingStoreDeps => ({
    meetingsRepository: {getMeetingsList, getMeeting} as unknown as MeetingsRepository,
    conversationRepository: {safeGetConversationById} as unknown as ConversationRepository,
    callingRepository: {findCall: jest.fn(), leaveCall: jest.fn()} as unknown as CallingRepository,
    wallClock: wallClockOverride,
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

  it('keeps the list visible while reloading meetings that are already shown', async () => {
    let finishFetch: () => void = noop;
    const fetchGate = new Promise<void>(resolve => {
      finishFetch = resolve;
    });
    const getMeetingsList = jest.fn().mockReturnValue(
      task.tryOrElse(
        () => new Error('fetch failed'),
        async () => {
          await fetchGate;
          return [{...apiMeeting, title: 'Weekly sync (refreshed)'}];
        },
      ),
    );
    const store = createMeetingStore(createDeps({getMeetingsList}), {meetingSeries: [meetingSeriesEntry]});

    const pendingReload = store.getState().loadMeetings();

    expect(store.getState()).toMatchObject({
      isLoading: false,
      meetingSeries: [meetingSeriesEntry],
    });

    finishFetch();
    await pendingReload;

    expect(store.getState()).toMatchObject({
      isLoading: false,
      hasLoadError: false,
    });
    expect(store.getState().meetingSeries[0]?.title).toBe('Weekly sync (refreshed)');
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

  it('does not restore a removed meeting when an older list reload finishes', async () => {
    let finishFetch: () => void = noop;
    const fetchGate = new Promise<void>(resolve => {
      finishFetch = resolve;
    });
    const getMeetingsList = jest.fn().mockReturnValue(
      task.tryOrElse(
        () => new Error('fetch failed'),
        async () => {
          await fetchGate;
          return [apiMeeting];
        },
      ),
    );
    const store = createMeetingStore(createDeps({getMeetingsList}), {meetingSeries: [meetingSeriesEntry]});

    const pendingReload = store.getState().loadMeetings();
    store.getState().removeMeetingByQualifiedId(apiMeeting.qualified_id);
    finishFetch();

    await pendingReload;

    expect(store.getState()).toMatchObject({isLoading: false, meetingSeries: []});
  });

  it('does not remove a newly synchronized meeting when an older list reload finishes', async () => {
    let finishFetch: () => void = noop;
    const fetchGate = new Promise<void>(resolve => {
      finishFetch = resolve;
    });
    const getMeetingsList = jest.fn().mockReturnValue(
      task.tryOrElse(
        () => new Error('fetch failed'),
        async () => {
          await fetchGate;
          return [];
        },
      ),
    );
    const store = createMeetingStore(createDeps({getMeetingsList}));

    const pendingReload = store.getState().loadMeetings();
    const syncResult = await store.getState().syncMeetingByQualifiedId(apiMeeting.qualified_id);
    finishFetch();

    await pendingReload;

    expect(syncResult.isOk).toBe(true);
    expect(store.getState().meetingSeries).toEqual([expect.objectContaining(meetingSeriesEntry)]);
  });

  it('syncs a newly scheduled meeting into the store without reloading the meetings list', async () => {
    const scheduleMeeting = jest
      .fn()
      .mockReturnValue(task.resolve({failedToAdd: [], qualifiedMeetingId: apiMeeting.qualified_id}));
    const getMeetingsList = jest.fn().mockReturnValue(task.resolve([apiMeeting]));
    const getMeeting = jest.fn().mockReturnValue(task.resolve(apiMeeting));
    const store = createMeetingStore(
      createDeps({getMeetingsList, getMeeting, serviceTasks: createServiceTasks({scheduleMeeting})}),
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
    expect(getMeeting).toHaveBeenCalledWith(apiMeeting.qualified_id);
    expect(getMeetingsList).not.toHaveBeenCalled();
    expect(store.getState().meetingSeries).toEqual([expect.objectContaining(meetingSeriesEntry)]);
  });

  it('syncs a newly created Meet now meeting into the store without reloading the meetings list', async () => {
    const meetNowMeeting = jest.fn().mockReturnValue(
      task.resolve({
        failedToAdd: [],
        qualifiedConversation: apiMeeting.qualified_conversation,
        qualifiedMeetingId: apiMeeting.qualified_id,
      }),
    );
    const getMeetingsList = jest.fn().mockReturnValue(task.resolve([apiMeeting]));
    const getMeeting = jest.fn().mockReturnValue(task.resolve(apiMeeting));
    const store = createMeetingStore(
      createDeps({getMeetingsList, getMeeting, serviceTasks: createServiceTasks({meetNowMeeting})}),
    );
    const meetNowCommand = {
      title: 'Standup',
      selectedUsers: [],
    };

    const result = await store.getState().meetNowMeeting(meetNowCommand);

    expect(unwrap(result)).toEqual({
      failedToAdd: [],
      qualifiedConversation: apiMeeting.qualified_conversation,
      qualifiedMeetingId: apiMeeting.qualified_id,
    });
    expect(meetNowMeeting).toHaveBeenCalledTimes(1);
    expect(meetNowMeeting).toHaveBeenCalledWith(meetNowCommand);
    expect(getMeeting).toHaveBeenCalledWith(apiMeeting.qualified_id);
    expect(getMeetingsList).not.toHaveBeenCalled();
    expect(store.getState().meetingSeries).toEqual([expect.objectContaining(meetingSeriesEntry)]);
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

  it('prefills edit form with the edit anchor times for recurring meetings', async () => {
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

  it('prefills today’s in-progress occurrence when editing a future row (WPB-27894)', async () => {
    const conversation = new Conversation(
      'conversation-id',
      'example.com',
      CONVERSATION_PROTOCOL.MLS,
      translateForTest,
    );
    const safeGetConversationById = jest.fn().mockReturnValue(task.resolve(conversation));
    const ongoingWallClock = createDeterministicWallClock({
      initialCurrentTimestampInMilliseconds: Date.parse('2026-06-15T10:30:00.000Z'),
    });
    const store = createMeetingStore(createDeps({safeGetConversationById, wallClock: ongoingWallClock}));
    const recurringMeetingInstance = {
      meetingSeries: {
        ...meetingSeriesEntry,
        series_start_date: '2026-06-01T10:00:00.000Z',
        series_end_date: '2026-06-01T11:00:00.000Z',
        recurrence: 'weekly' as const,
      },
      start: new Date('2026-06-22T10:00:00.000Z'),
      end: new Date('2026-06-22T11:00:00.000Z'),
    };

    const result = await store.getState().loadMeetingForEdit(recurringMeetingInstance);

    expect(result.isOk).toBe(true);

    if (!result.isOk) {
      throw new Error('Expected loadMeetingForEdit to succeed');
    }

    assert(maybe.isJust(result.value.formState.start));
    expect(result.value.formState.start.value).toEqual(new Date('2026-06-15T10:00:00.000Z'));
    assert(maybe.isJust(result.value.formState.end));
    expect(result.value.formState.end.value).toEqual(new Date('2026-06-15T11:00:00.000Z'));
  });

  it('maps deleteMeetingForAll to a DeleteMeetingCommand for serviceTasks', async () => {
    const deleteMeetingForAll = jest.fn().mockReturnValue(task.resolve(undefined));
    const store = createMeetingStore(createDeps({serviceTasks: createServiceTasks({deleteMeetingForAll})}));

    const result = await store.getState().deleteMeetingForAll(listMeetingInstance);

    expect(result.isOk).toBe(true);
    expect(deleteMeetingForAll).toHaveBeenCalledWith({
      meetingId: listMeetingInstance.meetingSeries.qualified_id,
      qualifiedConversation: listMeetingInstance.meetingSeries.qualified_conversation,
    });
  });

  it('maps deleteMeetingForMe to a DeleteMeetingCommand for serviceTasks', async () => {
    const deleteMeetingForMe = jest.fn().mockReturnValue(task.resolve(undefined));
    const store = createMeetingStore(createDeps({serviceTasks: createServiceTasks({deleteMeetingForMe})}));

    const result = await store.getState().deleteMeetingForMe(listMeetingInstance);

    expect(result.isOk).toBe(true);
    expect(deleteMeetingForMe).toHaveBeenCalledWith({
      meetingId: listMeetingInstance.meetingSeries.qualified_id,
      qualifiedConversation: listMeetingInstance.meetingSeries.qualified_conversation,
    });
  });

  it('removes a meeting when meeting.delete is distributed with its qualified_id', async () => {
    const store = createMeetingStore(createDeps(), {meetingSeries: [meetingSeriesEntry]});
    const onMeetingDeleted = (meetingId: {id: string; domain: string}) => {
      store.getState().removeMeetingByQualifiedId(meetingId);
    };

    amplify.subscribe(WebAppEvents.MEETING.DELETED, onMeetingDeleted);

    const eventRepository = new EventRepository({} as any, {} as any, {} as any, {} as any);
    eventRepository.setEventProcessors([]);

    try {
      await eventRepository['distributeEvent'](
        {
          type: MEETING_EVENT.DELETE,
          time: '2026-07-21T12:00:00.000Z',
          qualified_id: meetingSeriesEntry.qualified_id,
          conversation: meetingSeriesEntry.conversation_id,
          qualified_conversation: meetingSeriesEntry.qualified_conversation,
          from: 'user-id',
          qualified_from: {id: 'user-id', domain: 'example.com'},
          via: 'user',
        },
        EventSource.WEBSOCKET,
      );

      expect(store.getState().meetingSeries).toEqual([]);
    } finally {
      amplify.unsubscribe(WebAppEvents.MEETING.DELETED, onMeetingDeleted);
    }
  });

  describe('syncMeetingByQualifiedId', () => {
    const otherDomainEntry = {
      ...meetingSeriesEntry,
      qualified_id: {id: 'meeting-id', domain: 'other.com'},
    };

    it('inserts the fetched meeting when no entry exists for its qualified id', async () => {
      const getMeeting = jest.fn().mockReturnValue(task.resolve(apiMeeting));
      const store = createMeetingStore(createDeps({getMeeting}));

      const result = await store.getState().syncMeetingByQualifiedId(apiMeeting.qualified_id);

      expect(unwrap(result)).toEqual({meeting: expect.objectContaining(meetingSeriesEntry), applied: true});
      expect(getMeeting).toHaveBeenCalledWith(apiMeeting.qualified_id);
      expect(store.getState().meetingSeries).toHaveLength(1);
      expect(store.getState().meetingSeries[0]).toMatchObject(meetingSeriesEntry);
    });

    it('replaces the existing entry for the same qualified id instead of duplicating it', async () => {
      const updatedApiMeeting = {...apiMeeting, title: 'Weekly sync (updated)'};
      const getMeeting = jest.fn().mockReturnValue(task.resolve(updatedApiMeeting));
      const store = createMeetingStore(createDeps({getMeeting}), {meetingSeries: [meetingSeriesEntry]});

      const result = await store.getState().syncMeetingByQualifiedId(apiMeeting.qualified_id);

      expect(unwrap(result).meeting.title).toBe('Weekly sync (updated)');
      expect(store.getState().meetingSeries).toHaveLength(1);
      expect(store.getState().meetingSeries[0]?.title).toBe('Weekly sync (updated)');
    });

    it('does not restore a locally removed meeting when an older sync finishes', async () => {
      let finishFetch: () => void = noop;
      const fetchGate = new Promise<void>(resolve => {
        finishFetch = resolve;
      });
      const getMeeting = jest.fn().mockReturnValue(
        task.tryOrElse(
          () => new Error('fetch failed'),
          async () => {
            await fetchGate;
            return apiMeeting;
          },
        ),
      );
      const store = createMeetingStore(createDeps({getMeeting}), {meetingSeries: [meetingSeriesEntry]});

      const pendingSync = store.getState().syncMeetingByQualifiedId(apiMeeting.qualified_id);
      store.getState().removeMeetingByQualifiedId(apiMeeting.qualified_id);
      finishFetch();

      const result = await pendingSync;

      expect(unwrap(result)).toEqual({meeting: expect.objectContaining(meetingSeriesEntry), applied: false});
      expect(store.getState().meetingSeries).toEqual([]);
    });

    it('leaves an entry with the same bare id in another domain untouched', async () => {
      const getMeeting = jest.fn().mockReturnValue(task.resolve(apiMeeting));
      const store = createMeetingStore(createDeps({getMeeting}), {meetingSeries: [otherDomainEntry]});

      const result = await store.getState().syncMeetingByQualifiedId(apiMeeting.qualified_id);

      expect(result.isOk).toBe(true);
      expect(store.getState().meetingSeries).toHaveLength(2);
      expect(store.getState().meetingSeries).toContainEqual(otherDomainEntry);
      expect(store.getState().meetingSeries.find(series => series.qualified_id.domain === 'example.com')).toEqual(
        expect.objectContaining(meetingSeriesEntry),
      );
    });

    it('preserves existing state and rejects with fetchFailed when fetching the meeting fails', async () => {
      const getMeeting = jest.fn().mockReturnValue(task.reject(new Error('network error')));
      const store = createMeetingStore(createDeps({getMeeting}), {meetingSeries: [meetingSeriesEntry]});

      const result = await store.getState().syncMeetingByQualifiedId(apiMeeting.qualified_id);

      expect(unwrapErr(result)).toBe('fetchFailed');
      expect(store.getState().meetingSeries).toEqual([meetingSeriesEntry]);
    });

    it('preserves existing state and rejects with mapFailed when the fetched meeting fails to map', async () => {
      const invalidApiMeeting = {...apiMeeting, start_time: 'not-a-date'};
      const getMeeting = jest.fn().mockReturnValue(task.resolve(invalidApiMeeting));
      const store = createMeetingStore(createDeps({getMeeting}), {meetingSeries: [meetingSeriesEntry]});

      const result = await store.getState().syncMeetingByQualifiedId(apiMeeting.qualified_id);

      expect(unwrapErr(result)).toBe('mapFailed');
      expect(store.getState().meetingSeries).toEqual([meetingSeriesEntry]);
    });
  });
});
