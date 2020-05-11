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

import {Availability, Confirmation} from '@wireapp/protocol-messaging';
import {WebAppEvents} from '@wireapp/webapp-events';

import {getLogger} from 'Util/Logger';
import {t} from 'Util/LocalizerUtil';
import {isTemporaryClientAndNonPersistent, validateProfileImageResolution} from 'Util/util';
import {Environment} from 'Util/Environment';
import {isKey, KEY} from 'Util/KeyboardUtil';
import {safeWindowOpen} from 'Util/SanitizationUtil';

import {PreferenceNotificationRepository} from '../../notification/PreferenceNotificationRepository';
import {getAccountPagesUrl, getCreateTeamUrl, getManageTeamUrl, URL_PATH} from '../../externalRoute';
import {PropertiesRepository} from '../../properties/PropertiesRepository';
import {PROPERTIES_TYPE} from '../../properties/PropertiesType';

import {modals, ModalsViewModel} from '../ModalsViewModel';
import {User} from '../../entity/User';

import {Config} from '../../Config';
import {ConsentValue} from '../../user/ConsentValue';
import {validateCharacter, validateHandle} from '../../user/UserHandleGenerator';
import {UserRepository} from '../../user/UserRepository';
import {nameFromType} from '../../user/AvailabilityMapper';
import {ParticipantAvatar} from 'Components/participantAvatar';
import {AvailabilityContextMenu} from '../../ui/AvailabilityContextMenu';
import {MotionDuration} from '../../motion/MotionDuration';
import {EventName} from '../../tracking/EventName';
import {ContentViewModel} from '../ContentViewModel';

import 'Components/availabilityState';
import {isAppLockEnabled} from './AppLockViewModel';
import {loadValue} from 'Util/StorageUtil';
import {StorageKey} from '../../storage';
import {UserError} from '../../error/UserError';

window.z = window.z || {};
window.z.viewModel = z.viewModel || {};
window.z.viewModel.content = z.viewModel.content || {};

