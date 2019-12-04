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

import {getLogger} from 'Util/Logger';

import {Actions} from 'Components/panel/userActions';
import 'Components/panel/enrichedFields';
import 'Components/panel/userDetails';
import {ConversationRole} from '../../conversation/ConversationRole';
import {BasePanelViewModel} from './BasePanelViewModel';

export class GroupParticipantUserViewModel extends BasePanelViewModel {
  constructor(params) {
    super(params);

    const {mainViewModel, repositories} = params;

    this.userRepository = repositories.user;
    this.actionsViewModel = mainViewModel.actions;
    this.teamRepository = repositories.team;

    this.logger = getLogger('GroupParticipantUserViewModel');

    this.selectedParticipant = ko.observable(undefined);

    this.onUserAction = this.onUserAction.bind(this);

    this.isSelfGroupAdmin = ko.pureComputed(() =>
      repositories.conversation.isSelfGroupAdmin(this.activeConversation()),
    );

    this.isAdmin = ko.pureComputed({
      read: () => repositories.conversation.isUserGroupAdmin(this.activeConversation(), this.selectedParticipant()),
      write: async isAdmin => {
        if (isAdmin) {
          repositories.conversation
            .updateMember(this.activeConversation(), this.selectedParticipant().id, ConversationRole.WIRE_ADMIN)
            .then(() => {
              this.activeConversation().roles[ConversationRole.WIRE_ADMIN].push(this.selectedParticipant().id);
              this.activeConversation().roles[ConversationRole.WIRE_MEMBER].splice(
                this.activeConversation().roles[ConversationRole.WIRE_MEMBER].indexOf(this.selectedParticipant().id),
                1,
              );
            });
        } else {
          repositories.conversation
            .updateMember(this.activeConversation(), this.selectedParticipant().id, ConversationRole.WIRE_MEMBER)
            .then(() => {
              this.activeConversation().roles[ConversationRole.WIRE_MEMBER].push(this.selectedParticipant().id);
              this.activeConversation().roles[ConversationRole.WIRE_ADMIN].splice(
                this.activeConversation().roles[ConversationRole.WIRE_ADMIN].indexOf(this.selectedParticipant().id),
                1,
              );
            });
        }
        return repositories.conversation.isUserGroupAdmin(this.activeConversation(), this.selectedParticipant());
      },
    });
  }

  onToggleAdmin() {
    this.isAdmin(!this.isAdmin());
  }

  showActionDevices(userEntity) {
    return !userEntity.is_me;
  }

  onUserAction(action) {
    if (action === Actions.REMOVE) {
      this.onGoBack();
    }
  }

  getElementId() {
    return 'group-participant-user';
  }

  getEntityId() {
    return this.selectedParticipant().id;
  }

  clickOnDevices() {
    this.navigateTo(z.viewModel.PanelViewModel.STATE.PARTICIPANT_DEVICES, {entity: this.selectedParticipant()});
  }

  initView({entity: user}) {
    const userEntity = user;
    this.selectedParticipant(userEntity);

    if (userEntity.isTemporaryGuest()) {
      userEntity.checkGuestExpiration();
    }
  }
}
