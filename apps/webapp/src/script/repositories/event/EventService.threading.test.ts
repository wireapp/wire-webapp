/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 */

import {ClientEvent} from 'Repositories/event/Client';
import {MessageCategory} from '../../message/MessageCategory';
import {StatusType} from '../../message/StatusType';

import {EventService} from './EventService';

import type {EventRecord} from '../storage';

type MutableEvent = Omit<EventRecord, 'primary_key' | 'category'> & Partial<Pick<EventRecord, 'primary_key' | 'category'>>;

const baseConversationId = 'conversation-1';
const baseFrom = 'user-1';

function createMessageEvent(overrides: Partial<MutableEvent> = {}): MutableEvent {
  return {
    conversation: baseConversationId,
    data: {content: 'hello', sender: baseFrom},
    from: baseFrom,
    id: `msg-${Math.random()}`,
    status: StatusType.SENT,
    time: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    type: ClientEvent.CONVERSATION.MESSAGE_ADD,
    ...overrides,
  } as MutableEvent;
}

function buildServiceWithStorage(initialRecords: EventRecord[] = []) {
  const records = [...initialRecords];

  const storageService = {
    db: undefined,
    getAll: jest.fn(async () => records),
    load: jest.fn(async (_store: string, primaryKey: string) => records.find(record => record.primary_key === primaryKey)),
    save: jest.fn(async (_store: string, _key: string | undefined, event: MutableEvent) => {
      const primaryKey = `${records.length + 1}`;
      const category = event.category ?? MessageCategory.TEXT;
      const savedRecord = {primary_key: primaryKey, ...event, category} as EventRecord;
      records.push(savedRecord);
      return primaryKey;
    }),
    update: jest.fn(async (_store: string, primaryKey: string, changes: Partial<EventRecord>) => {
      const index = records.findIndex(record => record.primary_key === primaryKey);
      if (index >= 0) {
        records[index] = {...records[index], ...changes};
        return 1;
      }
      return 0;
    }),
  };

  return {eventService: new EventService(storageService as any), records};
}

describe('EventService threading support', () => {
  it('infers deterministic thread root mapping for out-of-order threaded replies', async () => {
    const {eventService} = buildServiceWithStorage();

    const savedEvent = await eventService.saveEvent(
      createMessageEvent({id: 'reply-1', thread_id: 'root-1', thread_root_message_id: undefined, is_thread_reply: undefined}),
    );

    expect(savedEvent.thread_id).toBe('root-1');
    expect(savedEvent.thread_root_message_id).toBe('root-1');
    expect(savedEvent.is_thread_reply).toBe(true);
  });

  it('keeps main list loading stable by excluding thread replies', async () => {
    const records = [
      {
        ...createMessageEvent({id: 'main-1', time: '2026-01-01T00:00:00.000Z', thread_id: null, is_thread_reply: false}),
        category: MessageCategory.TEXT,
        primary_key: '1',
      },
      {
        ...createMessageEvent({id: 'reply-1', time: '2026-01-01T00:00:01.000Z', thread_id: 'root-1', is_thread_reply: true}),
        category: MessageCategory.TEXT,
        primary_key: '2',
      },
      {
        ...createMessageEvent({id: 'reply-2', time: '2026-01-01T00:00:02.000Z', thread_id: 'root-1', is_thread_reply: true}),
        category: MessageCategory.TEXT,
        primary_key: '3',
      },
    ] as EventRecord[];

    const {eventService} = buildServiceWithStorage(records);

    const precedingEvents = (await eventService.loadPrecedingEvents(baseConversationId)) as EventRecord[];
    const categorizedEvents = (await eventService.loadEventsWithCategory(
      baseConversationId,
      MessageCategory.TEXT,
    )) as EventRecord[];

    expect(precedingEvents.map(event => event.id)).toEqual(['main-1']);
    expect(categorizedEvents.map(event => event.id)).toEqual(['main-1']);
  });

  it('loads thread replies efficiently by conversation/thread/date', async () => {
    const records = [
      {
        ...createMessageEvent({id: 'reply-1', time: '2026-01-01T00:00:01.000Z', thread_id: 'root-1', is_thread_reply: true}),
        category: MessageCategory.TEXT,
        primary_key: '1',
      },
      {
        ...createMessageEvent({id: 'reply-2', time: '2026-01-01T00:00:02.000Z', thread_id: 'root-1', is_thread_reply: true}),
        category: MessageCategory.TEXT,
        primary_key: '2',
      },
      {
        ...createMessageEvent({id: 'reply-other', time: '2026-01-01T00:00:03.000Z', thread_id: 'root-2', is_thread_reply: true}),
        category: MessageCategory.TEXT,
        primary_key: '3',
      },
    ] as EventRecord[];

    const {eventService} = buildServiceWithStorage(records);
    const threadEvents = await eventService.loadThreadEvents(baseConversationId, 'root-1');

    expect(threadEvents.map(event => event.id)).toEqual(['reply-1', 'reply-2']);
  });

  it('keeps thread counters visibility-aware and consistent across updates', async () => {
    const {eventService, records} = buildServiceWithStorage();

    await eventService.saveEvent(
      createMessageEvent({id: 'reply-visible', thread_id: 'root-1', thread_root_message_id: 'root-1', is_thread_reply: true}),
    );
    await eventService.saveEvent(
      createMessageEvent({
        id: 'reply-hidden',
        thread_id: 'root-1',
        thread_root_message_id: 'root-1',
        is_thread_reply: true,
        ephemeral_expires: true,
      }),
    );

    expect(await eventService.countVisibleThreadReplies(baseConversationId, 'root-1')).toBe(1);

    const visibleReply = records.find(record => record.id === 'reply-visible');
    if (!visibleReply) {
      throw new Error('Expected visible reply to exist');
    }

    await eventService.updateEvent(visibleReply.primary_key, {ephemeral_expires: true});

    expect(await eventService.countVisibleThreadReplies(baseConversationId, 'root-1')).toBe(0);
  });

  it('preserves thread projection on id replacement (pending to sent)', async () => {
    const {eventService} = buildServiceWithStorage();

    const pending = await eventService.saveEvent(
      createMessageEvent({id: 'pending-id', thread_id: 'root-1', thread_root_message_id: 'root-1', is_thread_reply: true}),
    );

    await eventService.updateEvent(pending.primary_key, {id: 'sent-id', status: StatusType.SENT});

    expect(await eventService.countVisibleThreadReplies(baseConversationId, 'root-1')).toBe(1);

    const threadEvents = await eventService.loadThreadEvents(baseConversationId, 'root-1');
    expect(threadEvents.map(event => event.id)).toEqual(['sent-id']);
  });
});
