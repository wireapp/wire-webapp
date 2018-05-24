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
  static get CONFIG() {
    return {
      PROFILE_IMAGE: {
        FILE_TYPES: ['image/bmp', 'image/jpeg', 'image/jpg', 'image/png', '.jpg-large'],
      },
      SAVE_ANIMATION_TIMEOUT: z.motion.MotionDuration.X_LONG * 2,
    };
  }

  static get USERNAME_STATE() {
    return {
      AVAILABLE: 'PreferencesAccountViewModel.USERNAME_STATE.AVAILABLE',
      TAKEN: 'PreferencesAccountViewModel.USERNAME_STATE.TAKEN',
    };
  }

  constructor(mainViewModel, contentViewModel, repositories) {
    this.changeAccentColor = this.changeAccentColor.bind(this);
    this.checkNewClients = this.checkNewClients.bind(this);
    this.removedFromView = this.removedFromView.bind(this);

    this.logger = new z.util.Logger('z.viewModel.content.PreferencesAccountViewModel', z.config.LOGGER.OPTIONS);

    this.mainViewModel = mainViewModel;
    this.backupRepository = repositories.backup;
    this.clientRepository = repositories.client;
    this.conversationRepository = repositories.conversation;
    this.propertiesRepository = repositories.properties;
    this.teamRepository = repositories.team;
    this.userRepository = repositories.user;

    this.isActivatedAccount = this.mainViewModel.isActivatedAccount;
    this.selfUser = this.userRepository.self;

    this.newClients = ko.observableArray([]);
    this.name = ko.pureComputed(() => this.selfUser().name());
    this.availability = ko.pureComputed(() => this.selfUser().availability());

    this.availabilityLabel = ko.pureComputed(() => {
      let label = z.user.AvailabilityMapper.nameFromType(this.availability());

      const noStatusSet = this.availability() === z.user.AvailabilityType.NONE;
      if (noStatusSet) {
        label = z.l10n.text(z.string.preferencesAccountAvaibilityUnset);
      }

      return label;
    });

    this.username = ko.pureComputed(() => this.selfUser().username());
    this.enteredUsername = ko.observable();
    this.submittedUsername = ko.observable();
    this.usernameState = ko.observable();

    this.nameSaved = ko.observable();
    this.usernameSaved = ko.observable();

    this.isTeam = this.teamRepository.isTeam;
    this.isTeamManager = ko.pureComputed(() => this.isTeam() && this.selfUser().isTeamManager());
    this.team = this.teamRepository.team;
    this.teamName = ko.pureComputed(() => z.l10n.text(z.string.preferencesAccountTeam, this.teamRepository.teamName()));

    this.optionPrivacy = ko.observable();
    this.optionPrivacy.subscribe(privacyPreference => {
      this.propertiesRepository.savePreference(z.properties.PROPERTIES_TYPE.PRIVACY, privacyPreference);
    });

    this.optionMarketingConsent = this.userRepository.marketingConsent;

    this._initSubscriptions();
  }

  _initSubscriptions() {
    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATED, this.updateProperties.bind(this));
    amplify.subscribe(z.event.WebApp.USER.CLIENT_ADDED, this.onClientAdd.bind(this));
    amplify.subscribe(z.event.WebApp.USER.CLIENT_REMOVED, this.onClientRemove.bind(this));
  }

  changeAccentColor(id) {
    this.userRepository.change_accent_color(id);
  }

  changeName(viewModel, event) {
    const newName = event.target.value.trim();

    const isUnchanged = newName === this.selfUser().name();
    if (isUnchanged) {
      return event.target.blur();
    }

    const isValidName = newName.length >= z.user.UserRepository.CONFIG.MINIMUM_NAME_LENGTH;
    if (isValidName) {
      this.userRepository.change_name(newName).then(() => {
        this.nameSaved(true);
        event.target.blur();
        window.setTimeout(() => this.nameSaved(false), PreferencesAccountViewModel.CONFIG.SAVE_ANIMATION_TIMEOUT);
      });
    }
  }

  changeUsername(username, event) {
    const enteredUsername = event.target.value;
    const normalizedUsername = enteredUsername.toLowerCase().replace(/[^a-z0-9_]/g, '');

    const wasNormalized = enteredUsername !== normalizedUsername;
    if (wasNormalized) {
      event.target.value = normalizedUsername;
    }

    const isUnchanged = normalizedUsername === this.selfUser().username();
    if (isUnchanged) {
      return event.target.blur();
    }

    const isInvalidName = normalizedUsername.length < z.user.UserRepository.CONFIG.MINIMUM_USERNAME_LENGTH;
    if (isInvalidName) {
      return this.usernameState(null);
    }

    this.submittedUsername(normalizedUsername);
    this.userRepository
      .change_username(normalizedUsername)
      .then(() => {
        const isCurrentRequest = this.enteredUsername() === this.submittedUsername();
        if (isCurrentRequest) {
          this.usernameState(null);
          this.usernameSaved(true);

          event.target.blur();
          window.setTimeout(() => this.usernameSaved(false), PreferencesAccountViewModel.CONFIG.SAVE_ANIMATION_TIMEOUT);
        }
      })
      .catch(error => {
        const isUsernameTaken = error.type === z.user.UserError.TYPE.USERNAME_TAKEN;
        const isCurrentRequest = this.enteredUsername() === this.submittedUsername();
        if (isUsernameTaken && isCurrentRequest) {
          this.usernameState(PreferencesAccountViewModel.USERNAME_STATE.TAKEN);
        }
      });
  }

  checkUsernameInput(username, keyboardEvent) {
    if (z.util.KeyboardUtil.isKey(keyboardEvent, z.util.KeyboardUtil.KEY.BACKSPACE)) {
      return true;
    }

    // Automation: KeyboardEvent triggered during tests is missing key property
    const inputChar = keyboardEvent.key || String.fromCharCode(event.charCode);
    return z.user.UserHandleGenerator.validate_character(inputChar.toLowerCase());
  }

  checkNewClients() {
    if (this.newClients().length) {
      amplify.publish(z.event.WebApp.SEARCH.BADGE.HIDE);

      amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.ACCOUNT_NEW_DEVICES, {
        close: () => this.newClients.removeAll(),
        data: this.newClients(),
        preventClose: true,
        secondary: () => {
          amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.viewModel.ContentViewModel.STATE.PREFERENCES_DEVICES);
        },
      });
    }
  }

  clickOnChangePicture(files) {
    const [newUserPicture] = Array.from(files);

    this.setPicture(newUserPicture).catch(error => {
      const isInvalidUpdate = error.type === z.user.UserError.TYPE.INVALID_UPDATE;
      if (!isInvalidUpdate) {
        throw error;
      }
    });
  }

  clickOnAvailability(viewModel, event) {
    z.ui.AvailabilityContextMenu.show(event, 'settings', 'preferences-account-availability-menu');
  }

  clickOnBackupExport() {
    amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.viewModel.ContentViewModel.STATE.HISTORY_EXPORT);
    amplify.publish(z.event.WebApp.BACKUP.EXPORT.START);
  }

  onImportFileChange(viewModel, event) {
    const file = event.target.files[0];
    if (file) {
      amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.viewModel.ContentViewModel.STATE.HISTORY_IMPORT);
      amplify.publish(z.event.WebApp.BACKUP.IMPORT.START, file);
    }
  }

  clickOnCreate() {
    const path = `${z.l10n.text(z.string.urlWebsiteCreateTeam)}?pk_campaign=client&pk_kwd=desktop`;
    z.util.safeWindowOpen(z.util.URLUtil.buildUrl(z.util.URLUtil.TYPE.WEBSITE, path));
  }

  clickOnDeleteAccount() {
    amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
      action: () => this.userRepository.delete_me(),
      text: {
        action: z.l10n.text(z.string.modalAccountDeletionAction),
        message: z.l10n.text(z.string.modalAccountDeletionMessage),
        title: z.l10n.text(z.string.modalAccountDeletionHeadline),
      },
    });
  }

  clickOnLeaveGuestRoom() {
    amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
      action: () => this.conversationRepository.leaveGuestRoom().then(() => this.clientRepository.logoutClient()),
      preventClose: true,
      text: {
        action: z.l10n.text(z.string.modalAccountLeaveGuestRoomAction),
        message: z.l10n.text(z.string.modalAccountLeaveGuestRoomMessage),
        title: z.l10n.text(z.string.modalAccountLeaveGuestRoomHeadline),
      },
      warning: false,
    });
  }

  clickOnLogout() {
    this.clientRepository.logoutClient();
  }

  clickOnManage() {
    const path = `${z.config.URL_PATH.MANAGE_TEAM}?utm_source=client_settings&utm_term=desktop`;
    z.util.safeWindowOpen(z.util.URLUtil.buildUrl(z.util.URLUtil.TYPE.TEAM_SETTINGS, path));
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SETTINGS.OPENED_MANAGE_TEAM);
  }

  clickOnResetPassword() {
    z.util.safeWindowOpen(z.util.URLUtil.buildUrl(z.util.URLUtil.TYPE.ACCOUNT, z.config.URL_PATH.PASSWORD_RESET));
  }

  onClientAdd(userId, clientEntity) {
    const isSelfUser = userId === this.selfUser().id;
    if (isSelfUser) {
      amplify.publish(z.event.WebApp.SEARCH.BADGE.SHOW);
      this.newClients.push(clientEntity);
    }
  }

  onClientRemove(userId, clientId) {
    const isSelfUser = userId === this.selfUser().id;
    if (isSelfUser) {
      this.newClients.remove(clientEntity => {
        const isExpectedId = clientEntity.id === clientId;
        return isExpectedId && clientEntity.isPermanent();
      });

      if (!this.newClients().length) {
        amplify.publish(z.event.WebApp.SEARCH.BADGE.HIDE);
      }
    }
    return true;
  }

  removedFromView() {
    this._resetUsernameInput();
  }

  resetNameInput() {
    if (!this.nameSaved()) {
      this.name.notifySubscribers();
    }
  }

  resetUsernameInput() {
    if (!this.usernameSaved()) {
      this._resetUsernameInput();
      this.username.notifySubscribers();
    }
  }

  setPicture(newUserPicture) {
    const isTooLarge = newUserPicture.size > z.config.MAXIMUM_IMAGE_FILE_SIZE;
    if (isTooLarge) {
      const maximumSizeInMB = z.config.MAXIMUM_IMAGE_FILE_SIZE / 1024 / 1024;
      const messageString = z.l10n.text(z.string.modalPictureTooLargeMessage, maximumSizeInMB);
      const titleString = z.l10n.text(z.string.modalPictureTooLargeHeadline);

      return this._showUploadWarning(titleString, messageString);
    }

    const isWrongFormat = !PreferencesAccountViewModel.CONFIG.PROFILE_IMAGE.FILE_TYPES.includes(newUserPicture.type);
    if (isWrongFormat) {
      const titleString = z.l10n.text(z.string.modalPictureFileFormatHeadline);
      const messageString = z.l10n.text(z.string.modalPictureFileFormatMessage);

      return this._showUploadWarning(titleString, messageString);
    }

    const minHeight = z.user.UserRepository.CONFIG.MINIMUM_PICTURE_SIZE.HEIGHT;
    const minWidth = z.user.UserRepository.CONFIG.MINIMUM_PICTURE_SIZE.WIDTH;

    return z.util.validateProfileImageResolution(newUserPicture, minWidth, minHeight).then(isValid => {
      if (isValid) {
        return this.userRepository.change_picture(newUserPicture);
      }

      const messageString = z.l10n.text(z.string.modalPictureTooSmallMessage);
      const titleString = z.l10n.text(z.string.modalPictureTooSmallHeadline);
      return this._showUploadWarning(titleString, messageString);
    });
  }

  shouldFocusUsername() {
    return this.userRepository.should_set_username;
  }

  verifyUsername(username, event) {
    const enteredUsername = event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');

    const usernameTooShort = enteredUsername.length < z.user.UserRepository.CONFIG.MINIMUM_USERNAME_LENGTH;
    const usernameUnchanged = enteredUsername === this.selfUser().username();
    if (usernameTooShort || usernameUnchanged) {
      return this.usernameState(null);
    }

    this.enteredUsername(enteredUsername);

    if (z.user.UserHandleGenerator.validate_handle(enteredUsername)) {
      this.userRepository
        .verify_username(enteredUsername)
        .then(() => {
          const isCurrentRequest = this.enteredUsername() === enteredUsername;
          if (isCurrentRequest) {
            this.usernameState(PreferencesAccountViewModel.USERNAME_STATE.AVAILABLE);
          }
        })
        .catch(error => {
          const isUsernameTaken = error.type === z.user.UserError.TYPE.USERNAME_TAKEN;
          const isCurrentRequest = this.enteredUsername() === enteredUsername;
          if (isUsernameTaken && isCurrentRequest) {
            this.usernameState(PreferencesAccountViewModel.USERNAME_STATE.TAKEN);
          }
        });
    }
  }

  _showUploadWarning(title, message) {
    const modalOptions = {text: {message, title}};
    amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.ACKNOWLEDGE, modalOptions);

    return Promise.reject(new z.user.UserError(z.user.UserError.TYPE.INVALID_UPDATE));
  }

  _resetUsernameInput() {
    this.usernameState(null);
    this.enteredUsername(null);
    this.submittedUsername(null);
  }

  updateProperties(properties) {
    this.optionPrivacy(properties.settings.privacy.improve_wire);
  }
};
