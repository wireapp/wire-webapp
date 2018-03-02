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
    this.isGuestRoom = this.panelViewModel.isGuestRoom;
    this.isTeamOnly = this.panelViewModel.isTeamOnly;
    this.isVisible = this.panelViewModel.guestOptionsVisible;
    this.isGuestEnabled = ko.pureComputed(() => !this.isTeamOnly());

    this.hasAccessCode = ko.pureComputed(() => (this.isGuestRoom() ? !!this.conversationEntity().accessCode() : false));
    this.requestOngoing = ko.observable(false);

    this.conversationEntity.subscribe(conversationEntity => this._updateCode(this.isVisible(), conversationEntity));
    this.isVisible.subscribe(isVisible => this._updateCode(isVisible, this.conversationEntity()));

    this.toggleAccessState = this.toggleAccessState.bind(this);
    this.clickOnBack = this.clickOnBack.bind(this);
    this.clickOnClose = this.clickOnClose.bind(this);
    this.requestAccessCode = this.requestAccessCode.bind(this);
    this.revokeAccessCode = this.revokeAccessCode.bind(this);
  }

  clickOnBack() {
    this.panelViewModel.switchState(z.viewModel.PanelViewModel.STATE.CONVERSATION_DETAILS);
  }

  clickOnClose() {
    this.panelViewModel.closePanel();
  }

  copyLink() {
    const link = document.querySelector('.guest-options__link');
    link.disabled = false;
    link.select();
    document.execCommand('copy');
    link.disabled = true;
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

  _updateCode(isVisible, conversationEntity) {
    const updateCode = conversationEntity && conversationEntity.isGuestRoom() && !conversationEntity.accessCode();
    if (isVisible && updateCode) {
      this.requestOngoing(true);
      this.stateHandler.getAccessCode(conversationEntity).then(() => this.requestOngoing(false));
    }
  }
};
