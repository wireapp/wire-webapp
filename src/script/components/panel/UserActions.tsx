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

import {ConnectionStatus} from '@wireapp/api-client/lib/connection';
import {CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation';
import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {WebAppEvents} from '@wireapp/webapp-events';

import {TeamState} from 'src/script/team/TeamState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';

import type {MenuItem} from './PanelActions';
import {PanelActions} from './PanelActions';

import {ACCESS_STATE} from '../../conversation/AccessState';
import type {ConversationRoleRepository} from '../../conversation/ConversationRoleRepository';
import {Conversation} from '../../entity/Conversation';
import type {User} from '../../entity/User';
import type {ActionsViewModel} from '../../view_model/ActionsViewModel';

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
  selfUser: User;
  user: User;
  teamState?: TeamState;
}

function createPlaceholder1to1Conversation(user: User, selfUser: User) {
  const {id, domain} = user.connection().conversationId;
  const conversation = new Conversation(id, domain);
  conversation.name(user.name());
  conversation.selfUser(selfUser);
  conversation.type(CONVERSATION_TYPE.CONNECT);
  conversation.participating_user_ids([user.qualifiedId]);
  conversation.participating_user_ets([user]);
  conversation.accessState(ACCESS_STATE.PERSONAL.ONE2ONE);
  conversation.last_event_timestamp(Date.now());
  conversation.connection(user.connection());
  return conversation;
}

