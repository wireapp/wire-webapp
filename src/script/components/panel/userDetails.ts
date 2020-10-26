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

import {AVATAR_SIZE} from 'Components/ParticipantAvatar';
import type {User} from '../../entity/User';

import 'Components/availabilityState';

interface UserDetailsProps {
  badge?: string;
  isGroupAdmin: boolean;
  isSelfVerified: ko.Subscribable<boolean>;
  isVerified?: ko.PureComputed<boolean>;
  participant: ko.Observable<User>;
}

ko.components.register('panel-user-details', {
  template: `
    <div class="panel-participant">
      <div class="panel-participant__head">
        <!-- ko if: participant().inTeam() -->
          <availability-state class="panel-participant__head__name"
            data-uie-name="status-name"
            params="availability: participant().availability, label: participant().name()"></availability-state>
        <!-- /ko -->

        <!-- ko ifnot: participant().inTeam() -->
          <div class="panel-participant__head__name" data-bind="text: participant().name()" data-uie-name="status-name"></div>
        <!-- /ko -->

        <!-- ko if: isSelfVerified() && isVerified() -->
          <verified-icon class="panel-participant__head__verified-icon" data-uie-name="status-verified-participant"></verified-icon>
        <!-- /ko -->
      </div>

      <!-- ko if: participant().username() -->
        <div class="panel-participant__user-name" data-bind="text: participant().username()" data-uie-name="status-username"></div>
      <!-- /ko -->

      <participant-avatar params="participant: participant, size: '${AVATAR_SIZE.X_LARGE}'" data-uie-name="status-profile-picture"></participant-avatar>

      <!-- ko if: badge -->
        <div class="panel-participant__label" data-uie-name="status-external">
          <partner-icon></partner-icon>
          <span data-bind="text: badge"></span>
        </div>
      <!-- /ko -->

      <!-- ko if: participant().isGuest() -->
        <div class="panel-participant__label" data-uie-name="status-guest">
          <guest-icon></guest-icon>
          <span data-bind="text: t('conversationGuestIndicator')"></span>
        </div>
      <!-- /ko -->

      <!-- ko if: participant().isTemporaryGuest () -->
        <div class="panel-participant__guest-expiration" data-bind="text: participant().expirationText" data-uie-name="status-expiration-text"></div>
      <!-- /ko -->

      <!-- ko if: isGroupAdmin -->
        <div class="panel-participant__label" data-uie-name="status-admin">
          <group-admin-icon></group-admin-icon>
          <span data-bind="text: t('conversationDetailsGroupAdmin')"></span>
        </div>
      <!-- /ko -->
    </div>
  `,
  viewModel: function ({
    participant,
    isVerified = participant().is_verified,
    badge,
    isGroupAdmin,
    isSelfVerified = ko.observable(false),
  }: UserDetailsProps): void {
    this.participant = participant;
    this.isVerified = isVerified;
    this.badge = badge;
    this.isGroupAdmin = isGroupAdmin;
    this.isSelfVerified = isSelfVerified;

    amplify.publish(WebAppEvents.USER.UPDATE, this.participant().id);
  },
});
