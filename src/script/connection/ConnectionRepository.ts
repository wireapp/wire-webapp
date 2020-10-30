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

import {ConnectionStatus} from '@wireapp/api-client/src/connection';
import {USER_EVENT, UserConnectionEvent} from '@wireapp/api-client/src/event';
import type {BackendEventType} from '@wireapp/api-client/src/event/BackendEvent';
import type {UserConnectionData} from '@wireapp/api-client/src/user/data';
import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';
import ko from 'knockout';

import {Logger, getLogger} from 'Util/Logger';

import type {Conversation} from '../entity/Conversation';
import {MemberMessage} from '../entity/message/MemberMessage';
import type {User} from '../entity/User';
import {BaseError} from '../error/BaseError';
import {EventRepository} from '../event/EventRepository';
import type {EventSource} from '../event/EventSource';
import {SystemMessageType} from '../message/SystemMessageType';
import type {UserRepository} from '../user/UserRepository';
import type {ConnectionEntity} from './ConnectionEntity';
import {ConnectionMapper} from './ConnectionMapper';
import type {ConnectionService} from './ConnectionService';
import {ConnectionError} from '../error/ConnectionError';

export class ConnectionRepository {
  private readonly connectionService: ConnectionService;
  private readonly userRepository: UserRepository;
  private readonly logger: Logger;
  private readonly connectionMapper: ConnectionMapper;
  public readonly connectionEntities: ko.ObservableArray<ConnectionEntity>;

  static get CONFIG(): Record<string, BackendEventType[]> {
    return {
      SUPPORTED_EVENTS: [USER_EVENT.CONNECTION],
    };
  }

  constructor(connectionService: ConnectionService, userRepository: UserRepository) {
    this.connectionService = connectionService;
    this.userRepository = userRepository;

    this.logger = getLogger('ConnectionRepository');

    this.connectionMapper = new ConnectionMapper();
    this.connectionEntities = ko.observableArray([]);

    amplify.subscribe(WebAppEvents.USER.EVENT_FROM_BACKEND, this.onUserEvent.bind(this));
  }

  /**
   * Listener for incoming user events.
   *
   * @param eventJson JSON data for event
   * @param source Source of event
   */
  private onUserEvent(eventJson: UserConnectionEvent, source: EventSource): void {
    const eventType = eventJson.type;

    const isSupportedType = ConnectionRepository.CONFIG.SUPPORTED_EVENTS.includes(eventType);
    if (isSupportedType) {
      const logObject = {eventJson: JSON.stringify(eventJson), eventObject: eventJson};
      this.logger.info(`»» User Event: '${eventType}' (Source: ${source})`, logObject);

      const isUserConnection = eventType === USER_EVENT.CONNECTION;
      if (isUserConnection) {
        this.onUserConnection(eventJson, source);
      }
    }
  }

  /**
   * Convert a JSON event into an entity and get the matching conversation.
   *
   * @param eventJson JSON data of 'user.connection' event
   * @param source Source of event
   * @param showConversation Should the new conversation be opened?
   */
  private async onUserConnection(
    eventJson: UserConnectionData,
    source: EventSource,
    showConversation?: boolean,
  ): Promise<void> {
    if (!eventJson) {
      throw new ConnectionError(BaseError.TYPE.MISSING_PARAMETER, BaseError.MESSAGE.MISSING_PARAMETER);
    }

    const connectionData = eventJson.connection;

    let connectionEntity = this.getConnectionByUserId(connectionData.to);
    let previousStatus: ConnectionStatus = null;

    if (connectionEntity) {
      previousStatus = connectionEntity.status();
      this.connectionMapper.updateConnectionFromJson(connectionEntity, connectionData);
    } else {
      connectionEntity = this.connectionMapper.mapConnectionFromJson(connectionData);
    }

    await this.updateConnection(connectionEntity);
    const shouldUpdateUser = previousStatus === ConnectionStatus.SENT && connectionEntity.isConnected();
    if (shouldUpdateUser) {
      this.userRepository.updateUserById(connectionEntity.userId);
    }
    this.sendNotification(connectionEntity, source, previousStatus);
    amplify.publish(WebAppEvents.CONVERSATION.MAP_CONNECTION, connectionEntity, showConversation);
  }

  /**
   * Accept a connection request.
   * @param userEntity User to update connection with
   * @param showConversation Show new conversation on success
   * @returns Promise that resolves when the connection request was accepted
   */
  public acceptRequest(userEntity: User, showConversation: boolean = false): Promise<void> {
    return this.updateStatus(userEntity, ConnectionStatus.ACCEPTED, showConversation);
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
      amplify.publish(WebAppEvents.CONVERSATION.SHOW, nextConversationEntity);
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
    nextConversationEntity: Conversation,
  ): Promise<void> {
    await this.updateStatus(userEntity, ConnectionStatus.CANCELLED);
    if (hideConversation) {
      amplify.publish(WebAppEvents.CONVERSATION.SHOW, nextConversationEntity);
    }
  }

