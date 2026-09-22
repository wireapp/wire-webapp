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

import {act, fireEvent, render, screen} from '@testing-library/react';
import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import {ThemeProvider} from '@wireapp/react-ui-kit';
import {container} from 'tsyringe';

import {User} from 'Repositories/entity/User';
import {Conversation} from 'Repositories/entity/Conversation';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {UserState} from 'Repositories/user/userState';
import {setStrings, translate} from 'Util/localizerUtil';
import en from 'I18n/en-US.json';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
  requireValueForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {MeetingParticipants} from './meetingParticipants';

const qualifiedConversation: QualifiedId = {id: 'conversation-id', domain: 'example.com'};
const qualifiedCreator: QualifiedId = {id: 'creator-id', domain: 'example.com'};
const qualifiedSelf: QualifiedId = {id: 'self-id', domain: 'example.com'};
const specialCharacterName = `Eldon Bauch ±§!@#{}[]:"|;'\\<>?,./$%^&*()`;

describe('MeetingParticipants', () => {
  it('preserves special characters in the organizer tooltip', () => {
    setStrings({en});
    const userState = container.resolve(UserState);
    const conversationState = container.resolve(ConversationState);
    const previousUsers = userState.users();
    const previousSelf = userState.self();
    const previousConversations = conversationState.conversations();
    const organizer = new User(qualifiedCreator.id, qualifiedCreator.domain, translate);
    organizer.name(specialCharacterName);
    const selfUser = new User('self-id', 'example.com', translate);
    const conversation = new Conversation(
      qualifiedConversation.id,
      qualifiedConversation.domain,
      CONVERSATION_PROTOCOL.PROTEUS,
      translate,
    );
    conversation.participating_user_ets([organizer]);
    userState.self(selfUser);
    userState.users([organizer]);
    conversationState.conversations([conversation]);
    const appRoot = document.createElement('div');
    appRoot.id = 'wire-app';
    document.body.appendChild(appRoot);

    try {
      const rendered = render(
        <ThemeProvider>
          <MeetingParticipants qualifiedConversation={qualifiedConversation} qualifiedCreator={qualifiedCreator} />
        </ThemeProvider>,
        {wrapper: createRootProviderWrapperForTest(createRootContextValueForTest({translate}))},
      );

      const avatar = screen.getByLabelText(`${specialCharacterName} (Organizer)`);
      expect(avatar).toBeInTheDocument();
      const tooltipWrapper = avatar.closest('[data-testid="tooltip-wrapper"]');
      expect(tooltipWrapper).toBeInTheDocument();
      fireEvent.mouseEnter(requireValueForTest(tooltipWrapper));
      expect(document.querySelector('[data-testid="tooltip-content"]')).toHaveTextContent(
        `${specialCharacterName} (Organizer)`,
      );
      expect(screen.queryByText(/&quot;|&#x27;|&lt;|&gt;|&amp;/)).not.toBeInTheDocument();
      rendered.unmount();
    } finally {
      act(() => {
        userState.users(previousUsers);
        userState.self(previousSelf);
        conversationState.conversations(previousConversations);
      });
      appRoot.remove();
    }
  });

  it('shows the self-organizer avatar with the name only in the tooltip', () => {
    setStrings({en});
    const userState = container.resolve(UserState);
    const conversationState = container.resolve(ConversationState);
    const previousUsers = userState.users();
    const previousSelf = userState.self();
    const previousConversations = conversationState.conversations();
    const selfUser = new User(qualifiedSelf.id, qualifiedSelf.domain, translate);
    selfUser.name('Self Organizer');
    const conversation = new Conversation(
      qualifiedConversation.id,
      qualifiedConversation.domain,
      CONVERSATION_PROTOCOL.PROTEUS,
      translate,
    );
    conversation.participating_user_ets([]);
    userState.self(selfUser);
    userState.users([selfUser]);
    conversationState.conversations([conversation]);
    const appRoot = document.createElement('div');
    appRoot.id = 'wire-app';
    document.body.appendChild(appRoot);

    try {
      const rendered = render(
        <ThemeProvider>
          <MeetingParticipants qualifiedConversation={qualifiedConversation} qualifiedCreator={qualifiedSelf} />
        </ThemeProvider>,
        {wrapper: createRootProviderWrapperForTest(createRootContextValueForTest({translate}))},
      );

      const avatar = screen.getByLabelText('Self Organizer (Organizer)');
      expect(avatar).toBeInTheDocument();
      expect(screen.queryByText('Self Organizer')).not.toBeInTheDocument();
      const tooltipWrapper = avatar.closest('[data-testid="tooltip-wrapper"]');
      expect(tooltipWrapper).toBeInTheDocument();
      fireEvent.mouseEnter(requireValueForTest(tooltipWrapper));
      expect(screen.getByText('Self Organizer (Organizer)')).toBeInTheDocument();
      rendered.unmount();
    } finally {
      act(() => {
        userState.users(previousUsers);
        userState.self(previousSelf);
        conversationState.conversations(previousConversations);
      });
      appRoot.remove();
    }
  });
});
