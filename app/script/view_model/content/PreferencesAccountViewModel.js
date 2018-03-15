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

z.viewModel.content.PreferencesAccountViewModel = class PreferencesAccountViewModel {
  static get SAVED_ANIMATION_TIMEOUT() {
    return 750 * 2;
  }

  constructor(mainViewModel, contentViewModel, repositories) {
    this.change_accent_color = this.change_accent_color.bind(this);
    this.check_new_clients = this.check_new_clients.bind(this);
    this.removed_from_view = this.removed_from_view.bind(this);

    this.logger = new z.util.Logger('z.viewModel.content.PreferencesAccountViewModel', z.config.LOGGER.OPTIONS);

    this.client_repository = repositories.client;
    this.team_repository = repositories.team;
    this.user_repository = repositories.user;

    this.self_user = this.user_repository.self;
    this.new_clients = ko.observableArray([]);
    this.name = ko.pureComputed(() => this.self_user().name());
    this.availability = ko.pureComputed(() => this.self_user().availability());

    this.availabilityLabel = ko.pureComputed(() => {
      let label = z.user.AvailabilityMapper.nameFromType(this.availability());

      const noStatusSet = this.availability() === z.user.AvailabilityType.NONE;
      if (noStatusSet) {
        label = z.l10n.text(z.string.preferencesAccountAvaibilityUnset);
      }

      return label;
    });

    this.username = ko.pureComputed(() => this.self_user().username());
    this.entered_username = ko.observable();
    this.submitted_username = ko.observable();
    this.username_error = ko.observable();

    this.is_team = this.team_repository.isTeam;
    this.is_team_manager = ko.pureComputed(() => this.is_team() && this.self_user().is_team_manager());
    this.team = this.team_repository.team;
    this.team_name = ko.pureComputed(() =>
      z.l10n.text(z.string.preferencesAccountTeam, this.team_repository.teamName())
    );

    this.name_saved = ko.observable();
    this.username_saved = ko.observable();

    this._init_subscriptions();
  }

  _init_subscriptions() {
    amplify.subscribe(z.event.WebApp.USER.CLIENT_ADDED, this.onClientAdd.bind(this));
    amplify.subscribe(z.event.WebApp.USER.CLIENT_REMOVED, this.onClientRemove.bind(this));
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
    if (z.util.KeyboardUtil.isKey(keyboard_event, z.util.KeyboardUtil.KEY.BACKSPACE)) {
      return true;
    }
    // Automation: KeyboardEvent triggered during tests is missing key property
    const input_char = keyboard_event.key || String.fromCharCode(event.charCode);
    return z.user.UserHandleGenerator.validate_character(input_char.toLowerCase());
  }

  clickOnAvailability(viewModel, event) {
    z.ui.AvailabilityContextMenu.show(event, 'settings', 'preferences-account-availability-menu');
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
      amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.ACCOUNT_NEW_DEVICES, {
        close: () => this.new_clients.removeAll(),
        data: this.new_clients(),
        preventClose: true,
        secondary: () => {
          amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.viewModel.ContentViewModel.STATE.PREFERENCES_DEVICES);
        },
      });
    }
  }

  click_on_change_picture(files) {
    const [new_user_picture] = Array.from(files);

    this.set_picture(new_user_picture).catch(error => {
      if (error.type !== z.user.UserError.TYPE.INVALID_UPDATE) {
        throw error;
      }
    });
  }

  click_on_delete_account() {
    amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
      action: () => this.user_repository.delete_me(),
      text: {
        action: z.l10n.text(z.string.modalAccountDeletionAction),
        message: z.l10n.text(z.string.modalAccountDeletionMessage),
        title: z.l10n.text(z.string.modalAccountDeletionHeadline),
      },
    });
  }

  click_on_create() {
    const path = `${z.l10n.text(z.string.urlWebsiteCreateTeam)}?pk_campaign=client&pk_kwd=desktop`;
    z.util.safeWindowOpen(z.util.URLUtil.buildUrl(z.util.URLUtil.TYPE.WEBSITE, path));
  }

  click_on_logout() {
    this.client_repository.logoutClient();
  }

  click_on_manage() {
    const path = `${z.config.URL_PATH.MANAGE_TEAM}?utm_source=client_settings&utm_term=desktop`;
    z.util.safeWindowOpen(z.util.URLUtil.buildUrl(z.util.URLUtil.TYPE.TEAM_SETTINGS, path));
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SETTINGS.OPENED_MANAGE_TEAM);
  }

  click_on_reset_password() {
    z.util.safeWindowOpen(z.util.URLUtil.buildUrl(z.util.URLUtil.TYPE.ACCOUNT, z.config.URL_PATH.PASSWORD_RESET));
  }

  set_picture(new_user_picture) {
    if (new_user_picture.size > z.config.MAXIMUM_IMAGE_FILE_SIZE) {
      const maximum_size_in_mb = z.config.MAXIMUM_IMAGE_FILE_SIZE / 1024 / 1024;
      const messageString = z.l10n.text(z.string.modalPictureTooLargeMessage, maximum_size_in_mb);
      const titleString = z.l10n.text(z.string.modalPictureTooLargeHeadline);

      return this._show_upload_warning(titleString, messageString);
    }

    if (!z.config.SUPPORTED_PROFILE_IMAGE_TYPES.includes(new_user_picture.type)) {
      const titleString = z.l10n.text(z.string.modalPictureFileFormatHeadline);
      const messageString = z.l10n.text(z.string.modalPictureFileFormatMessage);

      return this._show_upload_warning(titleString, messageString);
    }

    const min_height = z.user.UserRepository.CONFIG.MINIMUM_PICTURE_SIZE.HEIGHT;
    const min_width = z.user.UserRepository.CONFIG.MINIMUM_PICTURE_SIZE.WIDTH;

    return z.util.valid_profile_image_size(new_user_picture, min_width, min_height).then(valid => {
      if (valid) {
        return this.user_repository.change_picture(new_user_picture);
      }

      const messageString = z.l10n.text(z.string.modalPictureTooSmallMessage);
      const titleString = z.l10n.text(z.string.modalPictureTooSmallHeadline);
      return this._show_upload_warning(titleString, messageString);
    });
  }

  _show_upload_warning(title, message) {
    const modalOptions = {text: {message, title}};
    amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.ACKNOWLEDGE, modalOptions);

    return Promise.reject(new z.user.UserError(z.user.UserError.TYPE.INVALID_UPDATE));
  }

  onClientAdd(userId, clientEntity) {
    const isSelfUser = userId === this.self_user().id;
    if (isSelfUser) {
      amplify.publish(z.event.WebApp.SEARCH.BADGE.SHOW);
      this.new_clients.push(clientEntity);
    }
  }

  onClientRemove(userId, clientId) {
    const isSelfUser = userId === this.self_user().id;
    if (isSelfUser) {
      this.new_clients.remove(clientEntity => {
        const isExpectedId = clientEntity.id === clientId;
        return isExpectedId && clientEntity.isPermanent();
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
