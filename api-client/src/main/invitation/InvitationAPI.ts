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

import {AxiosRequestConfig} from 'axios';

import {HttpClient} from '../http';
import {Invitation, InvitationList, InvitationRequest} from '../invitation';

class InvitationAPI {
  constructor(private readonly client: HttpClient) {}

  static get URL() {
    return {
      INFO: 'info',
      INVITATIONS: '/invitations',
    };
  }

  /**
   * Delete a pending invitation by ID.
   * @param invitationId The invitation ID to delete
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/invitation_0
   */
  public async deleteInvitation(invitationId: string): Promise<void> {
    const config: AxiosRequestConfig = {
      method: 'delete',
      url: `${InvitationAPI.URL.INVITATIONS}/${invitationId}`,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Get a pending invitation by ID.
   * @param invitationId The invitation ID to get
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/invitation
   */
  public getInvitation(invitationId: string): Promise<Invitation> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${InvitationAPI.URL.INVITATIONS}/${invitationId}`,
    };

    return this.client.sendJSON<Invitation>(config).then(response => response.data);
  }

  /**
   * Get invitation info given a code.
   * @param invitationCode The code for the invitation
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/invitation_0_1
   */
  public getInvitationInfo(invitationCode: string): Promise<Invitation> {
    const config: AxiosRequestConfig = {
      method: 'get',
      params: {
        code: invitationCode,
      },
      url: `${InvitationAPI.URL.INVITATIONS}/${InvitationAPI.URL.INFO}`,
    };

    return this.client.sendJSON<Invitation>(config).then(response => response.data);
  }

  /**
   * List the sent invitations.
   * @param limit Number of results to return (default 100, max 500)
   * @param emailAddress Email address to start from (ascending)
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/invitations
   */
  public getInvitations(limit: number = 100, emailAddress?: string): Promise<InvitationList> {
    const config: AxiosRequestConfig = {
      data: {
        size: limit,
      },
      method: 'get',
      url: InvitationAPI.URL.INVITATIONS,
    };

    if (emailAddress) {
      config.data.start = emailAddress;
    }

    return this.client.sendJSON<InvitationList>(config).then(response => response.data);
  }

  /**
   * Create and send a new invitation.
   * Note: Invitations are sent by email.
   * @param invitationData The invitation to send
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/sendInvitation
   */
  public postInvitation(invitationData: InvitationRequest): Promise<Invitation> {
    const config: AxiosRequestConfig = {
      method: 'post',
      url: InvitationAPI.URL.INVITATIONS,
    };

    return this.client.sendJSON<Invitation>(config).then(response => response.data);
  }
}

export {InvitationAPI};
