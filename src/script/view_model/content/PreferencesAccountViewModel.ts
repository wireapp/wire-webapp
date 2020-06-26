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
import {amplify} from 'amplify';
import ko from 'knockout';
import {WebappProperties} from '@wireapp/api-client/dist/user/data';
import {t} from 'Util/LocalizerUtil';
import {isTemporaryClientAndNonPersistent, validateProfileImageResolution} from 'Util/util';
import {Environment} from 'Util/Environment';
import {isKey, KEY} from 'Util/KeyboardUtil';
import {safeWindowOpen} from 'Util/SanitizationUtil';
import {ChangeEvent} from 'react';

import {PreferenceNotificationRepository, Notification} from '../../notification/PreferenceNotificationRepository';
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
import {HistoryExportViewModel} from './HistoryExportViewModel';
import {ClientRepository} from '../../client/ClientRepository';
import {ConversationRepository} from '../../conversation/ConversationRepository';
import {TeamRepository} from '../../team/TeamRepository';
import {AccentColorID} from '@wireapp/commons/dist/commonjs/util/AccentColor';
import {TeamEntity} from '../../team/TeamEntity';

export class PreferencesAccountViewModel {
  fileExtension: string;
  isDesktop: boolean;
  brandName: string;
  isActivatedAccount: ko.PureComputed<boolean>;
  selfUser: ko.Observable<User>;
  name: ko.PureComputed<string>;
  availability: ko.PureComputed<Availability.Type>;
  availabilityLabel: ko.PureComputed<string>;
  username: ko.PureComputed<string>;
  enteredUsername: ko.Observable<string>;
  submittedUsername: ko.Observable<string>;
  usernameState: ko.Observable<string>;
  richProfileFields: ko.Observable<any[]>;
  nameSaved: ko.Observable<boolean>;
  usernameSaved: ko.Observable<boolean>;
  isTeam: ko.PureComputed<boolean>;
  team: ko.Observable<TeamEntity>;
  teamName: ko.PureComputed<string>;
  optionPrivacy: ko.Observable<boolean>;
  optionReadReceipts: ko.Observable<any>;
  optionMarketingConsent: ko.Observable<boolean | ConsentValue>;
  optionResetAppLock: boolean;
  ParticipantAvatar: typeof ParticipantAvatar;
  isMacOsWrapper: boolean;
  manageTeamUrl: string;
  createTeamUrl: string;
  isTemporaryAndNonPersistent: boolean;
  isConsentCheckEnabled: () => boolean;
  canEditProfile: (user: User) => boolean;

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

  constructor(
    private readonly clientRepository: ClientRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly preferenceNotificationRepository: PreferenceNotificationRepository,
    private readonly propertiesRepository: PropertiesRepository,
    private readonly teamRepository: TeamRepository,
    private readonly userRepository: UserRepository,
  ) {
    this.fileExtension = HistoryExportViewModel.CONFIG.FILE_EXTENSION;
    this.isDesktop = Environment.desktop;
    this.brandName = Config.getConfig().BRAND_NAME;

    this.isActivatedAccount = this.userRepository.isActivatedAccount;
    this.selfUser = this.userRepository.self;

    this.name = ko.pureComputed(() => this.selfUser().name());
    this.availability = ko.pureComputed(() => this.selfUser().availability());

    this.availabilityLabel = ko.pureComputed(() => {
      let label = nameFromType(this.availability());

      const noStatusSet = this.availability() === Availability.Type.NONE;
      if (noStatusSet) {
        label = t('preferencesAccountAvailabilityUnset');
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
    this.teamName = ko.pureComputed(() => t('preferencesAccountTeam', this.teamRepository.getTeamName()()));

    this.optionPrivacy = ko.observable();
    this.optionPrivacy.subscribe(privacyPreference => {
      this.propertiesRepository.savePreference(PROPERTIES_TYPE.PRIVACY, privacyPreference);
    });

    this.optionReadReceipts = this.propertiesRepository.getReceiptMode();
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

  _initSubscriptions = () => {
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATED, this.updateProperties);
  };

  changeAccentColor = (id: AccentColorID) => {
    this.userRepository.changeAccentColor(id);
  };

  changeName = (viewModel: unknown, event: ChangeEvent<HTMLInputElement>) => {
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
  };

  changeUsername = (username: string, event: ChangeEvent<HTMLInputElement>) => {
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
  };

  checkUsernameInput = (username: string, keyboardEvent: KeyboardEvent) => {
    if (isKey(keyboardEvent, KEY.BACKSPACE)) {
      return true;
    }

    // Automation: KeyboardEvent triggered during tests is missing key property
    const inputChar = keyboardEvent.key || String.fromCharCode(keyboardEvent.charCode);
    return validateCharacter(inputChar.toLowerCase());
  };

  popNotification = () => {
    this.preferenceNotificationRepository
      .getNotifications()
      .forEach(({type, notification}) => this._showNotification(type, notification));
  };

  _showNotification = (type: string, aggregatedNotifications: Notification[]) => {
    switch (type) {
      case PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.NEW_CLIENT: {
        modals.showModal(
          ModalsViewModel.TYPE.ACCOUNT_NEW_DEVICES,
          {
            data: aggregatedNotifications.map(notification => notification.data),
            preventClose: true,
            secondaryAction: {
              action: () => {
                amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentViewModel.STATE.PREFERENCES_DEVICES);
              },
            },
          },
          undefined,
        );
        break;
      }

      case PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.READ_RECEIPTS_CHANGED: {
        modals.showModal(
          ModalsViewModel.TYPE.ACCOUNT_READ_RECEIPTS_CHANGED,
          {
            data: aggregatedNotifications.pop().data,
            preventClose: true,
          },
          undefined,
        );
        break;
      }
    }
  };

  clickOnChangePicture = (files: File[]) => {
    const [newUserPicture] = Array.from(files);

    this.setPicture(newUserPicture).catch(error => {
      const isInvalidUpdate = error.type === UserError.TYPE.INVALID_UPDATE;
      if (!isInvalidUpdate) {
        throw error;
      }
    });
  };

  clickOnAvailability = (viewModel: unknown, event: MouseEvent) => {
    AvailabilityContextMenu.show(event, 'settings', 'preferences-account-availability-menu');
  };

  clickOnBackupExport = (): void => {
    amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentViewModel.STATE.HISTORY_EXPORT);
    amplify.publish(WebAppEvents.BACKUP.EXPORT.START);
  };

  onImportFileChange = (viewModel: unknown, event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files[0];
    if (file) {
      amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentViewModel.STATE.HISTORY_IMPORT);
      amplify.publish(WebAppEvents.BACKUP.IMPORT.START, file);
    }
  };

