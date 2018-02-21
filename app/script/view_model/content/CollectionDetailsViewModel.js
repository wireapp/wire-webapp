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

'use strict';

window.z = window.z || {};
window.z.viewModel = z.viewModel || {};
window.z.viewModel.content = z.viewModel.content || {};

// Parent: z.viewModel.CollectionViewModel
z.viewModel.content.CollectionDetailsViewModel = class CollectionDetailsViewModel {
  constructor() {
    this.item_added = this.item_added.bind(this);
    this.item_removed = this.item_removed.bind(this);
    this.removed_from_view = this.removed_from_view.bind(this);
    this.set_conversation = this.set_conversation.bind(this);

    this.logger = new z.util.Logger('z.viewModel.CollectionDetailsViewModel', z.config.LOGGER.OPTIONS);

    this.template = ko.observable();
    this.conversation_et = ko.observable();

    this.items = ko.observableArray();

    this.last_message_timestamp = undefined;
  }

  set_conversation(conversation_et, category, items) {
    amplify.subscribe(z.event.WebApp.CONVERSATION.MESSAGE.ADDED, this.item_added);
    amplify.subscribe(z.event.WebApp.CONVERSATION.MESSAGE.REMOVED, this.item_removed);
    this.template(category);
    this.conversation_et(conversation_et);
    z.util.ko_push_deferred(this.items, items);
  }

  item_added(message_et) {
    if (this.conversation_et().id === message_et.conversation_id) {
      switch (this.category) {
        case 'images':
          if (
            message_et.category & z.message.MessageCategory.IMAGE &&
            !(message_et.category & z.message.MessageCategory.GIF)
          ) {
            this.items.push(message_et);
          }
          break;
        case 'files':
          if (message_et.category & z.message.MessageCategory.FILE) {
            this.items.push(message_et);
          }
          break;
        case 'links':
          if (message_et.category & z.message.MessageCategory.LINK_PREVIEW) {
            this.items.push(message_et);
          }
          break;
        default:
          break;
      }
    }
  }

  item_removed(removed_message_id) {
    this.items.remove(message_et => message_et.id === removed_message_id);
    if (!this.items().length) {
      this.click_on_back_button();
    }
  }

  removed_from_view() {
    amplify.unsubscribe(z.event.WebApp.CONVERSATION.MESSAGE.ADDED, this.item_added);
    amplify.unsubscribe(z.event.WebApp.CONVERSATION.MESSAGE.REMOVED, this.item_removed);
    this.last_message_timestamp = undefined;
    this.conversation_et(null);
    this.items.removeAll();
  }

  click_on_back_button() {
    amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.viewModel.content.CONTENT_STATE.COLLECTION);
  }

  click_on_image(message_et) {
    amplify.publish(z.event.WebApp.CONVERSATION.DETAIL_VIEW.SHOW, message_et, this.items(), 'collection');
  }

  should_show_header(message_et) {
    if (!this.last_message_timestamp) {
      this.last_message_timestamp = message_et.timestamp();
      return true;
    }

    // We passed today
    if (
      !moment(message_et.timestamp()).is_same_day(this.last_message_timestamp) &&
      moment(this.last_message_timestamp).is_today()
    ) {
      this.last_message_timestamp = message_et.timestamp();
      return true;
    }

    // We passed the month
    if (!moment(message_et.timestamp()).is_same_month(this.last_message_timestamp)) {
      this.last_message_timestamp = message_et.timestamp();
      return true;
    }
  }

  get_title_for_header(message_et) {
    const message_date = moment(message_et.timestamp());
    if (message_date.is_today()) {
      return z.l10n.text(z.string.conversation_today);
    }

    if (message_date.is_current_year()) {
      return message_date.format('MMMM');
    }

    return message_date.format('MMMM Y');
  }
};
