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

import {fireEvent, render, screen} from '@testing-library/react';

import type {Conversation} from 'Repositories/entity/Conversation';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';

import {MeetingConversationsSearchableList} from './meetingConversationsSearchableList';
import {translateForTest} from 'Util/test/translateForTest';

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({
    translate: translateForTest,
  }),
);

const createConversation = (id: string, name: string, channel = false) =>
  ({
    display_name: () => name,
    id,
    isChannel: () => channel,
    participating_user_ets: () => [],
    qualifiedId: {domain: 'example.com', id},
  }) as unknown as Conversation;

describe('MeetingConversationsSearchableList', () => {
  it('renders groups and channels with their selection state', () => {
    const conversations = [
      createConversation('group', 'Project group'),
      createConversation('channel', 'Project channel', true),
    ];
    const onSelectConversation = jest.fn();

    render(
      withThemeAndRootContext(
        <MeetingConversationsSearchableList
          id="participants"
          conversations={conversations}
          selectedConversationIds={new Set(['example.com-group'])}
          onSelectConversation={onSelectConversation}
          isOpen
          onOpenChange={jest.fn()}
          noUnderline={false}
        />,
        rootProviderWrapper,
      ),
    );

    expect(screen.getByText('Project group')).toBeInTheDocument();
    expect(screen.getByText('Project channel')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', {name: 'Project group'})).toBeChecked();
    expect(screen.getByRole('checkbox', {name: 'Project channel'})).not.toBeChecked();

    fireEvent.click(screen.getByRole('checkbox', {name: 'Project channel'}));
    expect(onSelectConversation).toHaveBeenCalledWith(conversations[1]);
  });

  it('collapses and expands the list without changing the selection handler', () => {
    const onOpenChange = jest.fn();

    render(
      withThemeAndRootContext(
        <MeetingConversationsSearchableList
          id="participants"
          conversations={[createConversation('group', 'Project group')]}
          selectedConversationIds={new Set()}
          onSelectConversation={jest.fn()}
          isOpen
          onOpenChange={onOpenChange}
          noUnderline={false}
        />,
        rootProviderWrapper,
      ),
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders nothing when there are no matching conversations', () => {
    render(
      withThemeAndRootContext(
        <MeetingConversationsSearchableList
          id="participants"
          conversations={[]}
          selectedConversationIds={new Set()}
          onSelectConversation={jest.fn()}
          isOpen
          onOpenChange={jest.fn()}
          noUnderline={false}
        />,
        rootProviderWrapper,
      ),
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText('Project group')).not.toBeInTheDocument();
  });
});
