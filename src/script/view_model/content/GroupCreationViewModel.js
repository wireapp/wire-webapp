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

import Logger from 'utils/Logger';

import ReceiptMode from '../../conversation/ReceiptMode';
import {t} from 'utils/LocalizerUtil';
import {onEscKey, offEscKey} from 'utils/KeyboardUtil';
import trackingHelpers from '../../tracking/Helpers';

export class GroupCreationViewModel {
  static get STATE() {
    return {
      DEFAULT: 'GroupCreationViewModel.STATE.DEFAULT',
      PARTICIPANTS: 'GroupCreationViewModel.STATE.PARTICIPANTS',
      PREFERENCES: 'GroupCreationViewModel.STATE.PREFERENCES',
    };
  }

  constructor(mainViewModel, contentViewModel, repositories) {
    this.logger = Logger('z.viewModel.content.GroupCreationViewModel');

    this.clickOnCreate = this.clickOnCreate.bind(this);
    this.clickOnToggleGuestMode = this.clickOnToggleGuestMode.bind(this);

    this.conversationRepository = repositories.conversation;
    this.searchRepository = repositories.search;
    this.teamRepository = repositories.team;
    this.userRepository = repositories.user;
    this.isTeam = this.teamRepository.isTeam;

    this.isShown = ko.observable(false);
    this.state = ko.observable(GroupCreationViewModel.STATE.DEFAULT);

    this.isCreatingConversation = false;
    this.method = undefined;
    this.nameError = ko.observable('');
    this.nameInput = ko.observable('');
    this.selectedContacts = ko.observableArray([]);
    this.showContacts = ko.observable(false);
    this.participantsInput = ko.observable('');

    this.accessState = ko.observable(z.conversation.ACCESS_STATE.TEAM.GUEST_ROOM);
    this.isGuestRoom = ko.pureComputed(() => this.accessState() === z.conversation.ACCESS_STATE.TEAM.GUEST_ROOM);
    this.isGuestRoom.subscribe(isGuestRoom => {
      if (!isGuestRoom) {
        this.selectedContacts.remove(userEntity => !userEntity.isTeamMember());
      }
    });

    this.enableReadReceipts = ko.observable(false);

    this.activateNext = ko.pureComputed(() => this.nameInput().length);
    this.contacts = ko.pureComputed(() => {
      if (this.showContacts()) {
        if (!this.isTeam()) {
          return this.userRepository.connected_users();
        }

        if (this.isGuestRoom()) {
          return this.teamRepository.teamUsers();
        }

        return this.teamRepository
          .teamMembers()
          .sort((userA, userB) => z.util.StringUtil.sortByPriority(userA.first_name(), userB.first_name()));
      }
      return [];
    });
    this.participantsActionText = ko.pureComputed(() =>
      this.selectedContacts().length
        ? t('groupCreationParticipantsActionCreate')
        : t('groupCreationParticipantsActionSkip')
    );
    this.participantsHeaderText = ko.pureComputed(() =>
      this.selectedContacts().length
        ? t('groupCreationParticipantsHeaderWithCounter', this.selectedContacts().length)
        : t('groupCreationParticipantsHeader')
    );
    this.stateIsPreferences = ko.pureComputed(() => this.state() === GroupCreationViewModel.STATE.PREFERENCES);
    this.stateIsParticipants = ko.pureComputed(() => this.state() === GroupCreationViewModel.STATE.PARTICIPANTS);

    this.nameInput.subscribe(() => this.nameError(''));
    const onEscape = () => this.isShown(false);
    this.stateIsPreferences.subscribe(stateIsPreference => {
      if (stateIsPreference) {
        return onEscKey(onEscape);
      }
      offEscKey(onEscape);
    });

    this.stateIsParticipants.subscribe(stateIsParticipants => {
      if (stateIsParticipants) {
        return window.setTimeout(() => this.showContacts(true));
      }
      this.showContacts(false);
    });

    this.shouldUpdateScrollbar = ko
      .computed(() => this.selectedContacts() && this.stateIsPreferences() && this.contacts())
      .extend({notify: 'always', rateLimit: 500});

    amplify.subscribe(z.event.WebApp.CONVERSATION.CREATE_GROUP, this.showCreateGroup.bind(this));
  }

