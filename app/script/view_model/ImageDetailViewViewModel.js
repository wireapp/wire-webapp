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

z.ViewModel.ImageDetailViewViewModel = class ImageDetailViewViewModel {
  constructor(element_id, conversation_repository) {
    this.before_hide_callback = this.before_hide_callback.bind(this);
    this.hide_callback = this.hide_callback.bind(this);
    this.message_added = this.message_added.bind(this);
    this.message_removed = this.message_removed.bind(this);

    this.element_id = element_id;
    this.conversation_repository = conversation_repository;
    this.source = undefined;

    this.image_modal = undefined;
    this.image_src = ko.observable();
    this.image_visible = ko.observable(false);

    this.conversation_et = ko.observable();
    this.items = ko.observableArray();
    this.message_et = ko.observable();
    this.message_et.subscribe((message_et) => {
      if (message_et) {
        this.conversation_repository.get_conversation_by_id(message_et.conversation_id)
          .then((conversation_et) => this.conversation_et(conversation_et));
      }
    });

    amplify.subscribe(z.event.WebApp.CONVERSATION.DETAIL_VIEW.SHOW, this.show.bind(this));

    ko.applyBindings(this, document.getElementById(this.element_id));
  }

  before_hide_callback() {
    this.image_visible(false);
  }

  hide_callback() {
    $(document).off('keydown.lightbox');
    window.URL.revokeObjectURL(this.image_src());
    this.image_src(undefined);
    this.source = undefined;
    amplify.unsubscribe(z.event.WebApp.CONVERSATION.MESSAGE.ADDED, this.message_added);
    amplify.unsubscribe(z.event.WebApp.CONVERSATION.MESSAGE.REMOVED, this.message_removed);
  }

  show(message_et, message_ets, source) {
    this.items(message_ets);
    this.message_et(message_et);
    this.source = source;

    amplify.subscribe(z.event.WebApp.CONVERSATION.MESSAGE.ADDED, this.message_added);
    amplify.subscribe(z.event.WebApp.CONVERSATION.MESSAGE.REMOVED, this.message_removed);
    if (this.image_modal) {
      this.image_modal.destroy();
    }
    this.image_modal = new zeta.webapp.module.Modal('#detail-view', this.hide_callback, this.before_hide_callback);
    this.image_modal.show();

    this._load_image();
    $(document).on('keydown.lightbox', (event) => {
      switch (event.keyCode) {
        case z.util.KEYCODE.ESC:
          this.click_on_close();
          break;
        case z.util.KEYCODE.ARROW_DOWN:
        case z.util.KEYCODE.ARROW_RIGHT:
          this.click_on_show_next(this, event);
          break;
        case z.util.KEYCODE.ARROW_LEFT:
        case z.util.KEYCODE.ARROW_UP:
          this.click_on_show_previous(this, event);
          break;
        default:
          break;
      }
    });
  }

  message_added(message_et) {
    if (message_et.conversation === this.conversation_et().id) {
      this.items.push(message_et);
    }
  }

  message_removed(removed_message_id) {
    this.items.remove((message_et) => message_et.id === removed_message_id);
    if (this.message_et().id === removed_message_id) {
      this.image_modal.hide();
    }
  }

  _load_image() {
    this.image_visible(false);
    this.message_et()
      .get_first_asset()
      .resource()
      .load()
      .then((blob) => {
        this.image_src(window.URL.createObjectURL(blob));
        this.image_visible(true);
      });
  }

  click_on_close() {
    this.image_modal.hide();
  }

  click_on_delete() {
    amplify.publish(z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.DELETE_MESSAGE, {
      action: () => {
        if (this.source === 'collection') {
          this._track_item_action(this.conversation_et(), 'delete_for_me', 'image');
        }
        this.conversation_repository.delete_message(this.conversation_et(), this.message_et());
        this.image_modal.hide();
      },
    });
  }

  click_on_delete_for_everyone() {
    amplify.publish(z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.DELETE_EVERYONE_MESSAGE, {
      action: () => {
        if (this.source === 'collection') {
          this._track_item_action(this.conversation_et(), 'delete_for_everyone', 'image');
        }
        this.conversation_repository.delete_message_everyone(this.conversation_et(), this.message_et());
        this.image_modal.hide();
      },
    });
  }

  click_on_download() {
    if (this.source === 'collection') {
      this._track_item_action(this.conversation_et(), 'download', 'image');
    }
    this.message_et().download();
  }

  click_on_like() {
    if (this.source === 'collection') {
      this._track_item_action(this.conversation_et(), this.message_et().is_liked(), 'image');
    }
    return this.conversation_repository.toggle_like(this.conversation_et(), this.message_et());
  }

  click_on_show_next(view_model, event) {
    event.stopPropagation();
    const next_messsage_et = z.util.ArrayUtil.iterate_item(this.items(), this.message_et());

    if (next_messsage_et) {
      this.message_et(next_messsage_et);
      this._load_image();
    }
  }

  click_on_show_previous(view_model, event) {
    event.stopPropagation();
    const previous_message_et = z.util.ArrayUtil.iterate_item(this.items(), this.message_et(), true);

    if (previous_message_et) {
      this.message_et(z.util.ArrayUtil.iterate_item(this.items(), this.message_et(), true));
      this._load_image();
    }
  }

  _track_item_action(conversation_et, is_liked, type) {
    const like_action = is_liked ? 'unlike' : 'like';

    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.COLLECTION.DID_ITEM_ACTION, {
      action: like_action,
      conversation_type: z.tracking.helpers.get_conversation_type(conversation_et),
      type: type,
      with_bot: conversation_et.is_with_bot(),
    });
  }
};
