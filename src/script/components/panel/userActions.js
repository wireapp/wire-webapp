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
import {t} from 'utils/LocalizerUtil';

import './panelActions';

ko.components.register('user-actions', {
  template: '<panel-actions params="items: items()"></panel-actions>',
  viewModel: function({user, conversation, actionsViewModel, onUserRemove = () => {}, isSelfActivated}) {
    user = ko.unwrap(user);
    conversation = ko.unwrap(conversation);
    isSelfActivated = ko.unwrap(isSelfActivated);
    const isMe = user.is_me;
    const isNotMe = !isMe && isSelfActivated;

    const allItems = [
      {
        // open self profile
        condition: () => isMe,
        item: {
          click: () => amplify.publish(z.event.WebApp.PREFERENCES.MANAGE_ACCOUNT),
          icon: 'profile-icon',
          identifier: 'go-profile',
          label: t('groupParticipantActionSelfProfile'),
        },
      },
      {
        // self leave conversation
        condition: () => {
          return (
            isMe &&
            isSelfActivated &&
            conversation &&
            conversation.isGroup() &&
            !conversation.removed_from_conversation()
          );
        },
        item: {
          click: () => actionsViewModel.leaveConversation(conversation),
          icon: 'leave-icon',
          identifier: 'do-leave',
          label: t('groupParticipantActionLeave'),
        },
      },
      {
        // open conversation
        condition: () => isNotMe && (user.isConnected() || user.isTeamMember()),
        item: {
          click: () => actionsViewModel.open1to1Conversation(user),
          icon: 'message-icon',
          identifier: 'go-conversation',
          label: t('groupParticipantActionOpenConversation'),
        },
      },
      {
        // accept request
        condition: () => isNotMe && user.isIncomingRequest(),
        item: {
          click: () => actionsViewModel.acceptConnectionRequest(user, true),
          icon: 'check-icon',
          identifier: 'do-accept-request',
          label: t('groupParticipantActionIncomingRequest'),
        },
      },
      {
        //ignore request
        condition: () => isNotMe && user.isIncomingRequest(),
        item: {
          click: () => actionsViewModel.ignoreConnectionRequest(user),
          icon: 'close-icon',
          identifier: 'do-ignore-request',
          label: t('groupParticipantActionIgnoreRequest'),
        },
      },
      {
        //open request
        condition: () => isNotMe && user.isOutgoingRequest(),
        item: {
          click: () => actionsViewModel.open1to1Conversation(user),
          icon: 'message-icon',
          identifier: 'go-conversation',
          label: t('groupParticipantActionPending'),
        },
      },
      {
        // cancel request
        condition: () => isNotMe && user.isOutgoingRequest(),
        item: {
          click: () => actionsViewModel.cancelConnectionRequest(user),
          icon: 'undo-icon',
          identifier: 'do-cancel-request',
          label: t('groupParticipantActionCancelRequest'),
        },
      },
      {
        // send request
        condition: () => {
          const isNotConnectedUser = user.isCanceled() || user.isUnknown();
          const canConnect = !user.isTeamMember() && !user.isTemporaryGuest();
          return isNotMe && isNotConnectedUser && canConnect;
        },
        item: {
          click: () => actionsViewModel.sendConnectionRequest(user),
          icon: 'plus-icon',
          identifier: 'do-send-request',
          label: t('groupParticipantActionSendRequest'),
        },
      },
      {
        // block user
        condition: () => isNotMe && (user.isConnected() || user.isRequest()),
        item: {
          click: () => actionsViewModel.blockUser(user),
          icon: 'block-icon',
          identifier: 'do-block',
          label: t('groupParticipantActionBlock'),
        },
      },
      {
        // unblock user
        condition: () => isNotMe && user.isBlocked(),
        item: {
          click: () => actionsViewModel.unblockUser(user, false),
          icon: 'block-icon',
          identifier: 'do-unblock',
          label: t('groupParticipantActionUnblock'),
        },
      },
      {
        // remove user from conversation
        condition: () => {
          return (
            isNotMe &&
            conversation &&
            conversation.isActiveParticipant() &&
            conversation.participating_user_ids().some(id => user.id === id) &&
            z.userPermission().canUpdateGroupParticipants()
          );
        },
        item: {
          click: () => actionsViewModel.removeFromConversation(conversation, user).then(onUserRemove),
          icon: 'minus-icon',
          identifier: 'do-remove',
          label: t('groupParticipantActionRemove'),
        },
      },
    ];

    this.items = ko.computed(() => (user ? allItems.filter(({condition}) => condition()).map(({item}) => item) : []));
  },
});
