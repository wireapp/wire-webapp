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
import {WebappProperties} from '@wireapp/api-client/src/user/data';
import type {RichInfoField} from '@wireapp/api-client/src/user/RichInfo';
import {ChangeEvent} from 'react';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import {t} from 'Util/LocalizerUtil';
import {isTemporaryClientAndNonPersistent, validateProfileImageResolution} from 'Util/util';
import {isKey, KEY} from 'Util/KeyboardUtil';
import {safeWindowOpen} from 'Util/SanitizationUtil';

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
import {AVATAR_SIZE} from 'Components/ParticipantAvatar';
import {AvailabilityContextMenu} from '../../ui/AvailabilityContextMenu';
import {MotionDuration} from '../../motion/MotionDuration';
import {ContentViewModel} from '../ContentViewModel';
import {Logger, Runtime} from '@wireapp/commons';
import {getLogger} from 'Util/Logger';

import 'Components/availabilityState';
import {isAppLockEnabled} from './AppLockViewModel';
import {loadValue} from 'Util/StorageUtil';
import {StorageKey} from '../../storage';
import {UserError} from '../../error/UserError';
import {HistoryExportViewModel} from './HistoryExportViewModel';
import {ClientRepository} from '../../client/ClientRepository';
import {ConversationRepository} from '../../conversation/ConversationRepository';
import {AccentColorID} from '@wireapp/commons/src/main/util/AccentColor';
import {TeamEntity} from '../../team/TeamEntity';
import type {ClientEntity} from 'src/script/client/ClientEntity';
import {UserState} from '../../user/UserState';
import {container} from 'tsyringe';
import {TeamState} from '../../team/TeamState';

