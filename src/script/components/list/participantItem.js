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

import {User} from '../../entity/User';
import {ServiceEntity} from '../../integration/ServiceEntity';
import {UserlistMode} from 'Components/userList';

window.z = window.z || {};
window.z.components = z.components || {};

z.components.ParticipantItem = class ParticipantItem {
  constructor(params) {
    this.participant = ko.unwrap(params.participant);
    this.isService = this.participant instanceof ServiceEntity || this.participant.isService;
    this.isUser = this.participant instanceof User && !this.participant.isService;
    this.selfUser = window.wire.app.repository.user.self;
    this.isTemporaryGuest = this.isUser && this.participant.isTemporaryGuest();
    this.badge = params.badge;

    this.mode = params.mode || UserlistMode.DEFAULT;
    this.isDefaultMode = this.mode === UserlistMode.DEFAULT;
    this.isOthersMode = this.mode === UserlistMode.OTHERS;

    this.canSelect = params.canSelect;
    this.isSelected = params.isSelected;
    this.showCamera = params.showCamera;
    const hasCustomInfo = !!params.customInfo;

    this.hasUsernameInfo = this.isUser && !params.hideInfo && !hasCustomInfo && !this.isTemporaryGuest;

    if (hasCustomInfo) {
      this.contentInfo = params.customInfo;
    } else if (params.hideInfo) {
      this.contentInfo = null;
    } else if (this.isService) {
      this.contentInfo = this.participant.summary;
    } else if (this.isTemporaryGuest) {
      this.contentInfo = this.participant.expirationText;
    } else {
      this.contentInfo = this.participant.username();
    }
  }
};

ko.components.register('participant-item', {
  template: `
    <div class="participant-item" data-bind="attr: {'data-uie-name': isUser ? 'item-user' : 'item-service', 'data-uie-value': participant.name}">
      <div class="participant-item-image">
        <participant-avatar params="participant: participant, size: z.components.ParticipantAvatar.SIZE.SMALL"></participant-avatar>
      </div>

      <div class="participant-item-content">
        <!-- ko if: isUser && selfUser().inTeam() -->
          <availability-state class="participant-item-content-availability participant-item-content-name"
            data-uie-name="status-name"
            params="availability: participant.availability, label: participant.name"></availability-state>
        <!-- /ko -->

        <!-- ko if: isService || !selfUser().inTeam() -->
          <div class="participant-item-content-name" data-bind="text: participant.name" data-uie-name="status-name"></div>
        <!-- /ko -->
        <div class="participant-item-content-info">
          <!-- ko if: contentInfo -->
            <span class="participant-item-content-username label-username-notext" data-bind="text: contentInfo, css: {'label-username': hasUsernameInfo}" data-uie-name="status-username"></span>
            <!-- ko if: hasUsernameInfo && badge -->
              <span class="participant-item-content-badge" data-uie-name="status-partner">Partner</span>
            <!-- /ko -->
          <!-- /ko -->
        </div>
      </div>

      <!-- ko if: isUser && participant.is_verified() -->
        <verified-icon data-uie-name="status-verified"></verified-icon>
      <!-- /ko -->

      <!-- ko if: isUser && !isOthersMode && participant.isGuest() -->
        <guest-icon class="participant-item-guest-indicator" data-uie-name="status-guest"></guest-icon>
      <!-- /ko -->

      <!-- ko if: showCamera -->
        <camera-icon data-uie-name="status-video"></camera-icon>
      <!-- /ko -->

      <!-- ko if: canSelect -->
        <div class="search-list-item-select icon-check" data-bind="css: {'selected': isSelected}" data-uie-name="status-selected"></div>
      <!-- /ko -->

      <disclose-icon></disclose-icon>
    </div>
  `,
  viewModel: z.components.ParticipantItem,
});
