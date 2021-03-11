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
import ko from 'knockout';
import {ConnectionStatus} from '@wireapp/api-client/src/connection';

import TestPage from 'Util/test/TestPage';
import {noop} from 'Util/util';

import UserActions, {UserActionsProps} from './UserActions';
import {User} from 'src/script/entity/User';
import {Conversation} from 'src/script/entity/Conversation';
import {ConversationRoleRepository} from 'src/script/conversation/ConversationRoleRepository';
import {ActionsViewModel} from 'src/script/view_model/ActionsViewModel';

const actionsViewModel = {} as ActionsViewModel;

class UserActionsPage extends TestPage<UserActionsProps> {
  constructor(props?: UserActionsProps) {
    super(UserActions, props);
  }

  getAction = (identifier: string) => this.get(`div[data-uie-name="${identifier}"]`);
  getAllActions = () => this.get('.panel__action-item');
}
describe('UserActions', () => {
  it('generates actions for self user profile', () => {
    const user = new User();
    user.isMe = true;
    const conversation = new Conversation();
    jest.spyOn(conversation, 'isGroup').mockImplementation(ko.pureComputed(() => true));
    const conversationRoleRepository: Partial<ConversationRoleRepository> = {canLeaveGroup: () => true};
    const userActions = new UserActionsPage({
      actionsViewModel,
      conversation,
      conversationRoleRepository: conversationRoleRepository as ConversationRoleRepository,
      isSelfActivated: true,
      onAction: noop,
      user,
    });

    expect(userActions.getAllActions().length).toEqual(2);
    ['go-profile', 'do-leave'].forEach(action => {
      expect(userActions.getAction(action).exists()).toBe(true);
    });
  });
  it('generates actions for self user profile when user is not activated', () => {
    const user = new User();
    user.isMe = true;
    const conversation = new Conversation();

    const userActions = new UserActionsPage({
      actionsViewModel,
      conversation,
      conversationRoleRepository: {} as ConversationRoleRepository,
      isSelfActivated: false,
      onAction: noop,
      user,
    });

    expect(userActions.getAllActions().length).toEqual(1);

    expect(userActions.getAction('go-profile').exists()).toBe(true);
  });
  it('generates actions for another user profile to which I am connected', () => {
    const user = new User();
    const conversation = new Conversation();
    jest.spyOn(conversation, 'isGroup').mockImplementation(ko.pureComputed(() => true));
    user.connection().status(ConnectionStatus.ACCEPTED);
    const userActions = new UserActionsPage({
      actionsViewModel,
      conversation,
      conversationRoleRepository: {} as ConversationRoleRepository,
      isSelfActivated: true,
      onAction: noop,
      user,
    });

    expect(userActions.getAllActions().length).toEqual(2);
    ['go-conversation', 'do-block'].forEach(action => {
      expect(userActions.getAction(action).exists()).toBe(true);
    });
  });
});
