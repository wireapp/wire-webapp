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

import {ConnectionStatus} from '@wireapp/api-client/lib/connection/';
import {UserConnectionEvent, USER_EVENT} from '@wireapp/api-client/lib/event/';
import type {BackendEventType} from '@wireapp/api-client/lib/event/BackendEvent';
import {BackendErrorLabel} from '@wireapp/api-client/lib/http/';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import type {UserConnectionData} from '@wireapp/api-client/lib/user/data/';
import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {WebAppEvents} from '@wireapp/webapp-events';

import {replaceLink, t} from 'Util/LocalizerUtil';
import {getLogger, Logger} from 'Util/Logger';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {isBackendError} from 'Util/TypePredicateUtil';

import type {ConnectionEntity} from './ConnectionEntity';
import {ConnectionMapper} from './ConnectionMapper';
import type {ConnectionService} from './ConnectionService';
import {ConnectionState} from './ConnectionState';

import {PrimaryModal} from '../components/Modals/PrimaryModal';
import {Config} from '../Config';
import type {Conversation} from '../entity/Conversation';
import {MemberMessage} from '../entity/message/MemberMessage';
import type {User} from '../entity/User';
import {EventRepository} from '../event/EventRepository';
import type {EventSource} from '../event/EventSource';
import {SystemMessageType} from '../message/SystemMessageType';
import type {UserRepository} from '../user/UserRepository';

export class ConnectionRepository {
  private readonly connectionService: ConnectionService;
  private readonly userRepository: UserRepository;
  private readonly logger: Logger;

  static get CONFIG(): Record<string, BackendEventType[]> {
    return {
      SUPPORTED_EVENTS: [USER_EVENT.CONNECTION],
    };
  }

  constructor(
    connectionService: ConnectionService,
    userRepository: UserRepository,
    private readonly connectionState = container.resolve(ConnectionState),
  ) {
    this.connectionService = connectionService;
    this.userRepository = userRepository;

    this.logger = getLogger('ConnectionRepository');

    amplify.subscribe(WebAppEvents.USER.EVENT_FROM_BACKEND, this.onUserEvent);
  }

  /**
   * Listener for incoming user events.
   *
   * @param eventJson JSON data for event
   * @param source Source of event
   */
  private readonly onUserEvent = async (eventJson: UserConnectionEvent, source: EventSource) => {
    const eventType = eventJson.type;

    const isSupportedType = ConnectionRepository.CONFIG.SUPPORTED_EVENTS.includes(eventType);
    if (isSupportedType) {
      this.logger.info(`User Event: '${eventType}' (Source: ${source})`);

      const isUserConnection = eventType === USER_EVENT.CONNECTION;
      if (isUserConnection) {
        await this.onUserConnection(eventJson, source);
      }
    }
  };

  /**
   * Convert a JSON event into an entity and get the matching conversation.
   *
   * @param eventJson JSON data of 'user.connection' event
   * @param source Source of event
   */
  private async onUserConnection(eventJson: UserConnectionData, source: EventSource): Promise<void> {
    const connectionData = eventJson.connection;

    // Try to find existing connection
    let connectionEntity = this.getConnectionByUserId(
      connectionData.qualified_to || {domain: '', id: connectionData.to},
    );
    const previousStatus = connectionEntity?.status();

    // Update connection status
    if (connectionEntity) {
      ConnectionMapper.updateConnectionFromJson(connectionEntity, connectionData);
    } else {
      // Create new connection if there was no connection before
      connectionEntity = ConnectionMapper.mapConnectionFromJson(connectionData);
    }

    // Attach connection to user
    await this.attachConnectionToUser(connectionEntity);

    // Update info about user when connection gets accepted
    const shouldUpdateUser = previousStatus === ConnectionStatus.SENT && connectionEntity.isConnected();
    if (shouldUpdateUser) {
      await this.userRepository.refreshUser(connectionEntity.userId);
      // Get conversation related to connection and set its type to 1:1
      // This case is important when the 'user.connection' event arrives after the 'conversation.member-join' event: https://wearezeta.atlassian.net/browse/SQCORE-348
      amplify.publish(WebAppEvents.CONVERSATION.MAP_CONNECTION, connectionEntity);
    }

    await this.sendNotification(connectionEntity, source, previousStatus);
  }

