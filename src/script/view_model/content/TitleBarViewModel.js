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

import {getLogger} from 'Util/Logger';
import {t} from 'Util/LocalizerUtil';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {CONV_TYPE, CALL_TYPE} from '@wireapp/avs';

import {ConversationVerificationState} from '../../conversation/ConversationVerificationState';
import {WebAppEvents} from '../../event/WebApp';
import {Shortcut} from '../../ui/Shortcut';
import {ShortcutType} from '../../ui/ShortcutType';
import {ContentViewModel} from '../ContentViewModel';

window.z = window.z || {};
window.z.viewModel = z.viewModel || {};
window.z.viewModel.content = z.viewModel.content || {};

// Parent: ContentViewModel
z.viewModel.content.TitleBarViewModel = class TitleBarViewModel {
  constructor(callingViewModel, panelViewModel, contentViewModel, repositories) {
    this.addedToView = this.addedToView.bind(this);

    this.callingViewModel = callingViewModel;
    this.callingRepository = repositories.calling;
    this.conversationRepository = repositories.conversation;
    this.userRepository = repositories.user;
    this.multitasking = contentViewModel.multitasking;
    this.logger = getLogger('z.viewModel.content.TitleBarViewModel');

    this.panelViewModel = panelViewModel;
    this.contentViewModel = contentViewModel;

    this.panelIsVisible = this.panelViewModel.isVisible;

    // TODO remove the titlebar for now to ensure that buttons are clickable in macOS wrappers
    window.setTimeout(() => $('.titlebar').remove(), TIME_IN_MILLIS.SECOND);

    this.conversationEntity = this.conversationRepository.active_conversation;
    this.ConversationVerificationState = ConversationVerificationState;

    this.joinedCall = this.callingRepository.joinedCall;
    this.isActivatedAccount = this.userRepository.isActivatedAccount;

    this.hasCall = ko.pureComputed(() => {
      const hasEntities = this.conversationEntity() && this.joinedCall();
      return hasEntities ? this.conversationEntity().id === this.joinedCall().id : false;
    });

    this.badgeLabelCopy = ko.pureComputed(() => {
      let string;

      if (this.conversationEntity().hasGuest()) {
        string = this.conversationEntity().hasService()
          ? t('guestRoomConversationBadgeGuestAndService')
          : t('guestRoomConversationBadge');
      } else if (this.conversationEntity().hasService()) {
        string = t('guestRoomConversationBadgeService');
      }

      return string || '';
    });

    this.hasOngoingCall = ko.computed(() => {
      return this.hasCall() && this.joinedCall() ? this.joinedCall().isOngoing() : false;
    });

    this.showCallControls = ko.pureComputed(() => {
      if (!this.conversationEntity()) {
        return false;
      }

      const isSupportedConversation = this.conversationEntity().isGroup() || this.conversationEntity().is1to1();
      const hasParticipants = !!this.conversationEntity().participating_user_ids().length;
      const isActiveConversation = hasParticipants && !this.conversationEntity().removed_from_conversation();
      return !this.hasCall() && isSupportedConversation && isActiveConversation;
    });

    this.supportsVideoCall = ko.pureComputed(() => {
      return this.conversationEntity() && this.conversationEntity().supportsVideoCall(true);
    });

    const shortcut = Shortcut.getShortcutTooltip(ShortcutType.PEOPLE);
    this.peopleTooltip = t('tooltipConversationPeople', shortcut);
  }

  addedToView() {
    window.setTimeout(() => {
      amplify.subscribe(WebAppEvents.SHORTCUT.PEOPLE, () => this.showDetails());
      amplify.subscribe(WebAppEvents.SHORTCUT.ADD_PEOPLE, () => {
        if (this.isActivatedAccount()) {
          this.showAddParticipant();
        }
      });
    }, 50);
  }

  removedFromView() {
    amplify.unsubscribeAll(WebAppEvents.SHORTCUT.PEOPLE);
    amplify.unsubscribeAll(WebAppEvents.SHORTCUT.ADD_PEOPLE);
  }

  startAudioCall(conversationEntity) {
    this._startCall(conversationEntity, CALL_TYPE.NORMAL);
  }

  startVideoCall(conversationEntity) {
    this._startCall(conversationEntity, CALL_TYPE.VIDEO);
  }

  _startCall(conversationEntity, callType) {
    const convType = conversationEntity.isGroup() ? CONV_TYPE.GROUP : CONV_TYPE.ONEONONE;
    this.callingRepository.startCall(conversationEntity.id, convType, callType);
  }

  clickOnDetails() {
    this.showDetails();
  }

  clickOnCollectionButton() {
    amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentViewModel.STATE.COLLECTION);
  }

  showAddParticipant() {
    const canAddPeople = this.conversationEntity() && this.conversationEntity().isActiveParticipant();

    if (!canAddPeople) {
      return this.showDetails();
    }

    return this.conversationEntity().isGroup()
      ? this.showDetails(true)
      : amplify.publish(
          WebAppEvents.CONVERSATION.CREATE_GROUP,
          'conversation_details',
          this.conversationEntity().firstUserEntity(),
        );
  }

  showDetails(addParticipants) {
    const panelId = addParticipants
      ? z.viewModel.PanelViewModel.STATE.ADD_PARTICIPANTS
      : z.viewModel.PanelViewModel.STATE.CONVERSATION_DETAILS;

    this.panelViewModel.togglePanel(panelId);
  }
};
