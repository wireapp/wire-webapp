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

import {Logger, getLogger} from '../auth/LogProvider';
import BackendClient from '../service/BackendClient';
import {PhoneBook} from './PhoneBook';

class ConnectService {
  backendClient: BackendClient;
  logger: Logger;

  /**
   * Construct an new ConnectService.
   * @param backendClient Client for the API calls
   */
  constructor(backendClient: BackendClient) {
    this.backendClient = backendClient;
    this.logger = getLogger('ConnectService');
  }

  /**
   * Upload address book data for matching.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/addressbook/onboardingV3
   *
   * @param phoneBook Phone book containing the address cards
   * @returns Resolves with the matched contacts from the user's phone book
   */
  postOnboarding(phoneBook: PhoneBook): Promise<any> {
    return this.backendClient.sendJson({
      data: phoneBook,
      type: 'POST',
      url: '/onboarding/v3',
    });
  }
}

export {ConnectService};
