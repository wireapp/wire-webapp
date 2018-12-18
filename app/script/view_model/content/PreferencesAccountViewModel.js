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

import {groupBy} from 'underscore';

import backendEvent from '../../event/Backend';
import PropertiesRepository from '../../properties/PropertiesRepository';
import {getCreateTeamUrl, getManageTeamUrl, URL_PATH} from '../../externalRoute';

window.z = window.z || {};
window.z.viewModel = z.viewModel || {};
window.z.viewModel.content = z.viewModel.content || {};

z.viewModel.content.PreferencesAccountViewModel = class PreferencesAccountViewModel {
  static get CONFIG() {
    return {
      NOTIFICATION_TYPES: {
        NEW_CLIENT: 'new-client',
        READ_RECEIPTS_CHANGED: 'read-receipt-changed',
      },
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
    this.removedFromView = this.removedFromView.bind(this);

    this.logger = new z.util.Logger('z.viewModel.content.PreferencesAccountViewModel', z.config.LOGGER.OPTIONS);

    this.mainViewModel = mainViewModel;
    this.backupRepository = repositories.backup;
    this.clientRepository = repositories.client;
    this.conversationRepository = repositories.conversation;
    this.propertiesRepository = repositories.properties;
    this.teamRepository = repositories.team;
    this.userRepository = repositories.user;

    this.isActivatedAccount = this.userRepository.isActivatedAccount;
    this.selfUser = this.userRepository.self;

    this.notifications = ko.observableArray([]);
    this.notifications.subscribe(notifications => {
      const event = notifications.length > 0 ? z.event.WebApp.SEARCH.BADGE.SHOW : z.event.WebApp.SEARCH.BADGE.HIDE;
      amplify.publish(event);
    });

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

    this.optionReadReceipts = this.propertiesRepository.receiptMode;

    this.optionMarketingConsent = this.userRepository.marketingConsent;
    this.isMacOsWrapper = z.util.Environment.electron && z.util.Environment.os.mac;
    this.manageTeamUrl = getManageTeamUrl('client_settings');
    this.createTeamUrl = getCreateTeamUrl('client');

    this.isConsentCheckEnabled = () => z.config.FEATURE.CHECK_CONSENT;

    this._initSubscriptions();
  }

  _initSubscriptions() {
    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATED, this.updateProperties.bind(this));
    amplify.subscribe(z.event.WebApp.USER.CLIENT_ADDED, this.onClientAdd.bind(this));
    amplify.subscribe(z.event.WebApp.USER.CLIENT_REMOVED, this.onClientRemove.bind(this));
    amplify.subscribe(z.event.WebApp.USER.EVENT_FROM_BACKEND, this.onUserEvent.bind(this));
  }

  onUserEvent(event) {
    if (event.type === backendEvent.USER.PROPERTIES_DELETE || event.type === backendEvent.USER.PROPERTIES_SET) {
      if (event.key === PropertiesRepository.CONFIG.ENABLE_READ_RECEIPTS.key) {
        const defaultValue = !!PropertiesRepository.CONFIG.ENABLE_READ_RECEIPTS.defaultValue;
        this.notifications.push({
          data: event.value === undefined ? defaultValue : !!event.value,
          type: PreferencesAccountViewModel.CONFIG.NOTIFICATION_TYPES.READ_RECEIPTS_CHANGED,
        });
      }
    }
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
        const isUsernameTaken = error.type === z.error.UserError.TYPE.USERNAME_TAKEN;
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

  popNotification() {
    if (!this.notifications().length) {
      return;
    }
    const notificationPriorities = [
      PreferencesAccountViewModel.CONFIG.NOTIFICATION_TYPES.NEW_CLIENT,
      PreferencesAccountViewModel.CONFIG.NOTIFICATION_TYPES.READ_RECEIPTS_CHANGED,
    ];
    const groupedNotifications = groupBy(this.notifications(), notification => notification.type);
    for (const type of notificationPriorities) {
      if (groupedNotifications[type]) {
        this.notifications.remove(notification => notification.type === type);
        return this._showNotification(type, groupedNotifications[type], this.popNotification.bind(this));
      }
    }
  }

  _showNotification(type, aggregatedNotifications, closeAction) {
    switch (type) {
      case PreferencesAccountViewModel.CONFIG.NOTIFICATION_TYPES.NEW_CLIENT: {
        amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.ACCOUNT_NEW_DEVICES, {
          close: closeAction,
          data: aggregatedNotifications.map(notification => notification.data),
          preventClose: true,
          secondary: () => {
            amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.viewModel.ContentViewModel.STATE.PREFERENCES_DEVICES);
          },
        });
        break;
      }

      case PreferencesAccountViewModel.CONFIG.NOTIFICATION_TYPES.READ_RECEIPTS_CHANGED: {
        amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.ACCOUNT_READ_RECEIPTS_CHANGED, {
          close: closeAction,
          data: aggregatedNotifications.pop().data,
          preventClose: true,
        });
        break;
      }
    }
  }

  clickOnChangePicture(files) {
    const [newUserPicture] = Array.from(files);

    this.setPicture(newUserPicture).catch(error => {
      const isInvalidUpdate = error.type === z.error.UserError.TYPE.INVALID_UPDATE;
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

  clickOpenManageTeam() {
    if (this.manageTeamUrl) {
      z.util.SanitizationUtil.safeWindowOpen(this.manageTeamUrl);
      amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SETTINGS.OPENED_MANAGE_TEAM);
    }
  }

  clickOnResetPassword() {
    const url = z.util.URLUtil.buildUrl(z.util.URLUtil.TYPE.ACCOUNT, URL_PATH.PASSWORD_RESET);
    z.util.SanitizationUtil.safeWindowOpen(url);
  }

  onClientAdd(userId, clientEntity) {
    const isSelfUser = userId === this.selfUser().id;
    if (isSelfUser) {
      this.notifications.push({
        data: clientEntity,
        type: PreferencesAccountViewModel.CONFIG.NOTIFICATION_TYPES.NEW_CLIENT,
      });
    }
  }

  onClientRemove(userId, clientId) {
    const isSelfUser = userId === this.selfUser().id;
    if (isSelfUser) {
      this.notifications.remove(({data: clientEntity}) => {
        const isExpectedId = clientEntity.id === clientId;
        return isExpectedId && clientEntity.isPermanent();
      });
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
          const isUsernameTaken = error.type === z.error.UserError.TYPE.USERNAME_TAKEN;
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

    return Promise.reject(new z.error.UserError(z.error.UserError.TYPE.INVALID_UPDATE));
  }

  _resetUsernameInput() {
    this.usernameState(null);
    this.enteredUsername(null);
    this.submittedUsername(null);
  }

  onReadReceiptsChange(viewModel, event) {
    const enableReadReceipts = event.target.checked;
    const receiptMode = enableReadReceipts ? 1 : 0;
    this.propertiesRepository.saveReceiptMode(receiptMode);
    return true;
  }

  updateProperties(properties) {
    this.optionPrivacy(properties.settings.privacy.improve_wire);
  }
};
