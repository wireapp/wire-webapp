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
import {User} from '@wireapp/api-client/dist/user/';
import {Availability, GenericMessage} from '@wireapp/protocol-messaging';
import {AvailabilityType, BroadcastService} from '../broadcast/';

const UUID = require('pure-uuid');

export class UserService {
  private readonly apiClient: APIClient;
  private readonly broadcastService: BroadcastService;

  constructor(apiClient: APIClient, broadcastService: BroadcastService) {
    this.apiClient = apiClient;
    this.broadcastService = broadcastService;
  }

  public async getUser(userId: string): Promise<User> {
    const users = await this.getUsers([userId]);
    return users[0];
  }

  public async getUsers(userIds: string[]): Promise<User[]> {
    return this.apiClient.user.api.getUsers({ids: userIds});
  }

  public setAvailability(teamId: string, type: AvailabilityType): Promise<void> {
    const genericMessage = GenericMessage.create({
      availability: new Availability({type}),
      messageId: new UUID(4).format(),
    });

    return this.broadcastService.broadcastGenericMessage(teamId, genericMessage);
  }
}
