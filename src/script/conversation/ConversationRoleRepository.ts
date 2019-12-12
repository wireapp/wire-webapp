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

import ko from 'knockout';

import {Logger, getLogger} from 'Util/Logger';
import {Conversation} from '../entity/Conversation';
import {User} from '../entity/User';
import {TeamEntity} from '../team/TeamEntity';
import {TeamRepository} from '../team/TeamRepository';
import {ConversationRepository} from './ConversationRepository';
import {ConversationService} from './ConversationService';

export enum DefaultRole {
  WIRE_ADMIN = 'wire_admin',
  WIRE_MEMBER = 'wire_member',
}

export enum Permissions {
  renameConversation = 'modify_conversation_name',
  addParticipants = 'add_conversation_member',
  removeParticipants = 'remove_conversation_member',
  changeParticipantRoles = 'modify_other_conversation_member',
  toggleEphemeralTimer = 'modify_conversation_message_timer',
  toggleGuestsAndServices = 'modify_conversation_access',
  toggleReadReceipts = 'modify_conversation_receipt_mode',
  deleteConversation = 'delete_conversation',
  leaveConversation = 'leave_conversation',
}

export interface ConversationRole {
  conversation_role: string;
  actions: Permissions[];
}

export type ConversationRoles = ConversationRole[];

const defaultAdmin: ConversationRole = {
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

const defaultMember: ConversationRole = {
  actions: [Permissions.leaveConversation],
  conversation_role: DefaultRole.WIRE_MEMBER,
};

export class ConversationRoleRepository {
  conversationRoles: Record<string, ConversationRoles>;
  teamRoles: ConversationRoles;
  isTeam: ko.Observable<boolean>;
  team: ko.Observable<TeamEntity>;
  selfUser: ko.Observable<User>;
  conversationService: ConversationService;
  teamRepository: TeamRepository;
  logger: Logger;

  constructor(conversationRepository: ConversationRepository) {
    this.conversationRoles = {};
    this.teamRoles = [defaultAdmin, defaultMember];
    this.isTeam = conversationRepository.isTeam;
    this.team = conversationRepository.team;
    this.selfUser = conversationRepository.selfUser;
    this.conversationService = conversationRepository.conversation_service;
    this.teamRepository = conversationRepository.teamRepository;
    this.logger = getLogger('ConversationRepository');
  }

  loadTeamRoles = async () => {
    if (this.isTeam()) {
      try {
        const response = await this.teamRepository.getTeamConversationRoles();
        this.teamRoles = response.conversation_roles;
      } catch (error) {
        this.logger.warn('Could not load team conversation roles', error);
      }
    }
    return;
  };

  setConversationRoles = (conversation: Conversation, newRoles: ConversationRoles) => {
    this.conversationRoles[conversation.id] = newRoles;
  };

  setMemberConversationRole = (conversationEntity: Conversation, userId: string, conversationRole: string) => {
    return this.conversationService.putMembers(conversationEntity.id, userId, {
      conversation_role: conversationRole,
    });
  };

  getUserRole = (conversationEntity: Conversation, userEntity: User) => conversationEntity.roles()[userEntity.id];

  isUserGroupAdmin = (conversationEntity: Conversation, userEntity: User) =>
    this.getUserRole(conversationEntity, userEntity) === DefaultRole.WIRE_ADMIN;

  isSelfGroupAdmin = (conversationEntity: Conversation) => this.isUserGroupAdmin(conversationEntity, this.selfUser());

  getConversationRoles = (conversation: Conversation): ConversationRoles => {
    if (this.isTeam() && this.team()?.id === conversation.team_id) {
      return this.teamRoles;
    }
    return this.conversationRoles[conversation.id] || this.teamRoles;
  };

  getUserPermissions = (conversation: Conversation, user: User) => {
    const conversationRoles = this.getConversationRoles(conversation);
    const userRole: string = this.getUserRole(conversation, user);
    return conversationRoles?.find(({conversation_role}) => conversation_role === userRole) || defaultMember;
  };

  hasPermission = (conversation: Conversation, user: User, permissionName: Permissions) => {
    const userRole = this.getUserPermissions(conversation, user);
    return userRole.actions.includes(permissionName);
  };

  canRenameGroup = (conversation: Conversation, user: User = this.selfUser()) =>
    this.hasPermission(conversation, user, Permissions.renameConversation);

  canAddParticipants = (conversation: Conversation, user: User = this.selfUser()) =>
    this.hasPermission(conversation, user, Permissions.addParticipants);

  canRemoveParticipants = (conversation: Conversation, user: User = this.selfUser()) =>
    this.hasPermission(conversation, user, Permissions.removeParticipants);

  canChangeParticipantRoles = (conversation: Conversation, user: User = this.selfUser()) =>
    this.hasPermission(conversation, user, Permissions.changeParticipantRoles);

  canToggleTimeout = (conversation: Conversation, user: User = this.selfUser()) =>
    this.hasPermission(conversation, user, Permissions.toggleEphemeralTimer);

  canToggleGuests = (conversation: Conversation, user: User = this.selfUser()) =>
    this.hasPermission(conversation, user, Permissions.toggleGuestsAndServices);

  canToggleReadReceipts = (conversation: Conversation, user: User = this.selfUser()) =>
    this.hasPermission(conversation, user, Permissions.toggleReadReceipts);

  canDeleteGroup = (conversation: Conversation, user: User = this.selfUser()) =>
    this.hasPermission(conversation, user, Permissions.deleteConversation);

  canLeaveGroup = (conversation: Conversation, user: User = this.selfUser()) =>
    this.hasPermission(conversation, user, Permissions.leaveConversation);
}
