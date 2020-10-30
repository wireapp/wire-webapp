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

import {DefaultConversationRoleName as DefaultRole, ConversationRole} from '@wireapp/api-client/src/conversation';

import {Logger, getLogger} from 'Util/Logger';
import type {Conversation} from '../entity/Conversation';
import type {User} from '../entity/User';
import type {TeamRepository} from '../team/TeamRepository';
import type {ConversationService} from './ConversationService';
import {UserState} from '../user/UserState';
import {container} from 'tsyringe';
import {TeamState} from '../team/TeamState';

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
  ],
  conversation_role: DefaultRole.WIRE_ADMIN,
};

const defaultMemberRole: ConversationRole = {
  actions: [Permissions.leaveConversation],
  conversation_role: DefaultRole.WIRE_MEMBER,
};

export class ConversationRoleRepository {
  readonly conversationRoles: Record<string, ConversationRole[]>;
  readonly logger: Logger;
  teamRoles: ConversationRole[];

  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly conversationService: ConversationService,
    private readonly userState = container.resolve(UserState),
    private readonly teamState = container.resolve(TeamState),
  ) {
    this.logger = getLogger('ConversationRepository');
    this.conversationRoles = {};
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

  setConversationRoles = (conversation: Conversation, newRoles: ConversationRole[]): void => {
    this.conversationRoles[conversation.id] = newRoles;
  };

  updateConversationRoles = async (conversation: Conversation): Promise<void> => {
    const remoteConversationData = await this.conversationService.get_conversation_by_id(conversation.id);
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

  setMemberConversationRole = (conversation: Conversation, userId: string, conversationRole: string): Promise<void> => {
    return this.conversationService.putMembers(conversation.id, userId, {
      conversation_role: conversationRole,
    });
  };

  getUserRole = (conversation: Conversation, userEntity: User): string => {
    return conversation.roles()[userEntity.id];
  };

  isUserGroupAdmin = (conversation: Conversation, userEntity: User): boolean => {
    return this.getUserRole(conversation, userEntity) === DefaultRole.WIRE_ADMIN;
  };

  isSelfGroupAdmin = (conversation: Conversation): boolean => {
    return this.isUserGroupAdmin(conversation, this.userState.self());
  };

  getConversationRoles = (conversation: Conversation): ConversationRole[] => {
    if (this.teamState.isTeam() && this.teamState.team()?.id === conversation.team_id) {
      return this.teamRoles;
    }
    return this.conversationRoles[conversation.id] || this.teamRoles;
  };

  getUserPermissions = (conversation: Conversation, user: User): ConversationRole => {
    const conversationRoles = this.getConversationRoles(conversation);
    const userRole: string = this.getUserRole(conversation, user);
    return conversationRoles?.find(({conversation_role}) => conversation_role === userRole) || defaultMemberRole;
  };

  hasPermission = (conversation: Conversation, user: User, permissionName: Permissions): boolean => {
    const userRole = this.getUserPermissions(conversation, user);
    return userRole.actions.includes(permissionName);
  };

  canRenameGroup = (conversation: Conversation, user: User = this.userState.self()): boolean => {
    return this.hasPermission(conversation, user, Permissions.renameConversation);
  };

  canAddParticipants = (conversation: Conversation, user: User = this.userState.self()): boolean => {
    return this.hasPermission(conversation, user, Permissions.addParticipants);
  };

  canRemoveParticipants = (conversation: Conversation, user: User = this.userState.self()): boolean => {
    return this.hasPermission(conversation, user, Permissions.removeParticipants);
  };

  canChangeParticipantRoles = (conversation: Conversation, user: User = this.userState.self()): boolean => {
    return this.hasPermission(conversation, user, Permissions.changeParticipantRoles);
  };

  canToggleTimeout = (conversation: Conversation, user: User = this.userState.self()): boolean => {
    return this.hasPermission(conversation, user, Permissions.toggleEphemeralTimer);
  };

  canToggleGuests = (conversation: Conversation, user: User = this.userState.self()): boolean => {
    return this.hasPermission(conversation, user, Permissions.toggleGuestsAndServices);
  };

  canToggleReadReceipts = (conversation: Conversation, user: User = this.userState.self()): boolean => {
    return this.hasPermission(conversation, user, Permissions.toggleReadReceipts);
  };

  canDeleteGroup = (conversation: Conversation, user: User = this.userState.self()): boolean => {
    return this.hasPermission(conversation, user, Permissions.deleteConversation);
  };

  canLeaveGroup = (conversation: Conversation, user: User = this.userState.self()): boolean => {
    return this.hasPermission(conversation, user, Permissions.leaveConversation);
  };
}
