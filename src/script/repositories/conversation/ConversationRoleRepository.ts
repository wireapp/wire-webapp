/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {
  DefaultConversationRoleName as DefaultRole,
  ConversationRole,
  ADD_PERMISSION,
} from '@wireapp/api-client/lib/conversation/';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {container} from 'tsyringe';

import type {Conversation} from 'Repositories/entity/Conversation';
import type {User} from 'Repositories/entity/User';
import type {TeamRepository} from 'Repositories/team/TeamRepository';
import {TeamState} from 'Repositories/team/TeamState';
import {UserState} from 'Repositories/user/UserState';
import {Logger, getLogger} from 'Util/Logger';

import type {ConversationService} from './ConversationService';

export enum Permissions {
  addParticipants = 'add_conversation_member',
  changeParticipantRoles = 'modify_other_conversation_member',
  deleteConversation = 'delete_conversation',
  leaveConversation = 'leave_conversation',
  removeParticipants = 'remove_conversation_member',
  renameConversation = 'modify_conversation_name',
  toggleEphemeralTimer = 'modify_conversation_message_timer',
  toggleGuestsAndServices = 'modify_conversation_access',
  toggleReadReceipts = 'modify_conversation_receipt_mode',
  toggleAddPermission = 'modify_add_permission',
}

const defaultAdminRole: ConversationRole = {
  actions: [
    Permissions.renameConversation,
    Permissions.addParticipants,
    Permissions.removeParticipants,
    Permissions.changeParticipantRoles,
    Permissions.toggleEphemeralTimer,
    Permissions.toggleGuestsAndServices,
    Permissions.toggleReadReceipts,
    Permissions.deleteConversation,
    Permissions.leaveConversation,
    Permissions.toggleAddPermission,
  ],
  conversation_role: DefaultRole.WIRE_ADMIN,
};

const defaultMemberRole: ConversationRole = {
  actions: [Permissions.leaveConversation],
  conversation_role: DefaultRole.WIRE_MEMBER,
};

export class ConversationRoleRepository {
  readonly logger: Logger;
  teamRoles: ConversationRole[];

  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly conversationService: ConversationService,
    private readonly userState = container.resolve(UserState),
    private readonly teamState = container.resolve(TeamState),
  ) {
    this.logger = getLogger('ConversationRoleRepository');
    this.teamRoles = [defaultAdminRole, defaultMemberRole];
  }

  loadTeamRoles = async (): Promise<void> => {
    if (this.teamState.isTeam()) {
      try {
        const response = await this.teamRepository.getTeamConversationRoles();
        this.teamRoles = response.conversation_roles;
      } catch (error) {
        this.logger.warn('Could not load team conversation roles', error);
      }
    }
  };

  updateConversationRoles = async (conversation: Conversation): Promise<void> => {
    const remoteConversationData = await this.conversationService.getConversationById(conversation);
    const roleUpdates: Record<string, string> = {};

    // Add role for self participant
    if (remoteConversationData.members.self.conversation_role) {
      roleUpdates[remoteConversationData.members.self.id] = remoteConversationData.members.self.conversation_role;
    }

    // Add roles for other participants
    remoteConversationData.members.others.forEach(other => {
      if (other.conversation_role) {
        roleUpdates[other.id] = other.conversation_role;
      }
    });

    conversation.roles(roleUpdates);
  };

  readonly setMemberConversationRole = (
    conversation: Conversation,
    userId: QualifiedId,
    conversationRole: string,
  ): Promise<void> => {
    return this.conversationService.putMembers(conversation.qualifiedId, userId, {
      conversation_role: conversationRole,
    });
  };

  private readonly getUserRole = (conversation: Conversation, userEntity: User): string => {
    return conversation.roles()[userEntity.id];
  };

  readonly isUserGroupAdmin = (conversation: Conversation, userEntity: User): boolean => {
    return this.getUserRole(conversation, userEntity) === DefaultRole.WIRE_ADMIN;
  };

  private readonly getConversationRoles = (conversation: Conversation): ConversationRole[] => {
    if (this.teamState.isTeam() && this.teamState.team()?.id === conversation.teamId) {
      return this.teamRoles;
    }
    return this.teamRoles;
  };

  private readonly getUserPermissions = (conversation: Conversation, user: User): ConversationRole => {
    const conversationRoles = this.getConversationRoles(conversation);
    const userRole: string = this.getUserRole(conversation, user);
    return conversationRoles?.find(({conversation_role}) => conversation_role === userRole) || defaultMemberRole;
  };

  readonly hasPermission = (conversation: Conversation, user: User, permissionName: Permissions): boolean => {
    // Bypass permission check for admin or owner and when conversation is a channel and teamId matches
    if (user.isAdminOrOwner() && conversation.teamId === user.teamId && conversation.isChannel()) {
      return true;
    }

    const userRole = this.getUserPermissions(conversation, user);
    return userRole.actions.includes(permissionName);
  };

  readonly canRenameGroup = (conversation: Conversation, user: User = this.userState.self()): boolean => {
    return this.hasPermission(conversation, user, Permissions.renameConversation);
  };

  readonly canAddParticipants = (conversation: Conversation, user: User = this.userState.self()): boolean => {
    return (
      conversation.conversationModerator() === ADD_PERMISSION.EVERYONE ||
      this.hasPermission(conversation, user, Permissions.addParticipants)
    );
  };

  readonly canRemoveParticipants = (conversation: Conversation, user: User = this.userState.self()): boolean => {
    return this.hasPermission(conversation, user, Permissions.removeParticipants);
  };

  readonly canChangeParticipantRoles = (conversation: Conversation, user: User = this.userState.self()): boolean => {
    return this.hasPermission(conversation, user, Permissions.changeParticipantRoles);
  };

  readonly canToggleTimeout = (conversation: Conversation, user: User = this.userState.self()): boolean => {
    return this.hasPermission(conversation, user, Permissions.toggleEphemeralTimer);
  };

  readonly canToggleGuests = (conversation: Conversation, user: User = this.userState.self()): boolean => {
    return this.hasPermission(conversation, user, Permissions.toggleGuestsAndServices);
  };

  readonly canToggleReadReceipts = (conversation: Conversation, user: User = this.userState.self()): boolean => {
    return this.hasPermission(conversation, user, Permissions.toggleReadReceipts);
  };

  readonly canDeleteGroup = (conversation: Conversation, user: User = this.userState.self()): boolean => {
    return this.hasPermission(conversation, user, Permissions.deleteConversation);
  };

  readonly canLeaveGroup = (conversation: Conversation, user: User = this.userState.self()): boolean => {
    return this.hasPermission(conversation, user, Permissions.leaveConversation);
  };

  readonly canToggleAddPermission = (conversation: Conversation, user: User = this.userState.self()): boolean => {
    return this.hasPermission(conversation, user, Permissions.toggleAddPermission);
  };
}
