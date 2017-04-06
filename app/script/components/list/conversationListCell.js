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
  constructor(params) {
    this.conversation = params.conversation;
    this.user = new z.entity.User()
  }
};

ko.components.register('conversation-list-cell', {
  viewModel: z.components.ConversationListCell,
  template: `
    <div class="conversation-list-cell-left">
      <user-avatar class="user-avatar-sm" params="user: user"></user-avatar>
    </div>
    <div class="conversation-list-cell-center">
      <span class="ellipsis" data-bind="text: conversation.display_name()"></span>
      <span class="label-xs">subtitle</span>
    </div>
    <div class="conversation-list-cell-right"></div>
  `,
});
