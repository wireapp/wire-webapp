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

import {Consent} from '@wireapp/api-client/dist/self';
import {BackendClient} from '../service/BackendClient';

export class SelfService {
  private readonly backendClient: BackendClient;

  static get URL(): {SELF: string} {
    return {
      SELF: '/self',
    };
  }

  constructor(backendClient: BackendClient) {
    this.backendClient = backendClient;
  }

  deleteSelf(password?: string): Promise<void> {
    return this.backendClient.sendJson({
      data: {
        password: password,
      },
      type: 'DELETE',
      url: SelfService.URL.SELF,
    });
  }

  getSelf(): Promise<any> {
    return this.backendClient.sendRequest({
      type: 'GET',
      url: SelfService.URL.SELF,
    });
  }

  getSelfConsent(): Promise<Consent[]> {
    return this.backendClient
      .sendRequest({
        type: 'GET',
        url: `${SelfService.URL.SELF}/consent`,
      })
      .then(data => data.results);
  }

  putSelf(selfData: {}): Promise<void> {
    return this.backendClient.sendJson({
      data: selfData,
      type: 'PUT',
      url: SelfService.URL.SELF,
    });
  }

  putSelfConsent(consentType: number, value: number, source: string): Promise<void> {
    return this.backendClient.sendJson({
      data: {
        source: source,
        type: consentType,
        value: value,
      },
      type: 'PUT',
      url: `${SelfService.URL.SELF}/consent`,
    });
  }

  putSelfEmail(email: string): Promise<void> {
    return this.backendClient.sendJson({
      data: {
        email: email,
      },
      type: 'PUT',
      url: `${SelfService.URL.SELF}/email`,
    });
  }

  putSelfHandle(username: string): Promise<void> {
    return this.backendClient.sendJson({
      data: {
        handle: username,
      },
      type: 'PUT',
      url: `${SelfService.URL.SELF}/handle`,
    });
  }

  putSelfLocale(newLocale: string): Promise<void> {
    return this.backendClient.sendJson({
      data: {
        locale: newLocale,
      },
      type: 'PUT',
      url: `${SelfService.URL.SELF}/locale`,
    });
  }

  putSelfPassword(newPassword: string, oldPassword?: string): Promise<void> {
    return this.backendClient.sendJson({
      data: {
        new_password: newPassword,
        old_password: oldPassword,
      },
      type: 'PUT',
      url: `${SelfService.URL.SELF}/password`,
    });
  }

  putSelfPhone(phoneNumber: string): Promise<void> {
    return this.backendClient.sendJson({
      data: {
        phone: phoneNumber,
      },
      type: 'PUT',
      url: `${SelfService.URL.SELF}/phone`,
    });
  }
}
