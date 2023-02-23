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

import {SUBCONVERSATION_ID} from '@wireapp/api-client/lib/conversation';

import {subconversationGroupIdStore} from './subconversationGroupIdStore';

describe('subconversationGroupIdMapper', () => {
  it('returns empty groupId if conversation is not known', () => {
    const groupId = subconversationGroupIdStore.getGroupId(
      {domain: 'example.com', id: '123'},
      SUBCONVERSATION_ID.CONFERENCE,
    );
    expect(groupId).toBeUndefined();
  });

  it('returns the stored groupId', () => {
    const conversationId = {domain: 'example.com', id: '123'};
    const subconversation = SUBCONVERSATION_ID.CONFERENCE;
    const groupId = 'groupID';
    subconversationGroupIdStore.storeGroupId(conversationId, subconversation, groupId);

    const result = subconversationGroupIdStore.getGroupId(conversationId, subconversation);
    expect(result).toBe(groupId);
  });

  it('removes groupId from the store', () => {
    const conversationId = {domain: 'example.com', id: '123'};
    const subconversation = SUBCONVERSATION_ID.CONFERENCE;
    const groupId = 'groupID';
    subconversationGroupIdStore.storeGroupId(conversationId, subconversation, groupId);

    expect(subconversationGroupIdStore.getGroupId(conversationId, subconversation)).toEqual(groupId);
    subconversationGroupIdStore.removeGroupId(conversationId, subconversation);

    expect(subconversationGroupIdStore.getGroupId(conversationId, subconversation)).toBeUndefined();
  });

  it('retrieves all entries from the store by subconversation id', () => {
    const conversationId = {domain: 'example.com', id: '123'};
    const subconversation = SUBCONVERSATION_ID.CONFERENCE;
    const groupId = 'groupID';

    const conversationId2 = {domain: 'example2.com', id: '1234'};
    const subconversation2 = SUBCONVERSATION_ID.CONFERENCE;
    const groupId2 = 'groupID2';

    const conversationId3 = {domain: 'example3.com', id: '12345'};
    const subconversation3 = 'none' as SUBCONVERSATION_ID;
    const groupId3 = 'groupID3';

    subconversationGroupIdStore.storeGroupId(conversationId, subconversation, groupId);
    subconversationGroupIdStore.storeGroupId(conversationId2, subconversation2, groupId2);
    subconversationGroupIdStore.storeGroupId(conversationId3, subconversation3, groupId3);

    const result = subconversationGroupIdStore.getAllGroupIdsBySubconversationId(SUBCONVERSATION_ID.CONFERENCE);
    expect(result).toEqual([
      {
        parentConversation: conversationId,
        subconversation: subconversation,
        subconversationGroupId: groupId,
      },
      {
        parentConversation: conversationId2,
        subconversation: subconversation2,
        subconversationGroupId: groupId2,
      },
    ]);
  });
});
