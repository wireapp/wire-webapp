/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import GroupList, {GroupListProps} from 'Components/GroupList';
import TestPage from 'Util/test/TestPage';
import {createRandomUuid, noop} from 'Util/util';
import {AssetRepository} from '../assets/AssetRepository';
import {Conversation} from '../entity/Conversation';
import {User} from '../entity/User';
import {Router} from '../router/Router';

class GroupListPage extends TestPage<GroupListProps> {
  constructor(props?: GroupListProps) {
    super(GroupList, props);
  }
  getGroupConversationItem = (groupId: string) => this.get(`[data-uie-name="item-group"][data-uie-uid="${groupId}"]`);
}

describe('GroupList', () => {
  const createConversation = (name: string, id = createRandomUuid()) => {
    const conversation = new Conversation(id);
    spyOn(conversation, 'display_name').and.returnValue(name);
    const userIds = [createRandomUuid(), createRandomUuid()];
    const users = userIds.map(id => new User(id));
    conversation.participating_user_ids.push(...userIds);
    conversation.participating_user_ets.push(...users);
    return conversation;
  };
  it('shows group list', () => {
    const groups = [createConversation('groupA'), createConversation('groupB')];
    const assetRepository: Partial<AssetRepository> = {};
    const router: Partial<Router> = {};

    const groupListPage = new GroupListPage({
      assetRepository: assetRepository as AssetRepository,
      click: noop,
      groups,
      router: router as Router,
    });
    expect(groupListPage.getGroupConversationItem(groups[0].id).exists()).toBe(true);
    expect(groupListPage.getGroupConversationItem(groups[1].id).exists()).toBe(true);
  });

  it('shows group list and navigates conversation on click', () => {
    const groups = [createConversation('groupA'), createConversation('groupB')];
    const assetRepository: Partial<AssetRepository> = {};
    const router: Partial<Router> = {
      navigate: jest.fn(),
    };

    const groupListPage = new GroupListPage({
      assetRepository: assetRepository as AssetRepository,
      click: noop,
      groups,
      router: router as Router,
    });

    expect(groupListPage.getGroupConversationItem(groups[0].id).exists()).toBe(true);
  });
});
