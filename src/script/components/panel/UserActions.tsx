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
import {ClientMLSError, ClientMLSErrorLabel} from '@wireapp/core/lib/messagingProtocols/mls';
import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {WebAppEvents} from '@wireapp/webapp-events';

import * as Icon from 'Components/Icon';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {listCSS} from 'Components/panel/PanelActions/PanelActions.styles';
import {ACCESS_STATE} from 'Repositories/conversation/AccessState';
import type {ConversationRoleRepository} from 'Repositories/conversation/ConversationRoleRepository';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {Conversation} from 'Repositories/entity/Conversation';
import type {User} from 'Repositories/entity/User';
import {TeamState} from 'Repositories/team/TeamState';
import {SidebarTabs, useSidebarStore} from 'src/script/page/LeftSidebar/panels/Conversations/useSidebarStore';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';

import type {MenuItem} from './PanelActions';
import {PanelActions} from './PanelActions';
import {SingleAction} from './SingleAction/SingleAction';

import type {ActionsViewModel} from '../../view_model/ActionsViewModel';

export enum Actions {
  ACCEPT_REQUEST = 'UserActions.ACCEPT_REQUEST',
  BLOCK = 'UserActions.BLOCK',
  CANCEL_REQUEST = 'UserActions.CANCEL_REQUEST',
  IGNORE_REQUEST = 'UserActions.IGNORE_REQUEST',
  LEAVE = 'UserActions.LEAVE',
  OPEN_CONVERSATION = 'UserActions.OPEN_CONVERSATION',
  START_CONVERSATION = 'UserActions.START_CONVERSATION',
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
  [Actions.START_CONVERSATION]: 'start-conversation',
  [Actions.OPEN_PROFILE]: 'go-profile',
  [Actions.REMOVE]: 'do-remove',
  [Actions.SEND_REQUEST]: 'do-send-request',
  [Actions.UNBLOCK]: 'do-unblock',
};

interface UserActionsProps {
  actionsViewModel: ActionsViewModel;
  conversation?: Conversation;
  conversationRoleRepository?: ConversationRoleRepository;
  isSelfActivated: boolean;
  onAction: (action: Actions) => void;
  selfUser: User;
  user: User;
  isModal?: boolean;
  teamState?: TeamState;
  conversationState?: ConversationState;
}

