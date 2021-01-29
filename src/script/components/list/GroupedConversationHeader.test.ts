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
import {ConversationLabel, LabelType} from '../../conversation/ConversationLabelRepository';
import {Conversation} from '../../entity/Conversation';
import {ContentMessage} from '../../entity/message/ContentMessage';
import {User} from '../../entity/User';

class GroupedConversationHeaderPage extends TestPage<GroupedConversationHeaderProps> {
  constructor(props?: GroupedConversationHeaderProps) {
    super(GroupedConversationHeader, props);
  }

  getBadge = () => this.get('span[data-uie-name="conversation-folder-badge"]');
}

describe('GroupedConversationHeader', () => {
  it('displays the badge', () => {
    const conversations = ko.observableArray([new Conversation(createRandomUuid())]);

    const conversationLabel: ConversationLabel = {
      conversations,
      id: createRandomUuid(),
      name: createRandomUuid(),
      type: LabelType.Custom,
    };

    const groupedConversationHeader = new GroupedConversationHeaderPage({
      conversationLabel,
      isOpen: true,
    });

    let badgeSpan = groupedConversationHeader.getBadge();
    expect(badgeSpan.exists()).toBe(false);

    const message = new ContentMessage(createRandomUuid());
    message.visible(true);

    const unreadConversation = new Conversation(createRandomUuid());
    unreadConversation.selfUser(new User(createRandomUuid()));
    unreadConversation.add_message(message);
    conversationLabel.conversations.push(unreadConversation);

    badgeSpan = groupedConversationHeader.getBadge();
    expect(badgeSpan.exists()).toBe(true);
  });
});
