/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {act, render} from '@testing-library/react';
import {ConnectionStatus} from '@wireapp/api-client/lib/connection/';
import {ConversationProtocol, CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation/';
import {ClientMLSError, ClientMLSErrorLabel} from '@wireapp/core/lib/messagingProtocols/mls';
import ko from 'knockout';
import {container} from 'tsyringe';

import {PrimaryModalComponent} from 'Components/Modals/PrimaryModal/PrimaryModal';
import {ConnectionEntity} from 'Repositories/connection/ConnectionEntity';
import {ConversationRoleRepository} from 'Repositories/conversation/ConversationRoleRepository';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {TeamEntity} from 'Repositories/team/TeamEntity';
import {TeamState} from 'Repositories/team/TeamState';
import {UserState} from 'Repositories/user/UserState';
import {withTheme} from 'src/script/auth/util/test/TestUtil';
import {ActionsViewModel} from 'src/script/view_model/ActionsViewModel';
import {noop} from 'Util/util';

import {ActionIdentifier, Actions, UserActions} from './UserActions';

const actionsViewModel = {
  open1to1Conversation: jest.fn(),
  getOrCreate1to1Conversation: jest.fn(),
} as unknown as ActionsViewModel;

const getAllActions = (queryFunction: (id: string) => HTMLElement | null) =>
  Object.values(ActionIdentifier)
    .map(action => queryFunction(action))
    .filter(action => action !== null);

describe('UserActions', () => {
  const conversationState = container.resolve(ConversationState);
  const teamState = container.resolve(TeamState);
  const userState = container.resolve(UserState);

  afterEach(() => {
    conversationState.conversations.removeAll();
  });

  it('generates actions for self user profile', () => {
    const user = new User('');
    user.isMe = true;
    const conversation = new Conversation();
    jest.spyOn(conversation, 'isGroup').mockImplementation(ko.pureComputed(() => true));
    const conversationRoleRepository: Partial<ConversationRoleRepository> = {canLeaveGroup: () => true};
    const props = {
      actionsViewModel,
      conversation,
      conversationRoleRepository: conversationRoleRepository as ConversationRoleRepository,
      isSelfActivated: true,
      onAction: noop,
      selfUser: user,
      user,
    };

    const {queryByTestId} = render(<UserActions {...props} />);

    const allActions = getAllActions(queryByTestId);

    expect(allActions).toHaveLength(2);

    [Actions.OPEN_PROFILE, Actions.LEAVE].forEach(action => {
      const identifier = ActionIdentifier[action];
      expect(queryByTestId(identifier)).not.toBeNull();
    });
  });

  it('generates actions for self user profile when user is not activated', () => {
    const user = new User('');
    user.isMe = true;
    const conversation = new Conversation();

    const props = {
      actionsViewModel,
      conversation,
      conversationRoleRepository: {} as ConversationRoleRepository,
      isSelfActivated: false,
      onAction: noop,
      selfUser: user,
      user,
    };

    const {queryByTestId} = render(<UserActions {...props} />);

    const allActions = getAllActions(queryByTestId);
    expect(allActions).toHaveLength(1);

    const identifier = ActionIdentifier[Actions.OPEN_PROFILE];
    expect(queryByTestId(identifier)).not.toBeNull();
  });

  it('generates actions for another user profile to which I am connected', () => {
    const user = new User('');
    const connection = new ConnectionEntity();

    user.connection(connection);
    user.teamId = 'teamId';

    const selfUser = new User('');
    selfUser.teamId = 'teamId2';

    jest.spyOn(user, 'isAvailable').mockImplementation(ko.pureComputed(() => true));
    const conversation = new Conversation();
    conversation.connection(connection);
    jest.spyOn(conversation, 'isGroup').mockImplementation(ko.pureComputed(() => true));
    jest.spyOn(conversation, 'participating_user_ids').mockImplementation(ko.observableArray([new User()]));
    user.connection()?.status(ConnectionStatus.ACCEPTED);
    connection.userId = user.qualifiedId;

    conversationState.conversations.push(conversation);

    const conversationRoleRepository: Partial<ConversationRoleRepository> = {canRemoveParticipants: () => true};

    const props = {
      actionsViewModel,
      conversation,
      conversationRoleRepository: conversationRoleRepository as ConversationRoleRepository,
      isSelfActivated: true,
      onAction: noop,
      selfUser,
      user,
    };

    const {queryByTestId} = render(<UserActions {...props} />);

    const allActions = getAllActions(queryByTestId);
    expect(allActions).toHaveLength(3);

    [Actions.OPEN_CONVERSATION, Actions.BLOCK].forEach(action => {
      const identifier = ActionIdentifier[action];
      expect(queryByTestId(identifier)).not.toBeNull();
    });
  });

  it('generates actions for another user profile that I have blocked', () => {
    const user = new User('');
    const connection = new ConnectionEntity();

    user.connection(connection);
    user.teamId = 'teamId';

    const selfUser = new User('');
    selfUser.teamId = 'teamId2';

    jest.spyOn(user, 'isAvailable').mockImplementation(ko.pureComputed(() => true));
    const conversation = new Conversation();
    conversation.type(CONVERSATION_TYPE.ONE_TO_ONE);
    conversation.connection(connection);

    jest.spyOn(conversation, 'participating_user_ids').mockImplementation(ko.observableArray([new User()]));
    user.connection()?.status(ConnectionStatus.BLOCKED);
    connection.userId = user.qualifiedId;

    conversationState.conversations.push(conversation);

    const conversationRoleRepository: Partial<ConversationRoleRepository> = {canRemoveParticipants: () => false};

    const props = {
      actionsViewModel,
      conversation,
      conversationRoleRepository: conversationRoleRepository as ConversationRoleRepository,
      isSelfActivated: true,
      onAction: noop,
      selfUser,
      user,
    };

    const {queryByTestId} = render(<UserActions {...props} />);

    const allActions = getAllActions(queryByTestId);
    expect(allActions).toHaveLength(1);

    expect(queryByTestId(ActionIdentifier[Actions.UNBLOCK])).not.toBeNull();
  });

  it("shows start conversation if there's no existing conversation between two users from the same team", () => {
    const user = new User('');

    const team = new TeamEntity('teamId');
    teamState.team(team);

    user.teamId = team.id;

    const selfUser = new User('');
    selfUser.teamId = team.id;

    userState.self(selfUser);

    jest.spyOn(user, 'isAvailable').mockImplementation(ko.pureComputed(() => true));
    const conversation = new Conversation();
    conversation.participating_user_ids([user]);

    const conversationRoleRepository: Partial<ConversationRoleRepository> = {canRemoveParticipants: () => true};

    const props = {
      actionsViewModel,
      conversation,
      conversationRoleRepository: conversationRoleRepository as ConversationRoleRepository,
      isSelfActivated: true,
      onAction: noop,
      selfUser,
      user,
    };

    const {queryByTestId} = render(<UserActions {...props} />);

    const allActions = getAllActions(queryByTestId);
    expect(allActions).toHaveLength(2);

    [Actions.START_CONVERSATION, Actions.REMOVE].forEach(action => {
      const identifier = ActionIdentifier[action];
      expect(queryByTestId(identifier)).not.toBeNull();
    });
  });

  it('opens a no available keys modal if failed when trying to establish mls 1:1', async () => {
    const user = new User('');

    const team = new TeamEntity('teamId');
    teamState.team(team);

    user.teamId = team.id;

    const selfUser = new User('');
    selfUser.teamId = team.id;

    userState.self(selfUser);

    jest.spyOn(user, 'isAvailable').mockImplementation(ko.pureComputed(() => true));
    const conversation = new Conversation();
    conversation.participating_user_ids([user]);

    const conversationRoleRepository: Partial<ConversationRoleRepository> = {canRemoveParticipants: () => true};

    const props = {
      actionsViewModel,
      conversation,
      conversationRoleRepository: conversationRoleRepository as ConversationRoleRepository,
      isSelfActivated: true,
      onAction: noop,
      selfUser,
      user,
    };

    jest
      .spyOn(actionsViewModel, 'getOrCreate1to1Conversation')
      .mockRejectedValueOnce(new ClientMLSError(ClientMLSErrorLabel.NO_KEY_PACKAGES_AVAILABLE));

    const {getByTestId, getByText} = render(
      <>
        <UserActions {...props} />
        <PrimaryModalComponent />
      </>,
    );

    const button = getByTestId(ActionIdentifier[Actions.START_CONVERSATION]);

    await act(async () => button?.click());

    expect(getByText('modal1To1ConversationCreateErrorNoKeyPackagesHeadline')).toBeDefined();
    expect(getByText('modal1To1ConversationCreateErrorNoKeyPackagesMessage')).toBeDefined();
  });

  it("shows open conversation if there's an existing conversation between two users from the same team", () => {
    const teamDomain = 'team-domain';
    const user = new User('userid1', teamDomain);

    const team = new TeamEntity('teamId');
    teamState.team(team);

    user.teamId = team.id;

    const selfUser = new User('userid2', teamDomain);
    selfUser.teamId = team.id;

    userState.self(selfUser);

    jest.spyOn(user, 'isAvailable').mockImplementation(ko.pureComputed(() => true));
    const conversation = new Conversation();
    jest.spyOn(conversation, 'participating_user_ids').mockImplementation(ko.observableArray([user]));

    const one2oneConversation = new Conversation('123', 'domain', ConversationProtocol.PROTEUS);
    one2oneConversation.type(CONVERSATION_TYPE.ONE_TO_ONE);
    one2oneConversation.participating_user_ids.push(user.qualifiedId);
    one2oneConversation.participating_user_ets.push(user);

    conversationState.conversations.push(one2oneConversation);

    const conversationRoleRepository: Partial<ConversationRoleRepository> = {canRemoveParticipants: () => true};

    const props = {
      actionsViewModel,
      conversation,
      conversationRoleRepository: conversationRoleRepository as ConversationRoleRepository,
      isSelfActivated: true,
      onAction: noop,
      selfUser,
      user,
    };

    const {queryByTestId} = render(<UserActions {...props} />);

    const allActions = getAllActions(queryByTestId);
    expect(allActions).toHaveLength(2);

    [Actions.OPEN_CONVERSATION, Actions.REMOVE].forEach(action => {
      const identifier = ActionIdentifier[action];
      expect(queryByTestId(identifier)).not.toBeNull();
    });
  });

  it('only generates remove participant action for an unavailable user', () => {
    const user = new User('');
    const conversation = new Conversation();
    jest.spyOn(conversation, 'isGroup').mockImplementation(ko.pureComputed(() => true));
    jest.spyOn(conversation, 'participating_user_ids').mockImplementation(ko.observableArray([new User()]));
    user.connection()?.status(ConnectionStatus.ACCEPTED);
    const conversationRoleRepository: Partial<ConversationRoleRepository> = {canRemoveParticipants: () => true};

    const props = {
      actionsViewModel,
      conversation,
      conversationRoleRepository: conversationRoleRepository as ConversationRoleRepository,
      isSelfActivated: true,
      onAction: noop,
      selfUser: new User(''),
      user,
    };

    const {queryByTestId} = render(<UserActions {...props} />);

    const allActions = getAllActions(queryByTestId);
    expect(allActions).toHaveLength(1);
  });

  it('displays buttons instead of a list when a single action is available in user modal', () => {
    const user = new User('');
    const conversation = new Conversation();
    const connection = new ConnectionEntity();
    user.connection(connection);
    conversation.connection(connection);
    user.connection()?.status(ConnectionStatus.UNKNOWN);
    jest.spyOn(user, 'isAvailable').mockImplementation(ko.pureComputed(() => true));
    const conversationRoleRepository: Partial<ConversationRoleRepository> = {canRemoveParticipants: () => false};

    const props = {
      actionsViewModel,
      conversation,
      conversationRoleRepository: conversationRoleRepository as ConversationRoleRepository,
      isSelfActivated: true,
      onAction: noop,
      selfUser: new User(''),
      user,
      isModal: true,
    };

    const {queryByTestId} = render(withTheme(<UserActions {...props} />));

    const allActions = getAllActions(queryByTestId);
    expect(allActions).toHaveLength(1);
    const identifier = ActionIdentifier[Actions.SEND_REQUEST];
    expect(queryByTestId(identifier)).not.toBeNull();
    expect(queryByTestId('do-close')).not.toBeNull();
  });

  it('displays a list when a single action is available in sidebar', () => {
    const user = new User('');
    const conversation = new Conversation();
    const connection = new ConnectionEntity();
    user.connection(connection);
    conversation.connection(connection);
    user.connection()?.status(ConnectionStatus.UNKNOWN);
    jest.spyOn(user, 'isAvailable').mockImplementation(ko.pureComputed(() => true));
    const conversationRoleRepository: Partial<ConversationRoleRepository> = {canRemoveParticipants: () => false};

    const props = {
      actionsViewModel,
      conversation,
      conversationRoleRepository: conversationRoleRepository as ConversationRoleRepository,
      isSelfActivated: true,
      onAction: noop,
      selfUser: new User(''),
      user,
    };

    const {queryByTestId} = render(withTheme(<UserActions {...props} />));

    const allActions = getAllActions(queryByTestId);
    expect(allActions).toHaveLength(1);
    const identifier = ActionIdentifier[Actions.SEND_REQUEST];
    expect(queryByTestId(identifier)).not.toBeNull();
    expect(queryByTestId('do-close')).toBeNull();
  });

  it('displays a list when multiple actions are available in user modal', () => {
    const user = new User('');
    const conversation = new Conversation();
    const connection = new ConnectionEntity();
    user.connection(connection);
    conversation.connection(connection);
    user.connection()?.status(ConnectionStatus.SENT);
    jest.spyOn(user, 'isAvailable').mockImplementation(ko.pureComputed(() => true));
    const conversationRoleRepository: Partial<ConversationRoleRepository> = {canRemoveParticipants: () => false};

    const props = {
      actionsViewModel,
      conversation,
      conversationRoleRepository: conversationRoleRepository as ConversationRoleRepository,
      isSelfActivated: true,
      onAction: noop,
      selfUser: new User(''),
      user,
      isModal: true,
    };

    const {queryByTestId} = render(withTheme(<UserActions {...props} />));

    const allActions = getAllActions(queryByTestId);
    expect(allActions).toHaveLength(2);

    [Actions.CANCEL_REQUEST, Actions.BLOCK].forEach(action => {
      const identifier = ActionIdentifier[action];
      expect(queryByTestId(identifier)).not.toBeNull();
    });

    expect(queryByTestId('do-close')).toBeNull();
  });
});
