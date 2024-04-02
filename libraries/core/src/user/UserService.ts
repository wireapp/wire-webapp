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

import {ConversationProtocol} from '@wireapp/api-client/lib/conversation';
import {QualifiedId, User} from '@wireapp/api-client/lib/user/';

import {APIClient} from '@wireapp/api-client';

export class UserService {
  private readonly apiClient: APIClient;

  constructor(apiClient: APIClient) {
    this.apiClient = apiClient;
  }

  public getUser(userId: string | QualifiedId): Promise<User> {
    return this.apiClient.api.user.getUser(userId as QualifiedId);
  }

  public async getUsers(userIds: QualifiedId[]) {
    if (!userIds.length) {
      return [];
    }
    return this.apiClient.api.user.postListUsers({qualified_ids: userIds});
  }

  /**
   * Get the list of other user's supported protocols.
   */
  public async getUserSupportedProtocols(userId: QualifiedId): Promise<ConversationProtocol[]> {
    // Clients that uses version below the one supporting MLS, are not aware of user's supported protocols, we default to Proteus in this case.
    if (!this.apiClient.backendFeatures.supportsMLS) {
      return [ConversationProtocol.PROTEUS];
    }

    const supportedProtocols = await this.apiClient.api.user.getUserSupportedProtocols(userId);
    return supportedProtocols.length > 0 ? supportedProtocols : [ConversationProtocol.PROTEUS];
  }
}
