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

import {Connection, ConnectionStatus} from '@wireapp/api-client/lib/connection/';
import {UserConnectionEvent, USER_EVENT, UserEvent} from '@wireapp/api-client/lib/event/';
import {BackendErrorLabel} from '@wireapp/api-client/lib/http/';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import type {UserConnectionData, UserUpdateData} from '@wireapp/api-client/lib/user/data/';
import {amplify} from 'amplify';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import type {Conversation} from 'Repositories/entity/Conversation';
import {MemberMessage} from 'Repositories/entity/message/MemberMessage';
import type {User} from 'Repositories/entity/User';
import {EventRepository} from 'Repositories/event/EventRepository';
import type {EventSource} from 'Repositories/event/EventSource';
import {SelfService} from 'Repositories/self/SelfService';
import {TeamService} from 'Repositories/team/TeamService';
import type {UserRepository} from 'Repositories/user/UserRepository';
import {UserState} from 'Repositories/user/UserState';
import {container} from 'tsyringe';
import {replaceLink, t} from 'Util/LocalizerUtil';
import {getLogger, Logger} from 'Util/Logger';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {isBackendError} from 'Util/TypePredicateUtil';

import {WebAppEvents} from '@wireapp/webapp-events';

import type {ConnectionEntity} from './ConnectionEntity';
import {ConnectionMapper} from './ConnectionMapper';
import type {ConnectionService} from './ConnectionService';
import {ConnectionState} from './ConnectionState';

import {Config} from '../../Config';
import {SystemMessageType} from '../../message/SystemMessageType';

export class ConnectionRepository {
  private readonly connectionService: ConnectionService;
  private readonly userRepository: UserRepository;
  private readonly logger: Logger;
  private onDeleteConnectionRequestConversation?: (userId: QualifiedId) => Promise<void>;