const UserActions: React.FC<UserActionsProps> = ({
  actionsViewModel,
  isSelfActivated,
  user,
  conversation,
  onAction,
  conversationRoleRepository,
  selfUser,
  teamState = container.resolve(TeamState),
}) => {
  const {
    isAvailable,
    isBlocked,
    isCanceled,
    isRequest,
    isTemporaryGuest,
    isUnknown,
    isConnected,
    isOutgoingRequest,
    isIncomingRequest,
  } = useKoSubscribableChildren(user, [
    'isAvailable',
    'isTemporaryGuest',
    'isBlocked',
    'isOutgoingRequest',
    'isIncomingRequest',
    'isRequest',
    'isCanceled',
    'isUnknown',
    'isConnected',
  ]);
  const isTeamMember = teamState.isInTeam(user);

  const isNotMe = !user.isMe && isSelfActivated;

  const create1to1Conversation = async (userEntity: User, showConversation: boolean): Promise<void> => {
    const conversationEntity = await actionsViewModel.getOrCreate1to1Conversation(userEntity);
    if (showConversation) {
      actionsViewModel.open1to1Conversation(conversationEntity);
    }
  };

  const openSelfProfile: MenuItem | undefined = user.isMe
    ? {
        click: () => {
          amplify.publish(WebAppEvents.PREFERENCES.MANAGE_ACCOUNT);
          onAction(Actions.OPEN_PROFILE);
        },
        icon: 'profile-icon',
        identifier: ActionIdentifier[Actions.OPEN_PROFILE],
        label: t('groupParticipantActionSelfProfile'),
      }
    : undefined;

  const leaveConversation: MenuItem | undefined =
    user.isMe &&
    isSelfActivated &&
    conversation?.isGroup() &&
    !conversation.removed_from_conversation() &&
    conversationRoleRepository?.canLeaveGroup(conversation)
      ? {
          click: async () => {
            await actionsViewModel.leaveConversation(conversation);
            onAction(Actions.LEAVE);
          },
          icon: 'leave-icon',
          identifier: ActionIdentifier[Actions.LEAVE],
          label: t('groupParticipantActionLeave'),
        }
      : undefined;

  const open1To1Conversation: MenuItem | undefined =
    isNotMe && isAvailable && (isConnected || isTeamMember)
      ? {
          click: async () => {
            await create1to1Conversation(user, true);
            onAction(Actions.OPEN_CONVERSATION);
          },
          icon: 'message-icon',
          identifier: ActionIdentifier[Actions.OPEN_CONVERSATION],
          label: t('groupParticipantActionOpenConversation'),
        }
      : undefined;

  const acceptConnectionRequest: MenuItem | undefined =
    isNotMe && isAvailable && isIncomingRequest
      ? {
          click: async () => {
            await actionsViewModel.acceptConnectionRequest(user);
            await create1to1Conversation(user, true);
            onAction(Actions.ACCEPT_REQUEST);
          },
          icon: 'check-icon',
          identifier: ActionIdentifier[Actions.ACCEPT_REQUEST],
          label: t('groupParticipantActionIncomingRequest'),
        }
      : undefined;

  const ignoreConnectionRequest: MenuItem | undefined =
    isNotMe && isIncomingRequest
      ? {
          click: async () => {
            await actionsViewModel.ignoreConnectionRequest(user);
            onAction(Actions.IGNORE_REQUEST);
          },
          icon: 'close-icon',
          identifier: ActionIdentifier[Actions.IGNORE_REQUEST],
          label: t('groupParticipantActionIgnoreRequest'),
        }
      : undefined;

  const cancelConnectionRequest: MenuItem | undefined =
    isNotMe && isOutgoingRequest
      ? {
          click: async () => {
            await actionsViewModel.cancelConnectionRequest(user);
            await create1to1Conversation(user, false);
            onAction(Actions.CANCEL_REQUEST);
          },
          icon: 'undo-icon',
          identifier: ActionIdentifier[Actions.CANCEL_REQUEST],
          label: t('groupParticipantActionCancelRequest'),
        }
      : undefined;

  const isNotConnectedUser = isCanceled || isUnknown;
  const canConnect = !isTeamMember && !isTemporaryGuest;

  const sendConnectionRequest: MenuItem | undefined =
    isNotMe && isAvailable && isNotConnectedUser && canConnect
      ? {
          click: async () => {
            const connectionData = await actionsViewModel.sendConnectionRequest(user);

            if (!connectionData) {
              // Sending the connection failed, there is nothing more to do
              return;
            }

            const {connectionStatus, conversationId} = connectionData;

            // If connection's state is SENT, we create a local 1:1 conversation that will act as a placeholder
            // before the other user has accepted the request.
            const connectionConversation =
              connectionStatus === ConnectionStatus.SENT
                ? createPlaceholder1to1Conversation(user, selfUser)
                : await actionsViewModel.getConversationById(conversationId);

            const savedConversation = await actionsViewModel.saveConversation(connectionConversation);
            if (!conversation) {
              // Only open the new conversation if we aren't currently in a conversation context
              await actionsViewModel.open1to1Conversation(savedConversation);
            }
            onAction(Actions.SEND_REQUEST);
          },
          icon: 'plus-icon',
          identifier: ActionIdentifier[Actions.SEND_REQUEST],
          label: t('groupParticipantActionSendRequest'),
        }
      : undefined;

  const blockUser: MenuItem | undefined =
    isNotMe && isAvailable && (isConnected || isRequest)
      ? {
          click: async () => {
            await actionsViewModel.blockUser(user);
            await create1to1Conversation(user, false);
            onAction(Actions.BLOCK);
          },
          icon: 'block-icon',
          identifier: ActionIdentifier[Actions.BLOCK],
          label: t('groupParticipantActionBlock'),
        }
      : undefined;

  const unblockUser: MenuItem | undefined =
    isNotMe && isAvailable && isBlocked
      ? {
          click: async () => {
            await actionsViewModel.unblockUser(user);
            await create1to1Conversation(user, !conversation);
            onAction(Actions.UNBLOCK);
          },
          icon: 'block-icon',
          identifier: ActionIdentifier[Actions.UNBLOCK],
          label: t('groupParticipantActionUnblock'),
        }
      : undefined;

  const removeUserFromConversation: MenuItem | undefined =
    isNotMe &&
    conversation &&
    !conversation.removed_from_conversation() &&
    conversation.participating_user_ids().some(userId => matchQualifiedIds(userId, user)) &&
    conversationRoleRepository?.canRemoveParticipants(conversation)
      ? {
          click: async () => {
            await actionsViewModel.removeFromConversation(conversation, user);
            onAction(Actions.REMOVE);
          },
          icon: 'minus-icon',
          identifier: 'do-remove',
          label: t('groupParticipantActionRemove'),
        }
      : undefined;

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
  ].filter((item): item is MenuItem => !!item);

  return <PanelActions items={items} />;
};

export {UserActions};
