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

import React from 'react';
import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';

import {t} from 'Util/LocalizerUtil';

import type {ConversationRoleRepository} from '../../conversation/ConversationRoleRepository';
import type {Conversation} from '../../entity/Conversation';
import type {ActionsViewModel} from '../../view_model/ActionsViewModel';
import type {User} from '../../entity/User';
import type {MenuItem} from './PanelActions';

import PanelActions from './PanelActions';
import {registerReactComponent} from 'Util/ComponentUtil';

export enum Actions {
  ACCEPT_REQUEST = 'UserActions.ACCEPT_REQUEST',
  BLOCK = 'UserActions.BLOCK',
  CANCEL_REQUEST = 'UserActions.CANCEL_REQUEST',
  IGNORE_REQUEST = 'UserActions.IGNORE_REQUEST',
  LEAVE = 'UserActions.LEAVE',
  OPEN_CONVERSATION = 'UserActions.OPEN_CONVERSATION',
  OPEN_PROFILE = 'UserActions.OPEN_PROFILE',
  REMOVE = 'UserActions.REMOVE',
  SEND_REQUEST = 'UserActions.SEND_REQUEST',
  UNBLOCK = 'UserActions.UNBLOCK',
}

export const ActionIdentifier = {
  [Actions.ACCEPT_REQUEST]: 'do-accept-request',
  [Actions.BLOCK]: 'do-block',
  [Actions.CANCEL_REQUEST]: 'do-cancel-request',
  [Actions.IGNORE_REQUEST]: 'do-ignore-request',
  [Actions.LEAVE]: 'do-leave',
  [Actions.OPEN_CONVERSATION]: 'go-conversation',
  [Actions.OPEN_PROFILE]: 'go-profile',
  [Actions.REMOVE]: 'do-remove',
  [Actions.SEND_REQUEST]: 'do-send-request',
  [Actions.UNBLOCK]: 'do-unblock',
};

export interface UserActionsProps {
  actionsViewModel: ActionsViewModel;
  conversation?: Conversation;
  conversationRoleRepository?: ConversationRoleRepository;
  isSelfActivated: boolean;
  onAction: (action: Actions) => void;
  user: User;
}

