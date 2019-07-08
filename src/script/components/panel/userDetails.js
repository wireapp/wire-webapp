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

import {AvailabilityType} from '../../user/AvailabilityType';
import {nameFromType} from '../../user/AvailabilityMapper';

import 'Components/availabilityState';

ko.components.register('panel-user-details', {
  template: `
    <div class="panel-participant">

      <!-- ko if: isVerified() -->
        <verified-icon class="panel-participant__verified-icon" data-uie-name="status-verified-participant"></verified-icon>
      <!-- /ko -->

      <div class="panel-participant__name" data-bind="text: participant().name()" data-uie-name="status-name"></div>


      <!-- ko if: participant().username() -->
        <div class="panel-participant__user-name" data-bind="text: participant().username()" data-uie-name="status-username"></div>
      <!-- /ko -->

      <participant-avatar params="participant: participant, size: z.components.ParticipantAvatar.SIZE.X_LARGE" data-uie-name="status-profile-picture"></participant-avatar>

      <!-- ko if: badge -->
        <div class="panel-participant__role-label" data-bind="text: badge" data-uie-name="status-partner"></div>
      <!-- /ko -->

      <!-- ko if: participant().isGuest() -->
        <div class="panel-participant__guest-label" data-uie-name="status-guest">
          <guest-icon></guest-icon>
          <span data-bind="text: t('conversationGuestIndicator')"></span>
        </div>
      <!-- /ko -->

      <!-- ko if: participant().isTemporaryGuest () -->
        <div class="panel-participant__guest-expiration" data-bind="text: participant().expirationText" data-uie-name="status-expiration-text"></div>
      <!-- /ko -->

      <!-- ko if: participant().inTeam() -->
        <availability-state
          class="panel-participant__availability"
          data-uie-name="status-availability"
          params="availability: participant().availability(), label: availabilityLabel()">
        </availability-state>
      <!-- /ko -->
    </div>
  `,
  viewModel: class {
    constructor(params) {
      this.participant = params.participant;
      this.isVerified = params.hasOwnProperty('isVerified') ? params.isVerified : this.participant().is_verified;
      this.badge = params.badge;
      this.availabilityLabel = ko.pureComputed(() => {
        const availabilitySetToNone = this.participant().availability() === AvailabilityType.NONE;
        if (!availabilitySetToNone) {
          return nameFromType(this.participant().availability());
        }
      });
    }
  },
});
