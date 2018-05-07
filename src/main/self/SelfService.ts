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

const logdown = require('logdown');
import APIClient = require('@wireapp/api-client');
import {Self} from '@wireapp/api-client/dist/commonjs/self/index';

export default class SelfService {
  constructor(private apiClient: APIClient) {}

  public async getName(): Promise<string> {
    const {name} = await this.apiClient.self.api.getName();
    return name;
  }

  public async getUserName(): Promise<string | undefined> {
    const {handle} = await this.apiClient.self.api.getSelf();
    return handle;
  }

  public getSelf(): Promise<Self> {
    return this.apiClient.self.api.getSelf();
  }

  public setName(name: string): Promise<{}> {
    return this.apiClient.self.api.putSelf({name});
  }

  public async setUserName(userName: string): Promise<{}> {
    const [availableHandle] = await this.apiClient.user.api.postHandles({
      handles: [userName],
    });

    if (availableHandle) {
      return this.apiClient.self.api.putHandle({handle: userName});
    }

    throw new Error(`Username "${userName}" is not available.`);
  }
}
