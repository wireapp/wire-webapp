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

import {type EntryPayload} from '../domain/EntryTypes';

describe('EntryTypes', () => {
  it('should have report entry type', () => {
    const report: EntryPayload = {
      type: 'report',
      participants: [{id: 'u1', domain: 'wire.com', handle: 'alice', name: 'Alice'}],
      description: 'Summary of Q1 planning',
      start: '2025-01-01T00:00:00Z',
      end: '2025-03-31T23:59:59Z',
    };
    expect(report.type).toBe('report');
  });

  it('should have todo entry type', () => {
    const todo: EntryPayload = {
      type: 'todo',
      title: 'Write tests',
      description: 'Cover the domain layer',
      created_at: '2025-05-01T10:00:00Z',
    };
    expect(todo.type).toBe('todo');
  });

  it('should have ticket entry type', () => {
    const ticket: EntryPayload = {
      type: 'ticket',
      title: 'Fix login bug',
      description: 'Users cannot log in on mobile',
      created_at: '2025-05-02T09:00:00Z',
    };
    expect(ticket.type).toBe('ticket');
  });
});
