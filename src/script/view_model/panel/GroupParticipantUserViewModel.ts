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

import ko from 'knockout';

import {getLogger, Logger} from 'Util/Logger';

import {Actions} from 'Components/panel/userActions';
import 'Components/panel/enrichedFields';
import 'Components/panel/userDetails';
import {DefaultRole, ConversationRoleRepository} from '../../conversation/ConversationRoleRepository';
import {BasePanelViewModel, PanelViewModelProps} from './BasePanelViewModel';
import {UserRepository} from '../../user/UserRepository';
import {ActionsViewModel} from '../ActionsViewModel';
import {TeamRepository} from '../../team/TeamRepository';
import {ConversationRepository} from '../../conversation/ConversationRepository';
import {User} from '../../entity/User';
import {PanelViewModel} from '../PanelViewModel';

export class GroupParticipantUserViewModel extends BasePanelViewModel {
  userRepository: UserRepository;
  actionsViewModel: ActionsViewModel;
  teamRepository: TeamRepository;
  conversationRepository: ConversationRepository;
  conversationRoleRepository: ConversationRoleRepository;
  logger: Logger;
  selectedParticipant: ko.Observable<User>;
  isSelfVerified: ko.PureComputed<boolean>;
  canChangeRole: ko.PureComputed<boolean>;
  isAdmin: ko.PureComputed<boolean>;
  constructor(params: PanelViewModelProps) {
    super(params);

    const {mainViewModel, repositories} = params;

    this.userRepository = repositories.user;
    this.actionsViewModel = mainViewModel.actions;
    this.teamRepository = repositories.team;
    this.conversationRepository = repositories.conversation;
    this.conversationRoleRepository = repositories.conversation.conversationRoleRepository;

    this.logger = getLogger('GroupParticipantUserViewModel');

    this.selectedParticipant = ko.observable(undefined);
    this.isSelfVerified = ko.pureComputed(() => repositories.user.self()?.is_verified());

    this.canChangeRole = ko.pureComputed(
      () =>
        this.conversationRoleRepository.canChangeParticipantRoles(this.activeConversation()) &&
        !!this.selectedParticipant() &&
        !this.selectedParticipant().isMe &&
        !this.selectedParticipant().isTemporaryGuest(),
    );

    this.isAdmin = ko.pureComputed(
      () =>
        this.activeConversation().isGroup() &&
        this.conversationRoleRepository.isUserGroupAdmin(this.activeConversation(), this.selectedParticipant()),
    );
  }

  onToggleAdmin = async (): Promise<void> => {
    const newRole = this.isAdmin() ? DefaultRole.WIRE_MEMBER : DefaultRole.WIRE_ADMIN;
    await this.conversationRoleRepository.setMemberConversationRole(
      this.activeConversation(),
      this.selectedParticipant().id,
      newRole,
    );
    const roles = this.activeConversation().roles();
    roles[this.selectedParticipant().id] = newRole;
    this.activeConversation().roles(roles);
  };

  showActionDevices(userEntity: User): boolean {
    return !userEntity.isMe;
  }

  onUserAction = (action: Actions): void => {
    if (action === Actions.REMOVE) {
      this.onGoBack();
    }
  };

  getElementId(): string {
    return 'group-participant-user';
  }

  getEntityId(): string {
    return this.selectedParticipant().id;
  }

  clickOnDevices(): void {
    this.navigateTo(PanelViewModel.STATE.PARTICIPANT_DEVICES, {entity: this.selectedParticipant()});
  }

  initView({entity: userEntity}: {entity: User}): void {
    this.selectedParticipant(userEntity);
    if (this.teamRepository.isTeam()) {
      this.teamRepository.updateTeamMembersByIds(this.teamRepository.team(), [userEntity.id], true);
    }
    if (userEntity.isTemporaryGuest()) {
      userEntity.checkGuestExpiration();
    }
  }
}