  showCreateGroup(method, userEntity) {
    this.method = method;
    this.enableReadReceipts(this.isTeam());
    this.isShown(true);
    this.state(GroupCreationViewModel.STATE.PREFERENCES);
    if (userEntity) {
      this.selectedContacts.push(userEntity);
    }
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONVERSATION.OPENED_GROUP_CREATION, {
      method: this.method,
    });
  }

  clickOnBack() {
    this.state(GroupCreationViewModel.STATE.PREFERENCES);
  }

  clickOnClose() {
    this.isShown(false);
  }

  clickOnToggleGuestMode() {
    const accessState = this.isGuestRoom()
      ? z.conversation.ACCESS_STATE.TEAM.TEAM_ONLY
      : z.conversation.ACCESS_STATE.TEAM.GUEST_ROOM;

    this.accessState(accessState);
  }

  clickOnCreate() {
    if (!this.isCreatingConversation) {
      this.isCreatingConversation = true;

      const accessState = this.isTeam() ? this.accessState() : undefined;
      const options = {
        receipt_mode: this.enableReadReceipts() ? ReceiptMode.DELIVERY_AND_READ : ReceiptMode.DELIVERY,
      };

      this.conversationRepository
        .createGroupConversation(this.selectedContacts(), this.nameInput(), accessState, options)
        .then(conversationEntity => {
          this.isShown(false);

          amplify.publish(z.event.WebApp.CONVERSATION.SHOW, conversationEntity);

          this._trackGroupCreation(conversationEntity);
        })
        .catch(error => {
          this.isCreatingConversation = false;
          throw error;
        });
    }
  }

  clickOnNext() {
    if (this.nameInput().length) {
      const trimmedNameInput = this.nameInput().trim();
      const nameTooLong = trimmedNameInput.length > z.conversation.ConversationRepository.CONFIG.GROUP.MAX_NAME_LENGTH;
      const nameTooShort = !trimmedNameInput.length;

      this.nameInput(trimmedNameInput.slice(0, z.conversation.ConversationRepository.CONFIG.GROUP.MAX_NAME_LENGTH));
      if (nameTooLong) {
        return this.nameError(t('groupCreationPreferencesErrorNameLong'));
      }

      if (nameTooShort) {
        return this.nameError(t('groupCreationPreferencesErrorNameShort'));
      }

      amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONVERSATION.OPENED_SELECT_PARTICIPANTS, {
        method: this.method,
      });

      this.state(GroupCreationViewModel.STATE.PARTICIPANTS);
    }
  }

  afterHideModal = () => {
    this.isCreatingConversation = false;
    this.method = undefined;
    this.nameError('');
    this.nameInput('');
    this.participantsInput('');
    this.selectedContacts([]);
    this.state(GroupCreationViewModel.STATE.DEFAULT);
    this.accessState(z.conversation.ACCESS_STATE.TEAM.GUEST_ROOM);
  };

  _trackGroupCreation(conversationEntity) {
    this._trackGroupCreationSucceeded(conversationEntity);
    this._trackAddParticipants(conversationEntity);
  }

  _trackGroupCreationSucceeded(conversationEntity) {
    const attributes = {
      method: this.method,
      with_participants: !!this.selectedContacts().length,
    };

    const isTeamConversation = !!conversationEntity.team_id;
    if (isTeamConversation) {
      attributes.is_allow_guests = !conversationEntity.isTeamOnly();
    }

    const eventName = z.tracking.EventName.CONVERSATION.GROUP_CREATION_SUCCEEDED;
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, eventName, attributes);
  }

  _trackAddParticipants(conversationEntity) {
    const attributes = {
      method: 'create',
      user_num: conversationEntity.getNumberOfParticipants(),
    };

    const isTeamConversation = !!conversationEntity.team_id;
    if (isTeamConversation) {
      const participants = trackingHelpers.getParticipantTypes(conversationEntity.participating_user_ets(), true);

      Object.assign(attributes, {
        guest_num: participants.guests,
        is_allow_guests: conversationEntity.isGuestRoom(),
        temporary_guest_num: participants.temporaryGuests,
        user_num: participants.users,
      });
    }

    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONVERSATION.ADD_PARTICIPANTS, attributes);
  }
}
