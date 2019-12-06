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

import {Conversation} from '../entity/Conversation';
import {User} from '../entity/User';
import {TeamEntity} from '../team/TeamEntity';
import {ConversationRepository} from './ConversationRepository';
import {DefaultRole} from './DefaultRole';

export enum Permissions {
  renameConversation = 'modify_conversation_name',
  addParticipants = 'add_conversation_member',
  removeParticipants = 'remove_conversation_member',
  changeParticipantRoles = 'modify_other_conversation_member',
  toggleEphemeralTimer = 'modify_conversation_message_timer',
  toggleGuestsAndServices = 'modify_conversation_access',
  toggleReadReceipts = 'modify_conversation_receipt_mode',
  deleteConversation = 'delete_conversation',
}

export interface ConversationRole {
  name: string;
  permissions: Record<Permissions, boolean>;
}

export type ConversationRoles = ConversationRole[];

const defaultAdmin: ConversationRole = {
  name: DefaultRole.WIRE_ADMIN,
  permissions: {
    [Permissions.renameConversation]: true,
    [Permissions.addParticipants]: true,
    [Permissions.removeParticipants]: true,
    [Permissions.changeParticipantRoles]: true,
    [Permissions.toggleEphemeralTimer]: true,
    [Permissions.toggleGuestsAndServices]: true,
    [Permissions.toggleReadReceipts]: true,
    [Permissions.deleteConversation]: true,
  },
};

const defaultMember: ConversationRole = {
  name: DefaultRole.WIRE_MEMBER,
  permissions: {
    [Permissions.renameConversation]: false,
    [Permissions.addParticipants]: false,
    [Permissions.removeParticipants]: false,
    [Permissions.changeParticipantRoles]: true,
    [Permissions.toggleEphemeralTimer]: false,
    [Permissions.toggleGuestsAndServices]: false,
    [Permissions.toggleReadReceipts]: false,
    [Permissions.deleteConversation]: false,
  },
};

export class ConversationRoleRepository {
  conversationRoles: Record<string, ConversationRoles>;
  teamRoles: ConversationRoles;
  isTeam: ko.Observable<boolean>;
  team: ko.Observable<TeamEntity>;
  selfUser: ko.Observable<User>;

  constructor(conversationRepository: ConversationRepository) {
    this.conversationRoles = {};
    this.teamRoles = [defaultAdmin, defaultMember];
    this.isTeam = conversationRepository.isTeam;
    this.team = conversationRepository.team;
    this.selfUser = conversationRepository.selfUser;
  }

  setTeamRoles = (newRoles: ConversationRoles) => {
    this.teamRoles = newRoles;
  };

  setConversationRoles = (conversation: Conversation, newRoles: ConversationRoles) => {
    this.conversationRoles[conversation.id] = newRoles;
  };

  getUserRole = (conversationEntity: Conversation, userEntity: User) => conversationEntity.roles[userEntity.id];

  isUserGroupAdmin = (conversationEntity: Conversation, userEntity: User) =>
    this.getUserRole(conversationEntity, userEntity) === DefaultRole.WIRE_ADMIN;

  isSelfGroupAdmin = (conversationEntity: Conversation) => this.isUserGroupAdmin(conversationEntity, this.selfUser());

  getConversationRoles = (conversation: Conversation): ConversationRoles => {
    if (this.isTeam() && this.team() && this.team().id === conversation.id) {
      return this.teamRoles;
    }
    return this.conversationRoles[conversation.id];
  };

  getUserPermissions = (conversation: Conversation, user: User) => {
    const conversationRoles = this.getConversationRoles(conversation);
    const userRole: string = this.getUserRole(conversation, user);
    return conversationRoles.find(({name}) => name === userRole) || defaultMember;
  };

  hasPermission = (conversation: Conversation, user: User, permissionName: Permissions) => {
    const userRole = this.getUserPermissions(conversation, user);
    return userRole.permissions[permissionName];
  };

  canRenameGroup = (conversation: Conversation, user: User = this.selfUser()) =>
    this.hasPermission(conversation, user, Permissions.renameConversation);

  canAddParticipant = (conversation: Conversation, user: User = this.selfUser()) =>
    this.hasPermission(conversation, user, Permissions.addParticipants);

  canRemoveParticipant = (conversation: Conversation, user: User = this.selfUser()) =>
    this.hasPermission(conversation, user, Permissions.removeParticipants);

  canLeaveGroup = (conversation: Conversation, user: User = this.selfUser()) =>
    this.hasPermission(conversation, user, Permissions.changeParticipantRoles);

  canToggleTimeout = (conversation: Conversation, user: User = this.selfUser()) =>
    this.hasPermission(conversation, user, Permissions.renameConversation);

  canToggleGuest = (conversation: Conversation, user: User = this.selfUser()) =>
    this.hasPermission(conversation, user, Permissions.toggleGuestsAndServices);

  canToggleReadReceipts = (conversation: Conversation, user: User = this.selfUser()) =>
    this.hasPermission(conversation, user, Permissions.toggleReadReceipts);

  canDeleteGroup = (conversation: Conversation, user: User = this.selfUser()) =>
    this.hasPermission(conversation, user, Permissions.deleteConversation);
}