export class PreferencesAccountViewModel {
  logger: Logger;
  fileExtension: string;
  isDesktop: boolean;
  brandName: string;
  isActivatedAccount: ko.PureComputed<boolean>;
  selfUser: ko.Observable<User>;
  name: ko.PureComputed<string>;
  email: ko.PureComputed<string>;
  availability: ko.PureComputed<Availability.Type>;
  availabilityLabel: ko.PureComputed<string>;
  username: ko.PureComputed<string>;
  enteredUsername: ko.Observable<string>;
  submittedUsername: ko.Observable<string>;
  usernameState: ko.Observable<string>;
  richProfileFields: ko.Observable<RichInfoField[]>;
  nameSaved: ko.Observable<boolean>;
  usernameSaved: ko.Observable<boolean>;
  isTeam: ko.PureComputed<boolean>;
  team: ko.Observable<TeamEntity>;
  teamName: ko.PureComputed<string>;
  optionPrivacy: ko.Observable<boolean>;
  optionTelemetrySharing: ko.Observable<boolean>;
  optionReadReceipts: ko.Observable<Confirmation.Type>;
  optionMarketingConsent: ko.Observable<boolean | ConsentValue>;
  optionResetAppLock: boolean;
  AVATAR_SIZE: typeof AVATAR_SIZE;
  isMacOsWrapper: boolean;
  manageTeamUrl: string;
  createTeamUrl: string;
  isTemporaryAndNonPersistent: boolean;
  isConsentCheckEnabled: () => boolean;
  canEditProfile: (user: User) => boolean;
  Config: typeof PreferencesAccountViewModel.CONFIG;
  UserNameState: typeof PreferencesAccountViewModel.USERNAME_STATE;
  isCountlyEnabled: boolean = false;

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
    private readonly userRepository: UserRepository,
    private readonly userState = container.resolve(UserState),
    private readonly teamState = container.resolve(TeamState),
  ) {
    this.logger = getLogger('PreferencesAccountViewModel');
    this.fileExtension = HistoryExportViewModel.CONFIG.FILE_EXTENSION;
    this.isDesktop = Runtime.isDesktopApp();
    this.brandName = Config.getConfig().BRAND_NAME;
    this.isCountlyEnabled = !!Config.getConfig().COUNTLY_API_KEY;

    this.isActivatedAccount = this.userState.isActivatedAccount;
    this.selfUser = this.userState.self;
    this.Config = PreferencesAccountViewModel.CONFIG;
    this.UserNameState = PreferencesAccountViewModel.USERNAME_STATE;

    this.name = ko.pureComputed(() => this.selfUser().name());
    this.email = ko.pureComputed(() => this.selfUser().email());
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

    this.isTeam = this.teamState.isTeam;
    this.team = this.teamState.team;
    this.teamName = ko.pureComputed(() => t('preferencesAccountTeam', this.teamState.teamName()));

    this.optionPrivacy = ko.observable();
    this.optionPrivacy.subscribe(privacyPreference => {
      this.propertiesRepository.savePreference(PROPERTIES_TYPE.PRIVACY, privacyPreference);
    });

    this.optionTelemetrySharing = ko.observable();
    this.optionTelemetrySharing.subscribe(privacyPreference => {
      this.propertiesRepository.savePreference(PROPERTIES_TYPE.TELEMETRY_SHARING, privacyPreference);
    });

    this.optionReadReceipts = this.propertiesRepository.receiptMode;
    this.optionMarketingConsent = this.propertiesRepository.marketingConsent;

    this.optionResetAppLock = isAppLockEnabled();
    this.AVATAR_SIZE = AVATAR_SIZE;

    this.isMacOsWrapper = Runtime.isDesktopApp() && Runtime.isMacOS();
    this.manageTeamUrl = getManageTeamUrl('client_settings');
    this.createTeamUrl = getCreateTeamUrl();

    this.isTemporaryAndNonPersistent = isTemporaryClientAndNonPersistent(loadValue(StorageKey.AUTH.PERSIST));
    this.isConsentCheckEnabled = () => Config.getConfig().FEATURE.CHECK_CONSENT;
    this.canEditProfile = user => user.managedBy() === User.CONFIG.MANAGED_BY.WIRE;

    this.updateProperties(this.propertiesRepository.properties);
    this._initSubscriptions();
  }

  private readonly _initSubscriptions = () => {
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATED, this.updateProperties);
  };

  changeAccentColor = (id: AccentColorID) => {
    this.userRepository.changeAccentColor(id);
  };

  changeName = async (viewModel: unknown, event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const newName = event.target.value.trim();

    const isUnchanged = newName === this.selfUser().name();
    if (isUnchanged) {
      return event.target.blur();
    }

    const isValidName = newName.length >= UserRepository.CONFIG.MINIMUM_NAME_LENGTH;
    if (isValidName) {
      try {
        await this.userRepository.changeName(newName);
        this.nameSaved(true);
        event.target.blur();
        window.setTimeout(() => this.nameSaved(false), PreferencesAccountViewModel.CONFIG.SAVE_ANIMATION_TIMEOUT);
      } catch (error) {
        this.logger.warn('Failed to update name', error);
      }
    }
  };

  changeUsername = async (username: string, event: ChangeEvent<HTMLInputElement>): Promise<void> => {
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
    try {
      await this.userRepository.changeUsername(normalizedUsername);

      const isCurrentRequest = this.enteredUsername() === this.submittedUsername();
      if (isCurrentRequest) {
        this.usernameState(null);
        this.usernameSaved(true);

        event.target.blur();
        window.setTimeout(() => this.usernameSaved(false), PreferencesAccountViewModel.CONFIG.SAVE_ANIMATION_TIMEOUT);
      }
    } catch (error) {
      const isUsernameTaken = error.type === UserError.TYPE.USERNAME_TAKEN;
      const isCurrentRequest = this.enteredUsername() === this.submittedUsername();
      if (isUsernameTaken && isCurrentRequest) {
        this.usernameState(PreferencesAccountViewModel.USERNAME_STATE.TAKEN);
      }
    }
  };

  changeEmail = async (data: unknown, event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    try {
      const enteredEmail = event.target.value;

      await this.userRepository.changeEmail(enteredEmail);
      amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
        text: {
          message: t('authPostedResendDetail'),
          title: t('modalPreferencesAccountEmailHeadline'),
        },
      });
    } catch (error) {
      this.logger.warn('Failed to send reset email request', error);
      if (error.code === HTTP_STATUS.BAD_REQUEST) {
        amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
          text: {
            message: t('modalPreferencesAccountEmailInvalidMessage'),
            title: t('modalPreferencesAccountEmailErrorHeadline'),
          },
        });
      }
      if (error.code === HTTP_STATUS.CONFLICT) {
        amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
          text: {
            message: t('modalPreferencesAccountEmailTakenMessage'),
            title: t('modalPreferencesAccountEmailErrorHeadline'),
          },
        });
      }
    } finally {
      event.target.blur();
    }
  };

  checkUsernameInput = (_username: string, keyboardEvent: KeyboardEvent) => {
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

  private readonly _showNotification = (type: string, aggregatedNotifications: Notification[]) => {
    switch (type) {
      case PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.NEW_CLIENT: {
        modals.showModal(
          ModalsViewModel.TYPE.ACCOUNT_NEW_DEVICES,
          {
            data: aggregatedNotifications.map(notification => notification.data) as ClientEntity[],
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
            data: aggregatedNotifications.pop().data as boolean,
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
          action: async (): Promise<void> => {
            try {
              await this.conversationRepository.leaveGuestRoom();
              this.clientRepository.logoutClient();
            } catch (error) {
              this.logger.warn('Error while leaving room', error);
            }
          },
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

  resetEmailInput = (): void => {
    this.email.notifySubscribers();
  };

  resetUsernameInput = (): void => {
    if (!this.usernameSaved()) {
      this._resetUsernameInput();
      this.username.notifySubscribers();
    }
  };

  setPicture = async (newUserPicture: File): Promise<boolean | User> => {
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

    try {
      const isValid = await validateProfileImageResolution(newUserPicture, minWidth, minHeight);
      if (isValid) {
        return this.userRepository.changePicture(newUserPicture);
      }

      const messageString = t('modalPictureTooSmallMessage');
      const titleString = t('modalPictureTooSmallHeadline');
      return this._showUploadWarning(titleString, messageString);
    } catch (error) {
      this.logger.error('Failed to validate profile image', error);
      return false;
    }
  };

  shouldFocusUsername = (): boolean => this.userRepository.shouldSetUsername;

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

  private readonly _showUploadWarning = (title: string, message: string): Promise<never> => {
    const modalOptions = {text: {message, title}};
    modals.showModal(ModalsViewModel.TYPE.ACKNOWLEDGE, modalOptions, undefined);

    return Promise.reject(new UserError(UserError.TYPE.INVALID_UPDATE, UserError.MESSAGE.INVALID_UPDATE));
  };

  private readonly _resetUsernameInput = (): void => {
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
    this.optionTelemetrySharing(settings.privacy.telemetry_sharing);
  };
}
