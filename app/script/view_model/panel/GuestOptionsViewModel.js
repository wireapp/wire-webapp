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
window.z.viewModel = z.viewModel || {};
window.z.viewModel.panel = z.viewModel.panel || {};

z.viewModel.panel.GuestOptionsViewModel = class GuestOptionsViewModel {
  constructor(mainViewModel, panelViewModel, repositories) {
    this.conversationRepository = repositories.conversation;

    this.conversationEntity = this.conversationRepository.active_conversation;

    this.isTeamConversation = ko.pureComputed(() => this.conversationEntity() && !!this.conversationEntity().team_id);
    this.isGuestRoom = ko.pureComputed(() => {
      if (this.isTeamConversation()) {
        return this.conversationEntity().accessState() === z.conversation.ACCESS_STATE.TEAM.GUEST_ROOM;
      }
    });

    this.hasAccessCode = ko.pureComputed(() => (this.isGuestRoom() ? !!this.conversationEntity().accessCode() : false));

    this.conversationEntity.subscribe(conversationEntity => {
      if (this.isGuestRoom()) {
        this.conversationRepository.stateHandler.getAccessCode(conversationEntity);
      }
    });
  }

  toggleAccessState() {
    const conversationEntity = this.conversationEntity();
    if (conversationEntity.team_id) {
      const isGuestRoom = conversationEntity.accessState() === z.conversation.ACCESS_STATE.TEAM.GUEST_ROOM;
      const accessState = isGuestRoom
        ? z.conversation.ACCESS_STATE.TEAM.TEAM_ONLY
        : z.conversation.ACCESS_STATE.TEAM.GUEST_ROOM;

      return this.conversationRepository.stateHandler.changeAccessState(conversationEntity, accessState);
    }
  }

  requestAccessCode() {
    return this.conversationRepository.stateHandler.requestAccessCode(this.conversationEntity());
  }

  revokeAccessCode() {
    return this.conversationRepository.stateHandler.revokeAccessCode(this.conversationEntity());
  }
};
