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

import {CONVERSATION_TYPE} from '@wireapp/api-client/src/conversation';
import GroupList, {GroupListProps} from './GroupList';
import TestPage from 'Util/test/TestPage';
import {createRandomUuid, noop} from 'Util/util';
import {AssetRepository} from '../../../../../assets/AssetRepository';
import {Conversation} from '../../../../../entity/Conversation';
import {User} from '../../../../../entity/User';
import {Router} from '../../../../../router/Router';
import type {QualifiedId} from '@wireapp/api-client/src/user/';

class GroupListPage extends TestPage<GroupListProps> {
  constructor(props?: GroupListProps) {
    super(GroupList, props);
  }
  getGroupConversationItem = (groupId: string) => this.get(`[data-uie-name="item-group"][data-uie-uid="${groupId}"]`);
  clickGroupConversationItem = (groupId: string) => this.click(this.getGroupConversationItem(groupId));
}

describe('GroupList', () => {
  const createGroupConversation = (name: string, id = createRandomUuid()) => {
    const conversation = new Conversation(id);
    const userIds: QualifiedId[] = [
      {
        domain: '',
        id: createRandomUuid(),
      },
      {
        domain: '',
        id: createRandomUuid(),
      },
    ];
    const users = userIds.map(userId => new User(userId.id, userId.domain));
    conversation.participating_user_ids.push(...userIds);
    conversation.participating_user_ets.push(...users);
    return conversation;
  };

  const create1on1Conversation = (name: string, id = createRandomUuid()) => {
    const conversation = createGroupConversation(name, id);
    conversation.type(CONVERSATION_TYPE.ONE_TO_ONE);
    return conversation;
  };

  it('shows group list', () => {
    const groups = [createGroupConversation('groupA'), create1on1Conversation('groupB')];
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
    const groups = [createGroupConversation('groupA'), create1on1Conversation('groupB')];
    const assetRepository: Partial<AssetRepository> = {};
    const router: Partial<Router> = {
      navigate: jest.fn(),
    };
    const onClickSpy = jest.fn();
    const groupListPage = new GroupListPage({
      assetRepository: assetRepository as AssetRepository,
      click: onClickSpy,
      groups,
      router: router as Router,
    });

    groupListPage.clickGroupConversationItem(groups[0].id);
    expect(router.navigate).toHaveBeenCalledWith(`/conversation/${groups[0].id}`);
    expect(onClickSpy).toHaveBeenCalledWith(groups[0]);

    groupListPage.clickGroupConversationItem(groups[1].id);
    expect(router.navigate).toHaveBeenCalledWith(`/conversation/${groups[1].id}`);
    expect(onClickSpy).toHaveBeenCalledWith(groups[1]);
  });
});