  /**
   * Create a connection request.
   *
   * @param userEntity User to connect to
   * @param showConversation Should we open the new conversation?
   * @returns Promise that resolves when the connection request was successfully created
   */
  public async createConnection(userEntity: User, showConversation: boolean = false): Promise<void> {
    try {
      const response = await this.connectionService.postConnections(userEntity.id, userEntity.name());
      const connectionEvent = {connection: response, user: {name: userEntity.name()}};
      return this.onUserConnection(connectionEvent, EventRepository.SOURCE.INJECTED, showConversation);
    } catch (error) {
      this.logger.error(`Failed to send connection request to user '${userEntity.id}': ${error.message}`, error);
    }
  }

  /**
   * Get a connection for a user ID.
   */
  private getConnectionByUserId(userId: string): ConnectionEntity {
    return this.connectionEntities().find(connectionEntity => connectionEntity.userId === userId);
  }

  /**
   * Get a connection for a conversation ID.
   * @param conversationId Conversation ID
   * @returns User connection entity
   */
  getConnectionByConversationId(conversationId: string): ConnectionEntity {
    return this.connectionEntities().find(connectionEntity => connectionEntity.conversationId === conversationId);
  }

  /**
   * Retrieve all connections from backend.
   *
   * @note Initially called by Wire for Web's app start to retrieve connections.
   *
   * @returns Promise that resolves when all connections have been retrieved and mapped
   */
  async getConnections(): Promise<ConnectionEntity[]> {
    try {
      const connectionData = await this.connectionService.getConnections();
      const newConnectionEntities = this.connectionMapper.mapConnectionsFromJson(connectionData);
      return newConnectionEntities.length ? this.updateConnections(newConnectionEntities) : this.connectionEntities();
    } catch (error) {
      this.logger.error(`Failed to retrieve connections from backend: ${error.message}`, error);
      throw error;
    }
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
   * @param showConversation Show new conversation on success
   * @returns Promise that resolves when a user was unblocked
   */
  public unblockUser(userEntity: User, showConversation = true): Promise<void> {
    return this.updateStatus(userEntity, ConnectionStatus.ACCEPTED, showConversation);
  }

  /**
   * Update user matching a given connection.
   * @returns Promise that resolves when the connection have been updated
   */
  private async updateConnection(connectionEntity: ConnectionEntity): Promise<ConnectionEntity> {
    if (!connectionEntity) {
      throw new ConnectionError(BaseError.TYPE.MISSING_PARAMETER, BaseError.MESSAGE.MISSING_PARAMETER);
    }
    this.connectionEntities.push(connectionEntity);
    const userEntity = await this.userRepository.getUserById(connectionEntity.userId);
    return userEntity.connection(connectionEntity);
  }

  /**
   * Update users matching the given connections.
   * @returns Promise that resolves when all connections have been updated
   */
  private async updateConnections(connectionEntities: ConnectionEntity[]): Promise<ConnectionEntity[]> {
    if (!connectionEntities.length) {
      throw new ConnectionError(BaseError.TYPE.INVALID_PARAMETER, BaseError.MESSAGE.INVALID_PARAMETER);
    }
    this.connectionEntities.push(...connectionEntities);
    await this.userRepository.updateUsersFromConnections(connectionEntities);
    return this.connectionEntities();
  }

  /**
   * Update the status of a connection.
   * @param userEntity User to update connection with
   * @param connectionStatus Connection status
   * @param showConversation Show conversation on success
   * @returns Promise that resolves when the connection status was updated
   */
  private async updateStatus(
    userEntity: User,
    connectionStatus: ConnectionStatus,
    showConversation = false,
  ): Promise<void> {
    if (!userEntity || !connectionStatus) {
      this.logger.error('Missing parameter to update connection');
      return Promise.reject(new ConnectionError(BaseError.TYPE.MISSING_PARAMETER, BaseError.MESSAGE.MISSING_PARAMETER));
    }

    const currentStatus = userEntity.connection().status();
    if (currentStatus === connectionStatus) {
      this.logger.error(`Connection status change to '${connectionStatus}' for '${userEntity.id}' is no change`);
      return Promise.reject(new ConnectionError(BaseError.TYPE.INVALID_PARAMETER, BaseError.MESSAGE.INVALID_PARAMETER));
    }

    try {
      const response = await this.connectionService.putConnections(userEntity.id, connectionStatus);
      const connectionEvent = {connection: response, user: {name: userEntity.name()}};
      return this.onUserConnection(connectionEvent, EventRepository.SOURCE.INJECTED, showConversation);
    } catch (error) {
      const logMessage = `Connection change from '${currentStatus}' to '${connectionStatus}' failed`;
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
  private sendNotification(
    connectionEntity: ConnectionEntity,
    source: EventSource,
    previousStatus: ConnectionStatus,
  ): void {
    // We accepted the connection request or unblocked the user
    const expectedPreviousStatus = [ConnectionStatus.BLOCKED, ConnectionStatus.PENDING];
    const wasExpectedPreviousStatus = expectedPreviousStatus.includes(previousStatus);
    const selfUserAccepted = connectionEntity.isConnected() && wasExpectedPreviousStatus;
    const isWebSocketEvent = source === EventRepository.SOURCE.WEB_SOCKET;

    const showNotification = isWebSocketEvent && !selfUserAccepted;
    if (showNotification) {
      this.userRepository.getUserById(connectionEntity.userId).then(userEntity => {
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
      });
    }
  }
}
