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
window.z.conversation = z.conversation || {};

z.conversation.ConversationStateHandler = class ConversationStateHandler {
  /**
   * Construct a new conversation state handler.
   * @param {ConversationService} conversationService - Service for conversation related backend interactions
   * @param {ConversationRepository} conversationRepository - Repository for conversation interactions
   */
  constructor(conversationService, conversationRepository) {
    this.conversationService = conversationService;
    this.conversationRepository = conversationRepository;
    this.conversationMapper = this.conversationRepository.conversation_mapper;
  }

  changeAccessState(conversationEntity, accessState) {
    const isTeamConversation = conversationEntity && conversationEntity.team_id;
    if (isTeamConversation && !conversationEntity.is_guest()) {
      const isStateChange = conversationEntity.accessState() !== accessState;

      if (isStateChange) {
        let accessModes;
        let accessRole;

        const changeToGuestRoom = accessState === z.conversation.ACCESS_STATE.TEAM.GUEST_ROOM;
        const changeToTeamOnly = accessState === z.conversation.ACCESS_STATE.TEAM.TEAM_ONLY;
        if (changeToGuestRoom) {
          accessModes = [z.conversation.ACCESS_MODE.INVITE, z.conversation.ACCESS_MODE.CODE];
          accessRole = z.conversation.ACCESS_ROLE.NON_ACTIVATED;
        } else if (changeToTeamOnly) {
          accessModes = [z.conversation.ACCESS_MODE.INVITE];
          accessRole = z.conversation.ACCESS_ROLE.TEAM;
        }

        if (accessModes && accessRole) {
          return this.conversationService
            .putConversationAccess(conversationEntity.id, accessModes, accessRole)
            .then(() => {
              conversationEntity.accessState(accessState);

              const attribute = {is_allow_guests: changeToGuestRoom};
              amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.GUEST_ROOMS.ALLOW_GUESTS, attribute);
            })
            .catch(() => {
              const messageStringId = changeToGuestRoom
                ? z.string.modalConversationGuestOptionsAllowGuestMessage
                : z.string.modalConversationGuestOptionsDisableGuestMessage;

              this._showModal(messageStringId);
            });
        }
      }
    }

    this._showModal(z.string.modalConversationGuestOptionsToggleGuestsMessage);
    return Promise.resolve();
  }

  getAccessCode(conversationEntity) {
    return this.conversationService
      .getConversationCode(conversationEntity.id)
      .then(response => this.conversationMapper.mapAccessCode(conversationEntity, response))
      .catch(error => {
        const isNotFound = error.code === z.service.BackendClientError.STATUS_CODE.NOT_FOUND;
        if (!isNotFound) {
          this._showModal(z.string.modalConversationGuestOptionsGetCodeMessage);
        }
      });
  }

  requestAccessCode(conversationEntity) {
    return this.conversationService
      .postConversationCode(conversationEntity.id)
      .then(response => {
        const accessCode = response.data || response;
        this.conversationMapper.mapAccessCode(conversationEntity, accessCode);
        amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.GUEST_ROOMS.LINK_CREATED);
      })
      .catch(() => this._showModal(z.string.modalConversationGuestOptionsRequestCodeMessage));
  }

  revokeAccessCode(conversationEntity) {
    return this.conversationService
      .deleteConversationCode(conversationEntity.id)
      .then(() => {
        conversationEntity.accessCode(undefined);
        amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.GUEST_ROOMS.LINK_REVOKED);
      })
      .catch(() => this._showModal(z.string.modalConversationGuestOptionsRevokeCodeMessage));
  }

  /**
   * Listener for incoming events.
   *
   * @param {Object} eventJson - JSON data for event
   * @param {z.event.EventRepository.SOURCE} eventSource - Source of event
   * @returns {Promise} Resolves when event was handled
   */
  onConversationEvent(eventJson, eventSource = z.event.EventRepository.SOURCE.STREAM) {
    if (!eventJson) {
      return Promise.reject(new Error('Conversation Repository Event Handling: Event missing'));
    }

    const {conversation: conversationId, data: eventData, type} = eventJson;

    return this.conversationRepository
      .get_conversation_by_id(conversationId)
      .then(conversationEntity => {
        switch (type) {
          case z.event.Backend.CONVERSATION.ACCESS_UPDATE:
            this.conversationMapper.mapAccessState(conversationEntity, eventData.access, eventData.access_role);
            break;
          case z.event.Backend.CONVERSATION.CODE_DELETE:
            conversationEntity.accessCode(undefined);
            break;
          case z.event.Backend.CONVERSATION.CODE_UPDATE:
            this.conversationMapper.mapAccessCode(conversationEntity, eventData);
            break;
          default:
            break;
        }
      })
      .catch(error => {
        const isNotFound = error.type === z.conversation.ConversationError.TYPE.CONVERSATION_NOT_FOUND;
        if (!isNotFound) {
          throw error;
        }
      });
  }

  _showModal(messageStringId) {
    const modalOptions = {text: {message: z.l10n.text(messageStringId)}};
    amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.ACKNOWLEDGE, modalOptions);
  }
};
