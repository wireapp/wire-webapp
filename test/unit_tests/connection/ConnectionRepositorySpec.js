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
import {WebAppEvents} from '@wireapp/webapp-events';
import {createRandomUuid} from 'Util/util';
import {Conversation} from 'src/script/entity/Conversation';
import {User} from 'src/script/entity/User';
import {ConnectionEntity} from 'src/script/connection/ConnectionEntity';
import {TestFactory} from '../../helper/TestFactory';
import {ConnectionRepository} from 'src/script/connection/ConnectionRepository';

describe('ConnectionRepository', () => {
  let server = undefined;
  let connectionRepository = undefined;
  const testFactory = new TestFactory();

  beforeAll(() => testFactory.exposeConnectionActors());

  beforeEach(() => {
    connectionRepository = testFactory.connection_repository;
    server = sinon.fakeServer.create();
    server.autoRespond = true;
  });

  afterEach(() => {
    connectionRepository.connectionEntities.removeAll();
    server.restore();
  });

  describe('cancelRequest', () => {
    let userEntity = undefined;

    beforeEach(() => {
      const userId = createRandomUuid();
      const connectionEntity = new ConnectionEntity(createRandomUuid());
      connectionEntity.userId = userId;

      userEntity = new User(userId);
      userEntity.connection(connectionEntity);

      connectionRepository.connectionEntities.push(connectionEntity);
      spyOn(connectionRepository, 'updateStatus').and.returnValue(Promise.resolve());
    });

    it('sets the connection status to cancelled', () => {
      return connectionRepository.cancelRequest(userEntity).then(() => {
        expect(connectionRepository.updateStatus).toHaveBeenCalled();
      });
    });

    it('switches the conversation if requested', () => {
      const amplifySpy = jasmine.createSpy('conversation_show');
      amplify.subscribe(WebAppEvents.CONVERSATION.SHOW, amplifySpy);

      return connectionRepository.cancelRequest(userEntity, new Conversation()).then(() => {
        expect(connectionRepository.updateStatus).toHaveBeenCalled();
        expect(amplifySpy).toHaveBeenCalled();
      });
    });
  });

  describe('getConnectionByConversationId', () => {
    let firstConnectionEntity = null;
    let secondConnectionEntity = null;

    beforeEach(() => {
      firstConnectionEntity = new ConnectionEntity();
      firstConnectionEntity.conversationId = createRandomUuid();
      connectionRepository.connectionEntities.push(firstConnectionEntity);

      secondConnectionEntity = new ConnectionEntity();
      secondConnectionEntity.conversationId = createRandomUuid();
      connectionRepository.connectionEntities.push(secondConnectionEntity);
    });

    it('should return the expected connection for the given conversation id', () => {
      const connectionEntity = connectionRepository.getConnectionByConversationId(firstConnectionEntity.conversationId);

      expect(connectionEntity).toBe(firstConnectionEntity);
      const otherConnectionEntity = connectionRepository.getConnectionByConversationId('');

      expect(otherConnectionEntity).not.toBeDefined();
    });
  });

  describe('getConnections', () => {
    it('should return the connected users', async () => {
      const connectionServiceSpy = {
        getConnections: jest.fn().mockImplementation(() =>
          Promise.resolve([
            {
              conversation: '45c8f986-6c8f-465b-9ac9-bd5405e8c944',
              from: 'd5a39ffb-6ce3-4cc8-9048-0e15d031b4c5',
              last_update: '2015-01-07T16:08:36.537Z',
              message: `Hi Jane Doe,\nLet's connect.\nJohn Doe`,
              status: ConnectionStatus.ACCEPTED,
              to: '7025598b-ffac-4993-8a81-af3f35b7147f',
            },
            {
              conversation: '45c8f986-6c8f-465b-9ac9-bd5405e8c944',
              from: 'd5a39ffb-6ce3-4cc8-9048-0e15d031b4c5',
              last_update: '2015-01-07T16:08:36.537Z',
              message: `Hi Jane Doe,\nLet's connect.\nJohn Doe`,
              status: ConnectionStatus.ACCEPTED,
              to: '7025598b-ffac-4993-8a81-af3f35b7147f',
            },
          ]),
        ),
      };

      const userRepoSpy = {
        updateUsersFromConnections: jest.fn(),
      };

      const connectionRepo = new ConnectionRepository(connectionServiceSpy, userRepoSpy);

      await connectionRepo.getConnections();
      expect(connectionRepo.connectionEntities().length).toBe(2);
      const [firstConnectionEntity, secondConnectionEntity] = connectionRepo.connectionEntities();

      expect(firstConnectionEntity.status()).toEqual(ConnectionStatus.ACCEPTED);
      expect(secondConnectionEntity.conversationId).toEqual('45c8f986-6c8f-465b-9ac9-bd5405e8c944');
    });
  });
});
