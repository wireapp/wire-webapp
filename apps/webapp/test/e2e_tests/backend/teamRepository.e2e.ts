/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {BackendClientE2E} from './backendClient.e2e';

import {Service} from '../data/serviceInfo';
import {User} from '../data/user';
import {Role} from '@wireapp/api-client/lib/team';
import {faker} from '@faker-js/faker';

export class TeamRepositoryE2E extends BackendClientE2E {
  async inviteUserToTeam(emailOfInvitee: string, teamOwner: User, role: Role = Role.MEMBER): Promise<string> {
    const response = this.axiosInstance.post(
      `teams/${teamOwner.teamId}/invitations`,
      {
        inviterName: `${teamOwner.firstName} ${teamOwner.lastName}`,
        role,
        email: emailOfInvitee,
      },
      {
        headers: {
          Authorization: `Bearer ${teamOwner.token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return (await response).data.id;
  }

  async acceptTeamInvitation(teamInvitationCode: string, user: Pick<User, 'password' | 'token'>) {
    await this.axiosInstance.post(
      'teams/invitations/accept',
      {
        code: teamInvitationCode,
        password: user.password,
      },
      {
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  async addServiceToTeamWhitelist(teamId: string, service: Service, token: string) {
    await this.axiosInstance.post(
      `teams/${teamId}/services/whitelist`,
      {
        provider: service.providerId,
        id: service.serviceId,
        whitelisted: true,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  async deleteTeam(user: User, teamId: string) {
    await this.axiosInstance.request({
      url: `teams/${teamId}`,
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
      data: {
        password: user.password,
      },
    });
  }

  public async upgradeTeam(teamId: string, user: User) {
    const billingInfo = {
      firstname: user.firstName,
      lastname: user.lastName,
      company: faker.company.name(),
      street: '123 Test Street',
      zip: '12345',
      city: 'Berlin',
      country: 'DE',
    };

    for (let i = 0; i < 5; i++) {
      const res = await this.axiosInstance.put(`/teams/${teamId}/billing/info`, billingInfo, {
        headers: {Authorization: `Bearer ${user.token}`},
      });
      if (res.status !== 412) break;

      console.log(`Failed to upgrade team with id ${teamId}, retrying in ${3_000 * (i + 1)} seconds...`, res.data);
      await new Promise(res => setTimeout(res, 3_000 * (i + 1)));
    }

    await this.axiosInstance.put(
      `/teams/${teamId}/billing/card`,
      {
        // tok_visa is a pre-built test token provided by Stripe for test mode environments.
        // It represents the card number 4242424242424242 (Visa, always succeeds) without needing to go through the Stripe.js card tokenization flow.
        stripeToken: 'tok_visa',
      },
      {headers: {Authorization: `Bearer ${user.token}`}},
    );

    const plansResponse = await this.axiosInstance.get(`teams/${teamId}/billing/plan/list`, {
      headers: {Authorization: `Bearer ${user.token}`},
    });
    if (!Array.isArray(plansResponse.data) || plansResponse.data.length < 1) {
      throw new Error('No valid enterprise plans found to upgrade to');
    }

    const plan = plansResponse.data.find(plan => plan.premium === true);

    await this.axiosInstance.put(
      `/teams/${teamId}/billing/subscription`,
      {planId: plan.id},
      {headers: {Authorization: `Bearer ${user.token}`}},
    );

    const {data: upgradedTeam} = await this.axiosInstance.get(`teams/${teamId}/billing/team`, {
      headers: {Authorization: `Bearer ${user.token}`},
    });
    if (upgradedTeam.status !== 'active') {
      throw new Error('Failed to upgrade team');
    }
  }
}