  constructor(
    connectionService: ConnectionService,
    userRepository: UserRepository,
    private readonly selfService: SelfService,
    private readonly teamService: TeamService,
    private readonly connectionState = container.resolve(ConnectionState),
    private readonly userState = container.resolve(UserState),
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
  private readonly onUserEvent = async (eventJson: UserEvent, source: EventSource) => {
    const eventType = eventJson.type;

    switch (eventType) {
      case USER_EVENT.CONNECTION:
        await this.onUserConnection(eventJson as UserConnectionEvent, source);
        break;
      case USER_EVENT.UPDATE:
        await this.onUserUpdate(eventJson);
        break;
    }
  };

  private async onUserUpdate(eventJson: UserUpdateData) {
    if (eventJson.user.id === this.userState.self()?.qualifiedId.id) {
      await this.deletePendingConnectionsToSelfNewTeamMembers();
      return;
    }
    await this.deletePendingConnectionToNewTeamMember(eventJson);
  }

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

    const user = await this.userRepository.getUserById(connectionEntity.userId);
    // If this is the connection request, but the user does not exist anymore, no need to attach a connection to a user or a conversation
    if (user?.isDeleted && connectionEntity.status() === ConnectionStatus.SENT) {
      return;
    }

    // Attach connection to user
    await this.attachConnectionToUser(connectionEntity);

    // Update info about user when connection gets accepted
    const wasConnectionAccepted = previousStatus === ConnectionStatus.SENT && connectionEntity.isConnected();
    if (wasConnectionAccepted) {
      await this.userRepository.refreshUser(connectionEntity.userId);
    }

    const isConnectionSent = connectionEntity.isOutgoingRequest();
    if (isConnectionSent || wasConnectionAccepted) {
      // Get conversation related to connection and set its type to 1:1
      // This case is important when the 'user.connection' event arrives after the 'conversation.member-join' event: https://wearezeta.atlassian.net/browse/SQCORE-348
      amplify.publish(WebAppEvents.CONVERSATION.MAP_CONNECTION, connectionEntity, source);
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
  public async blockUser(userEntity: User): Promise<void> {
    await this.updateStatus(userEntity, ConnectionStatus.BLOCKED);
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
  public async createConnection(
    userEntity: User,
  ): Promise<{connectionStatus: ConnectionStatus; conversationId: QualifiedId} | null> {
    try {
      const response = await this.connectionService.postConnections(userEntity.qualifiedId);
      const connectionEvent = {connection: response, user: {name: userEntity.name()}};
      await this.onUserConnection(connectionEvent, EventRepository.SOURCE.INJECTED);
      return {
        connectionStatus: response.status,
        conversationId: response.qualified_conversation || {id: response.conversation, domain: ''},
      };
    } catch (error) {
      if (isBackendError(error)) {
        switch (error.label) {
          case BackendErrorLabel.LEGAL_HOLD_MISSING_CONSENT: {
            const replaceLinkLegalHold = replaceLink(
              Config.getConfig().URL.SUPPORT.LEGAL_HOLD_BLOCK,
              '',
              'read-more-legal-hold',
            );
            PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
              text: {
                htmlMessage: t('modalUserCannotSendConnectionLegalHoldMessage', undefined, replaceLinkLegalHold),
                title: t('modalUserCannotConnectHeadline'),
              },
            });
            break;
          }

          case BackendErrorLabel.FEDERATION_NOT_ALLOWED: {
            PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
              text: {
                htmlMessage: t('modalUserCannotSendConnectionNotFederatingMessage', {username: userEntity.name()}),
                title: t('modalUserCannotConnectHeadline'),
              },
            });
            break;
          }

          default: {
            this.logger.error(`Failed to send connection request to user '${userEntity.id}': ${error.message}`, error);
            PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
              text: {
                htmlMessage: t('modalUserCannotSendConnectionMessage'),
                title: t('modalUserCannotConnectHeadline'),
              },
            });
            break;
          }
        }
        return null;
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
  async getConnections(
    teamMembers: QualifiedId[],
  ): Promise<{connections: ConnectionEntity[]; deadConnections: ConnectionEntity[]}> {
    const connectionData = await this.connectionService.getConnections();

    const acceptedConnectionsOrNoneTeamMembersConnections: Connection[] = [];
    const deadConnections: Connection[] = [];

    connectionData.forEach(connection => {
      const isTeamMember = teamMembers.some(teamMemberQualifiedId =>
        matchQualifiedIds(connection.qualified_to, teamMemberQualifiedId),
      );

      if (!isTeamMember || connection.status === ConnectionStatus.ACCEPTED) {
        acceptedConnectionsOrNoneTeamMembersConnections.push(connection);
      }

      if (isTeamMember && connection.status !== ConnectionStatus.ACCEPTED) {
        deadConnections.push(connection);
      }
    });

    const connections = ConnectionMapper.mapConnectionsFromJson(acceptedConnectionsOrNoneTeamMembersConnections);
    const deadConnectionEntities = ConnectionMapper.mapConnectionsFromJson(deadConnections);

    this.connectionState.connections(connections);
    this.connectionState.deadConnections(deadConnectionEntities);
    return {connections, deadConnections: deadConnectionEntities};
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
    const currentStatus = userEntity.connection()?.status();
    try {
      const response = await this.connectionService.putConnections(userEntity.qualifiedId, newStatus);
      const connectionEvent = {connection: response, user: {name: userEntity.name()}};
      await this.onUserConnection(connectionEvent, EventRepository.SOURCE.INJECTED);
    } catch (error) {
      const logMessage = `Connection change from '${currentStatus}' to '${newStatus}' failed`;
      this.logger.error(`${logMessage} for '${userEntity.id}' failed: ${error.message}`, error);
      switch (newStatus) {
        case ConnectionStatus.ACCEPTED: {
          PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
            text: {
              htmlMessage: t('modalUserCannotAcceptConnectionMessage'),
              title: t('modalUserCannotConnectHeadline'),
            },
          });
          break;
        }
        case ConnectionStatus.CANCELLED: {
          PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
            text: {
              htmlMessage: t('modalUserCannotCancelConnectionMessage'),
              title: t('modalUserCannotConnectHeadline'),
            },
          });
          break;
        }
        case ConnectionStatus.IGNORED: {
          PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
            text: {
              htmlMessage: t('modalUserCannotIgnoreConnectionMessage'),
              title: t('modalUserCannotConnectHeadline'),
            },
          });
          break;
        }
        default: {
          PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
            text: {
              title: t('modalUserCannotConnectHeadline'),
            },
          });
          break;
        }
      }

      const user = await this.userRepository.refreshUser(userEntity.qualifiedId);

      const isNotConnectedError = isBackendError(error) && error.label === BackendErrorLabel.NOT_CONNECTED;

      // If connection failed because the user is deleted, delete the conversation representing the connection request (type 3 - CONNECT)
      if (isNotConnectedError && user.isDeleted) {
        await this.deleteConnectionWithUser(user);
      }
    }
  }

  public async deleteConnectionWithUser(user: User) {
    const connection = this.connectionState
      .connections()
      .find(connection => matchQualifiedIds(connection.userId, user.qualifiedId));

    await this.onDeleteConnectionRequestConversation?.(user.qualifiedId);

    if (connection) {
      this.connectionState.connections.remove(connection);
      user.connection(null);
    }
  }

  /**
   * Set callback for deleting a connection request conversation.
   * @param callback Callback function
   */
  public setDeleteConnectionRequestConversationHandler(callback: (userId: QualifiedId) => Promise<void>): void {
    this.onDeleteConnectionRequestConversation = callback;
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

  async deletePendingConnectionsToSelfNewTeamMembers() {
    const freshSelf = await this.selfService.getSelf([]);
    const newTeamId = freshSelf.team;

    if (!newTeamId) {
      return;
    }

    const currentConnectionsUserIds = this.connectionState.connections().map(connection => connection.userId);
    const currentConnectionsUsers = await this.userRepository.getUsersById(currentConnectionsUserIds);

    const teamMembersToDeletePendingConnectionsWith = await this.teamService.getTeamMembersByIds(
      newTeamId,
      currentConnectionsUsers.map(user => user.qualifiedId.id),
    );

    const currentUsersToDeleteConnectionWith = currentConnectionsUsers.filter(user => {
      return teamMembersToDeletePendingConnectionsWith.some(member => member.user === user.qualifiedId.id);
    });

    for (const user of currentUsersToDeleteConnectionWith) {
      await this.deleteConnectionWithUser(user);
    }
  }

  async deletePendingConnectionToNewTeamMember(event: UserUpdateData) {
    const newlyJoinedUserId = event.user.id;
    const selfUserDomain = this.userState.self()?.domain;
    const newlyJoinedUserQualifiedId = {
      id: newlyJoinedUserId,
      /*
          we can assume that the domain of the user is the same as the self user domain
          because they have joined our team
        */
      domain: selfUserDomain ?? '',
    };

    const newlyJoinedUser = await this.userRepository.getUserById(newlyJoinedUserQualifiedId);
    const connectionWithNewlyJoinedUser = newlyJoinedUser.connection();
    const conversationIdWithNewlyJoinedUser = connectionWithNewlyJoinedUser?.conversationId;

    // If the connection is already accepted, we don't need to delete the conversation from our state
    // we're gonna use the previous 1:1 conversation with the newly joined user
    if (
      !connectionWithNewlyJoinedUser ||
      !conversationIdWithNewlyJoinedUser ||
      connectionWithNewlyJoinedUser?.status() === ConnectionStatus.ACCEPTED
    ) {
      return;
    }

    await this.deleteConnectionWithUser(newlyJoinedUser);
  }
}
