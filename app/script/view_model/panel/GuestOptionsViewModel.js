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
    this.panelViewModel = panelViewModel;
    this.conversationRepository = repositories.conversation;
    this.stateHandler = this.conversationRepository.stateHandler;

    this.conversationEntity = this.conversationRepository.active_conversation;
    this.panelState = this.panelViewModel.state;

    this.isGuestRoom = ko.pureComputed(() => this.conversationEntity() && this.conversationEntity().isGuestRoom());
    this.isTeamOnly = ko.pureComputed(() => this.conversationEntity() && this.conversationEntity().isTeamOnly());
    this.hasAccessCode = ko.pureComputed(() => (this.isGuestRoom() ? !!this.conversationEntity().accessCode() : false));

    this.codeVisible = ko.pureComputed(() => z.viewModel.PanelViewModel.CODE_STATES.includes(this.panelState()));

    this.conversationEntity.subscribe(conversationEntity => this._updateCode(this.codeVisible(), conversationEntity));
    this.codeVisible.subscribe(codeVisible => this._updateCode(codeVisible, this.conversationEntity()));

    this.requestOngoing = ko.observable(false);
  }

  toggleAccessState() {
    const conversationEntity = this.conversationEntity();
    if (conversationEntity.team_id) {
      const newAccessState = this.isTeamOnly()
        ? z.conversation.ACCESS_STATE.TEAM.GUEST_ROOM
        : z.conversation.ACCESS_STATE.TEAM.TEAM_ONLY;

      const _changeAccessState = () => {
        if (!this.requestOngoing()) {
          this.requestOngoing(true);

          this.stateHandler
            .changeAccessState(conversationEntity, newAccessState)
            .then(() => this.requestOngoing(false));
        }
      };

      if (this.isTeamOnly()) {
        return _changeAccessState();
      }

      amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
        action: () => _changeAccessState(),
        preventClose: true,
        text: {
          action: z.l10n.text(z.string.modalConversationRemoveGuestsAction),
          message: z.l10n.text(z.string.modalConversationRemoveGuestsMessage),
          title: z.l10n.text(z.string.modalConversationRemoveGuestsHeadline),
        },
      });
    }
  }

  requestAccessCode() {
    // Handle conversations in legacy state
    const accessStatePromise = this.isGuestRoom()
      ? Promise.resolve()
      : this.stateHandler.changeAccessState(this.conversationEntity(), z.conversation.ACCESS_STATE.TEAM.GUEST_ROOM);

    accessStatePromise.then(() => {
      if (!this.requestOngoing()) {
        this.requestOngoing(true);

        this.stateHandler.requestAccessCode(this.conversationEntity()).then(() => this.requestOngoing(false));
      }
    });
  }

  revokeAccessCode() {
    amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
      action: () => {
        if (!this.requestOngoing()) {
          this.requestOngoing(true);

          this.stateHandler.revokeAccessCode(this.conversationEntity()).then(() => this.requestOngoing(false));
        }
      },
      preventClose: true,
      text: {
        action: z.l10n.text(z.string.modalConversationRevokeLinkAction),
        message: z.l10n.text(z.string.modalConversationRevokeLinkHeadline),
        title: z.l10n.text(z.string.modalConversationRevokeLinkMessage),
      },
    });
  }

  _updateCode(isVisible, conversationEntity) {
    const updateCode = conversationEntity && conversationEntity.isGuestRoom() && !conversationEntity.accessCode();
    if (isVisible && updateCode) {
      this.requestOngoing(true);
      this.stateHandler.getAccessCode(conversationEntity).then(() => this.requestOngoing(false));
    }
  }
};
