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

import {isNullOrUndefined} from '@sindresorhus/is';
import {container} from 'tsyringe';

import type {TraceState} from '../../apiClient/http/traceState';
import type {Consent} from '../../apiClient/self/consent';
import type {Self} from '../../apiClient/self/self';
import {CONVERSATION_PROTOCOL} from '../../apiClient/team/feature/featureList.types';
import type {UserUpdate} from '../../apiClient/user/userUpdate';
import type {SelfService as CoreSelfService} from '../../core/self';
import {APIClient} from '../../service/apiClientSingleton';
import {Core} from '../../service/coreSingleton';

export class SelfService {
  constructor(
    private readonly apiClient = container.resolve(APIClient),
    private readonly core = container.resolve(Core),
  ) {}

  private get coreSelfService(): CoreSelfService {
    const selfService = this.core.service?.self;
    if (isNullOrUndefined(selfService)) {
      throw new Error('Self service not available');
    }

    return selfService;
  }

  deleteSelf(password?: string): Promise<void> {
    return this.apiClient.api.self.deleteSelf({password});
  }

  getSelf(traceStates: TraceState[]): Promise<Self> {
    traceStates.push({position: 'SelfService.getSelf', vendor: 'webapp'});
    return this.apiClient.api.self.getSelf(traceStates);
  }

  async getSelfConsent(): Promise<Consent[]> {
    return (await this.apiClient.api.self.getConsents()).results;
  }

  putSelf(selfData: UserUpdate): Promise<void> {
    return this.apiClient.api.self.putSelf(selfData);
  }

  putSelfConsent(type: number, value: number, source: string): Promise<void> {
    return this.apiClient.api.self.putConsent({source, type, value});
  }

  putSelfEmail(email: string): Promise<void> {
    return this.apiClient.api.auth.putEmail({email});
  }

  putSelfHandle(handle: string): Promise<void> {
    return this.apiClient.api.self.putHandle({handle});
  }

  putSelfLocale(locale: string): Promise<void> {
    return this.apiClient.api.self.putLocale({locale});
  }

  putSelfPassword(newPassword: string, oldPassword?: string): Promise<void> {
    return this.apiClient.api.self.putPassword({new_password: newPassword, old_password: oldPassword});
  }

  public async putSupportedProtocols(supportedProtocols: CONVERSATION_PROTOCOL[]): Promise<void> {
    return this.coreSelfService.putSupportedProtocols(supportedProtocols);
  }
}
