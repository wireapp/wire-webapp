/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import type {RichInfo} from '@wireapp/api-client/lib/user/';
import {container, singleton} from 'tsyringe';

import {APIClient} from '../../service/APIClientSingleton';

@singleton()
export class RichProfileRepository {
  constructor(private readonly apiClient = container.resolve(APIClient)) {}

  getUserRichProfile(userId: string): Promise<RichInfo> {
    return this.apiClient.api.user.getRichInfo(userId);
  }
}
