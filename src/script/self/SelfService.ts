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

import type {Consent, Self} from '@wireapp/api-client/src/self';
import type {UserUpdate} from '@wireapp/api-client/src/user';
import {container} from 'tsyringe';

import {APIClient} from '../service/APIClientSingleton';

export class SelfService {
  constructor(private readonly apiClient = container.resolve(APIClient)) {}

  deleteSelf(password?: string): Promise<void> {
    return this.apiClient.self.api.deleteSelf({password});
  }

  getSelf(): Promise<Self> {
    return this.apiClient.self.api.getSelf();
  }

  async getSelfConsent(): Promise<Consent[]> {
    return (await this.apiClient.self.api.getConsents()).results;
  }

  putSelf(selfData: UserUpdate): Promise<void> {
    return this.apiClient.self.api.putSelf(selfData);
  }

  putSelfConsent(type: number, value: number, source: string): Promise<void> {
    return this.apiClient.self.api.putConsent({source, type, value});
  }

  putSelfEmail(email: string): Promise<void> {
    return this.apiClient.self.api.putEmail({email});
  }

  putSelfHandle(handle: string): Promise<void> {
    return this.apiClient.self.api.putHandle({handle});
  }

  putSelfLocale(locale: string): Promise<void> {
    return this.apiClient.self.api.putLocale({locale});
  }

  putSelfPassword(newPassword: string, oldPassword?: string): Promise<void> {
    return this.apiClient.self.api.putPassword({new_password: newPassword, old_password: oldPassword});
  }

  putSelfPhone(phone: string): Promise<void> {
    return this.apiClient.self.api.putPhone({phone});
  }
}
