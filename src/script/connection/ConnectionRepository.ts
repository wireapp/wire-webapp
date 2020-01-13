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

import {ConnectionStatus} from '@wireapp/api-client/dist/connection';
import {USER_EVENT, UserConnectionEvent} from '@wireapp/api-client/dist/event';
import {BackendEventType} from '@wireapp/api-client/dist/event/BackendEvent';
import {UserConnectionData} from '@wireapp/api-client/dist/user/data';
import {amplify} from 'amplify';
import ko from 'knockout';

import {Logger, getLogger} from 'Util/Logger';
import {koArrayPushAll} from 'Util/util';

import {Conversation} from '../entity/Conversation';
import {MemberMessage} from '../entity/message/MemberMessage';
import {User} from '../entity/User';
import {BaseError} from '../error/BaseError';
import {EventRepository} from '../event/EventRepository';
import {EventSource} from '../event/EventSource';
import {WebAppEvents} from '../event/WebApp';
import {SystemMessageType} from '../message/SystemMessageType';
import {BackendClient} from '../service/BackendClient';
import {UserRepository} from '../user/UserRepository';
import {ConnectionEntity} from './ConnectionEntity';
import {ConnectionMapper} from './ConnectionMapper';
import {ConnectionService} from './ConnectionService';

export class ConnectionRepository {
  private readonly connectionService: ConnectionService;
  private readonly userRepository: UserRepository;
  private readonly logger: Logger;
  private readonly connectionMapper: ConnectionMapper;
  public readonly connectionEntities: ko.ObservableArray<ConnectionEntity>;

  // tslint:disable-next-line:typedef
  static get CONFIG(): Record<string, BackendEventType[]> {
    return {
      SUPPORTED_EVENTS: [USER_EVENT.CONNECTION],
    };
  }

