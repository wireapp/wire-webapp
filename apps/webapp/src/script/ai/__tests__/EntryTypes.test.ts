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

import {
  ReportPayloadSchema,
  TodoPayloadSchema,
  TicketPayloadSchema,
  FinalEntrySchema,
  SubReportToolArgsSchema,
  EntryPayloadSchema,
} from '../domain/EntryTypes';
import zodToJsonSchema from 'zod-to-json-schema';

describe('ReportPayloadSchema', () => {
  it('parses a valid report payload', () => {
    const result = ReportPayloadSchema.parse({
      type: 'report',
      participants: [
        {
          id: 'u1',
          domain: 'wire.com',
          handle: 'alice',
          name: 'Alice',
        },
      ],
      description: 'Summary of Q1 planning',
      start: '2025-01-01T00:00:00Z',
      end: '2025-03-31T23:59:59Z',
    });
    expect(result.type).toBe('report');
    expect(result.participants.length).toBe(1);
  });
});

describe('TodoPayloadSchema', () => {
  it('parses a valid todo payload', () => {
    const result = TodoPayloadSchema.parse({
      type: 'todo',
      title: 'Write tests',
      description: 'Cover the domain layer',
      created_at: '2025-05-01T10:00:00Z',
    });
    expect(result.type).toBe('todo');
  });
});

describe('TicketPayloadSchema', () => {
  it('parses a valid ticket payload', () => {
    const result = TicketPayloadSchema.parse({
      type: 'ticket',
      title: 'Fix login bug',
      description: 'Users cannot log in on mobile',
      created_at: '2025-05-02T09:00:00Z',
    });
    expect(result.type).toBe('ticket');
  });
});

describe('FinalEntrySchema', () => {
  it('parses a final report entry with report payload', () => {
    const result = FinalEntrySchema.parse({
      type: 'report',
      participants: [
        {
          id: 'u1',
          domain: 'wire.com',
          handle: 'alice',
          name: 'Alice',
        },
      ],
      description: 'Summary of Q1 planning',
      start: '2025-01-01T00:00:00Z',
      end: '2025-03-31T23:59:59Z',
      conversation_ids: ['conv-1'],
    });
    expect(result.conversation_ids.length).toBe(1);
  });

  it('parses a final report entry with todo payload', () => {
    const result = FinalEntrySchema.parse({
      type: 'todo',
      title: 'Write tests',
      description: 'Cover the domain layer',
      created_at: '2025-05-01T10:00:00Z',
      conversation_ids: ['conv-1'],
    });
    expect(result.conversation_ids.length).toBe(1);
  });

  it('parses a final report entry with ticket payload', () => {
    const result = FinalEntrySchema.parse({
      type: 'ticket',
      title: 'Fix login bug',
      description: 'Users cannot log in on mobile',
      created_at: '2025-05-02T09:00:00Z',
      conversation_ids: ['conv-1'],
    });
    expect(result.conversation_ids.length).toBe(1);
  });
});

describe('EntryPayloadSchema rejection cases', () => {
  it('rejects a report payload missing the type discriminator', () => {
    const result = ReportPayloadSchema.safeParse({
      participants: [],
      description: 'x',
      start: '2025-01-01T00:00:00Z',
      end: '2025-01-01T00:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an entry payload with only participants field', () => {
    const result = EntryPayloadSchema.safeParse({
      participants: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('Date field type validation', () => {
  it('rejects non-string created_at in TodoPayloadSchema', () => {
    const result = TodoPayloadSchema.safeParse({
      type: 'todo',
      title: 'x',
      description: 'y',
      created_at: 12345,
    });
    expect(result.success).toBe(false);
  });

  it('rejects null created_at in TicketPayloadSchema', () => {
    const result = TicketPayloadSchema.safeParse({
      type: 'ticket',
      title: 'x',
      description: 'y',
      created_at: null,
    });
    expect(result.success).toBe(false);
  });
});

describe('Cross-type field pollution', () => {
  it('strips unknown fields from cross-type pollution', () => {
    const result = TodoPayloadSchema.safeParse({
      type: 'todo',
      title: 'x',
      description: 'y',
      created_at: '2025-01-01T00:00:00Z',
      participants: [],
      start: '2025-01-01T00:00:00Z',
      end: '2025-01-01T00:00:00Z',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.participants).toBeUndefined();
    }
  });
});

describe('FinalEntrySchema conversation_ids validation', () => {
  it('rejects empty conversation_ids array', () => {
    const result = FinalEntrySchema.safeParse({
      type: 'todo',
      title: 'x',
      description: 'y',
      created_at: '2025-01-01T00:00:00Z',
      conversation_ids: [],
    });
    expect(result.success).toBe(false);
  });

  it('accepts non-empty conversation_ids array', () => {
    const result = FinalEntrySchema.safeParse({
      type: 'todo',
      title: 'x',
      description: 'y',
      created_at: '2025-01-01T00:00:00Z',
      conversation_ids: ['conv-1'],
    });
    expect(result.success).toBe(true);
  });
});

describe('zodToJsonSchema shape test', () => {
  it('produces discriminated union with three oneOf variants', () => {
    const schema = zodToJsonSchema(SubReportToolArgsSchema);
    expect(schema.properties.entries.items.anyOf).toHaveLength(3);
  });
});
