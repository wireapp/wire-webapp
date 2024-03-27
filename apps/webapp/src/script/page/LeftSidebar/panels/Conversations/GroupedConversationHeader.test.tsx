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

import {render} from '@testing-library/react';
import ko from 'knockout';
import {act} from 'react-dom/test-utils';

import {createUuid} from 'Util/uuid';

import {GroupedConversationHeader} from './GroupedConversationHeader';

import {ConversationLabel, LabelType} from '../../../../conversation/ConversationLabelRepository';
import {Conversation} from '../../../../entity/Conversation';

describe('GroupedConversationHeader', () => {
  it('displays the unread badge', () => {
    const conversations = ko.observableArray([new Conversation(createUuid())]);

    const conversationLabel: ConversationLabel = {
      conversations,
      id: createUuid(),
      name: createUuid(),
      type: LabelType.Custom,
    };

    const props = {
      conversationLabel,
      isOpen: false,
    };

    const {queryByTestId, rerender, getByText} = render(<GroupedConversationHeader {...props} />);

    expect(queryByTestId('conversation-folder-badge')).toBeNull();

    const conversation: Partial<Conversation> = {hasUnread: ko.pureComputed(() => true)};

    act(() => {
      conversationLabel.conversations.push(conversation as Conversation, conversation as Conversation);
    });

    props.conversationLabel = conversationLabel;
    rerender(<GroupedConversationHeader {...props} />);

    expect(getByText('2')).not.toBeNull();
  });
});
