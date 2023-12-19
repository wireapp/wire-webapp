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

import {render} from '@testing-library/react';
import {ConnectionStatus} from '@wireapp/api-client/lib/connection/';
import ko from 'knockout';

import {withTheme} from 'src/script/auth/util/test/TestUtil';
import {ConversationRoleRepository} from 'src/script/conversation/ConversationRoleRepository';
import {Conversation} from 'src/script/entity/Conversation';
import {User} from 'src/script/entity/User';
import {ActionsViewModel} from 'src/script/view_model/ActionsViewModel';
import {noop} from 'Util/util';

import {ActionIdentifier, Actions, UserActions} from './UserActions';

const actionsViewModel = {} as ActionsViewModel;

const getAllActions = (queryFunction: (id: string) => HTMLElement | null) =>
  Object.values(ActionIdentifier)
    .map(action => queryFunction(action))
    .filter(action => action !== null);

describe('UserActions', () => {
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
    jest.spyOn(user, 'isAvailable').mockImplementation(ko.pureComputed(() => true));
    const conversation = new Conversation();
    jest.spyOn(conversation, 'isGroup').mockImplementation(ko.pureComputed(() => true));
    jest.spyOn(conversation, 'participating_user_ids').mockImplementation(ko.observableArray([new User()]));
    user.connection().status(ConnectionStatus.ACCEPTED);
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
    expect(allActions).toHaveLength(3);

    [Actions.OPEN_CONVERSATION, Actions.BLOCK].forEach(action => {
      const identifier = ActionIdentifier[action];
      expect(queryByTestId(identifier)).not.toBeNull();
    });
  });

  it('only generates remove participant action for an unavailable user', () => {
    const user = new User('');
    const conversation = new Conversation();
    jest.spyOn(conversation, 'isGroup').mockImplementation(ko.pureComputed(() => true));
    jest.spyOn(conversation, 'participating_user_ids').mockImplementation(ko.observableArray([new User()]));
    user.connection().status(ConnectionStatus.ACCEPTED);
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
    user.connection().status(ConnectionStatus.UNKNOWN);
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
    user.connection().status(ConnectionStatus.UNKNOWN);
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
    user.connection().status(ConnectionStatus.SENT);
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
