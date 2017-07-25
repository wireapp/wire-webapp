/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

'use strict';

window.z = window.z || {};
window.z.components = z.components || {};

z.components.ConversationListCallingCell = class ConversationListCallingCell {
  constructor(params) {
    this.conversation = params.conversation;
    this.is_selected = params.is_selected;

    this.users = ko.pureComputed(() => this.conversation.participating_user_ets());

    this.description = ko.observable('');
  }
};

ko.components.register('conversation-list-calling-cell', {
  template: `
    <div class="conversation-list-cell" data-bind="attr: {'data-uie-uid': conversation.id, 'data-uie-value': conversation.display_name}, css: {'conversation-list-cell-active': is_selected(conversation)}">
      <div class="conversation-list-cell-left">
        <!-- ko if: conversation.is_group() -->
          <group-avatar class="conversation-list-cell-avatar-arrow" params="users: users(), conversation: conversation"></group-avatar>
        <!-- /ko -->
        <!-- ko if: !conversation.is_group() && users().length -->
          <div class="user-avatar-halo">
            <user-avatar class="user-avatar-s" params="user: users()[0]"></user-avatar>
          </div>
        <!-- /ko -->
      </div>
      <div class="conversation-list-cell-center">
        <span class="conversation-list-cell-name" data-bind="text: conversation.display_name(), css: {'text-theme': is_selected(conversation)}"></span>
        <span class="conversation-list-cell-description" data-bind="text: description" data-uie-name="secondary-line"></span>
      </div>
      <div class="conversation-list-cell-right">
      </div>
    </div>
  `,
  viewModel: z.components.ConversationListCallingCell,
});