  /**
   * Accept a connection request.
   * @param userEntity User to update connection with
   * @returns Promise that resolves when the connection request was accepted
   */
  public acceptRequest(userEntity: User): Promise<void> {
    return this.updateStatus(userEntity, ConnectionStatus.ACCEPTED);
  }

  /**
   * Block a user.
   *
   * @param userEntity User to block
   * @param hideConversation Hide current conversation
   * @param nextConversationEntity Conversation to be switched to
   * @returns Promise that resolves when the user was blocked
   */
  public async blockUser(
    userEntity: User,
    hideConversation: boolean = false,
    nextConversationEntity?: Conversation,
  ): Promise<void> {
    await this.updateStatus(userEntity, ConnectionStatus.BLOCKED);
    if (hideConversation) {
      amplify.publish(WebAppEvents.CONVERSATION.SHOW, nextConversationEntity, {});
    }
  }

  /**
   * Cancel a connection request.
   *
   * @param userEntity User to cancel the sent connection request
   * @param hideConversation Hide current conversation
   * @param nextConversationEntity Conversation to be switched to
   * @returns Promise that resolves when an outgoing connection request was cancelled
   */
  public async cancelRequest(
    userEntity: User,
    hideConversation: boolean = false,
    nextConversationEntity?: Conversation,
  ): Promise<void> {
    await this.updateStatus(userEntity, ConnectionStatus.CANCELLED);
    if (hideConversation) {
      amplify.publish(WebAppEvents.CONVERSATION.SHOW, nextConversationEntity, {});
    }
  }

