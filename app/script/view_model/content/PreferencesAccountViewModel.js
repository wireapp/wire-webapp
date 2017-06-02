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

z.ViewModel.content.PreferencesAccountViewModel = class PreferencesAccountViewModel {
  static get SAVED_ANIMATION_TIMEOUT() {
    return 750 * 2;
  }

  constructor(element_id, client_repository, user_repository) {
    this.change_accent_color = this.change_accent_color.bind(this);
    this.check_new_clients = this.check_new_clients.bind(this);
    this.removed_from_view = this.removed_from_view.bind(this);

    this.client_repository = client_repository;
    this.user_repository = user_repository;
    this.logger = new z.util.Logger('z.ViewModel.content.PreferencesAccountViewModel', z.config.LOGGER.OPTIONS);

    this.self_user = this.user_repository.self;
    this.new_clients = ko.observableArray([]);
    this.name = ko.pureComputed(() => this.self_user().name());

    this.username = ko.pureComputed(() => this.self_user().username());
    this.entered_username = ko.observable();
    this.submitted_username = ko.observable();
    this.username_error = ko.observable();

    this.name_saved = ko.observable();
    this.username_saved = ko.observable();

    this._init_subscriptions();
  }

  _init_subscriptions() {
    amplify.subscribe(z.event.WebApp.CLIENT.ADD_OWN_CLIENT, this.on_client_add.bind(this));
    amplify.subscribe(z.event.WebApp.CLIENT.REMOVE, this.on_client_remove.bind(this));
  }

  removed_from_view() {
    this._reset_username_input();
  }

  change_accent_color(id) {
    this.user_repository.change_accent_color(id);
  }

  change_name(name, event) {
    const new_name = event.target.value.trim();

    if (new_name === this.self_user().name()) {
      event.target.blur();
    }

    this.user_repository.change_name(new_name)
      .then(() => {
        this.name_saved(true);
        event.target.blur();
        window.setTimeout(() => {
          this.name_saved(false);
        }, PreferencesAccountViewModel.SAVED_ANIMATION_TIMEOUT);
      });
  }

  reset_name_input() {
    if (!this.name_saved()) {
      this.name.notifySubscribers();
    }
  }

  reset_username_input() {
    if (!this.username_saved()) {
      this._reset_username_input();
      return this.username.notifySubscribers();
    }
  }

  should_focus_username() {
    return this.user_repository.should_set_username;
  }

  check_username_input(username, event) {
    // FF sends charCode 0 when pressing backspace
    if (event.charCode !== 0) {
      // Automation is missing key prop
      return z.user.UserHandleGenerator.validate_character(String.fromCharCode(event.charCode));
    }
    return true;
  }

  click_on_username() {
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SETTINGS.EDITED_USERNAME);
  }

  change_username(username, event) {
    const entered_username = event.target.value;

    if (entered_username.length < 2) {
      this.username_error(null);
      return;
    }

    if (entered_username === this.self_user().username()) {
      event.target.blur();
    }

    this.submitted_username(entered_username);
    this.user_repository.change_username(entered_username)
      .then(() => {
        if (this.entered_username() === this.submitted_username()) {
          this.username_error(null);
          this.username_saved(true);

          amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SETTINGS.SET_USERNAME, {length: entered_username.length});

          event.target.blur();
          window.setTimeout(() => {
            this.username_saved(false);
          }, PreferencesAccountViewModel.SAVED_ANIMATION_TIMEOUT);
        }
      })
      .catch((error) => {
        if (error.type === z.user.UserError.TYPE.USERNAME_TAKEN && this.entered_username() === this.submitted_username()) {
          return this.username_error('taken');
        }
      });
  }

  verify_username(username, event) {
    const entered_username = event.target.value;

    if ((entered_username.length < 2) || (entered_username === this.self_user().username())) {
      this.username_error(null);
      return;
    }

    this.entered_username(entered_username);
    this.user_repository.verify_username(entered_username)
      .then(() => {
        if (this.entered_username() === entered_username) {
          this.username_error('available');
        }
      })
      .catch((error) => {
        if (error.type === z.user.UserError.TYPE.USERNAME_TAKEN && this.entered_username() === this.submitted_username()) {
          return this.username_error('taken');
        }
      });
  }

  check_new_clients() {
    if (this.new_clients().length) {
      amplify.publish(z.event.WebApp.SEARCH.BADGE.HIDE);
      amplify.publish(z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.CONNECTED_DEVICE, {
        close: () => this.new_clients.removeAll(),
        data: this.new_clients(),
        secondary() {
          amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.ViewModel.content.CONTENT_STATE.PREFERENCES_DEVICES);
        },
      });
    }
  }

  click_on_change_picture(files) {
    this.set_picture(files, () => {
      amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.PROFILE_PICTURE_CHANGED, {source: 'fromPhotoLibrary'});
    });
  }

  click_on_delete_account() {
    return amplify.publish(z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.DELETE_ACCOUNT, {
      action: () => {
        return this.user_repository.delete_me();
      },
      data: this.self_user().email(),
    }
    );
  }

  click_on_logout() {
    return this.client_repository.logout_client();
  }

  click_on_reset_password() {
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.PASSWORD_RESET, {value: 'fromProfile'});
    return z.util.safe_window_open(`${z.util.Environment.backend.website_url()}${z.l10n.text(z.string.url_password_reset)}`);
  }

  set_picture(files) {
    const [input_picture] = files;

    if (input_picture.size > z.config.MAXIMUM_IMAGE_FILE_SIZE) {
      const warning_file_size = z.localization.Localizer.get_text({
        id: z.string.alert_upload_too_large,
        replace: {
          content: z.config.MAXIMUM_IMAGE_FILE_SIZE / 1024 / 1024,
          placeholder: '%no',
        },
      });

      return this._show_upload_warning(warning_file_size);
    }

    if (!z.config.SUPPORTED_PROFILE_IMAGE_TYPES.includes(input_picture.type)) {
      return this._show_upload_warning(z.l10n.text(z.string.alert_upload_file_format));
    }

    const max_width = z.config.MINIMUM_PROFILE_IMAGE_SIZE.WIDTH;
    const max_height = z.config.MINIMUM_PROFILE_IMAGE_SIZE.HEIGHT;
    z.util.valid_profile_image_size(input_picture, max_width, max_height, (valid) => {
      if (valid) {
        return this.user_repository.change_picture(input_picture);
      }

      return this._show_upload_warning(z.l10n.text(z.string.alert_upload_too_small));
    });
  }

  _show_upload_warning(warning) {
    amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.ALERT);
    window.setTimeout(function() {
      Promise.reject(new Error('Failed to set new user picture'));
      window.alert(warning);
    }, 200);
  }

  on_client_add(user_id, client_et) {
    amplify.publish(z.event.WebApp.SEARCH.BADGE.SHOW);
    this.new_clients.push(client_et);
  }

  on_client_remove(user_id, client_id) {
    if (user_id === this.self_user().id) {
      this.new_clients().forEach((client_et) => {
        if (client_et.id === client_id && client_et.is_permanent()) {
          this.new_clients.remove(client_et);
        }
      });

      if (!this.new_clients().length) {
        amplify.publish(z.event.WebApp.SEARCH.BADGE.HIDE);
      }
    }
    return true;
  }

  _reset_username_input() {
    this.username_error(null);
    this.entered_username(null);
    this.submitted_username(null);
  }
};
