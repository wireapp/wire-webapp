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

import type {APIClient} from '@wireapp/api-client';
import {ClientMismatch} from '@wireapp/api-client/src/conversation';
import type {UserPreKeyBundleMap} from '@wireapp/api-client/src/user/';
import {GenericMessage} from '@wireapp/protocol-messaging';

import {MessageService} from '../conversation/message/MessageService';
import type {CryptographyService} from '../cryptography/';

export class BroadcastService {
  private readonly messageService: MessageService;

  constructor(private readonly apiClient: APIClient, private readonly cryptographyService: CryptographyService) {
    this.messageService = new MessageService(this.apiClient, this.cryptographyService);
  }

  public async getPreKeyBundlesFromTeam(teamId: string, skipOwnClients = false): Promise<UserPreKeyBundleMap> {
    const {members: teamMembers} = await this.apiClient.teams.member.api.getAllMembers(teamId);

    let members = teamMembers.map(member => ({id: member.user}));

    if (skipOwnClients) {
      const selfUser = await this.apiClient.self.api.getSelf();
      members = members.filter(member => member.id !== selfUser.id);
    }

    const preKeys = await Promise.all(members.map(member => this.apiClient.user.api.getUserPreKeys(member.id)));

    return preKeys.reduce<UserPreKeyBundleMap>((bundleMap, bundle) => {
      bundleMap[bundle.user] = {};
      for (const client of bundle.clients) {
        bundleMap[bundle.user][client.client] = client.prekey;
      }
      return bundleMap;
    }, {});
  }

  public async broadcastGenericMessage(
    genericMessage: GenericMessage,
    preKeyBundles: UserPreKeyBundleMap,
    sendAsProtobuf?: boolean,
  ): Promise<ClientMismatch> {
    const plainTextArray = GenericMessage.encode(genericMessage).finish();
    const recipients = await this.cryptographyService.encrypt(plainTextArray, preKeyBundles);

    return sendAsProtobuf
      ? this.messageService.sendOTRProtobufMessage(this.apiClient.validatedClientId, recipients, null, plainTextArray)
      : this.messageService.sendOTRMessage(this.apiClient.validatedClientId, recipients, null, plainTextArray);
  }
}
