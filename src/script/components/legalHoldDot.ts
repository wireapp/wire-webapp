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
import {Conversation} from '../entity/Conversation';
import {UserRepository} from '../user/UserRepository';
import {LegalHoldModalViewModel} from '../view_model/content/LegalHoldModalViewModel';

interface LegalHoldParams {
  isPending: boolean;
  large: boolean;
  conversation?: Conversation;
  userRepository?: UserRepository;
  legalHoldModal?: LegalHoldModalViewModel;
}

ko.components.register('legal-hold-dot', {
  template: `
    <div class="legal-hold-dot"
         data-bind="click: onClick, css: {'legal-hold-dot--interactive': isInteractive, 'legal-hold-dot--large': large, 'legal-hold-dot--active': !isPending}">
      <!-- ko if: isPending -->
        <pending-icon></pending-icon>
      <!-- /ko -->
    </div>
    `,
  viewModel: function({
    isPending = false,
    large = false,
    conversation,
    userRepository,
    legalHoldModal,
  }: LegalHoldParams): void {
    this.large = large;
    this.isPending = isPending;
    this.isInteractive = !!legalHoldModal;

    this.onClick = () => {
      if (legalHoldModal) {
        if (conversation) {
          legalHoldModal.showUsers(conversation.participating_user_ets());
        } else if (userRepository) {
          legalHoldModal.showUsers([userRepository.self()]);
        }
      }
      // TODO: Implement opening the legal hold modal once built
      // if a conversation is passed, open the conversation specific modal, otherwise the one for the selfuser
    };
  },
});
