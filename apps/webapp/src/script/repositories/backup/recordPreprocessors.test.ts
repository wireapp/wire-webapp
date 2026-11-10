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

import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

import {preprocessConversations} from './recordPreprocessors';

import {Conversation} from '../entity/Conversation';
import {translateForTest} from '../../util/test/translateForTest';

describe('preprocessConversations', () => {
  it('removes the device-local unread marker while preserving synchronized read state', () => {
    const conversation = new Conversation('conversation', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
    conversation.last_read_timestamp(500);
    conversation.manualUnreadTimestamp(100);

    const records = preprocessConversations([conversation.serialize()]);

    expect(records.at(0)).not.toHaveProperty('manual_unread_timestamp');
    expect(records.at(0)?.last_read_timestamp).toBe(500);
  });

  it('accepts existing records without a manual unread marker', () => {
    const conversation = new Conversation('conversation', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
    const originalRecord = conversation.serialize();

    const records = preprocessConversations([originalRecord]);

    expect(records).toEqual([originalRecord]);
    expect(records.at(0)).not.toHaveProperty('manual_unread_timestamp');
  });
});
