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

import ko from 'knockout';

import {AVATAR_SIZE} from 'Components/ParticipantAvatar';
import {UserlistMode} from 'Components/userList';
import {t} from 'Util/LocalizerUtil';
import {capitalizeFirstChar} from 'Util/StringUtil';

import {User} from '../../entity/User';
import {ServiceEntity} from '../../integration/ServiceEntity';
import {viewportObserver} from '../../ui/viewportObserver';

import 'Components/availabilityState';
import {Participant} from '../../calling/Participant';

interface ParticipantItemParams {
  badge: boolean;
  callParticipant?: Participant;
  canSelect: boolean;
  customInfo: string;
  external: boolean;
  hideInfo: boolean;
  isSelected: boolean;
  isSelfVerified: ko.Subscribable<boolean>;
  mode: UserlistMode;
  participant: User | ServiceEntity;
  selfInTeam: boolean;
}

class ParticipantItem {
  avatarSize: string;
  badge: boolean;
  canSelect: boolean;
  callParticipant?: Participant;
  contentInfo: string | ko.Observable<string>;
  external: boolean;
  hasUsernameInfo: boolean;
  isDefaultMode: boolean;
  isInViewport: ko.Observable<boolean>;
  isOthersMode: boolean;
  isSelected: boolean;
  isSelf: boolean;
  isSelfVerified: ko.Subscribable<boolean>;
  isService: boolean;
  isUser: boolean;
  participant: User | ServiceEntity;
  selfInTeam: boolean;
  selfString: string;

  constructor(
    {
      participant,
      badge,
      mode = UserlistMode.DEFAULT,
      canSelect,
      isSelected,
      callParticipant,
      customInfo,
      hideInfo,
      selfInTeam,
      external,
      isSelfVerified = ko.observable(false),
    }: ParticipantItemParams,
    element: HTMLElement,
  ) {
    this.avatarSize = AVATAR_SIZE.SMALL;
    this.participant = ko.unwrap(participant);
    this.isSelf = !!(this.participant as User).isMe;
    this.selfString = `(${capitalizeFirstChar(t('conversationYouNominative'))})`;
    this.isService = this.participant instanceof ServiceEntity || this.participant.isService;
    this.isUser = this.participant instanceof User && !this.participant.isService;
    this.selfInTeam = selfInTeam;
    this.isSelfVerified = isSelfVerified;
    this.badge = badge;

    this.isDefaultMode = mode === UserlistMode.DEFAULT;
    this.isOthersMode = mode === UserlistMode.OTHERS;

    this.canSelect = canSelect;
    this.isSelected = isSelected;
    this.callParticipant = ko.unwrap(callParticipant);

    this.external = external;
    const hasCustomInfo = !!customInfo;

    const isTemporaryGuest = this.isUser && (this.participant as User).isTemporaryGuest();
    this.hasUsernameInfo = this.isUser && !hideInfo && !hasCustomInfo && !isTemporaryGuest;

    if (hasCustomInfo) {
      this.contentInfo = customInfo;
    } else if (hideInfo) {
      this.contentInfo = null;
    } else if (this.isService) {
      this.contentInfo = (this.participant as ServiceEntity).summary;
    } else if (isTemporaryGuest) {
      this.contentInfo = (this.participant as User).expirationText;
    } else {
      this.contentInfo = (this.participant as User).username();
    }
    this.isInViewport = ko.observable(false);

    viewportObserver.trackElement(
      element,
      (isInViewport: boolean) => {
        if (isInViewport) {
          this.isInViewport(true);
          viewportObserver.removeElement(element);
        }
      },
      false,
      undefined,
    );
  }
}

ko.components.register('participant-item', {
  template: `
    <div class="participant-item" data-bind="attr: {'data-uie-name': isUser ? 'item-user' : 'item-service', 'data-uie-value': participant.name}">
      <!-- ko if: isInViewport() -->
        <div class="participant-item__image">
          <participant-avatar params="participant: participant, size: avatarSize"></participant-avatar>
        </div>

        <div class="participant-item__content">
          <div class="participant-item__content__name-wrapper">
            <!-- ko if: isUser && selfInTeam -->
              <availability-state class="participant-item__content__availability participant-item__content__name"
                data-uie-name="status-name"
                params="availability: participant.availability, label: participant.name"></availability-state>
            <!-- /ko -->

            <!-- ko if: isService || !selfInTeam -->
              <div class="participant-item__content__name" data-bind="text: participant.name" data-uie-name="status-name"></div>
            <!-- /ko -->
            <!-- ko if: isSelf -->
              <div class="participant-item__content__self-indicator" data-bind="text: selfString"></div>
            <!-- /ko -->
          </div>
          <div class="participant-item__content__info">
            <!-- ko if: contentInfo -->
              <span class="participant-item__content__username label-username-notext" data-bind="text: contentInfo, css: {'label-username': hasUsernameInfo}" data-uie-name="status-username"></span>
              <!-- ko if: hasUsernameInfo && badge -->
                <span class="participant-item__content__badge" data-uie-name="status-partner" data-bind="text: badge"></span>
              <!-- /ko -->
            <!-- /ko -->
          </div>
        </div>
        
        <!-- ko if: callParticipant -->
          <!-- ko if: callParticipant.sharesCamera() -->
            <camera-icon data-uie-name="status-video"></camera-icon>
          <!-- /ko -->

          <!-- ko if: callParticipant.sharesScreen() -->
            <screenshare-icon data-uie-name="status-screenshare"></screenshare-icon>
          <!-- /ko -->

          <!-- ko ifnot: callParticipant.isMuted() -->
            <mic-on-icon data-uie-name="status-audio-on"></mic-on-icon>
          <!-- /ko -->

          <!-- ko if: callParticipant.isMuted() -->
            <mic-off-icon data-uie-name="status-audio-off"></mic-off-icon>
          <!-- /ko -->
        <!-- /ko -->

        <!-- ko if: isUser && !isOthersMode && participant.isGuest() -->
          <guest-icon data-uie-name="status-guest"></guest-icon>
        <!-- /ko -->

        <!-- ko if: external -->
          <partner-icon data-uie-name="status-external"></partner-icon>
        <!-- /ko -->

        <!-- ko if: isUser && isSelfVerified() && participant.is_verified() -->
          <verified-icon data-uie-name="status-verified"></verified-icon>
        <!-- /ko -->

        <!-- ko if: canSelect -->
          <div class="search-list-item-select icon-check" data-bind="css: {'selected': isSelected}" data-uie-name="status-selected"></div>
        <!-- /ko -->

        <disclose-icon></disclose-icon>
      <!-- /ko -->
    </div>
  `,
  viewModel: {
    createViewModel: (props: ParticipantItemParams, componentInfo: {element: HTMLElement}) =>
      new ParticipantItem(props, componentInfo.element),
  },
});
