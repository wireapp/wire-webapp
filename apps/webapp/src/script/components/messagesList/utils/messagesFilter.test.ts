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

import {MemberMessage} from 'Repositories/entity/message/memberMessage';
import {ClientEvent} from 'Repositories/event/Client';
import {translateForTest} from 'Util/test/translateForTest';

import {filterMessages} from './messagesFilter';

describe('filterMessages', () => {
  it('keeps the first creation message and filters a later duplicate', () => {
    const firstMessage = new MemberMessage(translateForTest);
    firstMessage.id = 'first-creation';
    firstMessage.type = ClientEvent.CONVERSATION.GROUP_CREATION;
    const duplicateMessage = new MemberMessage(translateForTest);
    duplicateMessage.id = 'duplicate-creation';
    duplicateMessage.type = ClientEvent.CONVERSATION.GROUP_CREATION;

    expect(filterMessages([])).toEqual([]);
    expect(filterMessages([firstMessage])).toEqual([firstMessage]);
    expect(filterMessages([firstMessage, duplicateMessage])).toEqual([firstMessage]);
  });
});
