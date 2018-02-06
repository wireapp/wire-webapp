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

z.ViewModel.content.ConversationCreationViewModel = class ConversationCreationViewModel {
  static get STATE() {
    return {
      PARTICIPANTS: 'ConversationCreationViewModel.STATE.PARTICIPANTS',
      PREFERENCES: 'ConversationCreationViewModel.STATE.PREFERENCES',
    };
  }

  constructor(elementId, conversationRepository, teamRepository, userRepository) {
    this.logger = new z.util.Logger('z.ViewModel.content.ConversationCreationViewModel', z.config.LOGGER.OPTIONS);

    this.elementId = elementId;
    this.conversationRepository = conversationRepository;
    this.teamRepository = teamRepository;
    this.userRepository = userRepository;

    this.modal = undefined;
    this.state = ko.observable(ConversationCreationViewModel.STATE.PREFERENCES);

    this.contacts = ko.pureComputed(() => {
      if (this.teamRepository.isTeam()) {
        return this.teamRepository.teamUsers();
      }

      return this.userRepository.connected_users();
    });

    this.isCreatingConversation = false;
    this.nameInput = ko.observable('');
    this.selectedContacts = ko.observableArray([]);
    this.participantsInput = ko.observable('');

    this.activateNext = ko.pureComputed(() => this.nameInput().length);
    this.participantsActionText = ko.pureComputed(() => {
      const stringSelector = this.selectedContacts().length
        ? z.string.conversation_creation_participants_action_create
        : z.string.conversation_creation_participants_action_skip;
      return z.l10n.text(stringSelector);
    });
    this.participantsHeaderText = ko.pureComputed(() => {
      const stringSelector = this.selectedContacts().length
        ? z.string.conversation_creation_participants_header_with_counter
        : z.string.conversation_creation_participants_header;
      return z.l10n.text(stringSelector, {number: this.selectedContacts().length});
    });

    this.stateIsPreferences = ko.pureComputed(() => this.state() === ConversationCreationViewModel.STATE.PREFERENCES);
    this.stateIsParticipants = ko.pureComputed(() => this.state() === ConversationCreationViewModel.STATE.PARTICIPANTS);

    this.shouldUpdateScrollbar = ko
      .computed(() => this.selectedContacts() && this.stateIsPreferences())
      .extend({notify: 'always', rateLimit: 500});
  }

  showCreateConversation() {
    this._resetView();

    if (!this.modal) {
      this.modal = new zeta.webapp.module.Modal('#conversation-creation-modal');
    }

    this.modal.show();
  }

  clickOnBack() {
    this.state(ConversationCreationViewModel.STATE.PREFERENCES);
  }

  clickOnClose() {
    this._resetView();
  }

  clickOnCreate() {
    if (!this.isCreatingConversation) {
      this.isCreatingConversation = true;

      this.conversationRepository
        .createGroupConversation(this.selectedContacts(), this.nameInput())
        .then(conversationEntity => {
          this._resetView();
          amplify.publish(z.event.WebApp.CONVERSATION.SHOW, conversationEntity);
        })
        .catch(error => {
          this.isCreatingConversation = false;
          throw error;
        });
    }
  }

  clickOnNext() {
    this.nameInput(this._normalizeNameInput());

    if (this.nameInput().length) {
      return this.state(ConversationCreationViewModel.STATE.PARTICIPANTS);
    }
    // Show error
  }

  _normalizeNameInput() {
    return this.nameInput()
      .trim()
      .slice(0, 64);
  }
  _resetView() {
    if (this.modal) {
      this.modal.hide();
    }

    this.isCreatingConversation = false;
    this.nameInput('');
    this.participantsInput('');
    this.selectedContacts([]);
    this.state(ConversationCreationViewModel.STATE.PREFERENCES);
  }
};
