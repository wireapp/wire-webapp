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

import {amplify} from 'amplify';
import {container} from 'tsyringe';
import {WebAppEvents} from '@wireapp/webapp-events';
import ko from 'knockout';

import {formatTimestamp} from 'Util/TimeUtil';
import {getLogger, Logger} from 'Util/Logger';
import {t} from 'Util/LocalizerUtil';

import {ActionsViewModel} from '../ActionsViewModel';
import {ClientEntity} from '../../client/ClientEntity';
import {ClientRepository} from '../../client/ClientRepository';
import {Config} from '../../Config';
import {ContentViewModel} from '../ContentViewModel';
import {ConversationState} from '../../conversation/ConversationState';
import {CryptographyRepository} from '../../cryptography/CryptographyRepository';
import {MainViewModel} from '../MainViewModel';
import {MotionDuration} from '../../motion/MotionDuration';
import {User} from '../../entity/User';
import type {MessageRepository} from '../../conversation/MessageRepository';

export class PreferencesDeviceDetailsViewModel {
  private readonly logger: Logger;
  private readonly actionsViewModel: ActionsViewModel;
  private readonly selfUser: ko.Observable<User>;
  readonly activationDate: ko.Observable<string>;
  readonly device: ko.Observable<ClientEntity>;
  readonly fingerprint: ko.ObservableArray<string>;
  readonly SessionResetState: typeof PreferencesDeviceDetailsViewModel.SESSION_RESET_STATE;
  readonly sessionResetState: ko.Observable<string>;
  readonly brandName: string;

  static get SESSION_RESET_STATE() {
    return {
      CONFIRMATION: 'confirmation',
      ONGOING: 'ongoing',
      RESET: 'reset',
    };
  }

  constructor(
    mainViewModel: MainViewModel,
    private readonly clientRepository: ClientRepository,
    private readonly cryptographyRepository: CryptographyRepository,
    private readonly messageRepository: MessageRepository,
    private readonly conversationState = container.resolve(ConversationState),
  ) {
    this.actionsViewModel = mainViewModel.actions;
    this.selfUser = this.clientRepository.selfUser;
    this.SessionResetState = PreferencesDeviceDetailsViewModel.SESSION_RESET_STATE;
    this.logger = getLogger('PreferencesDeviceDetailsViewModel');

    this.activationDate = ko.observable();
    this.device = ko.observable();
    this.fingerprint = ko.observableArray([]);
    this.sessionResetState = ko.observable(PreferencesDeviceDetailsViewModel.SESSION_RESET_STATE.RESET);
    this.brandName = Config.getConfig().BRAND_NAME;

    this.device.subscribe(clientEntity => {
      if (clientEntity) {
        this.sessionResetState(PreferencesDeviceDetailsViewModel.SESSION_RESET_STATE.RESET);
        this._updateFingerprint();
        const date = formatTimestamp(clientEntity.time);
        this.activationDate(t('preferencesDevicesActivatedOn', {date}));
      }
    });
  }

  private readonly _updateFingerprint = async (): Promise<void> => {
    this.fingerprint([]);
    try {
      const fingerprint = await this.cryptographyRepository.getRemoteFingerprint(this.selfUser().id, this.device().id);
      this.fingerprint(fingerprint);
    } catch (error) {
      this.logger.warn('Error while trying to update fingerprint', error);
    }
  };

  readonly clickOnDetailsClose = (): void => {
    amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentViewModel.STATE.PREFERENCES_DEVICES);
    this.device(null);
  };

  clickOnResetSession = async (): Promise<void> => {
    this.sessionResetState(PreferencesDeviceDetailsViewModel.SESSION_RESET_STATE.ONGOING);

    try {
      const selfConversationId = this.conversationState.self_conversation().id;
      await this.messageRepository.resetSession(this.selfUser().id, this.device().id, selfConversationId);
      window.setTimeout(() => {
        this.sessionResetState(PreferencesDeviceDetailsViewModel.SESSION_RESET_STATE.CONFIRMATION);
      }, MotionDuration.LONG);

      window.setTimeout(() => {
        this.sessionResetState(PreferencesDeviceDetailsViewModel.SESSION_RESET_STATE.RESET);
      }, 5000);
    } catch (error) {
      this.sessionResetState(PreferencesDeviceDetailsViewModel.SESSION_RESET_STATE.RESET);
      throw error;
    }
  };

  clickOnRemoveDevice = async (): Promise<void> => {
    try {
      await this.actionsViewModel.deleteClient(this.device());
      this.clickOnDetailsClose();
    } catch (error) {
      this.logger.warn('Error while trying to remove device', error);
    }
  };

  readonly toggleDeviceVerification = (): void => {
    const toggleVerified = !this.device().meta.isVerified();
    this.clientRepository.verifyClient(this.selfUser().id, this.device(), toggleVerified);
  };
}
