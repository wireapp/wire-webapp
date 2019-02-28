/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import Logger from 'utils/Logger';

import BasePanelViewModel from './BasePanelViewModel';
import {t} from 'utils/LocalizerUtil';

import '../../components/panel/panelActions';
import '../../components/panel/enrichedFields';
import '../../components/panel/userDetails';

export default class GroupParticipantUserViewModel extends BasePanelViewModel {
  constructor(params) {
    super(params);

    const {mainViewModel, repositories} = params;

    this.userRepository = repositories.user;
    this.actionsViewModel = mainViewModel.actions;

    this.logger = new Logger('GroupParticipantUserViewModel', z.config.LOGGER.OPTIONS);

    this.selectedParticipant = ko.observable(undefined);

    this.showActionDevices = ko.pureComputed(() => !this.selectedParticipant().is_me);
  }

  getElementId() {
    return 'group-participant-user';
  }

  getEntityId() {
    return this.selectedParticipant().id;
  }

  getParticipantActions(userEntity, conversationEntity) {
    if (!userEntity) {
      return [];
    }

    const openProfile = {
      condition: () => true,
      item: {
        click: () => this.clickOnShowProfile(),
        icon: 'profile-icon',
        identifier: 'go-profile',
        label: t('groupParticipantActionSelfProfile'),
      },
    };
    const openConversation = {
      condition: () => userEntity.isConnected() || userEntity.isTeamMember(),
      item: {
        click: () => this.clickOnOpenConversation(),
        icon: 'message-icon',
        identifier: 'go-conversation',
        label: t('groupParticipantActionOpenConversation'),
      },
    };
    const acceptRequest = {
      condition: () => userEntity.isIncomingRequest(),
      item: {
        click: () => this.clickToAcceptRequest(),
        icon: 'check-icon',
        identifier: 'do-accept-request',
        label: t('groupParticipantActionIncomingRequest'),
      },
    };
    const ignoreRequest = {
      condition: () => userEntity.isIncomingRequest(),
      item: {
        click: () => this.clickToIgnoreRequest(),
        icon: 'close-icon',
        identifier: 'do-ignore-request',
        label: t('groupParticipantActionIgnoreRequest'),
      },
    };
    const openRequest = {
      condition: () => userEntity.isOutgoingRequest(),
      item: {
        click: () => this.clickOnOpenConversation(),
        icon: 'message-icon',
        identifier: 'go-conversation',
        label: t('groupParticipantActionPending'),
      },
    };
    const cancelRequest = {
      condition: () => userEntity.isOutgoingRequest(),
      item: {
        click: () => this.clickToCancelRequest(),
        icon: 'undo-icon',
        identifier: 'do-cancel-request',
        label: t('groupParticipantActionCancelRequest'),
      },
    };
    const sendRequest = {
      condition: () => {
        const isNotConnectedUser = userEntity.isCanceled() || userEntity.isUnknown();
        const canConnect = !userEntity.isTeamMember() && !userEntity.isTemporaryGuest();
        return isNotConnectedUser && canConnect;
      },
      item: {
        click: () => this.clickToSendRequest(),
        icon: 'plus-icon',
        identifier: 'do-send-request',
        label: t('groupParticipantActionSendRequest'),
      },
    };
    const block = {
      condition: () => userEntity.isConnected() || userEntity.isRequest(),
      item: {
        click: () => this.clickToBlock(),
        icon: 'block-icon',
        identifier: 'do-block',
        label: t('groupParticipantActionBlock'),
      },
    };
    const unblock = {
      condition: () => userEntity.isBlocked(),
      item: {
        click: () => this.clickToUnblock(),
        icon: 'block-icon',
        identifier: 'do-unblock',
        label: t('groupParticipantActionUnblock'),
      },
    };
    const leave = {
      condition: () => {
        const isActiveParticipant = conversationEntity && !conversationEntity.removed_from_conversation();
        return conversationEntity.isGroup() && isActiveParticipant;
      },
      item: {
        click: () => this.clickToLeave(),
        icon: 'leave-icon',
        identifier: 'do-leave',
        label: t('groupParticipantActionLeave'),
      },
    };
    const remove = {
      condition: () => {
        const isActive = this.isVisible() && conversationEntity.isActiveParticipant();
        const isInConversation = conversationEntity.participating_user_ids().some(id => userEntity.id === id);

        return isActive && isInConversation && z.userPermission().canUpdateGroupParticipants();
      },
      item: {
        click: () => this.clickToRemove(),
        icon: 'minus-icon',
        identifier: 'do-remove',
        label: t('groupParticipantActionRemove'),
      },
    };

    const selfIsActivatedAccount = this.userRepository.isActivatedAccount();

    let allItems = [];
    if (userEntity.is_me) {
      allItems = selfIsActivatedAccount ? [openProfile, leave] : [openProfile];
    } else {
      allItems = selfIsActivatedAccount
        ? [
            openConversation,
            acceptRequest,
            ignoreRequest,
            openRequest,
            cancelRequest,
            sendRequest,
            block,
            unblock,
            remove,
          ]
        : [];
    }
    return allItems.filter(menuElement => menuElement.condition()).map(menuElement => menuElement.item);
  }

  clickOnDevices() {
    this.navigateTo(z.viewModel.PanelViewModel.STATE.PARTICIPANT_DEVICES, {entity: this.selectedParticipant()});
  }

  clickOnShowProfile() {
    amplify.publish(z.event.WebApp.PREFERENCES.MANAGE_ACCOUNT);
  }

  clickOnOpenConversation() {
    this.actionsViewModel.open1to1Conversation(this.selectedParticipant());
  }

  clickToAcceptRequest() {
    this.actionsViewModel.acceptConnectionRequest(this.selectedParticipant(), true);
  }

  clickToBlock() {
    this.actionsViewModel.blockUser(this.selectedParticipant());
  }

  clickToCancelRequest() {
    this.actionsViewModel.cancelConnectionRequest(this.selectedParticipant());
  }

  clickToIgnoreRequest() {
    this.actionsViewModel.ignoreConnectionRequest(this.selectedParticipant());
  }

  clickToLeave() {
    this.actionsViewModel.leaveConversation(this.activeConversation());
  }

  clickToRemove() {
    this.actionsViewModel
      .removeFromConversation(this.activeConversation(), this.selectedParticipant())
      .then(this.onGoBack);
  }

  clickToSendRequest() {
    this.actionsViewModel.sendConnectionRequest(this.selectedParticipant());
  }

  clickToUnblock() {
    this.actionsViewModel.unblockUser(this.selectedParticipant(), false);
  }

  initView({entity: user}) {
    const userEntity = user;
    this.selectedParticipant(userEntity);

    if (userEntity.isTemporaryGuest()) {
      userEntity.checkGuestExpiration();
    }
  }
}
