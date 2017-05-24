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
window.z.ViewModel = z.ViewModel || {};
window.z.ViewModel.list = z.ViewModel.list || {};

z.ViewModel.list.ArchiveViewModel = class ArchiveViewModel {
  /**
   * View model for the archive.
   *
   * @param {string} element_id - HTML selector
   * @param {z.ViewModel.list.ListViewModel} list_view_model - List view model
   * @param {z.conversation.ConversationRepository} conversation_repository - Conversation repository
   */
  constructor(element_id, list_view_model, conversation_repository) {
    this.click_on_archived_conversation = this.click_on_archived_conversation.bind(this);
    this.click_on_close_archive = this.click_on_close_archive.bind(this);
    this.update_list = this.update_list.bind(this);

    this.list_view_model = list_view_model;
    this.conversation_repository = conversation_repository;
    this.logger = new z.util.Logger('z.ViewModel.list.ArchiveViewModel', z.config.LOGGER.OPTIONS);

    this.conversations_archived = this.conversation_repository.conversations_archived;

    this.should_update_scrollbar = ko.computed(() => {
      return this.list_view_model.last_update();
    }).extend({notify: 'always', rateLimit: 500});
  }

  click_on_archived_conversation(conversation_et) {
    this.conversation_repository.unarchive_conversation(conversation_et);
    this.list_view_model.switch_list(z.ViewModel.list.LIST_STATE.CONVERSATIONS);
    amplify.publish(z.event.WebApp.CONVERSATION.SHOW, conversation_et);
  }

  click_on_close_archive() {
    this.list_view_model.switch_list(z.ViewModel.list.LIST_STATE.CONVERSATIONS);
  }

  update_list() {
    this.conversation_repository.update_conversations(this.conversation_repository.conversations_archived());
  }
};
