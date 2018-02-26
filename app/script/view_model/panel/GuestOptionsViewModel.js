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
    this.stateHandler = this.conversationRepository.stateHandler;

    this.conversationEntity = this.conversationRepository.active_conversation;

    this.isGuestRoom = ko.pureComputed(() => this.conversationEntity() && this.conversationEntity().isGuestRoom());
    this.isTeamOnly = ko.pureComputed(() => this.conversationEntity() && this.conversationEntity().isTeamOnly());
    this.hasAccessCode = ko.pureComputed(() => (this.isGuestRoom() ? !!this.conversationEntity().accessCode() : false));

    this.conversationEntity.subscribe(conversationEntity => {
      if (conversationEntity.isGuestRoom() && !conversationEntity.accessCode()) {
        this.stateHandler.getAccessCode(conversationEntity);
      }
    });
  }

  toggleAccessState() {
    const conversationEntity = this.conversationEntity();
    if (conversationEntity.team_id) {
      const newAccessState = this.isTeamOnly()
        ? z.conversation.ACCESS_STATE.TEAM.GUEST_ROOM
        : z.conversation.ACCESS_STATE.TEAM.TEAM_ONLY;

      if (this.isTeamOnly()) {
        this.stateHandler.changeAccessState(conversationEntity, newAccessState);
      } else {
        amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.REMOVE_GUESTS, {
          action: () => this.stateHandler.changeAccessState(conversationEntity, newAccessState),
        });
      }
    }
  }

  requestAccessCode() {
    // Handle conversations in legacy state
    const accessStatePromise = this.isGuestRoom()
      ? Promise.resolve()
      : this.stateHandler.changeAccessState(this.conversationEntity(), z.conversation.ACCESS_STATE.TEAM.GUEST_ROOM);

    accessStatePromise.then(() => this.stateHandler.requestAccessCode(this.conversationEntity()));
  }

  revokeAccessCode() {
    amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.REVOKE_LINK, {
      action: () => this.stateHandler.revokeAccessCode(this.conversationEntity()),
    });
  }
};
