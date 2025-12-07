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

import {render, screen, fireEvent} from '@testing-library/react';
import ko from 'knockout';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {NOTIFICATION_STATE} from 'Repositories/conversation/NotificationSetting';
import {Conversation} from 'Repositories/entity/Conversation';
import {TestFactory} from 'test/helper/TestFactory';

import {Notifications} from './Notifications';

import {ViewModelRepositories} from '../../../view_model/MainViewModel';

const testFactory = new TestFactory();
let conversationRepository: ConversationRepository;

beforeAll(() => {
  testFactory.exposeConversationActors().then(factory => {
    conversationRepository = factory;
    return conversationRepository;
  });
});

const getDefaultParams = () => {
  return {
    onClose: jest.fn(),
    onGoBack: jest.fn(),
    repositories: {} as ViewModelRepositories,
  };
};

describe('Notifications', () => {
  it('has the correct input checked', () => {
    const conversation = new Conversation();
    Object.defineProperty(conversation, 'notificationState', {
      value: ko.observable(NOTIFICATION_STATE.MENTIONS_AND_REPLIES),
    });
    const defaultProps = getDefaultParams();
    render(<Notifications {...defaultProps} activeConversation={conversation} />);
    expect(screen.getByLabelText('notificationSettingsMentionsAndReplies')).toBeDefined();
  });

  it('sets the correct new value on the ative conversation', () => {
    const conversation = new Conversation();
    const conversationRepository = {
      setNotificationState: jest.fn(),
    } as Partial<ConversationRepository>;
    const defaultProps = getDefaultParams();
    render(
      <Notifications
        {...defaultProps}
        activeConversation={conversation}
        repositories={{conversation: conversationRepository} as unknown as ViewModelRepositories}
      />,
    );
    const input = screen.getByTestId(`preferences-options-notifications-${NOTIFICATION_STATE.MENTIONS_AND_REPLIES}`);
    fireEvent.click(input);
    expect(conversationRepository.setNotificationState).toHaveBeenCalledWith(
      conversation,
      NOTIFICATION_STATE.MENTIONS_AND_REPLIES,
    );
  });
});
