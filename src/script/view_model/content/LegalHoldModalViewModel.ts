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

import {LegalHoldMemberStatus} from '@wireapp/api-client/src/team/legalhold';
import {amplify} from 'amplify';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import ko from 'knockout';
import {WebAppEvents} from '@wireapp/webapp-events';

import {UserDevicesHistory, UserDevicesState, makeUserDevicesHistory} from 'Components/userDevices';
import {t} from 'Util/LocalizerUtil';

import type {ClientRepository} from 'src/script/client/ClientRepository';
import type {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import type {CryptographyRepository} from 'src/script/cryptography/CryptographyRepository';
import type {Conversation} from 'src/script/entity/Conversation';
import type {User} from 'src/script/entity/User';
import type {TeamRepository} from 'src/script/team/TeamRepository';
import type {MessageRepository} from 'src/script/conversation/MessageRepository';
import {UserState} from '../../user/UserState';
import {container} from 'tsyringe';

export const SHOW_REQUEST_MODAL = 'LegalHold.showRequestModal';
export const HIDE_REQUEST_MODAL = 'LegalHold.hideRequestModal';
export const SHOW_LEGAL_HOLD_MODAL = 'LegalHold.showLegalHoldModal';
export const HIDE_LEGAL_HOLD_MODAL = 'LegalHold.hideLegalHoldModal';

export class LegalHoldModalViewModel {
  isVisible: ko.Observable<boolean>;
  isSelfInfo: ko.Observable<boolean>;
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
  requiresPassword: ko.Observable<boolean>;
  isSendingApprove: ko.Observable<boolean>;
  skipShowUsers: ko.Observable<boolean>;
  disableSubmit: ko.PureComputed<boolean>;
  conversationId: string;

  constructor(
    public conversationRepository: ConversationRepository,
    public teamRepository: TeamRepository,
    public clientRepository: ClientRepository,
    public cryptographyRepository: CryptographyRepository,
    public messageRepository: MessageRepository,
    private readonly userState = container.resolve(UserState),
  ) {
    this.isVisible = ko.observable(false);
    this.showRequest = ko.observable(false);
    this.requestFingerprint = ko.observable('');
    this.isSelfInfo = ko.observable(false);
    this.users = ko.observable([]);
    this.devicesUser = ko.observable();
    this.userDevicesHistory = makeUserDevicesHistory();
    this.requiresPassword = ko.observable(true);
    this.passwordValue = ko.observable('');
    this.requestError = ko.observable('');
    this.isLoading = ko.observable(false);
    this.isSendingApprove = ko.observable(false);
    this.skipShowUsers = ko.observable(false);
    this.showDeviceList = () => this.userDevicesHistory.current() === UserDevicesState.DEVICE_LIST;
    this.conversationId = null;

    this.onBgClick = () => {
      if (!this.showRequest()) {
        this.hideModal();
      }
    };
    this.onClosed = () => {
      this.users([]);
      this.devicesUser(undefined);
      this.showRequest(false);
      this.passwordValue('');
      this.requestError('');
      this.isLoading(false);
    };
    this.disableSubmit = ko.pureComputed(() => this.requiresPassword() && this.passwordValue().length < 1);
    amplify.subscribe(SHOW_REQUEST_MODAL, (fingerprint?: string[]) => this.showRequestModal(false, fingerprint));
    amplify.subscribe(HIDE_REQUEST_MODAL, this.hideModal);
    amplify.subscribe(SHOW_LEGAL_HOLD_MODAL, this.showUsers);
    amplify.subscribe(HIDE_LEGAL_HOLD_MODAL, this.hideLegalHoldModal);
  }

  showRequestModal = async (showLoading?: boolean, fingerprint?: string[]) => {
    this.showRequest(true);
    const setModalParams = (value: boolean) => {
      this.isVisible(value);
      this.isLoading(value);
      this.showRequest(value);
    };

    if (showLoading) {
      setModalParams(true);
    }
    const selfUser = this.userState.self();
    this.requiresPassword(!selfUser.isSingleSignOn);
    if (!selfUser.inTeam()) {
      setModalParams(false);
      return;
    }
    if (!fingerprint) {
      const response = await this.teamRepository.teamService.getLegalHoldState(selfUser.teamId, selfUser.id);
      if (response.status === LegalHoldMemberStatus.PENDING) {
        fingerprint = await this.cryptographyRepository.getRemoteFingerprint(
          selfUser.id,
          response.client.id,
          response.last_prekey,
        );
        selfUser.hasPendingLegalHold(true);
      } else {
        setModalParams(false);
        return;
      }
    }
    this.isVisible(true);
    this.isLoading(false);
    const formattedFingerprint = fingerprint.map(part => `<span>${part} </span>`).join('');
    this.requestFingerprint(
      `<span class="legal-hold-modal__fingerprint" data-uie-name="status-modal-fingerprint">${formattedFingerprint}</span>`,
    );
  };

  hideModal = () => {
    this.isVisible(false);
    this.conversationId = null;
  };

  closeRequest = () => {
    if (this.showRequest()) {
      this.hideModal();
    }
  };

  hideLegalHoldModal = (conversationId?: string) => {
    const isCurrentConversation = conversationId && conversationId === this.conversationId;
    if (!this.showRequest() && isCurrentConversation) {
      this.hideModal();
    }
  };

  acceptRequest = async () => {
    if (this.disableSubmit()) {
      return;
    }
    const selfUser = this.userState.self();
    this.requestError('');
    this.isSendingApprove(true);
    try {
      const password = this.requiresPassword() ? this.passwordValue() : undefined;
      await this.teamRepository.teamService.sendLegalHoldApproval(selfUser.teamId, selfUser.id, password);
      this.isVisible(false);
      this.isSendingApprove(false);
      this.skipShowUsers(true);
      selfUser.hasPendingLegalHold(false);
      await this.clientRepository.updateClientsForSelf();
      amplify.publish(WebAppEvents.USER.CLIENT_ADDED, selfUser.id);
    } catch ({code, message}) {
      switch (code) {
        case HTTP_STATUS.BAD_REQUEST: {
          this.requestError(t('BackendError.LABEL.BAD_REQUEST'));
          break;
        }
        case HTTP_STATUS.FORBIDDEN: {
          this.requestError(t('BackendError.LABEL.ACCESS_DENIED'));
          break;
        }
        default: {
          this.requestError(message);
        }
      }
      this.isSendingApprove(false);
    }
  };

  showUsers = async (conversation?: Conversation) => {
    if (this.skipShowUsers()) {
      return this.skipShowUsers(false);
    }
    this.showRequest(false);
    if (conversation === undefined) {
      this.users([this.userState.self()]);
      this.isSelfInfo(true);
      this.isLoading(false);
      this.isVisible(true);
      this.conversationId = 'self';
      return;
    }
    conversation = ko.unwrap(conversation);
    this.isSelfInfo(false);
    this.isLoading(true);
    this.isVisible(true);
    await this.messageRepository.updateAllClients(conversation, false);
    const allUsers = await this.conversationRepository.getAllUsersInConversation(conversation.id);
    const legalHoldUsers = allUsers.filter(user => user.isOnLegalHold());
    if (!legalHoldUsers.length) {
      this.isVisible(false);
      return;
    }
    this.users(legalHoldUsers);
    this.conversationId = conversation.id;
    this.isLoading(false);
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

  handleInputKey = (_data: LegalHoldModalViewModel, {key}: JQuery.Event<HTMLElement, KeyboardEvent>): boolean => {
    if (key !== 'Enter') {
      return true;
    }
    this.acceptRequest();
    return false;
  };
}
