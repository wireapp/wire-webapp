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

import {CONV_TYPE, CALL_TYPE} from '@wireapp/avs';
import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';
import ko from 'knockout';

import {t} from 'Util/LocalizerUtil';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {ConversationVerificationState} from '../../conversation/ConversationVerificationState';
import {Shortcut} from '../../ui/Shortcut';
import {ShortcutType} from '../../ui/ShortcutType';
import {ContentViewModel} from '../ContentViewModel';
import {CallingViewModel} from '../CallingViewModel';
import {PanelViewModel} from '../PanelViewModel';
import {CallingRepository} from '../../calling/CallingRepository';
import {Conversation} from '../../entity/Conversation';
import {Call} from '../../calling/Call';
import {container} from 'tsyringe';
import {UserState} from '../../user/UserState';
import {ConversationState} from '../../conversation/ConversationState';

// Parent: ContentViewModel
export class TitleBarViewModel {
  readonly panelIsVisible: ko.PureComputed<boolean>;
  readonly conversationEntity: ko.Observable<Conversation>;
  readonly ConversationVerificationState: typeof ConversationVerificationState;
  private readonly joinedCall: ko.PureComputed<Call | undefined>;
  readonly isActivatedAccount: ko.PureComputed<boolean>;
  private readonly hasCall: ko.PureComputed<boolean>;
  readonly badgeLabelCopy: ko.PureComputed<string>;
  readonly showCallControls: ko.PureComputed<boolean>;
  readonly supportsVideoCall: ko.PureComputed<boolean>;
  readonly peopleTooltip: string;

  constructor(
    readonly callingViewModel: CallingViewModel,
    private readonly panelViewModel: PanelViewModel,
    readonly contentViewModel: ContentViewModel,
    private readonly callingRepository: CallingRepository,
    private readonly userState = container.resolve(UserState),
    private readonly conversationState = container.resolve(ConversationState),
  ) {
    this.contentViewModel = contentViewModel;

    this.panelIsVisible = panelViewModel.isVisible;

    // TODO remove the titlebar for now to ensure that buttons are clickable in macOS wrappers
    window.setTimeout(() => $('.titlebar').remove(), TIME_IN_MILLIS.SECOND);

    this.conversationEntity = this.conversationState.activeConversation;
    this.ConversationVerificationState = ConversationVerificationState;

    this.joinedCall = this.callingRepository.joinedCall;
    this.isActivatedAccount = this.userState.isActivatedAccount;

    this.hasCall = ko.pureComputed(() => {
      const hasEntities = this.conversationEntity() && !!this.joinedCall();
      return hasEntities ? this.conversationEntity().id === this.joinedCall().conversationId : false;
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

    this.showCallControls = ko.pureComputed(() => {
      if (!this.conversationEntity()) {
        return false;
      }

      const isSupportedConversation = this.conversationEntity().isGroup() || this.conversationEntity().is1to1();
      const hasParticipants = !!this.conversationEntity().participating_user_ids().length;
      const isActiveConversation = hasParticipants && !this.conversationEntity().removed_from_conversation();
      return !this.hasCall() && isSupportedConversation && isActiveConversation;
    });

    this.supportsVideoCall = ko.pureComputed(() =>
      this.conversationEntity()?.supportsVideoCall(callingRepository.supportsConferenceCalling),
    );

    const shortcut = Shortcut.getShortcutTooltip(ShortcutType.PEOPLE);
    this.peopleTooltip = t('tooltipConversationPeople', shortcut);
  }

  addedToView = (): void => {
    window.setTimeout(() => {
      amplify.subscribe(WebAppEvents.SHORTCUT.PEOPLE, () => this.showDetails(false));
      amplify.subscribe(WebAppEvents.SHORTCUT.ADD_PEOPLE, () => {
        if (this.isActivatedAccount()) {
          this.showAddParticipant();
        }
      });
    }, 50);
  };

  removedFromView = () => {
    amplify.unsubscribeAll(WebAppEvents.SHORTCUT.PEOPLE);
    amplify.unsubscribeAll(WebAppEvents.SHORTCUT.ADD_PEOPLE);
  };

  startAudioCall = (conversationEntity: Conversation): void => {
    this._startCall(conversationEntity, CALL_TYPE.NORMAL);
  };

  startVideoCall = (conversationEntity: Conversation): void => {
    this._startCall(conversationEntity, CALL_TYPE.VIDEO);
  };

  private readonly _startCall = (conversationEntity: Conversation, callType: CALL_TYPE): void => {
    const convType = conversationEntity.isGroup() ? CONV_TYPE.GROUP : CONV_TYPE.ONEONONE;
    this.callingRepository.startCall(conversationEntity.id, convType, callType);
  };

  clickOnDetails = (): void => {
    this.showDetails(false);
  };

  clickOnCollectionButton = (): void => {
    amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentViewModel.STATE.COLLECTION);
  };

  showAddParticipant = (): void => {
    const canAddPeople = this.conversationEntity() && this.conversationEntity().isActiveParticipant();

    if (!canAddPeople) {
      return this.showDetails(false);
    }

    if (this.conversationEntity().isGroup()) {
      this.showDetails(true);
    } else {
      amplify.publish(
        WebAppEvents.CONVERSATION.CREATE_GROUP,
        'conversation_details',
        this.conversationEntity().firstUserEntity(),
      );
    }
  };

  showDetails = (addParticipants: boolean): void => {
    const panelId = addParticipants ? PanelViewModel.STATE.ADD_PARTICIPANTS : PanelViewModel.STATE.CONVERSATION_DETAILS;

    this.panelViewModel.togglePanel(panelId, undefined);
  };
}
