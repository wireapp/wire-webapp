/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {ConnectionStatus} from '@wireapp/api-client/lib/connection';
import {BackendError, BackendErrorLabel} from '@wireapp/api-client/lib/http';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {amplify} from 'amplify';
import {StatusCodes} from 'http-status-codes';

import {WebAppEvents} from '@wireapp/webapp-events';

import {Conversation} from 'Repositories/entity/Conversation';
import {SelfService} from 'Repositories/self/SelfService';
import {TeamService} from 'Repositories/team/TeamService';
import {UserRepository} from 'Repositories/user/UserRepository';
import {generateUser} from 'test/helper/UserGenerator';
import {createUuid} from 'Util/uuid';

import {ConnectionEntity} from './ConnectionEntity';
import {ConnectionRepository} from './ConnectionRepository';
import {ConnectionService} from './ConnectionService';
import {ConnectionState} from './ConnectionState';

function buildConnectionRepository() {
  const connectionState = new ConnectionState();
  const connectionService = new ConnectionService();
  const selfService = new SelfService();
  const teamService = new TeamService();
  const userRepository = {refreshUser: jest.fn()} as unknown as UserRepository;
  return [
    new ConnectionRepository(connectionService, userRepository, selfService, teamService, connectionState),
    {connectionState, userRepository, connectionService},
  ] as const;
}

function createConnection() {
  const user = generateUser();
  const connection = new ConnectionEntity();
  connection.userId = user.qualifiedId;
  connection.conversationId = {id: createUuid(), domain: user.domain};
  user.connection(connection);
  return user;
}

describe('ConnectionRepository', () => {
  describe('cancelRequest', () => {
    const [connectionRepository, {connectionService, userRepository}] = buildConnectionRepository();

    it('sets the connection status to cancelled', () => {
      const user = createConnection();
      connectionRepository.addConnectionEntity(user.connection()!);
      jest.spyOn(connectionService, 'putConnections').mockResolvedValue({} as any);
      return connectionRepository.cancelRequest(user).then(() => {
        expect(connectionService.putConnections).toHaveBeenCalled();
      });
    });

    it('switches the conversation if requested', () => {
      const user = createConnection();
      connectionRepository.addConnectionEntity(user.connection()!);
      const amplifySpy = jasmine.createSpy('conversation_show');
      amplify.subscribe(WebAppEvents.CONVERSATION.SHOW, amplifySpy);

      return connectionRepository.cancelRequest(user, true, new Conversation()).then(() => {
        expect(connectionService.putConnections).toHaveBeenCalled();
        expect(amplifySpy).toHaveBeenCalled();
      });
    });

    it('deletes connection request if the other user does not exist on backend anymore', async () => {
      const user = createConnection();

      connectionRepository.addConnectionEntity(user.connection()!);

      jest.spyOn(userRepository, 'refreshUser').mockImplementationOnce(async (uid: QualifiedId) => {
        user.isDeleted = true;
        return user;
      });
      jest
        .spyOn(connectionService, 'putConnections')
        .mockRejectedValueOnce(new BackendError('', BackendErrorLabel.NOT_CONNECTED, StatusCodes.FORBIDDEN));
      await connectionRepository.cancelRequest(user);

      expect(connectionService.putConnections).toHaveBeenCalled();
      expect(connectionRepository['connectionState'].connections()).not.toContain(user.connection());
      expect(user.connection()).toEqual(null);
    });
  });

  describe('getConnectionByConversationId', () => {
    const [connectionRepository] = buildConnectionRepository();

    it('should return the expected connection for the given conversation id', () => {
      const userA = createConnection();
      connectionRepository.addConnectionEntity(userA.connection()!);
      const connectionEntity = connectionRepository.getConnectionByConversationId(userA.connection()!.conversationId);

      expect(connectionEntity).toBe(userA.connection());

      const otherConnectionEntity = connectionRepository.getConnectionByConversationId({domain: '', id: 'random'});

      expect(otherConnectionEntity).not.toBeDefined();
    });
  });

  describe('getConnections', () => {
    const [connectionRepository, {connectionService}] = buildConnectionRepository();
    it('de-duplicates connection requests', async () => {
      const connectionRequest = {
        conversation: '45c8f986-6c8f-465b-9ac9-bd5405e8c944',
        from: 'd5a39ffb-6ce3-4cc8-9048-0e15d031b4c5',
        last_update: '2015-01-07T16:08:36.537Z',
        message: `Hi Jane Doe,\nLet's connect.\nJohn Doe`,
        status: ConnectionStatus.ACCEPTED,
        to: '7025598b-ffac-4993-8a81-af3f35b7147f',
      };

      jest.spyOn(connectionService, 'getConnections').mockResolvedValue([connectionRequest, connectionRequest]);

      await connectionRepository.getConnections([]);

      const storedConnection = connectionRepository.getConnectionByConversationId({
        id: connectionRequest.conversation,
        domain: '',
      });

      expect(storedConnection?.from).toEqual(connectionRequest.from);
    });
  });
});
