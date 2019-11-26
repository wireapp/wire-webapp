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

import {BackendClient} from '../service/BackendClient';
import {Logger, getLogger} from '../util/Logger';

export class RichProfileRepository {
  readonly logger: Logger;
  private readonly backendClient: BackendClient;

  // tslint:disable-next-line:typedef
  static get URL() {
    return {
      RICH_INFO: '/users/:id/rich-info',
    };
  }

  constructor(backendClient: BackendClient) {
    this.backendClient = backendClient;
    this.logger = getLogger('RichProfileRepository');
  }

  getUserRichProfile(userId: string): Promise<any> {
    return this.backendClient.sendRequest({
      type: 'GET',
      url: RichProfileRepository.URL.RICH_INFO.replace(':id', userId),
    });
  }
}
