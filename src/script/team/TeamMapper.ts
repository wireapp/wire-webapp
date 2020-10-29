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

import type {MemberData, TeamData} from '@wireapp/api-client/src/team/';
import type {TeamUpdateData} from '@wireapp/api-client/src/team/data';
import type {PermissionsData} from '@wireapp/api-client/src/team/member/PermissionsData';

import {Logger, getLogger} from 'Util/Logger';

import {roleFromTeamPermissions} from '../user/UserPermission';
import {TeamEntity} from './TeamEntity';
import {TeamMemberEntity} from './TeamMemberEntity';
import type {User} from '../entity/User';

export class TeamMapper {
  private readonly logger: Logger;

  constructor() {
    this.logger = getLogger('TeamMapper');
  }

  mapTeamFromObject(data: TeamData, teamEntity?: TeamEntity): TeamEntity {
    return this.updateTeamFromObject(data, teamEntity);
  }

  updateTeamFromObject(): void;
  updateTeamFromObject(teamData: TeamData | TeamUpdateData, teamEntity?: TeamEntity): TeamEntity;
  updateTeamFromObject(teamData?: TeamData | TeamUpdateData, teamEntity = new TeamEntity()): TeamEntity | void {
    if (teamData) {
      const {icon, icon_key: iconKey, name} = teamData;

      if ('creator' in teamData) {
        teamEntity.creator = teamData.creator;
      }

      if (icon) {
        teamEntity.icon = icon;
      }

      if (iconKey) {
        teamEntity.iconKey = iconKey;
      }

      if ('id' in teamData) {
        teamEntity.id = teamData.id;
      }

      if (name) {
        teamEntity.name(name);
      }

      return teamEntity;
    }
  }

  mapMemberFromArray(membersData: MemberData[]): TeamMemberEntity[] {
    return membersData.map(data => this.updateMemberFromObject(data));
  }

  mapMemberFromObject(data: MemberData): TeamMemberEntity {
    return this.updateMemberFromObject(data);
  }

  mapRole(userEntity: User, permissions?: PermissionsData): void {
    if (permissions) {
      const teamRole = roleFromTeamPermissions(permissions);
      this.logger.info(`Identified user '${userEntity.id}' as '${teamRole}'`, permissions);
      userEntity.teamRole(teamRole);
    }
  }

  updateMemberFromObject(): void;
  updateMemberFromObject(memberData: MemberData, memberEntity?: TeamMemberEntity): TeamMemberEntity;
  updateMemberFromObject(memberData?: MemberData, memberEntity = new TeamMemberEntity()): TeamMemberEntity | void {
    if (memberData) {
      const {created_by, permissions, user, legalhold_status} = memberData;
      if (created_by) {
        memberEntity.invitedBy = created_by;
      }
      if (permissions) {
        memberEntity.permissions = permissions;
      }
      if (legalhold_status) {
        memberEntity.legalholdStatus = legalhold_status;
      }
      if (user) {
        memberEntity.userId = user;
      }

      return memberEntity;
    }
  }
}
