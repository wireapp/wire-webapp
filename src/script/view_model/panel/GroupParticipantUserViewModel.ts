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
import {amplify} from 'amplify';
import {DefaultConversationRoleName as DefaultRole} from '@wireapp/api-client/src/conversation';
import {WebAppEvents} from '@wireapp/webapp-events';

import {Logger, getLogger} from 'Util/Logger';

import {Actions} from 'Components/panel/userActions';
import 'Components/panel/enrichedFields';
import 'Components/panel/userDetails';

import type {ConversationRoleRepository} from '../../conversation/ConversationRoleRepository';
import {BasePanelViewModel, PanelViewModelProps} from './BasePanelViewModel';
import type {ActionsViewModel} from '../ActionsViewModel';
import type {TeamRepository} from '../../team/TeamRepository';
import type {ConversationRepository} from '../../conversation/ConversationRepository';
import type {User} from '../../entity/User';
import {PanelViewModel} from '../PanelViewModel';
import type {PanelParams} from '../PanelViewModel';
import {ClientEvent} from '../../event/Client';
import type {MemberLeaveEvent} from '../../conversation/EventBuilder';
import {UserState} from '../../user/UserState';
import {container} from 'tsyringe';
import {TeamState} from '../../team/TeamState';

export class GroupParticipantUserViewModel extends BasePanelViewModel {
  private readonly userState: UserState;
  private readonly teamState: TeamState;

  actionsViewModel: ActionsViewModel;
  teamRepository: TeamRepository;
  conversationRepository: ConversationRepository;
  conversationRoleRepository: ConversationRoleRepository;
  logger: Logger;
  isActivatedAccount: ko.PureComputed<boolean>;
  selectedParticipant: ko.Observable<User>;
  isSelfVerified: ko.PureComputed<boolean>;
  canChangeRole: ko.PureComputed<boolean>;
  isAdmin: ko.PureComputed<boolean>;
  constructor(params: PanelViewModelProps) {
    super(params);

    this.userState = container.resolve(UserState);
    this.teamState = container.resolve(TeamState);

    const {mainViewModel, repositories} = params;

    this.actionsViewModel = mainViewModel.actions;
    this.teamRepository = repositories.team;
    this.conversationRepository = repositories.conversation;
    this.conversationRoleRepository = repositories.conversation.conversationRoleRepository;

    this.logger = getLogger('GroupParticipantUserViewModel');

    this.isActivatedAccount = this.userState.isActivatedAccount;
    this.selectedParticipant = ko.observable(undefined);
    this.isSelfVerified = ko.pureComputed(() => this.userState.self()?.is_verified());

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
    amplify.subscribe(WebAppEvents.CONVERSATION.EVENT_FROM_BACKEND, this.checkMemberLeave);
  }

  private readonly checkMemberLeave = ({type, data}: MemberLeaveEvent) => {
    if (
      this.isVisible() &&
      type === ClientEvent.CONVERSATION.TEAM_MEMBER_LEAVE &&
      data.user_ids.includes(this.getEntityId())
    ) {
      this.onGoToRoot();
    }
  };

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
    return this.selectedParticipant()?.id;
  }

  clickOnDevices(): void {
    this.navigateTo(PanelViewModel.STATE.PARTICIPANT_DEVICES, {entity: this.selectedParticipant()});
  }

  initView({entity: userEntity}: PanelParams): void {
    userEntity = userEntity as User;
    if (userEntity.isDeleted) {
      return this.onGoToRoot();
    }

    this.selectedParticipant(userEntity);
    if (this.teamState.isTeam()) {
      this.teamRepository.updateTeamMembersByIds(this.teamState.team(), [userEntity.id], true);
    }
    if (userEntity.isTemporaryGuest()) {
      userEntity.checkGuestExpiration();
    }
  }
}
