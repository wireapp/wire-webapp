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

import {render} from '@testing-library/react';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import {SharedDrive} from './sharedDrive';

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);

const createUser = ({id, name, teamId}: {id: string; name: string; teamId: string}) => {
  const user = new User(id, '', translateForTest);
  user.name(name);
  user.teamId = teamId;
  return user;
};

describe('SharedDrive', () => {
  it('explains access levels and shows each participant role', () => {
    const conversation = new Conversation('conversation-id', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
    conversation.teamId = 'conversation-team';

    const selfUser = createUser({id: 'self-user', name: 'Self user', teamId: 'conversation-team'});
    const editor = createUser({id: 'editor', name: 'Editor user', teamId: 'conversation-team'});
    const viewer = createUser({id: 'viewer', name: 'Viewer user', teamId: 'other-team'});
    conversation.selfUser(selfUser);
    conversation.participating_user_ets([editor, viewer]);

    const {getAllByText, getByTestId, getByText} = render(
      <SharedDrive activeConversation={conversation} onBack={jest.fn()} onClose={jest.fn()} />,
      {wrapper: rootProviderWrapper},
    );

    expect(getByText('cells.sharedDriveAccess.title')).toBeInTheDocument();
    expect(getByText('cells.sharedDriveAccess.description')).toBeInTheDocument();
    expect(getByText('cells.sharedDriveAccess.externalDescription')).toBeInTheDocument();
    expect(getAllByText('cells.sharedDriveAccess.role.editor')).toHaveLength(2);
    expect(getAllByText('cells.sharedDriveAccess.role.viewer')).toHaveLength(1);
    expect(getByTestId('shared-drive-viewer-icon')).toBeInTheDocument();
    expect(getByText('Editor user')).toBeInTheDocument();
    expect(getByText('Viewer user')).toBeInTheDocument();
  });
});
