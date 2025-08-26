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

import type {ConversationRolesList} from '@wireapp/api-client/lib/conversation/ConversationRole';
import type {FeatureList} from '@wireapp/api-client/lib/team/feature/';
import {FeatureStatus, FEATURE_KEY} from '@wireapp/api-client/lib/team/feature/';
import {TeamMigrationPayload} from '@wireapp/api-client/lib/team/invitation/TeamMigrationPayload';
import type {LegalHoldMemberData} from '@wireapp/api-client/lib/team/legalhold/';
import type {MemberData, Members} from '@wireapp/api-client/lib/team/member/';
import type {Services} from '@wireapp/api-client/lib/team/service/';
import type {TeamData} from '@wireapp/api-client/lib/team/team/';
import {container} from 'tsyringe';

import {APIClient} from '../../service/APIClientSingleton';

export class TeamService {
  constructor(private readonly apiClient = container.resolve(APIClient)) {}

  getTeamConversationRoles(teamId: string): Promise<ConversationRolesList> {
    return this.apiClient.api.teams.conversation.getRoles(teamId);
  }

  getTeamById(teamId: string): Promise<TeamData> {
    return this.apiClient.api.teams.team.getTeam(teamId);
  }

  getTeamMember(teamId: string, userId: string): Promise<MemberData> {
    return this.apiClient.api.teams.member.getMember(teamId, userId);
  }

  getLegalHoldState(teamId: string, userId: string): Promise<LegalHoldMemberData> {
    return this.apiClient.api.teams.legalhold.getMemberLegalHold(teamId, userId);
  }

  sendLegalHoldApproval(teamId: string, userId: string, password: string): Promise<void> {
    return this.apiClient.api.teams.legalhold.putMemberApproveLegalHold(teamId, userId, password);
  }

  getAllTeamMembers(teamId: string): Promise<Members> {
    return this.apiClient.api.teams.member.getAllMembers(teamId);
  }

  getTeamMembersByIds(teamId: string, userIds: string[]): Promise<MemberData[]> {
    return this.apiClient.api.teams.member.getMembers(teamId, {ids: userIds});
  }

  getWhitelistedServices(teamId: string): Promise<Services> {
    return this.apiClient.api.teams.service.getTeamServices(teamId);
  }

  async conversationHasGuestLink(conversationId: string): Promise<boolean> {
    const {status} = await this.apiClient.api.conversation.getConversationGuestLinkFeature(conversationId);
    return status === 'enabled';
  }

  async upgradePersonalToTeamUser(payload: TeamMigrationPayload) {
    return this.apiClient.api.teams.invitation.upgradePersonalToTeamUser(payload);
  }

  getAllTeamFeatures(): Promise<FeatureList> {
    return this.apiClient.api.teams.feature.getAllFeatures().catch(() => {
      // The following code enables all default features to ensure that modern webapps work with legacy backends (backends that don't provide a "feature-configs" endpoint)
      const defaultFeatures: FeatureList = {
        [FEATURE_KEY.APPLOCK]: {
          config: {
            enforceAppLock: false,
            inactivityTimeoutSecs: 60,
          },
          status: FeatureStatus.ENABLED,
        },
        [FEATURE_KEY.CLASSIFIED_DOMAINS]: {
          config: {
            domains: [],
          },
          status: FeatureStatus.DISABLED,
        },
        [FEATURE_KEY.CONFERENCE_CALLING]: {
          config: {useSFTForOneToOneCalls: false},
          status: FeatureStatus.ENABLED,
        },
        [FEATURE_KEY.DIGITAL_SIGNATURES]: {
          status: FeatureStatus.ENABLED,
        },
        [FEATURE_KEY.FILE_SHARING]: {
          status: FeatureStatus.ENABLED,
        },
        [FEATURE_KEY.LEGALHOLD]: {
          status: FeatureStatus.ENABLED,
        },
        [FEATURE_KEY.SEARCH_VISIBILITY]: {
          status: FeatureStatus.ENABLED,
        },
        [FEATURE_KEY.SSO]: {
          status: FeatureStatus.ENABLED,
        },
        [FEATURE_KEY.MLS]: undefined,
        [FEATURE_KEY.VALIDATE_SAML_EMAILS]: {
          status: FeatureStatus.ENABLED,
        },
        [FEATURE_KEY.VIDEO_CALLING]: {
          status: FeatureStatus.ENABLED,
        },
      };
      return defaultFeatures;
    });
  }
}
