/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {LegalHoldMemberStatus} from '@wireapp/api-client/dist/commonjs/team/legalhold';
import {amplify} from 'amplify';
import {UserDevicesHistory, UserDevicesState, makeUserDevicesHistory} from 'Components/userDevices';
import ko from 'knockout';
import {ClientRepository} from 'src/script/client/ClientRepository';
import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {CryptographyRepository} from 'src/script/cryptography/CryptographyRepository';
import {Conversation} from 'src/script/entity/Conversation';
import {User} from 'src/script/entity/User';
import {TeamRepository} from 'src/script/team/TeamRepository';
import {UserRepository} from 'src/script/user/UserRepository';
import {t} from 'Util/LocalizerUtil';
import {promiseProgress} from 'Util/PromiseUtil';
import {BackendClientError} from '../../error/BackendClientError';

export const SHOW_REQUEST_MODAL = 'LegalHold.showRequestModal';

export class LegalHoldModalViewModel {
  isVisible: ko.Observable<boolean>;
  isOnlyMe: ko.Observable<boolean>;
  users: ko.Observable<User[]>;
  devicesUser: ko.Observable<User>;
  onBgClick: () => void;
  onClosed: () => void;
  userDevicesHistory: UserDevicesHistory;
  showDeviceList: () => boolean;
  isLoading: ko.Observable<boolean>;
  showRequest: ko.Observable<boolean>;
  requestFingerprint: ko.Observable<string>;
  requestError: ko.Observable<string>;
  passwordValue: ko.Observable<string>;
  progress: ko.Observable<number>;

  constructor(
    public userRepository: UserRepository,
    public conversationRepository: ConversationRepository,
    public teamRepository: TeamRepository,
    public clientRepository: ClientRepository,
    public cryptographyRepository: CryptographyRepository
  ) {
    this.isLoading = ko.observable(false);
    this.isVisible = ko.observable(false);
    this.showRequest = ko.observable(false);
    this.requestFingerprint = ko.observable('');
    this.isOnlyMe = ko.observable(false);
    this.users = ko.observable([]);
    this.devicesUser = ko.observable();
    this.userDevicesHistory = makeUserDevicesHistory();
    this.progress = ko.observable(0);
    this.passwordValue = ko.observable('');
    this.requestError = ko.observable('');
    this.showDeviceList = () => this.userDevicesHistory.current() === UserDevicesState.DEVICE_LIST;

    this.onBgClick = () => {
      if (!this.showRequest()) {
        this.isVisible(false);
      }
    };
    this.onClosed = () => {
      this.users([]);
      this.devicesUser(undefined);
      this.showRequest(false);
      this.passwordValue('');
      this.requestError('');
    };
    amplify.subscribe(SHOW_REQUEST_MODAL, this.showRequestModal);
  }

  showRequestModal = async (fingerprint?: string[]) => {
    const selfUser = this.userRepository.self();
    if (!selfUser.inTeam()) {
      return;
    }
    if (!fingerprint) {
      const response = await this.teamRepository.teamService.getLegalHoldState(selfUser.teamId, selfUser.id);
      if (response.status === LegalHoldMemberStatus.PENDING) {
        fingerprint = await this.cryptographyRepository.getRemoteFingerprint(
          selfUser.id,
          response.client_id,
          response.last_prekey
        );
        selfUser.hasPendingLegalHold(true);
      } else {
        return;
      }
    }
    this.isVisible(true);
    this.showRequest(true);
    const formatedFingerprint = fingerprint.map(part => `<span>${part} </span>`).join('');
    this.requestFingerprint(
      `<span class="legal-hold-modal__fingerprint" data-uie-name="status-modal-fingerprint">${formatedFingerprint}</span>`
    );
  };

  closeRequest = () => {
    this.isVisible(false);
  };

  acceptRequest = async () => {
    const selfUser = this.userRepository.self();
    this.requestError('');
    try {
      await this.teamRepository.teamService.sendLegalHoldApproval(selfUser.teamId, selfUser.id, this.passwordValue());
      this.isVisible(false);
      this.clientRepository.updateClientsForSelf();
    } catch ({code, message}) {
      switch (code) {
        case BackendClientError.STATUS_CODE.BAD_REQUEST: {
          this.requestError(t('BackendError.LABEL.BAD_REQUEST'));
          break;
        }
        case BackendClientError.STATUS_CODE.FORBIDDEN: {
          this.requestError(t('BackendError.LABEL.ACCESS_DENIED'));
          break;
        }
        default: {
          this.requestError(message);
        }
      }
    }
  };

  showUsers = (conversation?: Conversation) => {
    if (conversation === undefined) {
      this.users([this.userRepository.self()]);
      this.isOnlyMe(true);
      this.isLoading(false);
      this.isVisible(true);
      return;
    }
    conversation = ko.unwrap(conversation);
    promiseProgress(
      conversation.participating_user_ids().map(id => this.clientRepository.getClientsByUserId(id)),
      progress => this.progress(progress)
    )
      .then(() => this.conversationRepository.get_all_users_in_conversation(conversation.id))
      .then(allUsers => {
        const legalHoldUsers = allUsers.filter(user => user.isOnLegalHold());
        const isOnlyMe = legalHoldUsers.length === 1 && legalHoldUsers[0].is_me;
        this.users(legalHoldUsers);
        this.isOnlyMe(isOnlyMe);
        this.isLoading(false);
      });

    this.isLoading(true);
    this.isVisible(true);
  };

  showUserDevices = (user: User) => {
    this.devicesUser(user);
  };

  clickOnBack = () => {
    if (!this.showDeviceList()) {
      return this.userDevicesHistory.goBack();
    }
    this.devicesUser(undefined);
  };
}
