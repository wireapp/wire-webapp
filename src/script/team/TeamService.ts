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

import {APIClient} from '@wireapp/api-client';
import {LegalHoldMemberData} from '@wireapp/api-client/dist/team/legalhold/';
import {MemberData, Members} from '@wireapp/api-client/dist/team/member/';
import {Services} from '@wireapp/api-client/dist/team/service/';
import {TeamChunkData, TeamData} from '@wireapp/api-client/dist/team/team/';

export class TeamService {
  private readonly apiClient: APIClient;

  constructor(apiClient: APIClient) {
    this.apiClient = apiClient;
  }

  getTeamConversationRoles(teamId: string): Promise<any> {
    return this.apiClient.teams.conversation.api.getRoles(teamId);
  }

  getTeamById(teamId: string): Promise<TeamData> {
    return this.apiClient.teams.team.api.getTeam(teamId);
  }

  getTeamMember(teamId: string, userId: string): Promise<MemberData> {
    return this.apiClient.teams.member.api.getMember(teamId, userId);
  }

  getLegalHoldState(teamId: string, userId: string): Promise<LegalHoldMemberData> {
    return this.apiClient.teams.legalhold.api.getMemberLegalHold(teamId, userId);
  }

  sendLegalHoldApproval(teamId: string, userId: string, password: string): Promise<void> {
    return this.apiClient.teams.legalhold.api.putMemberApproveLegalHold(teamId, userId, password);
  }

  getTeamMembers(teamId: string): Promise<Members> {
    return this.apiClient.teams.member.api.getMembers(teamId);
  }

  getTeams(): Promise<TeamChunkData> {
    return this.apiClient.teams.team.api.getTeams();
  }

  getWhitelistedServices(teamId: string): Promise<Services> {
    return this.apiClient.teams.service.api.getTeamServices(teamId);
  }
}