  /**
   * Create a connection request.
   *
   * @param userEntity User to connect to
   * @returns Promise that resolves to true if the request was successfully sent, false if not
   */
  public async createConnection(userEntity: User): Promise<boolean> {
    try {
      const response = await this.connectionService.postConnections(userEntity.qualifiedId);
      const connectionEvent = {connection: response, user: {name: userEntity.name()}};
      await this.onUserConnection(connectionEvent, EventRepository.SOURCE.INJECTED);
      return true;
    } catch (error) {
      if (isBackendError(error)) {
        if (error.label === BackendErrorLabel.LEGAL_HOLD_MISSING_CONSENT) {
          const replaceLinkLegalHold = replaceLink(
            Config.getConfig().URL.SUPPORT.LEGAL_HOLD_BLOCK,
            '',
            'read-more-legal-hold',
          );
          PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
            text: {
              htmlMessage: t('modalUserCannotConnectLegalHoldMessage', {}, replaceLinkLegalHold),
              title: t('modalUserCannotConnectLegalHoldHeadline'),
            },
          });
        }
        if (error.label === BackendErrorLabel.FEDERATION_NOT_ALLOWED) {
          PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
            text: {
              htmlMessage: t('modalUserCannotConnectNotFederatingMessage', userEntity.name()),
              title: t('modalUserCannotConnectNotFederatingHeadline'),
            },
          });
        }
        this.logger.error(`Failed to send connection request to user '${userEntity.id}': ${error.message}`, error);
        return false;
      }
      throw error;
    }
  }

  /**
   * Get a connection for a user ID.
   */
  private getConnectionByUserId(userId: QualifiedId): ConnectionEntity | undefined {
    return this.connectionState.connections().find(connection => matchQualifiedIds(connection.userId, userId));
  }

  /**
   * Get a connection for a conversation ID.
   * @param conversationId Conversation ID
   * @returns User connection entity
   */
  getConnectionByConversationId(conversationId: QualifiedId): ConnectionEntity | undefined {
    const connectionEntities = Object.values(this.connectionState.connections());
    return connectionEntities.find(connectionEntity =>
      matchQualifiedIds(connectionEntity.conversationId, conversationId),
    );
  }

  /**
   * Retrieve all connections from backend.
   *
   * @note Initially called by Wire for Web's app start to retrieve connections.
   *
   * @returns Promise that resolves when all connections have been retrieved and mapped
   */
  async getConnections(): Promise<ConnectionEntity[]> {
    const connectionData = await this.connectionService.getConnections();
    const connections = ConnectionMapper.mapConnectionsFromJson(connectionData);

    this.connectionState.connections(connections);
    return connections;
  }

  /**
   * Ignore connection request.
   * @param userEntity User to ignore the connection request
   * @returns Promise that resolves when an incoming connection request was ignored
   */
  public ignoreRequest(userEntity: User): Promise<void> {
    return this.updateStatus(userEntity, ConnectionStatus.IGNORED);
  }

  /**
   * Unblock a user.
   *
   * @param userEntity User to unblock
   * @returns Promise that resolves when a user was unblocked
   */
  public unblockUser(userEntity: User): Promise<void> {
    return this.updateStatus(userEntity, ConnectionStatus.ACCEPTED);
  }

  addConnectionEntity(connection: ConnectionEntity): void {
    this.connectionState.connections().push(connection);
  }

  /**
   * Attach a connection to a user and cache that information in the connection state.
   * @returns Promise that resolves when the connection has been updated
   */
  private async attachConnectionToUser(connectionEntity: ConnectionEntity): Promise<ConnectionEntity> {
    this.addConnectionEntity(connectionEntity);
    // TODO(Federation): Update code once connections are implemented on the backend
    const userEntity = await this.userRepository.getUserById(connectionEntity.userId);
    return userEntity.connection(connectionEntity);
  }

  /**
   * Update the status of a connection.
   * @param userEntity User to update connection with
   * @param newStatus Connection status
   * @returns Promise that resolves when the connection status was updated
   */
  private async updateStatus(userEntity: User, newStatus: ConnectionStatus): Promise<void> {
    const currentStatus = userEntity.connection().status();
    try {
      const response = await this.connectionService.putConnections(userEntity.qualifiedId, newStatus);
      const connectionEvent = {connection: response, user: {name: userEntity.name()}};
      await this.onUserConnection(connectionEvent, EventRepository.SOURCE.INJECTED);
    } catch (error) {
      const logMessage = `Connection change from '${currentStatus}' to '${newStatus}' failed`;
      this.logger.error(`${logMessage} for '${userEntity.id}' failed: ${error.message}`, error);
    }
  }

  /**
   * Send the user connection notification.
   *
   * @param connectionEntity Connection entity
   * @param source Source of event
   * @param previousStatus Previous connection status
   */
  private async sendNotification(
    connectionEntity: ConnectionEntity,
    source: EventSource,
    previousStatus: ConnectionStatus,
  ): Promise<void> {
    // We accepted the connection request or unblocked the user
    const expectedPreviousStatus = [
      ConnectionStatus.MISSING_LEGAL_HOLD_CONSENT,
      ConnectionStatus.BLOCKED,
      ConnectionStatus.PENDING,
    ];
    const wasExpectedPreviousStatus = expectedPreviousStatus.includes(previousStatus);
    const selfUserAccepted = connectionEntity.isConnected() && wasExpectedPreviousStatus;
    const isWebSocketEvent = source === EventRepository.SOURCE.WEB_SOCKET;

    const showNotification = isWebSocketEvent && !selfUserAccepted;
    if (showNotification) {
      // TODO(Federation): Update code once connections are implemented on the backend
      const userEntity = await this.userRepository.getUserById(connectionEntity.userId);
      const messageEntity = new MemberMessage();
      messageEntity.user(userEntity);

      if (connectionEntity.isConnected()) {
        const statusWasSent = previousStatus === ConnectionStatus.SENT;
        messageEntity.memberMessageType = statusWasSent
          ? SystemMessageType.CONNECTION_ACCEPTED
          : SystemMessageType.CONNECTION_CONNECTED;
      } else if (connectionEntity.isIncomingRequest()) {
        messageEntity.memberMessageType = SystemMessageType.CONNECTION_REQUEST;
      }

      amplify.publish(WebAppEvents.NOTIFICATION.NOTIFY, messageEntity, connectionEntity);
    }
  }
}
