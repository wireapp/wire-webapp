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

import sinon from 'sinon';
import {ConnectionStatus} from '@wireapp/api-client/src/connection';
import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';

import {createRandomUuid} from 'Util/util';
import {Conversation} from 'src/script/entity/Conversation';
import {User} from 'src/script/entity/User';
import {ConnectionEntity} from 'src/script/connection/ConnectionEntity';
import {TestFactory} from '../../helper/TestFactory';
import {ConnectionRepository} from 'src/script/connection/ConnectionRepository';
import {ConnectionState} from 'src/script/connection/ConnectionState';
import {ConnectionService} from 'src/script/connection/ConnectionService';
import {UserRepository} from 'src/script/user/UserRepository';

describe('ConnectionRepository', () => {
  let server: sinon.SinonFakeServer = undefined;
  let connectionRepository: ConnectionRepository = undefined;
  const testFactory = new TestFactory();

  beforeAll(() => testFactory.exposeConnectionActors());

  beforeEach(() => {
    connectionRepository = testFactory.connection_repository;
    server = sinon.fakeServer.create();
    server.autoRespond = true;
  });

  afterEach(() => {
    connectionRepository['connectionState'].connectionEntities({});
    server.restore();
  });

  describe('cancelRequest', () => {
    let userEntity: User = undefined;

    beforeEach(() => {
      const userId = createRandomUuid();
      const connectionEntity = new ConnectionEntity();
      connectionEntity.userId = userId;

      userEntity = new User(userId);
      userEntity.connection(connectionEntity);

      connectionRepository.addConnectionEntity(connectionEntity);
      spyOn<any>(connectionRepository, 'updateStatus').and.returnValue(Promise.resolve());
    });

    it('sets the connection status to cancelled', () => {
      return connectionRepository.cancelRequest(userEntity, false, new Conversation()).then(() => {
        expect(connectionRepository['updateStatus']).toHaveBeenCalled();
      });
    });

    it('switches the conversation if requested', () => {
      const amplifySpy = jasmine.createSpy('conversation_show');
      amplify.subscribe(WebAppEvents.CONVERSATION.SHOW, amplifySpy);

      return connectionRepository.cancelRequest(userEntity, true, new Conversation()).then(() => {
        expect(connectionRepository['updateStatus']).toHaveBeenCalled();
        expect(amplifySpy).toHaveBeenCalled();
      });
    });
  });

  describe('getConnectionByConversationId', () => {
    let firstConnectionEntity: ConnectionEntity = null;
    let secondConnectionEntity: ConnectionEntity = null;

    beforeEach(() => {
      firstConnectionEntity = new ConnectionEntity();
      firstConnectionEntity.conversationId = createRandomUuid();
      firstConnectionEntity.userId = createRandomUuid();
      connectionRepository.addConnectionEntity(firstConnectionEntity);

      secondConnectionEntity = new ConnectionEntity();
      secondConnectionEntity.conversationId = createRandomUuid();
      secondConnectionEntity.userId = createRandomUuid();
      connectionRepository.addConnectionEntity(secondConnectionEntity);
    });

    it('should return the expected connection for the given conversation id', () => {
      const connectionEntity = connectionRepository.getConnectionByConversationId(firstConnectionEntity.conversationId);

      expect(connectionEntity).toBe(firstConnectionEntity);
      const otherConnectionEntity = connectionRepository.getConnectionByConversationId('');

      expect(otherConnectionEntity).not.toBeDefined();
    });
  });

  describe('getConnections', () => {
    it('de-duplicates connection requests', async () => {
      const connectionRequest = {
        conversation: '45c8f986-6c8f-465b-9ac9-bd5405e8c944',
        from: 'd5a39ffb-6ce3-4cc8-9048-0e15d031b4c5',
        last_update: '2015-01-07T16:08:36.537Z',
        message: `Hi Jane Doe,\nLet's connect.\nJohn Doe`,
        status: ConnectionStatus.ACCEPTED,
        to: '7025598b-ffac-4993-8a81-af3f35b7147f',
      };

      const connectionServiceSpy: Partial<ConnectionService> = {
        getConnections: jest.fn().mockImplementation(() => {
          // Return request and duplicate
          return Promise.resolve([connectionRequest, connectionRequest]);
        }),
      };

      const userRepoSpy: Partial<UserRepository> = {
        updateUsersFromConnections: jest.fn(),
      };

      const connectionState = new ConnectionState();
      const connectionRepo = new ConnectionRepository(
        connectionServiceSpy as ConnectionService,
        userRepoSpy as UserRepository,
        connectionState,
      );

      await connectionRepo.getConnections();

      const connectionEntities = Object.values(connectionState.connectionEntities());
      expect(connectionEntities.length).toBe(1);
      expect(connectionEntities[0].status()).toEqual(connectionRequest.status);
      expect(connectionEntities[0].conversationId).toEqual(connectionRequest.conversation);
    });
  });
});
