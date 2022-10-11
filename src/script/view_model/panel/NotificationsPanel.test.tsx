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

import ko from 'knockout';

import NotificationsPanel from './NotificationsPanel';
import {ViewModelRepositories} from '../MainViewModel';
import {Conversation} from 'src/script/entity/Conversation';
import {NOTIFICATION_STATE} from 'src/script/conversation/NotificationSetting';
import {ConversationState} from 'src/script/conversation/ConversationState';
import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {render, fireEvent} from '@testing-library/react';

describe('NotificationsPanel', () => {
  const onGoBack = jest.fn();
  const onClose = jest.fn();

  it('has the correct input checked', () => {
    const conversation = new Conversation();
    Object.defineProperty(conversation, 'notificationState', {
      value: ko.observable(NOTIFICATION_STATE.MENTIONS_AND_REPLIES),
    });
    const conversationState = {
      activeConversation: ko.observable(conversation),
    } as ConversationState;
    const props = {
      conversationState,
      onClose,
      onGoBack,
      repositories: {} as ViewModelRepositories,
    };

    const {getByRole} = render(<NotificationsPanel {...props} />);

    const checkbox = getByRole('radio', {checked: true}) as HTMLInputElement;

    expect(checkbox.value).toEqual(NOTIFICATION_STATE.MENTIONS_AND_REPLIES.toString());
  });

  it('sets the correct new value on the ative conversation', () => {
    const conversation = new Conversation();
    const conversationState = {
      activeConversation: ko.observable(conversation),
    } as ConversationState;
    const conversationRepo = {
      setNotificationState: jest.fn(),
    } as Partial<ConversationRepository>;

    const props = {
      conversationState,
      onClose,
      onGoBack,
      repositories: {conversation: conversationRepo} as ViewModelRepositories,
    };

    const {getByLabelText} = render(<NotificationsPanel {...props} />);

    const mentionsRadioInput = getByLabelText('notificationSettingsMentionsAndReplies');

    fireEvent.click(mentionsRadioInput);

    expect(conversationRepo.setNotificationState).toHaveBeenCalledWith(
      conversation,
      NOTIFICATION_STATE.MENTIONS_AND_REPLIES,
    );
  });
});
