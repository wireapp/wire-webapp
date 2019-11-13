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
import {ConversationLabel} from '../../conversation/ConversationLabelRepository';
import {NOTIFICATION_STATE} from '../../conversation/NotificationSetting';

interface GroupedConversationHeaderParams {
  conversationLabel: ConversationLabel;
  isOpen: boolean;
}

ko.components.register('grouped-conversation-header', {
  template: `
    <div class="conversation-folder__head" data-uie-name="conversation-folder-head" data-bind="css: {'conversation-folder__head--open': isOpen}">
      <disclose-icon></disclose-icon>
      <span class="conversation-folder__head__name" data-bind="text: label.name"></span>
      <!-- ko if: badge() -->
        <span class="cell-badge-dark conversation-folder__head__badge" data-bind="text: badge" data-uie-name="conversation-folder-badge"></span>
      <!-- /ko -->
    </div>
  `,
  viewModel: function({conversationLabel, isOpen}: GroupedConversationHeaderParams): void {
    this.label = conversationLabel;
    this.isOpen = isOpen;
    this.badge = ko.pureComputed(
      () =>
        conversationLabel.conversations().filter(conversation => {
          const mutedState = conversation.mutedState();
          if (typeof mutedState === 'boolean') {
            const isMuted = mutedState === true;
            return isMuted ? false : conversation.hasUnread();
          }
          if (mutedState === NOTIFICATION_STATE.NOTHING) {
            return false;
          }
          if (mutedState === NOTIFICATION_STATE.MENTIONS_AND_REPLIES) {
            return conversation.hasUnreadTargeted();
          }
          return conversation.hasUnread();
        }).length,
    );
  },
});
