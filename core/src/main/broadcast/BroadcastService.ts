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

import {APIClient} from '@wireapp/api-client';
import {NewOTRMessage, OTRRecipients} from '@wireapp/api-client/dist/conversation/';
import {UserPreKeyBundleMap} from '@wireapp/api-client/dist/user/';
import {GenericMessage} from '@wireapp/protocol-messaging';
import {ConversationService} from '../conversation/';
import {CryptographyService} from '../cryptography/';

export class BroadcastService {
  constructor(
    private readonly apiClient: APIClient,
    private readonly conversationService: ConversationService,
    private readonly cryptographyService: CryptographyService,
  ) {}

  private async getPreKeyBundle(teamId: string, skipOwnClients = false): Promise<UserPreKeyBundleMap> {
    const {members: teamMembers} = await this.apiClient.teams.member.api.getMembers(teamId);

    let members = teamMembers.map(member => ({id: member.user}));

    if (skipOwnClients) {
      const selfUser = await this.apiClient.self.api.getSelf();
      members = members.filter(member => member.id !== selfUser.id);
    }

    const preKeys = await Promise.all(members.map(member => this.apiClient.user.api.getUserPreKeys(member.id)));

    return preKeys.reduce((bundleMap: UserPreKeyBundleMap, bundle) => {
      bundleMap[bundle.user] = {};
      for (const client of bundle.clients) {
        bundleMap[bundle.user][client.client] = client.prekey;
      }
      return bundleMap;
    }, {});
  }

  public async broadcastGenericMessage(teamId: string, genericMessage: GenericMessage): Promise<void> {
    const plainTextArray = GenericMessage.encode(genericMessage).finish();
    const preKeyBundle = await this.getPreKeyBundle(teamId);
    const recipients = await this.cryptographyService.encrypt(plainTextArray, preKeyBundle);
    return this.sendOTRBroadcastMessage(this.apiClient.validatedClientId, recipients, plainTextArray);
  }

  private async sendOTRBroadcastMessage(
    sendingClientId: string,
    recipients: OTRRecipients,
    plainTextArray: Uint8Array,
    data?: any,
  ): Promise<void> {
    const message: NewOTRMessage = {
      data,
      recipients,
      sender: sendingClientId,
    };
    try {
      await this.apiClient.broadcast.api.postBroadcastMessage(sendingClientId, message);
    } catch (error) {
      const reEncryptedMessage = await this.conversationService.onClientMismatch(error, message, plainTextArray);
      await this.apiClient.broadcast.api.postBroadcastMessage(sendingClientId, reEncryptedMessage);
    }
  }
}
