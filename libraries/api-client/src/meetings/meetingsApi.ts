/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {Meeting} from './meeting';
import {MeetingEmailsInvitation} from './meetingEmailsInvitation';
import {NewMeeting} from './newMeeting';
import {UpdateMeeting} from './updateMeeting';

import {HttpClient} from '../http';
import {QualifiedId} from '../user/qualifiedId';

export class MeetingsAPI {
  constructor(private readonly client: HttpClient) {}

  public static readonly URL = {
    MEETINGS: '/meetings',
    LIST: '/meetings/list',
    INVITATIONS: 'invitations',
    INVITATIONS_DELETE: 'invitations/delete',
  } as const;

  private generateMeetingUrl(meetingId: QualifiedId): string {
    return `${MeetingsAPI.URL.MEETINGS}/${meetingId.domain}/${meetingId.id}`;
  }

  /**
   * Create a new meeting.
   */
  public async createMeeting(newMeeting: NewMeeting): Promise<Meeting> {
    const config: AxiosRequestConfig = {
      data: newMeeting,
      method: 'post',
      url: MeetingsAPI.URL.MEETINGS,
    };

    const response = await this.client.sendJSON<Meeting>(config);
    return response.data;
  }

  /**
   * List all meetings for the authenticated user.
   */
  public async getMeetingsList(): Promise<Meeting[]> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: MeetingsAPI.URL.LIST,
    };

    const response = await this.client.sendJSON<Meeting[]>(config);
    return response.data;
  }

  /**
   * Delete a meeting.
   */
  public async deleteMeeting(meetingId: QualifiedId): Promise<void> {
    const config: AxiosRequestConfig = {
      method: 'delete',
      url: this.generateMeetingUrl(meetingId),
    };

    await this.client.sendJSON<void>(config);
  }

  /**
   * Get a single meeting by ID.
   */
  public async getMeeting(meetingId: QualifiedId): Promise<Meeting> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: this.generateMeetingUrl(meetingId),
    };

    const response = await this.client.sendJSON<Meeting>(config);
    return response.data;
  }

  /**
   * Update an existing meeting.
   */
  public async updateMeeting(meetingId: QualifiedId, updateMeeting: UpdateMeeting): Promise<Meeting> {
    const config: AxiosRequestConfig = {
      data: updateMeeting,
      method: 'put',
      url: this.generateMeetingUrl(meetingId),
    };

    const response = await this.client.sendJSON<Meeting>(config);
    return response.data;
  }

  /**
   * Add emails to the invited emails of a meeting.
   */
  public async addMeetingInvitation(meetingId: QualifiedId, invitation: MeetingEmailsInvitation): Promise<void> {
    const config: AxiosRequestConfig = {
      data: invitation,
      method: 'post',
      url: `${this.generateMeetingUrl(meetingId)}/${MeetingsAPI.URL.INVITATIONS}`,
    };

    await this.client.sendJSON<void>(config);
  }

  /**
   * Remove emails from the invited emails of a meeting.
   */
  public async removeMeetingInvitation(meetingId: QualifiedId, invitation: MeetingEmailsInvitation): Promise<void> {
    const config: AxiosRequestConfig = {
      data: invitation,
      method: 'post',
      url: `${this.generateMeetingUrl(meetingId)}/${MeetingsAPI.URL.INVITATIONS_DELETE}`,
    };

    await this.client.sendJSON<void>(config);
  }
}
