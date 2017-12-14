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

// Parent: z.ViewModel.ContentViewModel
z.ViewModel.ConversationInputViewModel = class ConversationInputViewModel {
  constructor(element_id, conversation_repository, user_repository, properties_repository) {
    this.added_to_view = this.added_to_view.bind(this);
    this.on_drop_files = this.on_drop_files.bind(this);
    this.on_paste_files = this.on_paste_files.bind(this);
    this.on_window_click = this.on_window_click.bind(this);
    this.show_separator = this.show_separator.bind(this);

    this.conversation_repository = conversation_repository;
    this.user_repository = user_repository;
    this.logger = new z.util.Logger('z.ViewModel.ConversationInputViewModel', z.config.LOGGER.OPTIONS);

    this.conversation_et = this.conversation_repository.active_conversation;
    this.conversation_et.subscribe(() => {
      this.conversation_has_focus(true);
      this.pasted_file(null);
      this.cancel_edit();
    });

    this.self = this.user_repository.self;
    this.list_not_bottom = ko.observable(true);

    this.pasted_file = ko.observable();
    this.pasted_file_preview_url = ko.observable();
    this.pasted_file_name = ko.observable();
    this.pasted_file.subscribe(blob => {
      if (blob) {
        if (z.config.SUPPORTED_CONVERSATION_IMAGE_TYPES.includes(blob.type)) {
          this.pasted_file_preview_url(URL.createObjectURL(blob));
        }

        const date = moment(blob.lastModifiedDate).format('MMMM Do YYYY, h:mm:ss a');
        this.pasted_file_name(z.l10n.text(z.string.conversation_send_pasted_file, date));
      } else {
        this.pasted_file_preview_url(null);
        this.pasted_file_name(null);
      }
    });

    this.edit_message_et = ko.observable();
    this.edit_input = ko.observable('');
    this.is_editing = ko.pureComputed(() => this.edit_message_et() != null);

    this.is_editing.subscribe(is_editing => {
      if (is_editing) {
        return window.addEventListener('click', this.on_window_click);
      }
      window.removeEventListener('click', this.on_window_click);
    });

    this.has_ephemeral_timer = ko.pureComputed(() => {
      if (this.conversation_et()) {
        return this.conversation_et().ephemeral_timer();
      }
    });

    this.conversation_has_focus = ko.observable(true).extend({notify: 'always'});
    this.browser_has_focus = ko.observable(true);

    this.blinking_cursor = ko
      .pureComputed(() => this.is_editing() || this.conversation_has_focus())
      .extend({notify: 'always'});

    this.has_text_input = ko.pureComputed(() => {
      if (this.conversation_et()) {
        return this.conversation_et().input().length > 0;
      }
    });

    this.show_giphy_button = ko.pureComputed(() => {
      if (this.conversation_et()) {
        return this.has_text_input() && this.conversation_et().input().length <= 256;
      }
    });

    this.input = ko.pureComputed({
      read: () => {
        if (this.is_editing()) {
          return this.edit_input();
        }

        if (this.conversation_et()) {
          return this.conversation_et().input() || '';
        }

        return '';
      },
      write: value => {
        if (this.is_editing()) {
          return this.edit_input(value);
        }

        if (this.conversation_et()) {
          this.conversation_et().input(value);
        }
      },
    });

    this.show_availability_tooltip = ko.pureComputed(() => {
      const isOne2OneConversation = this.conversation_et().is_one2one();
      const remoteParticipantEt = this.conversation_et().firstUserEntity();
      const availabilityIsNone = remoteParticipantEt.availability() === z.user.AvailabilityType.NONE;
      return this.self().is_team_member() && isOne2OneConversation && !availabilityIsNone;
    });

    this.file_tooltip = z.l10n.text(z.string.tooltip_conversation_file);
    this.input_tooltip = ko.pureComputed(() => {
      if (this.show_availability_tooltip()) {
        const remoteParticipantEt = this.conversation_et().firstUserEntity();

        switch (remoteParticipantEt.availability()) {
          case z.user.AvailabilityType.AVAILABLE:
            return z.l10n.text(z.string.tooltip_conversation_input_placeholder_available, remoteParticipantEt.name());
          case z.user.AvailabilityType.AWAY:
            return z.l10n.text(z.string.tooltip_conversation_input_placeholder_away, remoteParticipantEt.name());
          case z.user.AvailabilityType.BUSY:
            return z.l10n.text(z.string.tooltip_conversation_input_placeholder_busy, remoteParticipantEt.name());
        }
      }

      if (this.conversation_et().ephemeral_timer()) {
        return z.l10n.text(z.string.tooltip_conversation_ephemeral);
      }
      return z.l10n.text(z.string.tooltip_conversation_input_placeholder);
    });
    this.ping_tooltip = z.l10n.text(
      z.string.tooltip_conversation_ping,
      z.ui.Shortcut.get_shortcut_tooltip(z.ui.ShortcutType.PING)
    );
    this.picture_tooltip = z.l10n.text(z.string.tooltip_conversation_picture);
    this.ping_disabled = ko.observable(false);

    $(window)
      .blur(() => this.browser_has_focus(false))
      .focus(() => this.browser_has_focus(true));

    this.conversation_input_emoji = new z.ViewModel.ConversationInputEmojiViewModel(properties_repository);

    this._init_subscriptions();
  }

  _init_subscriptions() {
    amplify.subscribe(z.event.WebApp.SEARCH.SHOW, () => this.conversation_has_focus(false));
    amplify.subscribe(z.event.WebApp.SEARCH.HIDE, () =>
      window.requestAnimationFrame(() => this.conversation_has_focus(true))
    );
    amplify.subscribe(z.event.WebApp.EXTENSIONS.GIPHY.SEND, this.send_giphy.bind(this));
    amplify.subscribe(z.event.WebApp.CONVERSATION.IMAGE.SEND, this.upload_images.bind(this));
    amplify.subscribe(z.event.WebApp.CONVERSATION.MESSAGE.EDIT, this.edit_message.bind(this));
  }

  added_to_view() {
    window.setTimeout(() => {
      amplify.subscribe(z.event.WebApp.SHORTCUT.PING, () => this.ping());
    }, 50);
  }

  removed_from_view() {
    amplify.unsubscribeAll(z.event.WebApp.SHORTCUT.PING);
  }

  toggle_extensions_menu() {
    amplify.publish(z.event.WebApp.EXTENSIONS.GIPHY.SHOW);
  }

  ping() {
    if (this.conversation_et() && !this.ping_disabled()) {
      this.ping_disabled(true);
      this.conversation_repository.send_knock(this.conversation_et()).then(() => {
        window.setTimeout(() => {
          this.ping_disabled(false);
        }, 2000);
      });
    }
  }

  send_giphy() {
    if (this.conversation_et()) {
      this.conversation_et().input('');
    }
  }

  send_message(message) {
    if (message.length > 0) {
      this.conversation_repository.send_text_with_link_preview(message, this.conversation_et());
    }
  }

  send_message_edit(message, message_et) {
    this.cancel_edit();

    if (!message.length) {
      return this.conversation_repository.delete_message_everyone(this.conversation_et(), message_et);
    }

    if (message !== message_et.get_first_asset().text) {
      this.conversation_repository.send_message_edit(message, message_et, this.conversation_et());
    }
  }

  set_ephemeral_timer(millis) {
    if (!millis) {
      this.conversation_et().ephemeral_timer(false);
      return this.logger.info(
        `Ephemeral timer for conversation '${this.conversation_et().display_name()}' turned off.`
      );
    }

    this.conversation_et().ephemeral_timer(millis);
    this.logger.info(
      `Ephemeral timer for conversation '${this.conversation_et().display_name()}' is now at '${this.conversation_et().ephemeral_timer()}'.`
    );
  }

  /**
   * Post images to a conversation.
   * @param {Array|FileList} images - Images
   * @returns {undefined} No return value
   */
  upload_images(images) {
    if (!this._is_hitting_upload_limit(images)) {
      for (const image of [...images]) {
        if (image.size > z.config.MAXIMUM_IMAGE_FILE_SIZE) {
          return this._show_upload_warning(image);
        }
      }

      this.conversation_repository.upload_images(this.conversation_et(), images);
    }
  }

  /**
   * Post files to a conversation.
   * @param {Array|FileList} files - Images
   * @returns {undefined} No return value
   */
  upload_files(files) {
    if (!this._is_hitting_upload_limit(files)) {
      for (const file of [...files]) {
        if (file.size > z.config.MAXIMUM_ASSET_FILE_SIZE) {
          amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.FILE.UPLOAD_TOO_BIG, {
            size: file.size,
            type: file.type,
          });
          amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.ALERT);
          window.setTimeout(() => {
            amplify.publish(z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.UPLOAD_TOO_LARGE, {
              data: z.util.format_bytes(z.config.MAXIMUM_ASSET_FILE_SIZE),
            });
          }, 200);
          return;
        }
      }

      this.conversation_repository.upload_files(this.conversation_et(), files);
    }
  }

  on_paste_files(pasted_files) {
    this.pasted_file(pasted_files[0]);
  }

  on_send_pasted_files() {
    const pasted_file = this.pasted_file();
    this.on_drop_files([pasted_file]);
    this.pasted_file(null);
  }

  on_cancel_pasted_files() {
    this.pasted_file(null);
  }

  on_drop_files(dropped_files) {
    const images = [];
    const files = [];

    if (!this._is_hitting_upload_limit(dropped_files)) {
      for (const file of Array.from(dropped_files)) {
        switch (true) {
          case z.config.SUPPORTED_CONVERSATION_IMAGE_TYPES.includes(file.type):
            images.push(file);
            break;
          default:
            files.push(file);
        }
      }

      this.upload_images(images);
      this.upload_files(files);
    }
  }

  _show_upload_warning(image) {
    const string_id = image.type === 'image/gif' ? z.string.alert_gif_too_large : z.string.alert_upload_too_large;
    const warning_text = z.l10n.text(string_id, z.config.MAXIMUM_IMAGE_FILE_SIZE / 1024 / 1024);

    const attributes = {
      reason: 'too large',
      size: image.size,
      type: image.type,
    };

    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.IMAGE_SENT_ERROR, attributes);
    amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.ALERT);
    window.setTimeout(() => window.alert(warning_text), 200);
  }

  _is_hitting_upload_limit(files) {
    const pending_uploads = this.conversation_repository.get_number_of_pending_uploads();
    const is_hitting_upload_limit = pending_uploads + files.length > z.config.MAXIMUM_ASSET_UPLOADS;

    if (is_hitting_upload_limit) {
      amplify.publish(z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.UPLOAD_PARALLEL, {
        data: z.config.MAXIMUM_ASSET_UPLOADS,
      });
    }

    return is_hitting_upload_limit;
  }

  scroll_message_list(list_height_new, list_height_old) {
    const antiscroll = $('.message-list').data('antiscroll');
    if (antiscroll) {
      antiscroll.rebuild();
    }

    if ($('.messages-wrap').is_scrolled_bottom()) {
      return $('.messages-wrap').scroll_to_bottom();
    }

    return $('.messages-wrap').scroll_by(list_height_new - list_height_old);
  }

  show_separator(is_scrolled_bottom) {
    this.list_not_bottom(!is_scrolled_bottom);
  }

  on_window_click(event) {
    if (!$(event.target).closest('.conversation-input').length) {
      this.cancel_edit();
    }
  }

  on_input_click() {
    if (!this.has_text_input()) {
      amplify.publish(z.event.WebApp.CONVERSATION.INPUT.CLICK);
    }
  }

  on_input_enter(data, event) {
    if (this.pasted_file()) {
      return this.on_send_pasted_files();
    }

    const message = z.util.StringUtil.trim_line_breaks(this.input());

    if (message.length > z.config.MAXIMUM_MESSAGE_LENGTH) {
      amplify.publish(z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.TOO_LONG_MESSAGE, {
        close() {
          amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONVERSATION.CHARACTER_LIMIT_REACHED, {
            characters: message.length,
          });
        },
        data: z.config.MAXIMUM_MESSAGE_LENGTH,
      });
      return;
    }

    if (this.is_editing()) {
      this.send_message_edit(message, this.edit_message_et());
    } else {
      this.send_message(message);
    }

    this.input('');
    $(event.target).focus();
  }

  on_input_key_up(data, keyboard_event) {
    this.conversation_input_emoji.on_input_key_up(data, keyboard_event);
  }

  on_input_key_down(data, keyboard_event) {
    if (!this.conversation_input_emoji.on_input_key_down(data, keyboard_event)) {
      switch (keyboard_event.key) {
        case z.util.KeyboardUtil.KEY.ARROW_UP: {
          if (!this.input().length) {
            this.edit_message(this.conversation_et().get_last_editable_message(), keyboard_event.target);
          }
          break;
        }

        case z.util.KeyboardUtil.KEY.ESC: {
          if (this.pasted_file()) {
            this.pasted_file(null);
          } else {
            this.cancel_edit();
          }
          break;
        }

        case z.util.KeyboardUtil.KEY.ENTER: {
          if (keyboard_event.altKey || keyboard_event.metaKey) {
            z.util.KeyboardUtil.insert_at_caret(keyboard_event.target, '\n');
            $(keyboard_event.target).change();
            keyboard_event.preventDefault();
          }
          break;
        }

        default:
          break;
      }

      return true;
    }
  }

  edit_message(message_et, input_element) {
    if (message_et && (message_et.is_editable() && message_et !== this.edit_message_et())) {
      this.cancel_edit();
      this.edit_message_et(message_et);
      this.edit_message_et().is_editing(true);
      this.input(this.edit_message_et().get_first_asset().text);
      if (input_element) {
        this._move_cursor_to_end(input_element);
      }
    }
  }

  cancel_edit() {
    this.conversation_input_emoji.remove_emoji_popup();
    if (this.edit_message_et()) {
      this.edit_message_et().is_editing(false);
    }
    this.edit_message_et(undefined);
    this.edit_input('');
  }

  _move_cursor_to_end(input_element) {
    window.setTimeout(
      () => (input_element.selectionStart = input_element.selectionEnd = input_element.value.length * 2),
      0
    );
  }

  /**
   * Returns the full localized unit string.
   *
   * @param {number} number - Number to localize
   * @param {string} unit - Unit if type 's', 'm', 'd', 'h'
   * @returns {string} Localized unit string
   */
  _get_localized_unit_string(number, unit) {
    if (unit === 's') {
      if (number === 1) {
        return z.l10n.text(z.string.ephememal_units_second);
      }
      return z.l10n.text(z.string.ephememal_units_seconds);
    }

    if (unit === 'm') {
      if (number === 1) {
        return z.l10n.text(z.string.ephememal_units_minute);
      }
      return z.l10n.text(z.string.ephememal_units_minutes);
    }

    if (unit === 'd') {
      if (number === 1) {
        return z.l10n.text(z.string.ephememal_units_day);
      }
      return z.l10n.text(z.string.ephememal_units_days);
    }
  }

  /**
   * Click on ephemeral button
   * @param {Object} data - Object
   * @param {DOMEvent} event - Triggered event
   * @returns {undefined} No return value
   */
  click_on_ephemeral_button(data, event) {
    const entries = [
      {
        click: () => this.set_ephemeral_timer(0),
        label: z.l10n.text(z.string.ephememal_units_none),
      },
    ].concat(
      z.ephemeral.timings.get_values().map(milliseconds => {
        const [number, unit] = z.util.format_milliseconds_short(milliseconds);
        const unit_locale = this._get_localized_unit_string(number, unit);
        return {
          click: () => this.set_ephemeral_timer(milliseconds),
          label: `${number} ${unit_locale}`,
        };
      })
    );

    z.ui.Context.from(event, entries, 'ephemeral-options-menu');
  }
};