const UserActions: React.FC<UserActionsProps> = ({
  actionsViewModel,
  isSelfActivated,
  user,
  conversation,
  onAction,
  conversationRoleRepository,
}) => {
  const isNotMe = !user.isMe && isSelfActivated;

  const create1to1Conversation = async (userEntity: User, showConversation: boolean): Promise<void> => {
    const conversationEntity = await actionsViewModel.getOrCreate1to1Conversation(userEntity);
    if (showConversation) {
      await actionsViewModel.open1to1Conversation(conversationEntity);
    }
  };

  const openSelfProfile: MenuItem = user.isMe && {
    click: () => {
      amplify.publish(WebAppEvents.PREFERENCES.MANAGE_ACCOUNT);
      onAction(Actions.OPEN_PROFILE);
    },
    icon: 'profile-icon',
    identifier: ActionIdentifier[Actions.OPEN_PROFILE],
    label: t('groupParticipantActionSelfProfile'),
  };

  const leaveConversation: MenuItem = user.isMe &&
    isSelfActivated &&
    conversation?.isGroup() &&
    !conversation.removed_from_conversation() &&
    conversationRoleRepository.canLeaveGroup(conversation) && {
      click: async () => {
        await actionsViewModel.leaveConversation(conversation);
        onAction(Actions.LEAVE);
      },
      icon: 'leave-icon',
      identifier: ActionIdentifier[Actions.LEAVE],
      label: t('groupParticipantActionLeave'),
    };

  const open1To1Conversation: MenuItem = isNotMe &&
    (user.isConnected() || user.isTeamMember()) && {
      click: async () => {
        await create1to1Conversation(user, true);
        onAction(Actions.OPEN_CONVERSATION);
      },
      icon: 'message-icon',
      identifier: ActionIdentifier[Actions.OPEN_CONVERSATION],
      label: t('groupParticipantActionOpenConversation'),
    };

  const acceptConnectionRequest: MenuItem = isNotMe &&
    user.isIncomingRequest() && {
      click: async () => {
        await actionsViewModel.acceptConnectionRequest(user);
        await create1to1Conversation(user, true);
        onAction(Actions.ACCEPT_REQUEST);
      },
      icon: 'check-icon',
      identifier: ActionIdentifier[Actions.ACCEPT_REQUEST],
      label: t('groupParticipantActionIncomingRequest'),
    };

  const ignoreConnectionRequest: MenuItem = isNotMe &&
    user.isIncomingRequest() && {
      click: async () => {
        await actionsViewModel.ignoreConnectionRequest(user);
        onAction(Actions.IGNORE_REQUEST);
      },
      icon: 'close-icon',
      identifier: ActionIdentifier[Actions.IGNORE_REQUEST],
      label: t('groupParticipantActionIgnoreRequest'),
    };

  const cancelConnectionRequest: MenuItem = isNotMe &&
    user.isOutgoingRequest() && {
      click: async () => {
        await actionsViewModel.cancelConnectionRequest(user);
        await create1to1Conversation(user, false);
        onAction(Actions.CANCEL_REQUEST);
      },
      icon: 'undo-icon',
      identifier: ActionIdentifier[Actions.CANCEL_REQUEST],
      label: t('groupParticipantActionCancelRequest'),
    };

  const isNotConnectedUser = user.isCanceled() || user.isUnknown();
  const canConnect = !user.isTeamMember() && !user.isTemporaryGuest();
  const sendConnectionRequest: MenuItem = isNotMe &&
    isNotConnectedUser &&
    canConnect && {
      click: async () => {
        await actionsViewModel.sendConnectionRequest(user);
        await create1to1Conversation(user, !conversation);
        onAction(Actions.SEND_REQUEST);
      },
      icon: 'plus-icon',
      identifier: ActionIdentifier[Actions.SEND_REQUEST],
      label: t('groupParticipantActionSendRequest'),
    };

  const blockUser: MenuItem = isNotMe &&
    (user.isConnected() || user.isRequest()) && {
      click: async () => {
        await actionsViewModel.blockUser(user);
        await create1to1Conversation(user, false);
        onAction(Actions.BLOCK);
      },
      icon: 'block-icon',
      identifier: ActionIdentifier[Actions.BLOCK],
      label: t('groupParticipantActionBlock'),
    };

  const unblockUser: MenuItem = isNotMe &&
    user.isBlocked() && {
      click: async () => {
        await actionsViewModel.unblockUser(user);
        await create1to1Conversation(user, !conversation);
        onAction(Actions.UNBLOCK);
      },
      icon: 'block-icon',
      identifier: ActionIdentifier[Actions.UNBLOCK],
      label: t('groupParticipantActionUnblock'),
    };

  const removeUserFromConversation: MenuItem = isNotMe &&
    conversation &&
    !conversation.removed_from_conversation() &&
    conversation.participating_user_ids().some(id => user.id === id) &&
    conversationRoleRepository.canRemoveParticipants(conversation) && {
      click: async () => {
        await actionsViewModel.removeFromConversation(conversation, user);
        onAction(Actions.REMOVE);
      },
      icon: 'minus-icon',
      identifier: 'do-remove',
      label: t('groupParticipantActionRemove'),
      size: {height: 2, width: 16},
    };

  const items = [
    openSelfProfile,
    leaveConversation,
    open1To1Conversation,
    acceptConnectionRequest,
    ignoreConnectionRequest,
    cancelConnectionRequest,
    sendConnectionRequest,
    blockUser,
    unblockUser,
    removeUserFromConversation,
  ].filter(Boolean);

  return <PanelActions items={items} />;
};

export default UserActions;

registerReactComponent('user-actions', {
  component: UserActions,
  optionalParams: ['conversation', 'conversationRoleRepository'],
  template:
    '<div data-bind="react: {user: ko.unwrap(user), isSelfActivated: ko.unwrap(isSelfActivated), onAction, conversationRoleRepository, conversation: ko.unwrap(conversation), actionsViewModel}">',
});
