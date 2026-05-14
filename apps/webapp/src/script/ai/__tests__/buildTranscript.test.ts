import {describe, it, expect} from '@jest/globals';
import {buildTranscriptLines, INCLUDED_EVENT_TYPES, TranscriptLine} from '../transcript';
import type {EventRecord} from 'Repositories/storage/record/EventRecord';
import type {Conversation} from 'Repositories/entity/Conversation';

const makeEvent = (overrides: Partial<EventRecord>): EventRecord => {
  return {
    primary_key: 'pk',
    category: 0,
    type: 'conversation.message-add',
    time: new Date().toISOString(),
    from: 'user-001',
    data: {content: 'hello'},
    conversation: 'conv-001',
    ...overrides,
  } as unknown as EventRecord;
};

const makeConversation = (
  users: Array<{id: string; handle: string; name: string}>,
): Conversation => {
  return {
    participating_user_ets: () =>
      users.map(u => ({
        id: u.id,
        handle: u.handle,
        name: () => u.name,
      })) as any,
  } as unknown as Conversation;
};

describe('buildTranscriptLines', () => {
  describe('unknown-user test case', () => {
    it('should format unknown user with @unknown(<8-char-id>)', () => {
      const event = makeEvent({
        from: 'abcdef1234567890',
        type: 'conversation.message-add',
        data: {content: 'hello'},
      });
      const conversation = makeConversation([]);

      const lines = buildTranscriptLines(conversation, [event]);

      expect(lines).toHaveLength(1);
      expect(lines[0].text).toContain('@unknown(abcdef12)');
    });

    it('should format user with empty handle but truthy name', () => {
      const event = makeEvent({
        from: 'user-123',
        type: 'conversation.message-add',
        data: {content: 'hello'},
      });
      const conversation = makeConversation([{id: 'user-123', handle: '', name: 'Alice'}]);

      const lines = buildTranscriptLines(conversation, [event]);

      expect(lines).toHaveLength(1);
      expect(lines[0].text).toContain('Alice');
      expect(lines[0].text).not.toContain('@alice');
    });

    it('should format user with truthy handle', () => {
      const event = makeEvent({
        from: 'user-456',
        type: 'conversation.message-add',
        data: {content: 'hello'},
      });
      const conversation = makeConversation([{id: 'user-456', handle: 'alice', name: 'Alice Name'}]);

      const lines = buildTranscriptLines(conversation, [event]);

      expect(lines).toHaveLength(1);
      expect(lines[0].text).toContain('@alice');
    });
  });

  describe('system event framing test case', () => {
    it('should format member-join with -- framing', () => {
      const event = makeEvent({
        from: 'user-A',
        type: 'conversation.member-join',
        data: {user_ids: ['user-B']},
      });
      const conversation = makeConversation([
        {id: 'user-A', handle: 'alice', name: 'Alice'},
        {id: 'user-B', handle: 'bob', name: 'Bob'},
      ]);

      const lines = buildTranscriptLines(conversation, [event]);

      expect(lines).toHaveLength(1);
      expect(lines[0].text).toContain('-- @alice added @bob --');
      expect(lines[0].isSystem).toBe(true);
    });

    it('should format member-leave with -- framing', () => {
      const event = makeEvent({
        from: 'user-A',
        type: 'conversation.member-leave',
        data: {user_ids: ['user-B']},
      });
      const conversation = makeConversation([
        {id: 'user-A', handle: 'alice', name: 'Alice'},
        {id: 'user-B', handle: 'bob', name: 'Bob'},
      ]);

      const lines = buildTranscriptLines(conversation, [event]);

      expect(lines).toHaveLength(1);
      expect(lines[0].text).toContain('-- @alice removed @bob --');
      expect(lines[0].isSystem).toBe(true);
    });

    it('should format rename event with conversation name', () => {
      const event = makeEvent({
        from: 'user-A',
        type: 'conversation.rename',
        data: {name: 'New Room Name'},
      });
      const conversation = makeConversation([{id: 'user-A', handle: 'alice', name: 'Alice'}]);

      const lines = buildTranscriptLines(conversation, [event]);

      expect(lines).toHaveLength(1);
      expect(lines[0].text).toContain('renamed conversation to "New Room Name"');
      expect(lines[0].isSystem).toBe(true);
    });

    it('should format message-delete event', () => {
      const event = makeEvent({
        from: 'user-A',
        type: 'conversation.message-delete',
        data: {},
      });
      const conversation = makeConversation([{id: 'user-A', handle: 'alice', name: 'Alice'}]);

      const lines = buildTranscriptLines(conversation, [event]);

      expect(lines).toHaveLength(1);
      expect(lines[0].text).toContain('deleted a message --');
      expect(lines[0].isSystem).toBe(true);
    });
  });

  describe('asset-add test case', () => {
    it('should format asset-add with filename', () => {
      const event = makeEvent({
        from: 'user-1',
        type: 'conversation.asset-add',
        data: {info: {name: 'report.pdf'}},
      });
      const conversation = makeConversation([{id: 'user-1', handle: 'carol', name: 'Carol'}]);

      const lines = buildTranscriptLines(conversation, [event]);

      expect(lines).toHaveLength(1);
      expect(lines[0].text).toContain('[attachment: report.pdf]');
      expect(lines[0].isSystem).toBe(false);
    });

    it('should use fallback filename when not provided', () => {
      const event = makeEvent({
        from: 'user-1',
        type: 'conversation.asset-add',
        data: {},
      });
      const conversation = makeConversation([{id: 'user-1', handle: 'carol', name: 'Carol'}]);

      const lines = buildTranscriptLines(conversation, [event]);

      expect(lines).toHaveLength(1);
      expect(lines[0].text).toContain('[attachment: file]');
      expect(lines[0].isSystem).toBe(false);
    });
  });

  describe('allow-list enforcement test case', () => {
    it('should exclude conversation.reaction events', () => {
      const reactionEvent = makeEvent({
        type: 'conversation.reaction' as any,
      });
      const messageEvent = makeEvent({
        type: 'conversation.message-add',
      });
      const conversation = makeConversation([{id: 'user-001', handle: 'alice', name: 'Alice'}]);

      const lines = buildTranscriptLines(conversation, [reactionEvent, messageEvent]);

      expect(lines).toHaveLength(1);
      expect(lines[0].text).toContain('hello');
    });

    it('should exclude conversation.typing events', () => {
      const typingEvent = makeEvent({
        type: 'conversation.typing' as any,
      });
      const messageEvent = makeEvent({
        type: 'conversation.message-add',
      });
      const conversation = makeConversation([{id: 'user-001', handle: 'alice', name: 'Alice'}]);

      const lines = buildTranscriptLines(conversation, [typingEvent, messageEvent]);

      expect(lines).toHaveLength(1);
    });

    it('should exclude conversation.delivery events', () => {
      const deliveryEvent = makeEvent({
        type: 'conversation.delivery' as any,
      });
      const messageEvent = makeEvent({
        type: 'conversation.message-add',
      });
      const conversation = makeConversation([{id: 'user-001', handle: 'alice', name: 'Alice'}]);

      const lines = buildTranscriptLines(conversation, [deliveryEvent, messageEvent]);

      expect(lines).toHaveLength(1);
    });

    it('should exclude conversation.read events', () => {
      const readEvent = makeEvent({
        type: 'conversation.read' as any,
      });
      const messageEvent = makeEvent({
        type: 'conversation.message-add',
      });
      const conversation = makeConversation([{id: 'user-001', handle: 'alice', name: 'Alice'}]);

      const lines = buildTranscriptLines(conversation, [readEvent, messageEvent]);

      expect(lines).toHaveLength(1);
    });

    it('should verify reaction is not in INCLUDED_EVENT_TYPES', () => {
      expect(INCLUDED_EVENT_TYPES.has('conversation.reaction')).toBe(false);
    });
  });

  describe('ascending-sort test case', () => {
    it('should sort events ascending by time', () => {
      const time1 = new Date('2024-01-01T12:00:00Z').toISOString();
      const time2 = new Date('2024-01-01T11:00:00Z').toISOString();
      const time3 = new Date('2024-01-01T13:00:00Z').toISOString();

      const event1 = makeEvent({from: 'user-1', time: time3, data: {content: 'third'}});
      const event2 = makeEvent({from: 'user-2', time: time1, data: {content: 'first'}});
      const event3 = makeEvent({from: 'user-3', time: time2, data: {content: 'second'}});

      const conversation = makeConversation([
        {id: 'user-1', handle: 'a', name: 'A'},
        {id: 'user-2', handle: 'b', name: 'B'},
        {id: 'user-3', handle: 'c', name: 'C'},
      ]);

      const lines = buildTranscriptLines(conversation, [event1, event2, event3]);

      expect(lines).toHaveLength(3);
      expect(lines[0].time.getTime()).toBeLessThan(lines[1].time.getTime());
      expect(lines[1].time.getTime()).toBeLessThan(lines[2].time.getTime());
      expect(lines[0].text).toContain('second');
      expect(lines[1].text).toContain('first');
      expect(lines[2].text).toContain('third');
    });
  });

  describe('edited message suffix test case', () => {
    it('should append (edited) when edited_time is present', () => {
      const event = makeEvent({
        from: 'user-001',
        type: 'conversation.message-add',
        data: {content: 'Hello world', edited_time: '2024-01-01T12:30:00.000Z'},
      });
      const conversation = makeConversation([{id: 'user-001', handle: 'alice', name: 'Alice'}]);

      const lines = buildTranscriptLines(conversation, [event]);

      expect(lines).toHaveLength(1);
      expect(lines[0].text).toContain('Hello world (edited)');
    });

    it('should not append (edited) when edited_time is absent', () => {
      const event = makeEvent({
        from: 'user-001',
        type: 'conversation.message-add',
        data: {content: 'No edit'},
      });
      const conversation = makeConversation([{id: 'user-001', handle: 'alice', name: 'Alice'}]);

      const lines = buildTranscriptLines(conversation, [event]);

      expect(lines).toHaveLength(1);
      expect(lines[0].text).toContain('No edit');
      expect(lines[0].text).not.toContain('(edited)');
    });
  });

  describe('transcriptLinesToString test case', () => {
    it('should join lines with newline separator', () => {
      const line1: TranscriptLine = {time: new Date(), text: 'line-one', isSystem: false};
      const line2: TranscriptLine = {time: new Date(), text: 'line-two', isSystem: false};

      const result = transcriptLinesToString([line1, line2]);

      expect(result).toBe('line-one\nline-two');
    });

    it('should return empty string for empty array', () => {
      const result = transcriptLinesToString([]);

      expect(result).toBe('');
    });
  });

  describe('integration test', () => {
    it('should handle mixed event types correctly', () => {
      const events = [
        makeEvent({
          from: 'alice-id',
          type: 'conversation.message-add',
          time: new Date('2024-01-01T10:00:00Z').toISOString(),
          data: {content: 'Hello'},
        }),
        makeEvent({
          from: 'bob-id',
          type: 'conversation.member-join',
          time: new Date('2024-01-01T10:01:00Z').toISOString(),
          data: {user_ids: ['charlie-id']},
        }),
        makeEvent({
          from: 'alice-id',
          type: 'conversation.message-add',
          time: new Date('2024-01-01T10:02:00Z').toISOString(),
          data: {content: 'How are you?', edited_time: '2024-01-01T10:05:00Z'},
        }),
      ];

      const conversation = makeConversation([
        {id: 'alice-id', handle: 'alice', name: 'Alice'},
        {id: 'bob-id', handle: 'bob', name: 'Bob'},
        {id: 'charlie-id', handle: 'charlie', name: 'Charlie'},
      ]);

      const lines = buildTranscriptLines(conversation, events);

      expect(lines).toHaveLength(3);
      expect(lines[0].isSystem).toBe(false);
      expect(lines[0].text).toContain('Hello');
      expect(lines[1].isSystem).toBe(true);
      expect(lines[1].text).toContain('added @charlie');
      expect(lines[2].isSystem).toBe(false);
      expect(lines[2].text).toContain('How are you? (edited)');
    });
  });
});

// Import transcriptLinesToString for the last test
import {transcriptLinesToString} from '../transcript';