  clickOnDeleteAccount = (): void => {
    modals.showModal(
      ModalsViewModel.TYPE.CONFIRM,
      {
        primaryAction: {
          action: () => this.userRepository.deleteMe(),
          text: t('modalAccountDeletionAction'),
        },
        text: {
          message: t('modalAccountDeletionMessage'),
          title: t('modalAccountDeletionHeadline'),
        },
      },
      undefined,
    );
  };

  clickOnLeaveGuestRoom = (): void => {
    modals.showModal(
      ModalsViewModel.TYPE.CONFIRM,
      {
        preventClose: true,
        primaryAction: {
          action: () => this.conversationRepository.leaveGuestRoom().then(() => this.clientRepository.logoutClient()),
          text: t('modalAccountLeaveGuestRoomAction'),
        },
        text: {
          message: t('modalAccountLeaveGuestRoomMessage'),
          title: t('modalAccountLeaveGuestRoomHeadline'),
        },
      },
      undefined,
    );
  };

  clickOnLogout = (): void => {
    this.clientRepository.logoutClient();
  };

  clickOpenManageTeam = (): void => {
    if (this.manageTeamUrl) {
      safeWindowOpen(this.manageTeamUrl);
      amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.SETTINGS.OPENED_MANAGE_TEAM);
    }
  };

  clickOnResetPassword = (): void => {
    safeWindowOpen(getAccountPagesUrl(URL_PATH.PASSWORD_RESET));
  };

  clickOnResetAppLockPassphrase = (): void => {
    amplify.publish(WebAppEvents.PREFERENCES.CHANGE_APP_LOCK_PASSPHRASE);
  };

  removedFromView = (): void => {
    this._resetUsernameInput();
  };

  resetNameInput = (): void => {
    if (!this.nameSaved()) {
      this.name.notifySubscribers();
    }
  };

  resetUsernameInput = (): void => {
    if (!this.usernameSaved()) {
      this._resetUsernameInput();
      this.username.notifySubscribers();
    }
  };

  setPicture = (newUserPicture: File): Promise<boolean | User> => {
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
  };

  shouldFocusUsername = (): boolean => this.userRepository.getShouldSetUsername();

  verifyUsername = (username: string, event: ChangeEvent<HTMLInputElement>): void => {
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
  };

  _showUploadWarning = (title: string, message: string): Promise<never> => {
    const modalOptions = {text: {message, title}};
    modals.showModal(ModalsViewModel.TYPE.ACKNOWLEDGE, modalOptions, undefined);

    return Promise.reject(new UserError(UserError.TYPE.INVALID_UPDATE, UserError.MESSAGE.INVALID_UPDATE));
  };

  _resetUsernameInput = (): void => {
    this.usernameState(null);
    this.enteredUsername(null);
    this.submittedUsername(null);
  };

  onReadReceiptsChange = (viewModel: unknown, event: ChangeEvent<HTMLInputElement>): boolean => {
    const isChecked = event.target.checked;
    const mode = isChecked ? Confirmation.Type.READ : Confirmation.Type.DELIVERED;
    this.propertiesRepository.updateProperty(PropertiesRepository.CONFIG.WIRE_RECEIPT_MODE.key, mode);
    return true;
  };

  onMarketingConsentChange = (viewModel: unknown, event: ChangeEvent<HTMLInputElement>): boolean => {
    const isChecked = event.target.checked;
    const mode = isChecked ? ConsentValue.GIVEN : ConsentValue.NOT_GIVEN;
    this.propertiesRepository.updateProperty(PropertiesRepository.CONFIG.WIRE_MARKETING_CONSENT.key, mode);
    return true;
  };

  updateProperties = ({settings}: WebappProperties): void => {
    this.optionPrivacy(settings.privacy.improve_wire);
  };
}
