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
  }

  changeAccessState(conversationEntity, accessState) {
    if (conversationEntity && conversationEntity.team_id) {
      const isStateUnchanged = conversationEntity.accessState === accessState;

      if (!isStateUnchanged) {
        let accessModes;
        let accessRole;

        const changeToGuestRoom = accessState === z.conversation.ACCESS_STATE.TEAM.GUEST_ROOM;
        const changeToTeamOnly = accessState === z.conversation.ACCESS_STATE.TEAM.TEAM_ONLY;
        if (changeToGuestRoom) {
          accessModes = [z.conversation.ACCESS_MODE.INVITE, z.conversation.ACCESS_MODE.CODE];
          accessRole = z.conversation.ACCESS_ROLE.NON_VERIFIED;
        } else if (changeToTeamOnly) {
          accessModes = [z.conversation.ACCESS_MODE.INVITE];
          accessRole = z.conversation.ACCESS_ROLE.TEAM;
        }

        if (accessModes && accessRole) {
          return this.conversationService.putConversationAccess(conversationEntity.id, accessModes, accessRole);
        }
      }
    }

    return Promise.reject(new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.WRONG_CHANGE));
  }

  getCode(conversationEntity) {
    this.conversationService.getConversationCode(conversationEntity.id);
  }

  requestCode(conversationEntity) {
    this.conversationService.postConversationCode(conversationEntity.id);
  }

  revokeCode(conversationEntity) {
    this.conversationService.deleteConversationCode(conversationEntity.id);
  }
};