  constructor(backendClient: BackendClient, userRepository: UserRepository) {
    this.connectionService = new ConnectionService(backendClient);
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
   * @returns No return value
   */
  onUserEvent(eventJson: UserConnectionEvent, source: EventSource): void {
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
   * @returns No return value
   */
  onUserConnection(eventJson: UserConnectionData, source: EventSource, showConversation?: boolean): Promise<void> {
    if (!eventJson) {
      throw new window.z.error.ConnectionError(BaseError.TYPE.MISSING_PARAMETER);
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

    return this.updateConnection(connectionEntity).then(() => {
      const shouldUpdateUser = previousStatus === ConnectionStatus.SENT && connectionEntity.isConnected();
      if (shouldUpdateUser) {
        this.userRepository.updateUserById(connectionEntity.userId);
      }
      this._sendNotification(connectionEntity, source, previousStatus);
      amplify.publish(WebAppEvents.CONVERSATION.MAP_CONNECTION, connectionEntity, showConversation);
    });
  }

  /**
   * Accept a connection request.
   * @param userEntity User to update connection with
   * @param showConversation Show new conversation on success
   * @returns Promise that resolves when the connection request was accepted
   */
  acceptRequest(userEntity: User, showConversation: boolean = false): Promise<void> {
    return this._updateStatus(userEntity, ConnectionStatus.ACCEPTED, showConversation);
  }

  /**
   * Block a user.
   *
   * @param userEntity User to block
   * @param hideConversation Hide current conversation
   * @param nextConversationEntity Conversation to be switched to
   * @returns Promise that resolves when the user was blocked
   */
  blockUser(userEntity: User, hideConversation: boolean = false, nextConversationEntity: Conversation): Promise<void> {
    return this._updateStatus(userEntity, ConnectionStatus.BLOCKED).then(() => {
      if (hideConversation) {
        amplify.publish(WebAppEvents.CONVERSATION.SHOW, nextConversationEntity);
      }
    });
  }

  /**
   * Cancel a connection request.
   *
   * @param userEntity User to cancel the sent connection request
   * @param hideConversation Hide current conversation
   * @param nextConversationEntity Conversation to be switched to
   * @returns Promise that resolves when an outgoing connection request was cancelled
   */
  cancelRequest(
    userEntity: User,
    hideConversation: boolean = false,
    nextConversationEntity: Conversation,
  ): Promise<void> {
    return this._updateStatus(userEntity, ConnectionStatus.CANCELLED).then(() => {
      if (hideConversation) {
        amplify.publish(WebAppEvents.CONVERSATION.SHOW, nextConversationEntity);
      }
    });
  }

  /**
   * Create a connection request.
   *
   * @param userEntity User to connect to
   * @param showConversation Should we open the new conversation?
   * @returns Promise that resolves when the connection request was successfully created
   */
  createConnection(userEntity: User, showConversation: boolean = false): Promise<void> {
    return this.connectionService
      .postConnections(userEntity.id, userEntity.name())
      .then(response => {
        const connectionEvent = {connection: response, user: {name: userEntity.name()}};
        return this.onUserConnection(connectionEvent, EventRepository.SOURCE.INJECTED, showConversation);
      })
      .catch(error => {
        this.logger.error(`Failed to send connection request to user '${userEntity.id}': ${error.message}`, error);
      });
  }

  /**
   * Get a connection for a user ID.
   */
  getConnectionByUserId(userId: string): ConnectionEntity {
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
   * @param limit Query limit for user connections
   * @param userId User ID of the latest connection
   * @param connectionEntities Unordered array of user connections
   * @returns Promise that resolves when all connections have been retrieved and mapped
   */
  getConnections(
    limit: number = 500,
    userId?: string,
    connectionEntities: ConnectionEntity[] = [],
  ): Promise<ConnectionEntity[]> {
    return this.connectionService
      .getConnections(limit, userId)
      .then(response => {
        const {connections: connectionData, has_more: hasMore} = response;

        if (connectionData.length) {
          const newConnectionEntities = this.connectionMapper.mapConnectionsFromJson(connectionData);
          connectionEntities = connectionEntities.concat(newConnectionEntities);
        }

        if (hasMore) {
          const lastConnectionEntity = connectionEntities[connectionEntities.length - 1];
          return this.getConnections(limit, lastConnectionEntity.userId, connectionEntities);
        }

        return connectionEntities.length ? this.updateConnections(connectionEntities) : this.connectionEntities();
      })
      .catch(error => {
        this.logger.error(`Failed to retrieve connections from backend: ${error.message}`, error);
        throw error;
      });
  }

  /**
   * Ignore connection request.
   * @param userEntity User to ignore the connection request
   * @returns Promise that resolves when an incoming connection request was ignored
   */
  ignoreRequest(userEntity: User): Promise<void> {
    return this._updateStatus(userEntity, ConnectionStatus.IGNORED);
  }

  /**
   * Unblock a user.
   *
   * @param userEntity User to unblock
   * @param showConversation Show new conversation on success
   * @returns Promise that resolves when a user was unblocked
   */
  unblockUser(userEntity: User, showConversation = true): Promise<void> {
    return this._updateStatus(userEntity, ConnectionStatus.ACCEPTED, showConversation);
  }

  /**
   * Update user matching a given connection.
   * @returns Promise that resolves when the connection have been updated
   */
  updateConnection(connectionEntity: ConnectionEntity): Promise<ConnectionEntity> {
    return Promise.resolve()
      .then(() => {
        if (!connectionEntity) {
          throw new window.z.error.ConnectionError(BaseError.TYPE.MISSING_PARAMETER);
        }

        this.connectionEntities.push(connectionEntity);
        return this.userRepository.get_user_by_id(connectionEntity.userId);
      })
      .then(userEntity => userEntity.connection(connectionEntity));
  }

  /**
   * Update users matching the given connections.
   * @returns Promise that resolves when all connections have been updated
   */
  updateConnections(connectionEntities: ConnectionEntity[]): Promise<ConnectionEntity[]> {
    return Promise.resolve()
      .then(() => {
        if (!connectionEntities.length) {
          throw new window.z.error.ConnectionError(BaseError.TYPE.INVALID_PARAMETER);
        }

        koArrayPushAll(this.connectionEntities, connectionEntities);

        return this.userRepository.updateUsersFromConnections(connectionEntities);
      })
      .then(() => this.connectionEntities());
  }

  /**
   * Update the status of a connection.
   * @private
   * @param userEntity User to update connection with
   * @param connectionStatus Connection status
   * @param showConversation Show conversation on success
   * @returns Promise that resolves when the connection status was updated
   */
  _updateStatus(userEntity: User, connectionStatus: ConnectionStatus, showConversation = false): Promise<void> {
    if (!userEntity || !connectionStatus) {
      this.logger.error('Missing parameter to update connection');
      return Promise.reject(new z.error.ConnectionError(BaseError.TYPE.MISSING_PARAMETER));
    }

    const currentStatus = userEntity.connection().status();
    if (currentStatus === connectionStatus) {
      this.logger.error(`Connection status change to '${connectionStatus}' for '${userEntity.id}' is no change`);
      return Promise.reject(new z.error.ConnectionError(BaseError.TYPE.INVALID_PARAMETER));
    }

    return this.connectionService
      .putConnections(userEntity.id, connectionStatus)
      .then(response => {
        const connectionEvent = {connection: response, user: {name: userEntity.name()}};
        return this.onUserConnection(connectionEvent, EventRepository.SOURCE.INJECTED, showConversation);
      })
      .catch(error => {
        const logMessage = `Connection change from '${currentStatus}' to '${connectionStatus}' failed`;
        this.logger.error(`${logMessage} for '${userEntity.id}' failed: ${error.message}`, error);

        const customData = {
          currentStatus,
          newStatus: connectionStatus,
          serverError: error,
        };

        window.Raygun.send(new Error(logMessage), customData);
      });
  }

  /**
   * Send the user connection notification.
   *
   * @param connectionEntity Connection entity
   * @param source Source of event
   * @param previousStatus Previous connection status
   * @returns No return value
   */
  _sendNotification(connectionEntity: ConnectionEntity, source: EventSource, previousStatus: ConnectionStatus): void {
    // We accepted the connection request or unblocked the user
    const expectedPreviousStatus = [ConnectionStatus.BLOCKED, ConnectionStatus.PENDING];
    const wasExpectedPreviousStatus = expectedPreviousStatus.includes(previousStatus);
    const selfUserAccepted = connectionEntity.isConnected() && wasExpectedPreviousStatus;
    const isWebSocketEvent = source === EventRepository.SOURCE.WEB_SOCKET;

    const showNotification = isWebSocketEvent && !selfUserAccepted;
    if (showNotification) {
      this.userRepository.get_user_by_id(connectionEntity.userId).then(userEntity => {
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
