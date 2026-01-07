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

import {Self} from '@wireapp/api-client/lib/self/';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

import {APIClient} from '@wireapp/api-client';
import {LogFactory} from '@wireapp/commons';

export class SelfService {
  private readonly logger = LogFactory.getLogger('@wireapp/core/SelfService');

  constructor(private readonly apiClient: APIClient) {}

  public async checkUsername(username: string): Promise<boolean> {
    const [availableUsername] = await this.checkUsernames([username]);
    return !!availableUsername;
  }

  public checkUsernames(usernames: string[]): Promise<string[]> {
    return this.apiClient.api.user.postHandles({
      handles: usernames,
    });
  }

  public async getName(): Promise<string> {
    const {name} = await this.apiClient.api.self.getName();
    return name;
  }

  public async getSelf(): Promise<Self> {
    const selfData = await this.apiClient.api.self.getSelf();
    return selfData;
  }

  public async getUsername(): Promise<string | undefined> {
    const {handle} = await this.getSelf();
    return handle;
  }

  public setName(name: string): Promise<void> {
    return this.apiClient.api.self.putSelf({name});
  }

  public setUsername(username: string): Promise<void> {
    return this.apiClient.api.self.putHandle({handle: username});
  }

  /**
   * Update self user's list of supported-protocols
   * @param supportedProtocols The list of supported protocols
   */
  public async putSupportedProtocols(supportedProtocols: CONVERSATION_PROTOCOL[]) {
    if (!this.apiClient.backendFeatures.supportsMLS) {
      this.logger.warn('Self supported protocols were not updated, because endpoint is not supported by backend');
      return;
    }

    if (!supportedProtocols || supportedProtocols.length === 0) {
      throw new Error('Supported protocols must be a non-empty protocols list');
    }

    return this.apiClient.api.self.putSupportedProtocols(supportedProtocols);
  }
}
