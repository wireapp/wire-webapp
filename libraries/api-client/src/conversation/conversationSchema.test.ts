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

import {ADD_PERMISSION, CONVERSATION_ACCESS, CONVERSATION_CELLS_STATE, CONVERSATION_TYPE} from './conversation';
import {conversationSchema} from './conversationSchema';
import {CONVERSATION_PROTOCOL} from '../team';

describe('conversationSchema', () => {
  const validConversation = {
    qualified_id: {id: 'conversation-id', domain: 'example.com'},
    creator: 'creator-id',
    type: CONVERSATION_TYPE.REGULAR,
    access: [CONVERSATION_ACCESS.INVITE, CONVERSATION_ACCESS.PRIVATE],
    access_role: 'activated',
    cells_state: CONVERSATION_CELLS_STATE.READY,
    protocol: CONVERSATION_PROTOCOL.MLS,
    members: {
      self: {
        id: 'creator-id',
        conversation_role: 'wire_admin',
        hidden: false,
        hidden_ref: null,
        otr_archived: false,
        otr_archived_ref: null,
        otr_muted_ref: null,
        otr_muted_status: null,
        service: null,
        status_ref: '0.0',
        status_time: '1970-01-01T00:00:00.000Z',
      },
      others: [],
    },
  };

  it('accepts null add_permission on canonical conversation responses', () => {
    const result = conversationSchema.safeParse({
      ...validConversation,
      add_permission: null,
    });

    expect(result.success).toBe(true);

    if (!result.success) {
      throw new Error('Expected canonical conversation schema parse to succeed');
    }

    expect(result.data.add_permission).toBeUndefined();
  });

  it('accepts add_permission values on canonical conversation responses', () => {
    const result = conversationSchema.safeParse({
      ...validConversation,
      add_permission: ADD_PERMISSION.ADMINS,
    });

    expect(result.success).toBe(true);

    if (!result.success) {
      throw new Error('Expected canonical conversation schema parse to succeed');
    }

    expect(result.data.add_permission).toBe(ADD_PERMISSION.ADMINS);
  });
});
