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

  constructor(element_id, client_repository, team_repository, user_repository) {
    this.change_accent_color = this.change_accent_color.bind(this);
    this.check_new_clients = this.check_new_clients.bind(this);
    this.removed_from_view = this.removed_from_view.bind(this);

    this.logger = new z.util.Logger('z.ViewModel.content.PreferencesAccountViewModel', z.config.LOGGER.OPTIONS);

    this.client_repository = client_repository;
    this.team_repository = team_repository;
    this.user_repository = user_repository;

    this.self_user = this.user_repository.self;
    this.new_clients = ko.observableArray([]);
    this.name = ko.pureComputed(() => this.self_user().name());
    this.availability = ko.pureComputed(() => this.self_user().availability());

    this.availabilityLabel = ko.pureComputed(() => {
      let label = z.user.AvailabilityMapper.nameFromType(this.availability());

      const noStatusSet = this.availability() === z.user.AvailabilityType.NONE;
      if (noStatusSet) {
        label = z.l10n.text(z.string.preferences_account_avaibility_unset);
      }

      return label;
    });

    this.username = ko.pureComputed(() => this.self_user().username());
    this.entered_username = ko.observable();
    this.submitted_username = ko.observable();
    this.username_error = ko.observable();

    this.is_team = this.team_repository.is_team;
    this.is_team_manager = ko.pureComputed(() => this.is_team() && this.self_user().is_team_manager());
    this.team = this.team_repository.team;
    this.team_name = ko.pureComputed(() =>
      z.l10n.text(z.string.preferences_account_team, this.team_repository.team_name())
    );

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

  change_name(view_model, event) {
    const new_name = event.target.value.trim();

    if (new_name === this.self_user().name()) {
      event.target.blur();
    }

    if (new_name.length >= z.user.UserRepository.CONFIG.MINIMUM_NAME_LENGTH) {
      this.user_repository.change_name(new_name).then(() => {
        this.name_saved(true);
        event.target.blur();
        window.setTimeout(() => {
          this.name_saved(false);
        }, PreferencesAccountViewModel.SAVED_ANIMATION_TIMEOUT);
      });
    }
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

  check_username_input(username, keyboard_event) {
    if (z.util.KeyboardUtil.is_key(keyboard_event, z.util.KeyboardUtil.KEY.BACKSPACE)) {
      return true;
    }
    // Automation: KeyboardEvent triggered during tests is missing key property
    const input_char = keyboard_event.key || String.fromCharCode(event.charCode);
    return z.user.UserHandleGenerator.validate_character(input_char.toLowerCase());
  }

  clickOnAvailability(viewModel, event) {
    z.ui.AvailabilityContextMenu.show(event, 'settings', 'preferences-account-availability-menu');
  }

  click_on_username() {
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SETTINGS.EDITED_USERNAME);
  }

  change_username(username, event) {
    const entered_username = event.target.value;
    const normalized_username = entered_username.toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (entered_username !== normalized_username) {
      event.target.value = normalized_username;
    }

    if (normalized_username.length < z.user.UserRepository.CONFIG.MINIMUM_USERNAME_LENGTH) {
      return this.username_error(null);
    }

    if (normalized_username === this.self_user().username()) {
      event.target.blur();
    }

    this.submitted_username(normalized_username);
    this.user_repository
      .change_username(normalized_username)
      .then(() => {
        if (this.entered_username() === this.submitted_username()) {
          this.username_error(null);
          this.username_saved(true);

          amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SETTINGS.SET_USERNAME, {
            length: normalized_username.length,
          });

          event.target.blur();
          window.setTimeout(() => {
            this.username_saved(false);
          }, PreferencesAccountViewModel.SAVED_ANIMATION_TIMEOUT);
        }
      })
      .catch(error => {
        if (
          error.type === z.user.UserError.TYPE.USERNAME_TAKEN &&
          this.entered_username() === this.submitted_username()
        ) {
          return this.username_error('taken');
        }
      });
  }

  verify_username(username, event) {
    const entered_username = event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');

    const username_too_short = entered_username.length < z.user.UserRepository.CONFIG.MINIMUM_USERNAME_LENGTH;
    const username_unchanged = entered_username === this.self_user().username();
    if (username_too_short || username_unchanged) {
      this.username_error(null);
      return;
    }

    this.entered_username(entered_username);

    if (z.user.UserHandleGenerator.validate_handle(entered_username)) {
      this.user_repository
        .verify_username(entered_username)
        .then(() => {
          if (this.entered_username() === entered_username) {
            this.username_error('available');
          }
        })
        .catch(error => {
          if (error.type === z.user.UserError.TYPE.USERNAME_TAKEN && this.entered_username() === entered_username) {
            return this.username_error('taken');
          }
        });
    }
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
    const [new_user_picture] = Array.from(files);

    this.set_picture(new_user_picture)
      .then(() => {
        amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.PROFILE_PICTURE_CHANGED, {
          source: 'fromPhotoLibrary',
        });
      })
      .catch(error => {
        if (error.type !== z.user.UserError.TYPE.INVALID_UPDATE) {
          throw error;
        }
      });
  }

  click_on_delete_account() {
    amplify.publish(z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.DELETE_ACCOUNT, {
      action: () => this.user_repository.delete_me(),
      data: this.self_user().email(),
    });
  }

  click_on_create() {
    const path = `${z.l10n.text(z.string.url_website_create_team)}?pk_campaign=client&pk_kwd=desktop`;
    z.util.safe_window_open(z.util.URLUtil.build_url(z.util.URLUtil.TYPE.WEBSITE, path));
  }

  click_on_logout() {
    this.client_repository.logout_client();
  }

  click_on_manage() {
    const path = `${z.config.URL_PATH.MANAGE_TEAM}?pk_campaign=client&pk_kwd=desktop`;
    z.util.safe_window_open(z.util.URLUtil.build_url(z.util.URLUtil.TYPE.TEAM_SETTINGS, path));
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SETTINGS.OPENED_MANAGE_TEAM);
  }

  click_on_reset_password() {
    z.util.safe_window_open(z.util.URLUtil.build_url(z.util.URLUtil.TYPE.ACCOUNT, z.config.URL_PATH.PASSWORD_RESET));
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.PASSWORD_RESET, {value: 'fromProfile'});
  }

  set_picture(new_user_picture) {
    if (new_user_picture.size > z.config.MAXIMUM_IMAGE_FILE_SIZE) {
      const maximum_size_in_mb = z.config.MAXIMUM_IMAGE_FILE_SIZE / 1024 / 1024;
      return this._show_upload_warning(z.l10n.text(z.string.alert_upload_too_large, maximum_size_in_mb));
    }

    if (!z.config.SUPPORTED_PROFILE_IMAGE_TYPES.includes(new_user_picture.type)) {
      return this._show_upload_warning(z.l10n.text(z.string.alert_upload_file_format));
    }

    const min_height = z.user.UserRepository.CONFIG.MINIMUM_PICTURE_SIZE.HEIGHT;
    const min_width = z.user.UserRepository.CONFIG.MINIMUM_PICTURE_SIZE.WIDTH;

    return z.util.valid_profile_image_size(new_user_picture, min_width, min_height).then(valid => {
      if (valid) {
        return this.user_repository.change_picture(new_user_picture);
      }

      return this._show_upload_warning(z.l10n.text(z.string.alert_upload_too_small));
    });
  }

  _show_upload_warning(warning) {
    amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.ALERT);
    window.setTimeout(() => {
      window.alert(warning);
    }, 200);
    return Promise.reject(new z.user.UserError(z.user.UserError.TYPE.INVALID_UPDATE));
  }

  on_client_add(user_id, client_et) {
    amplify.publish(z.event.WebApp.SEARCH.BADGE.SHOW);
    this.new_clients.push(client_et);
  }

  on_client_remove(user_id, client_id) {
    if (user_id === this.self_user().id) {
      this.new_clients().forEach(client_et => {
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
