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
import {QualifiedId, User} from '@wireapp/api-client/src/user/';
import {Availability, GenericMessage} from '@wireapp/protocol-messaging';
import UUID from 'uuidjs';

import {AvailabilityType, BroadcastService} from '../broadcast/';
import {isQualifiedIdArray} from '../util/TypePredicateUtil';
import {ConnectionService} from '../connection';
import {ConnectionStatus} from '@wireapp/api-client/src/connection';
import {ConversationService} from '../conversation';
import {UserPreKeyBundleMap} from '@wireapp/api-client/src/user/';

export class UserService {
  private readonly apiClient: APIClient;
  private readonly broadcastService: BroadcastService;
  private readonly connectionService: ConnectionService;
  private readonly conversationService: ConversationService;

  constructor(
    apiClient: APIClient,
    broadcastService: BroadcastService,
    conversationService: ConversationService,
    connectionService: ConnectionService,
  ) {
    this.apiClient = apiClient;
    this.broadcastService = broadcastService;
    this.connectionService = connectionService;
    this.conversationService = conversationService;
  }

  public getUser(userId: string | QualifiedId): Promise<User> {
    return this.apiClient.api.user.getUser(userId as QualifiedId);
  }

  public async getUsers(userIds: string[] | QualifiedId[]): Promise<User[]> {
    if (!userIds.length) {
      return [];
    }
    return isQualifiedIdArray(userIds)
      ? this.apiClient.api.user.postListUsers({qualified_ids: userIds})
      : this.apiClient.api.user.getUsers({ids: userIds});
  }

  /**
   * Sends a availability update to members of the same team
   * @param teamId
   * @param type
   * @param options.sendAll=false will broadcast the message to all the members of the team (instead of just direct connections). Should be avoided in a big team
   * @param options.sendAsProtobuf=false
   */
  public async setAvailability(
    teamId: string,
    type: AvailabilityType,
    {sendAll = false, sendAsProtobuf = false} = {},
  ): Promise<void> {
    // Get pre-key bundles for members of your own team
    const preKeyBundlesFromTeam = await this.broadcastService.getPreKeyBundlesFromTeam(teamId, false, !sendAll);

    // Get pre-key bundles for all of your other 1:1 connections
    const connections = await this.connectionService.getConnections();
    const acceptedConnections = connections.filter(connection => connection.status === ConnectionStatus.ACCEPTED);
    const preKeyBundlePromises = acceptedConnections.map(connection => {
      const mappedConnection = {
        userId: connection.to,
        conversationId: connection.conversation,
      };
      return this.conversationService.getPreKeyBundleMap(mappedConnection.conversationId, [mappedConnection.userId]);
    });
    const preKeyBundlesFromConnections = await Promise.all(preKeyBundlePromises);

    // Merge pre-key bundles
    const allPreKeyBundles = preKeyBundlesFromConnections.reduce(
      (accumulator: UserPreKeyBundleMap, preKeyBundleMap: UserPreKeyBundleMap) => {
        return {
          ...accumulator,
          ...preKeyBundleMap,
        };
      },
      preKeyBundlesFromTeam,
    );

    const genericMessage = GenericMessage.create({
      availability: new Availability({type}),
      messageId: UUID.genV4().toString(),
    });

    // Broadcast availability status to your team members & external 1:1 connections
    await this.broadcastService.broadcastGenericMessage(genericMessage, allPreKeyBundles, sendAsProtobuf);
  }
}
