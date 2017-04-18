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

z.components.ConversationListCell = class ConversationListCell {
  constructor(params, component_info) {
    this.on_in_viewport = this.on_in_viewport.bind(this);
    this.conversation = params.conversation;
    this.is_selected = params.is_selected || function() {};
    this.entered_viewport = ko.observable(false);
    this.user = ko.pureComputed(() => this.conversation.participating_user_ets()[0]);
    this.users = ko.pureComputed(() => this.conversation.participating_user_ets().slice(0, 4));

    this.cell_state = ko.pureComputed(() => {
      return this.entered_viewport() ? z.conversation.ConversationCellState.generate(this.conversation) : '';
    });
  }

  on_in_viewport() {
    this.entered_viewport(true);
    return true;
  }
};

ko.components.register('conversation-list-cell', {
  viewModel: {
    createViewModel (params, component_info) {
      return new z.components.ConversationListCell(params, component_info)
    }
  },
  template: `
    <div class="conversation-list-cell" data-bind="css: {'conversation-list-cell-active': is_selected(conversation)}, in_viewport: on_in_viewport">
      <div class="conversation-list-cell-left" data-bind="css: {'conversation-list-cell-left-opaque': conversation.removed_from_conversation()}">
        <!-- ko if: conversation.is_group() -->
          <group-avatar params="users: users()"></group-avatar>
        <!-- /ko -->
        <!-- ko ifnot: conversation.is_group() -->
          <user-avatar class="user-avatar-s" params="user: user"></user-avatar>
        <!-- /ko -->
      </div>
      <div class="conversation-list-cell-center">
        <span class="conversation-list-cell-name" data-bind="text: conversation.display_name()"></span>
        <span class="conversation-list-cell-description" data-bind="text: cell_state().description"></span>
      </div>
      <div class="conversation-list-cell-right">
        <!-- ko if: cell_state().icon === z.conversation.ConversationStatusIcon.PENDING_CONNECTION -->
          <span class="conversation-list-cell-badge icon-pending"></span>
        <!-- /ko -->
        <!-- ko if: cell_state().icon === z.conversation.ConversationStatusIcon.UNREAD_PING -->
          <span class="conversation-list-cell-badge icon-ping"></span>
        <!-- /ko -->
        <!-- ko if: cell_state().icon === z.conversation.ConversationStatusIcon.MISSED_CALL -->
          <span class="conversation-list-cell-badge icon-call"></span>
        <!-- /ko -->
        <!-- ko if: cell_state().icon === z.conversation.ConversationStatusIcon.ACTIVE_CALL -->
          <span class="conversation-list-cell-badge icon-end-call"></span>
        <!-- /ko -->
        <!-- ko if: cell_state().icon === z.conversation.ConversationStatusIcon.MUTED -->
          <span class="conversation-list-cell-badge icon-silence"></span>
        <!-- /ko -->
        <!-- ko if: cell_state().icon === z.conversation.ConversationStatusIcon.UNREAD_MESSAGES -->
          <span class="conversation-list-cell-badge" data-bind="text: conversation.unread_event_count()"></span>
        <!-- /ko -->
      </div>
    </div>
  `,
});
