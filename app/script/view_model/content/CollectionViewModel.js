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
window.z.ViewModel.content = z.ViewModel.content || {};

// Parent: z.ViewModel.ContentViewModel
z.ViewModel.content.CollectionViewModel = class CollectionViewModel {
  constructor(element_id, conversation_repository, collection_details) {
    this.added_to_view = this.added_to_view.bind(this);
    this.click_on_message = this.click_on_message.bind(this);
    this.item_added = this.item_added.bind(this);
    this.item_removed = this.item_removed.bind(this);
    this.on_input_change = this.on_input_change.bind(this);
    this.removed_from_view = this.removed_from_view.bind(this);
    this.search_in_conversation = this.search_in_conversation.bind(this);
    this.set_conversation = this.set_conversation.bind(this);

    this.conversation_repository = conversation_repository;
    this.collection_details = collection_details;
    this.logger = new z.util.Logger('z.ViewModel.CollectionViewModel', z.config.LOGGER.OPTIONS);

    this.conversation_et = ko.observable();

    this.audio = ko.observableArray().extend({'rateLimit': 1});
    this.files = ko.observableArray().extend({'rateLimit': 1});
    this.images = ko.observableArray().extend({'rateLimit': 1});
    this.links = ko.observableArray().extend({'rateLimit': 1});

    this.search_input = ko.observable('');
    this.no_items_found = ko.pureComputed(() => {
      return (this.images().length + this.files().length + this.links().length + this.audio().length) === 0;
    });
  }

  added_to_view() {
    amplify.subscribe(z.event.WebApp.CONVERSATION.MESSAGE.ADDED, this.item_added);
    amplify.subscribe(z.event.WebApp.CONVERSATION.MESSAGE.REMOVED, this.item_removed);
    $(document).on('keydown.collection', (keyboard_event) => {
      if (z.util.KeyboardUtil.is_escape_key(keyboard_event)) {
        amplify.publish(z.event.WebApp.CONVERSATION.SHOW, this.conversation_et());
      }
    });
  }

  search_in_conversation(query) {
    return this.conversation_repository.search_in_conversation(this.conversation_et(), query);
  }

  on_input_change(input) {
    this.search_input(input || '');
  }

  on_result() {
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.COLLECTION.ENTERED_SEARCH);
  }

  item_added(message_et) {
    if (this.conversation_et().id === message_et.conversation_id) {
      this._populate_items([message_et]);
    }
  }

  item_removed(removed_message_id) {
    const _remove_item = (message_et) => message_et.id === removed_message_id;
    [this.audio, this.files, this.images, this.links].forEach((array) => array.remove(_remove_item));
  }

  removed_from_view() {
    amplify.unsubscribe(z.event.WebApp.CONVERSATION.MESSAGE.ADDED, this.item_added);
    amplify.unsubscribe(z.event.WebApp.CONVERSATION.MESSAGE.REMOVED, this.item_removed);
    $(document).off('keydown.collection');
    this.conversation_et(null);
    this.search_input('');
    [this.images, this.files, this.links, this.audio].forEach((array) => array.removeAll());
  }

  set_conversation(conversation_et = this.conversation_repository.active_conversation()) {
    if (conversation_et) {
      this.conversation_et(conversation_et);

      this.conversation_repository.get_events_for_category(conversation_et, z.message.MessageCategory.LINK_PREVIEW)
        .then((message_ets) => this._populate_items(message_ets))
        .then(() => this._track_opened_collection(conversation_et, this.no_items_found()));
    }
  }

  _populate_items(message_ets) {
    message_ets.map((message_et) => {

      // TODO: create binary map helper
      if ((message_et.category & z.message.MessageCategory.IMAGE) && !(message_et.category & z.message.MessageCategory.GIF)) {
        this.images.push(message_et);
      } else if (message_et.category & z.message.MessageCategory.FILE) {
        if (message_et.get_first_asset().is_audio()) {
          this.audio.push(message_et);
        } else {
          this.files.push(message_et);
        }
      } else if (message_et.category & z.message.MessageCategory.LINK_PREVIEW) {
        this.links.push(message_et);
      }
    });
  }

  click_on_message(message_et) {
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.COLLECTION.SELECTED_SEARCH_RESULT);
    amplify.publish(z.event.WebApp.CONVERSATION.SHOW, this.conversation_et(), message_et);
  }

  click_on_back_button() {
    amplify.publish(z.event.WebApp.CONVERSATION.SHOW, this.conversation_et());
  }

  click_on_section(category, items) {
    this.collection_details.set_conversation(this.conversation_et(), category, [].concat(items));
    amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.ViewModel.content.CONTENT_STATE.COLLECTION_DETAILS);
  }

  click_on_image(message_et) {
    amplify.publish(z.event.WebApp.CONVERSATION.DETAIL_VIEW.SHOW, message_et, this.images(), 'collection');
    this._track_opened_item(this.conversation_et(), 'image');
  }

  _track_opened_collection(conversation_et, is_empty) {
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.COLLECTION.OPENED_COLLECTIONS, {
      conversation_type: z.tracking.helpers.get_conversation_type(conversation_et),
      is_empty: is_empty,
      with_bot: conversation_et.is_with_bot(),
      with_search_result: false,
    });
  }

  _track_opened_item(conversation_et, type) {
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.COLLECTION.OPENED_ITEM, {
      conversation_type: z.tracking.helpers.get_conversation_type(conversation_et),
      type: type,
      with_bot: conversation_et.is_with_bot(),
    });
  }
};
