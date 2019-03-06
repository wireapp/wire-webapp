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

import {t} from 'utils/LocalizerUtil';

window.z = window.z || {};
window.z.conversation = z.conversation || {};

z.conversation.ConversationStateHandler = class ConversationStateHandler extends z.conversation
  .AbstractConversationEventHandler {
  /**
   * Construct a new conversation state handler.
   * @param {ConversationService} conversationService - Service for conversation related backend interactions
   * @param {ConversationRepository} conversationMapper - Repository for conversation interactions
   */
  constructor(conversationService, conversationMapper) {
    super();
    const eventHandlingConfig = {
      [z.event.Backend.CONVERSATION.ACCESS_UPDATE]: this._mapConversationAccessState.bind(this),
      [z.event.Backend.CONVERSATION.CODE_DELETE]: this._resetConversationAccessCode.bind(this),
      [z.event.Backend.CONVERSATION.CODE_UPDATE]: this._updateConversationAccessCode.bind(this),
    };
    this.setEventHandlingConfig(eventHandlingConfig);
    this.conversationMapper = conversationMapper;
    this.conversationService = conversationService;
  }

  changeAccessState(conversationEntity, accessState) {
    const isConversationInTeam = conversationEntity && conversationEntity.inTeam();
    if (isConversationInTeam) {
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

              if (changeToTeamOnly) {
                conversationEntity.accessCode(undefined);
              }

              const attribute = {is_allow_guests: changeToGuestRoom};
              amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.GUEST_ROOMS.ALLOW_GUESTS, attribute);
            })
            .catch(() => {
              const messageString = changeToGuestRoom
                ? t('modalConversationGuestOptionsAllowGuestMessage')
                : t('modalConversationGuestOptionsDisableGuestMessage');

              this._showModal(messageString);
            });
        }
      }
    }

    this._showModal(t('modalConversationGuestOptionsToggleGuestsMessage'));
    return Promise.resolve();
  }

  getAccessCode(conversationEntity) {
    return this.conversationService
      .getConversationCode(conversationEntity.id)
      .then(response => this.conversationMapper.mapAccessCode(conversationEntity, response))
      .catch(error => {
        const isNotFound = error.code === z.error.BackendClientError.STATUS_CODE.NOT_FOUND;
        if (!isNotFound) {
          this._showModal(t('modalConversationGuestOptionsGetCodeMessage'));
        }
      });
  }

  requestAccessCode(conversationEntity) {
    return this.conversationService
      .postConversationCode(conversationEntity.id)
      .then(response => {
        const accessCode = response && response.data;
        if (accessCode) {
          this.conversationMapper.mapAccessCode(conversationEntity, accessCode);
          amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.GUEST_ROOMS.LINK_CREATED);
        }
      })
      .catch(() => this._showModal(t('modalConversationGuestOptionsRequestCodeMessage')));
  }

  revokeAccessCode(conversationEntity) {
    return this.conversationService
      .deleteConversationCode(conversationEntity.id)
      .then(() => {
        conversationEntity.accessCode(undefined);
        amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.GUEST_ROOMS.LINK_REVOKED);
      })
      .catch(() => this._showModal(t('modalConversationGuestOptionsRevokeCodeMessage')));
  }

  _mapConversationAccessState(conversationEntity, eventJson) {
    const {access: accessModes, access_role: accessRole} = eventJson.data;
    this.conversationMapper.mapAccessState(conversationEntity, accessModes, accessRole);
  }

  _resetConversationAccessCode(conversationEntity) {
    conversationEntity.accessCode(undefined);
  }

  _updateConversationAccessCode(conversationEntity, eventJson) {
    this.conversationMapper.mapAccessCode(conversationEntity, eventJson.data);
  }

  _showModal(message) {
    const modalOptions = {text: {message}};
    amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.ACKNOWLEDGE, modalOptions);
  }
};
