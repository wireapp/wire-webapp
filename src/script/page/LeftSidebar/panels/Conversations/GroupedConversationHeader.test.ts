/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import ko from 'knockout';

import {createRandomUuid} from 'Util/util';
import TestPage from 'Util/test/TestPage';

import GroupedConversationHeader, {GroupedConversationHeaderProps} from './GroupedConversationHeader';
import {ConversationLabel, LabelType} from '../../../../conversation/ConversationLabelRepository';
import {Conversation} from '../../../../entity/Conversation';

class GroupedConversationHeaderPage extends TestPage<GroupedConversationHeaderProps> {
  constructor(props?: GroupedConversationHeaderProps) {
    super(GroupedConversationHeader, props);
  }

  getUnreadBadge = () => this.get('span[data-uie-name="conversation-folder-badge"]');
}

describe('GroupedConversationHeader', () => {
  it('displays the unread badge', () => {
    const conversations = ko.observableArray([new Conversation(createRandomUuid())]);

    const conversationLabel: ConversationLabel = {
      conversations,
      id: createRandomUuid(),
      name: createRandomUuid(),
      type: LabelType.Custom,
    };

    const groupedConversationHeader = new GroupedConversationHeaderPage({
      conversationLabel,
      isOpen: false,
    });

    let unreadBadge = groupedConversationHeader.getUnreadBadge();
    expect(unreadBadge.exists()).toBe(false);

    const conversation: Partial<Conversation> = {hasUnread: ko.pureComputed(() => true)};
    conversationLabel.conversations.push(conversation as Conversation, conversation as Conversation);

    groupedConversationHeader.setProps({conversationLabel, isOpen: false});

    unreadBadge = groupedConversationHeader.getUnreadBadge();
    expect(unreadBadge.exists()).toBe(true);
    expect(unreadBadge.text()).toBe('2');
  });
});
