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

import type {Conversation} from 'Repositories/entity/Conversation';
import type {EventRecord} from 'Repositories/storage/record/EventRecord';

import {buildTranscriptLines, transcriptLinesToString} from '../transcript/buildTranscript';

// Minimal event shape for test fixtures
interface MockEvent {
  type: string;
  from: string;
  time: string;
  data: unknown;
  conversation: string;
}

// Builds a mock Conversation with a small participant roster
const makeMockConversation = (
  participants: Array<{id: string; handle: string; name: string}>,
): Conversation => {
  return {
    participating_user_ets: () =>
      participants.map(p => ({
        id: p.id,
        handle: p.handle,
        name: () => p.name,
      })),
  } as unknown as Conversation;
};

// Casts a MockEvent to EventRecord so the source type matches
const asEvent = (e: MockEvent): EventRecord => e as unknown as EventRecord;

describe('buildTranscriptLines', () => {
  const conversation = makeMockConversation([
    {id: 'user-alice', handle: 'alice', name: 'Alice'},
    {id: 'user-bob', handle: 'bob', name: 'Bob'},
  ]);

  it('formats conversation.message-add events as [YYYY-MM-DD HH:mm] @handle: text', () => {
    const events: MockEvent[] = [
      {
        type: 'conversation.message-add',
        from: 'user-alice',
        time: '2025-05-01T10:30:00.000Z',
        data: {content: 'Hello world'},
        conversation: 'conv-1',
      },
    ];

    const lines = buildTranscriptLines(conversation, events.map(asEvent));

    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('[2025-05-01 10:30] @alice: Hello world');
    expect(lines[0].isSystem).toBe(false);
  });

  it('formats conversation.asset-add events as [attachment: filename]', () => {
    const events: MockEvent[] = [
      {
        type: 'conversation.asset-add',
        from: 'user-bob',
        time: '2025-05-01T11:00:00.000Z',
        data: {info: {name: 'report.pdf'}},
        conversation: 'conv-1',
      },
    ];

    const lines = buildTranscriptLines(conversation, events.map(asEvent));

    expect(lines).toHaveLength(1);
    expect(lines[0].text).toContain('[attachment: report.pdf]');
    expect(lines[0].isSystem).toBe(false);
  });

  it('formats conversation.member-join events as a system message with --', () => {
    const events: MockEvent[] = [
      {
        type: 'conversation.member-join',
        from: 'user-alice',
        time: '2025-05-01T09:00:00.000Z',
        data: {user_ids: ['user-bob']},
        conversation: 'conv-1',
      },
    ];

    const lines = buildTranscriptLines(conversation, events.map(asEvent));

    expect(lines).toHaveLength(1);
    expect(lines[0].text).toMatch(/^.*--.*--.*$/);
    expect(lines[0].text).toContain('@alice');
    expect(lines[0].text).toContain('@bob');
    expect(lines[0].isSystem).toBe(true);
  });

  it('filters out unknown event types like conversation.connection-request', () => {
    const events: MockEvent[] = [
      {
        type: 'conversation.connection-request',
        from: 'user-alice',
        time: '2025-05-01T08:00:00.000Z',
        data: {},
        conversation: 'conv-1',
      },
    ];

    const lines = buildTranscriptLines(conversation, events.map(asEvent));

    expect(lines).toHaveLength(0);
  });

  it('sorts lines by timestamp ascending regardless of input order', () => {
    const events: MockEvent[] = [
      {
        type: 'conversation.message-add',
        from: 'user-bob',
        time: '2025-05-01T12:00:00.000Z',
        data: {content: 'Later message'},
        conversation: 'conv-1',
      },
      {
        type: 'conversation.message-add',
        from: 'user-alice',
        time: '2025-05-01T08:00:00.000Z',
        data: {content: 'Earlier message'},
        conversation: 'conv-1',
      },
    ];

    const lines = buildTranscriptLines(conversation, events.map(asEvent));

    expect(lines).toHaveLength(2);
    expect(lines[0].time.getTime()).toBeLessThan(lines[1].time.getTime());
    expect(lines[0].text).toContain('Earlier message');
    expect(lines[1].text).toContain('Later message');
  });

  it('falls back to @unknown when the sender is not in the participant list', () => {
    const events: MockEvent[] = [
      {
        type: 'conversation.message-add',
        from: 'unknown-user-id-xyz',
        time: '2025-05-01T10:00:00.000Z',
        data: {content: 'Ghost message'},
        conversation: 'conv-1',
      },
    ];

    const lines = buildTranscriptLines(conversation, events.map(asEvent));

    expect(lines[0].text).toContain('@unknown(');
  });
});

describe('transcriptLinesToString', () => {
  it('joins transcript lines with newlines', () => {
    const conversation = makeMockConversation([{id: 'u1', handle: 'alice', name: 'Alice'}]);
    const events: MockEvent[] = [
      {
        type: 'conversation.message-add',
        from: 'u1',
        time: '2025-05-01T10:00:00.000Z',
        data: {content: 'First'},
        conversation: 'conv-1',
      },
      {
        type: 'conversation.message-add',
        from: 'u1',
        time: '2025-05-01T10:01:00.000Z',
        data: {content: 'Second'},
        conversation: 'conv-1',
      },
    ];

    const lines = buildTranscriptLines(conversation, events.map(asEvent));
    const str = transcriptLinesToString(lines);

    expect(str).toContain('\n');
    const parts = str.split('\n');
    expect(parts).toHaveLength(2);
    expect(parts[0]).toContain('First');
    expect(parts[1]).toContain('Second');
  });

  it('returns an empty string for an empty lines array', () => {
    expect(transcriptLinesToString([])).toBe('');
  });
});
