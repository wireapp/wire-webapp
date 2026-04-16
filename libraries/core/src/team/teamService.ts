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

import {
  FeatureList,
  MemberData,
  Members,
  NewTeamData,
  TeamChunkData,
  TeamData,
  UpdateTeamData,
} from '@wireapp/api-client/lib/team/';

import {APIClient} from '@wireapp/api-client';

export class TeamService {
  constructor(private readonly apiClient: APIClient) {}

  public addMember(teamId: string, memberData: MemberData): Promise<void> {
    return this.apiClient.api.teams.member.postMembers(teamId, memberData);
  }

  public createTeam(teamData: NewTeamData): Promise<void> {
    return this.apiClient.api.teams.team.postTeam(teamData);
  }

  public deleteTeam(teamId: string, password: string): Promise<void> {
    return this.apiClient.api.teams.team.deleteTeam(teamId, password);
  }

  public getAllMembers(teamId: string): Promise<Members> {
    return this.apiClient.api.teams.member.getAllMembers(teamId);
  }

  public getTeam(teamId: string): Promise<TeamData> {
    return this.apiClient.api.teams.team.getTeam(teamId);
  }

  public getTeams(): Promise<TeamChunkData> {
    return this.apiClient.api.teams.team.getTeams();
  }

  public removeMember(teamId: string, userId: string, password: string): Promise<void> {
    return this.apiClient.api.teams.member.deleteMember(teamId, userId, password);
  }

  public updateMember(teamId: string, memberData: MemberData): Promise<void> {
    return this.apiClient.api.teams.member.putMembers(teamId, memberData);
  }

  public updateTeam(teamId: string, teamData: UpdateTeamData): Promise<void> {
    return this.apiClient.api.teams.team.putTeam(teamId, teamData);
  }

  private commonConfig: FeatureList | null = null;
  private commonConfigFetchedAt: number | null = null;
  private readonly CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
  public async getCommonFeatureConfig() {
    const now = Date.now();

    if (
      this.commonConfig == null ||
      this.commonConfigFetchedAt == null ||
      now - this.commonConfigFetchedAt > this.CACHE_DURATION_MS
    ) {
      this.commonConfig = await this.apiClient.api.teams.feature.getAllFeatures();
      this.commonConfigFetchedAt = now;
    }

    return this.commonConfig;
  }
}
