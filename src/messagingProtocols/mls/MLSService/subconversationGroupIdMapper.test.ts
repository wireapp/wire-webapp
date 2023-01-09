/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {getGroupId, storeSubconversationGroupId} from './subconversationGroupIdMapper';

describe('subconversationGroupIdMapper', () => {
  it('returns empty groupId if conversation is not known', () => {
    const groupId = getGroupId({domain: 'example.com', id: '123'}, 'subconversation');
    expect(groupId).toBeUndefined();
  });

  it('returns the stored groupId', () => {
    const conversationId = {domain: 'example.com', id: '123'};
    const subconversation = 'subconversation';
    const groupId = 'groupID';
    storeSubconversationGroupId(conversationId, subconversation, groupId);

    const result = getGroupId({domain: 'example.com', id: '123'}, 'subconversation');
    expect(result).toBe(groupId);
  });
});
