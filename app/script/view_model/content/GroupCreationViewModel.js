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
window.z.ViewModel = z.ViewModel || {};

z.ViewModel.content.GroupCreationViewModel = class GroupCreationViewModel {
  static get STATE() {
    return {
      DEFAULT: 'GroupCreationViewModel.STATE.DEFAULT',
      PARTICIPANTS: 'GroupCreationViewModel.STATE.PARTICIPANTS',
      PREFERENCES: 'GroupCreationViewModel.STATE.PREFERENCES',
    };
  }

  constructor(elementId, conversationRepository, teamRepository, userRepository) {
    this.logger = new z.util.Logger('z.ViewModel.content.GroupCreationViewModel', z.config.LOGGER.OPTIONS);

    this.clickOnCreate = this.clickOnCreate.bind(this);

    this.elementId = elementId;
    this.conversationRepository = conversationRepository;
    this.teamRepository = teamRepository;
    this.userRepository = userRepository;

    this.modal = undefined;
    this.state = ko.observable(GroupCreationViewModel.STATE.DEFAULT);

    this.contacts = ko.pureComputed(() => {
      if (this.teamRepository.isTeam()) {
        return this.teamRepository.teamUsers();
      }

      return this.userRepository.connected_users();
    });

    this.isCreatingConversation = false;
    this.nameError = ko.observable('');
    this.nameInput = ko.observable('');
    this.selectedContacts = ko.observableArray([]);
    this.participantsInput = ko.observable('');

    this.nameInput.subscribe(() => this.nameError(''));

    this.activateNext = ko.pureComputed(() => this.nameInput().length);
    this.participantsActionText = ko.pureComputed(() => {
      const stringSelector = this.selectedContacts().length
        ? z.string.groupCreationParticipantsActionCreate
        : z.string.groupCreationParticipantsActionSkip;
      return z.l10n.text(stringSelector);
    });
    this.participantsHeaderText = ko.pureComputed(() => {
      const stringSelector = this.selectedContacts().length
        ? z.string.groupCreationParticipantsHeaderWithCounter
        : z.string.groupCreationParticipantsHeader;
      return z.l10n.text(stringSelector, {number: this.selectedContacts().length});
    });

    this.stateIsPreferences = ko.pureComputed(() => this.state() === GroupCreationViewModel.STATE.PREFERENCES);
    this.stateIsParticipants = ko.pureComputed(() => this.state() === GroupCreationViewModel.STATE.PARTICIPANTS);

    this.stateIsPreferences.subscribe(stateIsPreference => {
      if (stateIsPreference) {
        return $(document).on('keydown.groupCreation', keyboard_event => {
          if (z.util.KeyboardUtil.isEscapeKey(keyboard_event)) {
            this._hideModal();
          }
        });
      }
      return $(document).off('keydown.groupCreation');
    });

    this.shouldUpdateScrollbar = ko
      .computed(() => this.selectedContacts() && this.stateIsPreferences())
      .extend({notify: 'always', rateLimit: 500});

    amplify.subscribe(z.event.WebApp.CONVERSATION.CREATE_GROUP, this.showCreateGroup.bind(this));
  }

  showCreateGroup(userEntity) {
    if (!this.modal) {
      this.modal = new zeta.webapp.module.Modal('#group-creation-modal', this._afterHideModal.bind(this));
      this.modal.autoclose = false;
    }

    this.state(GroupCreationViewModel.STATE.PREFERENCES);
    if (userEntity) {
      this.selectedContacts.push(userEntity);
    }

    this.modal.show();
    $('.group-creation-modal-teamname-input').focus();
  }

  clickOnBack() {
    this.state(GroupCreationViewModel.STATE.PREFERENCES);
  }

  clickOnClose() {
    this._hideModal();
  }

  clickOnCreate() {
    if (!this.isCreatingConversation) {
      this.isCreatingConversation = true;

      this.conversationRepository
        .createGroupConversation(this.selectedContacts(), this.nameInput())
        .then(conversationEntity => {
          this._hideModal();
          amplify.publish(z.event.WebApp.CONVERSATION.SHOW, conversationEntity);
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

      this.nameInput(this.nameInput().slice(0, z.conversation.ConversationRepository.CONFIG.GROUP.MAX_NAME_LENGTH));
      if (nameTooLong) {
        return this.nameError(z.l10n.text(z.string.groupCreationPreferencesErrorNameLong));
      }

      if (nameTooShort) {
        return this.nameError(z.l10n.text(z.string.groupCreationPreferencesErrorNameShort));
      }

      return this.state(GroupCreationViewModel.STATE.PARTICIPANTS);
    }
  }

  _normalizeNameInput() {
    return this.nameInput().trim();
  }

  _afterHideModal() {
    this.isCreatingConversation = false;
    this.nameError('');
    this.nameInput('');
    this.participantsInput('');
    this.selectedContacts([]);
    this.state(GroupCreationViewModel.STATE.DEFAULT);
  }

  _hideModal() {
    if (this.modal) {
      this.modal.hide();
    }
  }
};