function createPlaceholder1to1Conversation(user: User, selfUser: User) {
  const userConnection = user.connection();

  if (!userConnection) {
    throw new Error(`There's no connection with user ${user.qualifiedId.id}.`);
  }

  const {id, domain} = userConnection.conversationId;
  const conversation = new Conversation(id, domain);
  conversation.name(user.name());
  conversation.selfUser(selfUser);
  conversation.type(CONVERSATION_TYPE.CONNECT);
  conversation.participating_user_ids([user.qualifiedId]);
  conversation.participating_user_ets([user]);
  conversation.accessState(ACCESS_STATE.PERSONAL.ONE2ONE);
  conversation.last_event_timestamp(Date.now());
  conversation.connection(userConnection);
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
  isModal = false,
  teamState = container.resolve(TeamState),
  conversationState = container.resolve(ConversationState),
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

  const {setCurrentTab: setCurrentSidebarTab} = useSidebarStore();

  const has1to1Conversation = conversationState.has1to1ConversationWithUser(user.qualifiedId);

  const isNotMe = !user.isMe && isSelfActivated;

  const create1to1Conversation = async (userEntity: User, showConversation: boolean): Promise<void> => {
    const conversationEntity = await actionsViewModel.getOrCreate1to1Conversation(userEntity);
    if (showConversation) {
      setCurrentSidebarTab(SidebarTabs.RECENT);
      actionsViewModel.open1to1Conversation(conversationEntity);
    }
  };

  const openSelfProfile: MenuItem | undefined = user.isMe
    ? {
        click: () => {
          amplify.publish(WebAppEvents.PREFERENCES.MANAGE_ACCOUNT);
          onAction(Actions.OPEN_PROFILE);
        },
        Icon: Icon.ProfileIcon,
        identifier: ActionIdentifier[Actions.OPEN_PROFILE],
        label: t('groupParticipantActionSelfProfile'),
      }
    : undefined;

  const leaveConversation: MenuItem | undefined =
    user.isMe &&
    isSelfActivated &&
    conversation?.isGroupOrChannel() &&
    !conversation.isSelfUserRemoved() &&
    conversationRoleRepository?.canLeaveGroup(conversation)
      ? {
          click: async () => {
            await actionsViewModel.leaveConversation(conversation);
            onAction(Actions.LEAVE);
          },
          Icon: Icon.LeaveIcon,
          identifier: ActionIdentifier[Actions.LEAVE],
          label: conversation.isChannel() ? t('channelParticipantActionLeave') : t('groupParticipantActionLeave'),
        }
      : undefined;

  const open1To1Conversation: MenuItem | undefined =
    isNotMe && isAvailable && (isConnected || isTeamMember) && has1to1Conversation
      ? {
          click: async () => {
            await create1to1Conversation(user, true);
            onAction(Actions.OPEN_CONVERSATION);
          },
          Icon: Icon.MessageIcon,
          identifier: ActionIdentifier[Actions.OPEN_CONVERSATION],
          label: t('groupParticipantActionOpenConversation'),
        }
      : undefined;

  const start1To1Conversation: MenuItem | undefined =
    isNotMe && isAvailable && (isConnected || isTeamMember) && !has1to1Conversation
      ? {
          click: async () => {
            try {
              await create1to1Conversation(user, true);
              onAction(Actions.START_CONVERSATION);
            } catch (error) {
              if (error instanceof ClientMLSError && error.label === ClientMLSErrorLabel.NO_KEY_PACKAGES_AVAILABLE) {
                return PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
                  text: {
                    title: t('modal1To1ConversationCreateErrorNoKeyPackagesHeadline'),
                    htmlMessage: t('modal1To1ConversationCreateErrorNoKeyPackagesMessage', {name: user.name()}),
                  },
                });
              }
              throw error;
            }
          },
          Icon: Icon.MessageIcon,
          identifier: ActionIdentifier[Actions.START_CONVERSATION],
          label: t('groupParticipantActionStartConversation'),
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
          Icon: Icon.CheckIcon,
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
          Icon: Icon.CloseIcon,
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
          Icon: Icon.UndoIcon,
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
            setCurrentSidebarTab(SidebarTabs.RECENT);
            onAction(Actions.SEND_REQUEST);
          },
          Icon: Icon.PlusIcon,
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
          Icon: Icon.BlockIcon,
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
          Icon: Icon.BlockIcon,
          identifier: ActionIdentifier[Actions.UNBLOCK],
          label: t('groupParticipantActionUnblock'),
        }
      : undefined;

  const removeUserFromConversation: MenuItem | undefined =
    isNotMe &&
    conversation &&
    !conversation.isSelfUserRemoved() &&
    conversation.participating_user_ids().some(userId => matchQualifiedIds(userId, user)) &&
    conversationRoleRepository?.canRemoveParticipants(conversation)
      ? {
          click: async () => {
            await actionsViewModel.removeFromConversation(conversation, user);
            onAction(Actions.REMOVE);
          },
          Icon: Icon.MinusIcon,
          identifier: 'do-remove',
          label: t('groupParticipantActionRemove'),
        }
      : undefined;

  const items = [
    openSelfProfile,
    leaveConversation,
    open1To1Conversation,
    start1To1Conversation,
    acceptConnectionRequest,
    ignoreConnectionRequest,
    cancelConnectionRequest,
    sendConnectionRequest,
    blockUser,
    unblockUser,
    removeUserFromConversation,
  ].filter((item): item is MenuItem => !!item);

  return items.length === 1 && isModal ? (
    <SingleAction
      oneButtonPerRow={items[0].identifier === ActionIdentifier[Actions.START_CONVERSATION]}
      item={items[0]}
      onCancel={onAction}
    />
  ) : (
    <ul css={listCSS}>
      <PanelActions items={items} />
    </ul>
  );
};

export {UserActions};