z.viewModel.content.PreferencesAccountViewModel = class PreferencesAccountViewModel {
  static get CONFIG() {
    return {
      PROFILE_IMAGE: {
        FILE_TYPES: ['image/bmp', 'image/jpeg', 'image/jpg', 'image/png', '.jpg-large'],
      },
      SAVE_ANIMATION_TIMEOUT: MotionDuration.X_LONG * 2,
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

    this.logger = getLogger('z.viewModel.content.PreferencesAccountViewModel');

    this.mainViewModel = mainViewModel;
    this.backupRepository = repositories.backup;
    this.clientRepository = repositories.client;
    this.conversationRepository = repositories.conversation;
    this.preferenceNotificationRepository = repositories.preferenceNotification;
    this.propertiesRepository = repositories.properties;
    this.teamRepository = repositories.team;
    this.userRepository = repositories.user;
    this.Environment = Environment;
    this.brandName = Config.getConfig().BRAND_NAME;

    this.isActivatedAccount = this.userRepository.isActivatedAccount;
    this.selfUser = this.userRepository.self;

    this.name = ko.pureComputed(() => this.selfUser().name());
    this.availability = ko.pureComputed(() => this.selfUser().availability());

    this.availabilityLabel = ko.pureComputed(() => {
      let label = nameFromType(this.availability());

      const noStatusSet = this.availability() === Availability.Type.NONE;
      if (noStatusSet) {
        // TODO: fix typo in translation string
        /* cspell:disable-next-line */
        label = t('preferencesAccountAvaibilityUnset');
      }

      return label;
    });

    this.username = ko.pureComputed(() => this.selfUser().username());
    this.enteredUsername = ko.observable();
    this.submittedUsername = ko.observable();
    this.usernameState = ko.observable();
    this.richProfileFields = ko.observable([]);

    this.nameSaved = ko.observable();
    this.usernameSaved = ko.observable();

    this.isTeam = this.teamRepository.isTeam;
    this.team = this.teamRepository.team;
    this.teamName = ko.pureComputed(() => t('preferencesAccountTeam', this.teamRepository.teamName()));

    this.optionPrivacy = ko.observable();
    this.optionPrivacy.subscribe(privacyPreference => {
      this.propertiesRepository.savePreference(PROPERTIES_TYPE.PRIVACY, privacyPreference);
    });

    this.optionReadReceipts = this.propertiesRepository.receiptMode;
    this.optionMarketingConsent = this.propertiesRepository.marketingConsent;

    this.optionResetAppLock = isAppLockEnabled();
    this.ParticipantAvatar = ParticipantAvatar;

    this.isMacOsWrapper = Environment.electron && Environment.os.mac;
    this.manageTeamUrl = getManageTeamUrl('client_settings');
    this.createTeamUrl = getCreateTeamUrl('client');

    this.isTemporaryAndNonPersistent = isTemporaryClientAndNonPersistent(loadValue(StorageKey.AUTH.PERSIST));
    this.isConsentCheckEnabled = () => Config.getConfig().FEATURE.CHECK_CONSENT;
    this.canEditProfile = user => user.managedBy() === User.CONFIG.MANAGED_BY.WIRE;

    this.updateProperties(this.propertiesRepository.properties);
    this._initSubscriptions();
  }

  _initSubscriptions() {
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATED, this.updateProperties);
  }

  changeAccentColor(id) {
    this.userRepository.changeAccentColor(id);
  }

  changeName(viewModel, event) {
    const newName = event.target.value.trim();

    const isUnchanged = newName === this.selfUser().name();
    if (isUnchanged) {
      return event.target.blur();
    }

    const isValidName = newName.length >= UserRepository.CONFIG.MINIMUM_NAME_LENGTH;
    if (isValidName) {
      this.userRepository.changeName(newName).then(() => {
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

    const isInvalidName = normalizedUsername.length < UserRepository.CONFIG.MINIMUM_USERNAME_LENGTH;
    if (isInvalidName) {
      return this.usernameState(null);
    }

    this.submittedUsername(normalizedUsername);
    this.userRepository
      .changeUsername(normalizedUsername)
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
        const isUsernameTaken = error.type === UserError.TYPE.USERNAME_TAKEN;
        const isCurrentRequest = this.enteredUsername() === this.submittedUsername();
        if (isUsernameTaken && isCurrentRequest) {
          this.usernameState(PreferencesAccountViewModel.USERNAME_STATE.TAKEN);
        }
      });
  }

  checkUsernameInput(username, keyboardEvent) {
    if (isKey(keyboardEvent, KEY.BACKSPACE)) {
      return true;
    }

    // Automation: KeyboardEvent triggered during tests is missing key property
    const inputChar = keyboardEvent.key || String.fromCharCode(event.charCode);
    return validateCharacter(inputChar.toLowerCase());
  }

  popNotification() {
    this.preferenceNotificationRepository
      .getNotifications()
      .forEach(({type, notification}) => this._showNotification(type, notification));
  }

  _showNotification(type, aggregatedNotifications) {
    switch (type) {
      case PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.NEW_CLIENT: {
        modals.showModal(ModalsViewModel.TYPE.ACCOUNT_NEW_DEVICES, {
          data: aggregatedNotifications.map(notification => notification.data),
          preventClose: true,
          secondaryAction: {
            action: () => {
              amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentViewModel.STATE.PREFERENCES_DEVICES);
            },
          },
        });
        break;
      }

      case PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.READ_RECEIPTS_CHANGED: {
        modals.showModal(ModalsViewModel.TYPE.ACCOUNT_READ_RECEIPTS_CHANGED, {
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
      const isInvalidUpdate = error.type === UserError.TYPE.INVALID_UPDATE;
      if (!isInvalidUpdate) {
        throw error;
      }
    });
  }

  clickOnAvailability(viewModel, event) {
    AvailabilityContextMenu.show(event, 'settings', 'preferences-account-availability-menu');
  }

  clickOnBackupExport() {
    amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentViewModel.STATE.HISTORY_EXPORT);
    amplify.publish(WebAppEvents.BACKUP.EXPORT.START);
  }

  onImportFileChange(viewModel, event) {
    const file = event.target.files[0];
    if (file) {
      amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentViewModel.STATE.HISTORY_IMPORT);
      amplify.publish(WebAppEvents.BACKUP.IMPORT.START, file);
    }
  }

  clickOnDeleteAccount() {
    modals.showModal(ModalsViewModel.TYPE.CONFIRM, {
      primaryAction: {
        action: () => this.userRepository.deleteMe(),
        text: t('modalAccountDeletionAction'),
      },
      text: {
        message: t('modalAccountDeletionMessage'),
        title: t('modalAccountDeletionHeadline'),
      },
    });
  }

  clickOnLeaveGuestRoom() {
    modals.showModal(ModalsViewModel.TYPE.CONFIRM, {
      preventClose: true,
      primaryAction: {
        action: () => this.conversationRepository.leaveGuestRoom().then(() => this.clientRepository.logoutClient()),
        text: t('modalAccountLeaveGuestRoomAction'),
      },
      text: {
        message: t('modalAccountLeaveGuestRoomMessage'),
        title: t('modalAccountLeaveGuestRoomHeadline'),
      },
    });
  }

  clickOnLogout() {
    this.clientRepository.logoutClient();
  }

  clickOpenManageTeam() {
    if (this.manageTeamUrl) {
      safeWindowOpen(this.manageTeamUrl);
      amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.SETTINGS.OPENED_MANAGE_TEAM);
    }
  }

  clickOnResetPassword() {
    safeWindowOpen(getAccountPagesUrl(URL_PATH.PASSWORD_RESET));
  }

  clickOnResetAppLockPassphrase() {
    amplify.publish(WebAppEvents.PREFERENCES.CHANGE_APP_LOCK_PASSPHRASE);
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
    const isTooLarge = newUserPicture.size > Config.getConfig().MAXIMUM_IMAGE_FILE_SIZE;
    if (isTooLarge) {
      const maximumSizeInMB = Config.getConfig().MAXIMUM_IMAGE_FILE_SIZE / 1024 / 1024;
      const messageString = t('modalPictureTooLargeMessage', maximumSizeInMB);
      const titleString = t('modalPictureTooLargeHeadline');

      return this._showUploadWarning(titleString, messageString);
    }

    const isWrongFormat = !PreferencesAccountViewModel.CONFIG.PROFILE_IMAGE.FILE_TYPES.includes(newUserPicture.type);
    if (isWrongFormat) {
      const titleString = t('modalPictureFileFormatHeadline');
      const messageString = t('modalPictureFileFormatMessage');

      return this._showUploadWarning(titleString, messageString);
    }

    const minHeight = UserRepository.CONFIG.MINIMUM_PICTURE_SIZE.HEIGHT;
    const minWidth = UserRepository.CONFIG.MINIMUM_PICTURE_SIZE.WIDTH;

    return validateProfileImageResolution(newUserPicture, minWidth, minHeight).then(isValid => {
      if (isValid) {
        return this.userRepository.changePicture(newUserPicture);
      }

      const messageString = t('modalPictureTooSmallMessage');
      const titleString = t('modalPictureTooSmallHeadline');
      return this._showUploadWarning(titleString, messageString);
    });
  }

  shouldFocusUsername() {
    return this.userRepository.should_set_username;
  }

  verifyUsername(username, event) {
    const enteredUsername = event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');

    const usernameTooShort = enteredUsername.length < UserRepository.CONFIG.MINIMUM_USERNAME_LENGTH;
    const usernameUnchanged = enteredUsername === this.selfUser().username();
    if (usernameTooShort || usernameUnchanged) {
      return this.usernameState(null);
    }

    this.enteredUsername(enteredUsername);

    if (validateHandle(enteredUsername)) {
      this.userRepository
        .verifyUsername(enteredUsername)
        .then(() => {
          const isCurrentRequest = this.enteredUsername() === enteredUsername;
          if (isCurrentRequest) {
            this.usernameState(PreferencesAccountViewModel.USERNAME_STATE.AVAILABLE);
          }
        })
        .catch(error => {
          const isUsernameTaken = error.type === UserError.TYPE.USERNAME_TAKEN;
          const isCurrentRequest = this.enteredUsername() === enteredUsername;
          if (isUsernameTaken && isCurrentRequest) {
            this.usernameState(PreferencesAccountViewModel.USERNAME_STATE.TAKEN);
          }
        });
    }
  }

  _showUploadWarning(title, message) {
    const modalOptions = {text: {message, title}};
    modals.showModal(ModalsViewModel.TYPE.ACKNOWLEDGE, modalOptions);

    return Promise.reject(new UserError(UserError.TYPE.INVALID_UPDATE, UserError.MESSAGE.INVALID_UPDATE));
  }

  _resetUsernameInput() {
    this.usernameState(null);
    this.enteredUsername(null);
    this.submittedUsername(null);
  }

  onReadReceiptsChange(viewModel, event) {
    const isChecked = event.target.checked;
    const mode = isChecked ? Confirmation.Type.READ : Confirmation.Type.DELIVERED;
    this.propertiesRepository.updateProperty(PropertiesRepository.CONFIG.WIRE_RECEIPT_MODE.key, mode);
    return true;
  }

  onMarketingConsentChange(viewModel, event) {
    const isChecked = event.target.checked;
    const mode = isChecked ? ConsentValue.GIVEN : ConsentValue.NOT_GIVEN;
    this.propertiesRepository.updateProperty(PropertiesRepository.CONFIG.WIRE_MARKETING_CONSENT.key, mode);
    return true;
  }

  updateProperties = ({settings}) => {
    this.optionPrivacy(settings.privacy.improve_wire);
  };
};
