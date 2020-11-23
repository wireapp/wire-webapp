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
import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';

import {t} from 'Util/LocalizerUtil';

import './panelActions';
import type {User} from '../../entity/User';
import type {ConversationRoleRepository} from '../../conversation/ConversationRoleRepository';
import type {Conversation} from '../../entity/Conversation';
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

interface UserInputParams {
  actionsViewModel: ActionsViewModel;
  conversation: ko.Observable<Conversation> | (() => null);
  conversationRoleRepository: ConversationRoleRepository;
  isSelfActivated: ko.Observable<boolean>;
  onAction: (action: Actions) => void;
  user: ko.Observable<User>;
}

interface UserActionItem {
  click: () => void;
  icon: string;
  identifier: string;
  label: string;
}

type UserAction = {
  condition: () => boolean;
  item: UserActionItem;
};

class UserActions {
  isSelfActivated: boolean;
  isMe: ko.Computed<boolean>;
  isNotMe: ko.Computed<any>;
  items: ko.Computed<UserActionItem[]>;

  constructor({
    user,
    conversation = () => null,
    actionsViewModel,
    onAction,
    isSelfActivated,
    conversationRoleRepository,
  }: UserInputParams) {
    this.isSelfActivated = ko.unwrap(isSelfActivated);
    this.isMe = ko.computed(() => user().isMe);
    this.isNotMe = ko.computed(() => !this.isMe() && this.isSelfActivated);
    const switchTo1on1Conversation = !conversation();

    const create1to1Conversation = async (userEntity: User, showConversation: boolean): Promise<void> => {
      const conversationEntity = await actionsViewModel.getOrCreate1to1Conversation(userEntity);
      if (showConversation) {
        await actionsViewModel.open1to1Conversation(conversationEntity);
      }
    };

    const openSelfProfile: UserAction = {
      condition: () => this.isMe(),
      item: {
        click: () => {
          amplify.publish(WebAppEvents.PREFERENCES.MANAGE_ACCOUNT);
          onAction(Actions.OPEN_PROFILE);
        },
        icon: 'profile-icon',
        identifier: 'go-profile',
        label: t('groupParticipantActionSelfProfile'),
      },
    };

    const leaveConversation: UserAction = {
      condition: () => {
        return (
          this.isMe() &&
          this.isSelfActivated &&
          conversation()?.isGroup() &&
          !conversation().removed_from_conversation() &&
          conversationRoleRepository.canLeaveGroup(conversation())
        );
      },
      item: {
        click: async () => {
          await actionsViewModel.leaveConversation(conversation());
          onAction(Actions.LEAVE);
        },
        icon: 'leave-icon',
        identifier: 'do-leave',
        label: t('groupParticipantActionLeave'),
      },
    };

    const open1To1Conversation: UserAction = {
      condition: () => this.isNotMe() && (user().isConnected() || user().isTeamMember()),
      item: {
        click: async () => {
          await create1to1Conversation(user(), true);
          onAction(Actions.OPEN_CONVERSATION);
        },
        icon: 'message-icon',
        identifier: 'go-conversation',
        label: t('groupParticipantActionOpenConversation'),
      },
    };

    const acceptConnectionRequest: UserAction = {
      condition: () => this.isNotMe() && user().isIncomingRequest(),
      item: {
        click: async () => {
          await actionsViewModel.acceptConnectionRequest(user());
          await create1to1Conversation(user(), true);
          onAction(Actions.ACCEPT_REQUEST);
        },
        icon: 'check-icon',
        identifier: 'do-accept-request',
        label: t('groupParticipantActionIncomingRequest'),
      },
    };

    const ignoreConnectionRequest: UserAction = {
      condition: () => this.isNotMe() && user().isIncomingRequest(),
      item: {
        click: async () => {
          await actionsViewModel.ignoreConnectionRequest(user());
          await create1to1Conversation(user(), false);
          onAction(Actions.IGNORE_REQUEST);
        },
        icon: 'close-icon',
        identifier: 'do-ignore-request',
        label: t('groupParticipantActionIgnoreRequest'),
      },
    };

    const cancelConnectionRequest: UserAction = {
      condition: () => this.isNotMe() && user().isOutgoingRequest(),
      item: {
        click: async () => {
          await actionsViewModel.cancelConnectionRequest(user());
          await create1to1Conversation(user(), false);
          onAction(Actions.CANCEL_REQUEST);
        },
        icon: 'undo-icon',
        identifier: 'do-cancel-request',
        label: t('groupParticipantActionCancelRequest'),
      },
    };

    const sendConnectionRequest: UserAction = {
      condition: () => {
        const isNotConnectedUser = user().isCanceled() || user().isUnknown();
        const canConnect = !user().isTeamMember() && !user().isTemporaryGuest();
        return this.isNotMe() && isNotConnectedUser && canConnect;
      },
      item: {
        click: async () => {
          await actionsViewModel.sendConnectionRequest(user());
          await create1to1Conversation(user(), switchTo1on1Conversation);
          onAction(Actions.SEND_REQUEST);
        },
        icon: 'plus-icon',
        identifier: 'do-send-request',
        label: t('groupParticipantActionSendRequest'),
      },
    };

    const blockUser: UserAction = {
      condition: () => this.isNotMe() && (user().isConnected() || user().isRequest()),
      item: {
        click: async () => {
          await actionsViewModel.blockUser(user());
          await create1to1Conversation(user(), false);
          onAction(Actions.BLOCK);
        },
        icon: 'block-icon',
        identifier: 'do-block',
        label: t('groupParticipantActionBlock'),
      },
    };

    const unblockUser: UserAction = {
      condition: () => this.isNotMe() && user().isBlocked(),
      item: {
        click: async () => {
          await actionsViewModel.unblockUser(user());
          await create1to1Conversation(user(), switchTo1on1Conversation);
          onAction(Actions.UNBLOCK);
        },
        icon: 'block-icon',
        identifier: 'do-unblock',
        label: t('groupParticipantActionUnblock'),
      },
    };

    const removeUserFromConversation: UserAction = {
      condition: () =>
        this.isNotMe() &&
        conversation() &&
        !conversation().removed_from_conversation() &&
        conversation()
          .participating_user_ids()
          .some(id => user().id === id) &&
        conversationRoleRepository.canRemoveParticipants(conversation()),
      item: {
        click: async () => {
          await actionsViewModel.removeFromConversation(conversation(), user());
          await create1to1Conversation(user(), false);
          onAction(Actions.REMOVE);
        },
        icon: 'minus-icon',
        identifier: 'do-remove',
        label: t('groupParticipantActionRemove'),
      },
    };

    const allItems: UserAction[] = [
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
    ];

    this.items = ko.computed(() => (user() ? allItems.filter(({condition}) => condition()).map(({item}) => item) : []));
  }

  dispose = () => {
    this.isMe.dispose();
    this.isNotMe.dispose();
    this.items.dispose();
  };
}

ko.components.register('user-actions', {
  template: '<panel-actions params="items: items()"></panel-actions>',
  viewModel: {
    createViewModel(params: UserInputParams) {
      return new UserActions(params);
    },
  },
});
