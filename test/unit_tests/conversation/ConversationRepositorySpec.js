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

import {ConnectionStatus} from '@wireapp/api-client/src/connection/';
import {CONVERSATION_EVENT} from '@wireapp/api-client/src/event/';
import {WebAppEvents} from '@wireapp/webapp-events';
import {CONVERSATION_TYPE} from '@wireapp/api-client/src/conversation/';
import {ClientClassification} from '@wireapp/api-client/src/client/';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {createRandomUuid} from 'Util/util';
import {LegalHoldStatus} from '@wireapp/protocol-messaging';
import {Conversation} from 'src/script/entity/Conversation';
import {User} from 'src/script/entity/User';
import {Message} from 'src/script/entity/message/Message';
import {ClientEvent} from 'src/script/event/Client';
import {NOTIFICATION_HANDLING_STATE} from 'src/script/event/NotificationHandlingState';
import {EventRepository} from 'src/script/event/EventRepository';
import {ClientEntity} from 'src/script/client/ClientEntity';
import {EventBuilder} from 'src/script/conversation/EventBuilder';
import {ConversationStatus} from 'src/script/conversation/ConversationStatus';
import {ConversationMapper} from 'src/script/conversation/ConversationMapper';
import {StorageSchemata} from 'src/script/storage/StorageSchemata';
import {ConnectionEntity} from 'src/script/connection/ConnectionEntity';
import {MessageCategory} from 'src/script/message/MessageCategory';
import {UserGenerator} from '../../helper/UserGenerator';
import {Config} from 'src/script/Config';
import {TestFactory} from '../../helper/TestFactory';
import {entities, payload} from '../../api/payloads';
import {ConversationError} from 'src/script/error/ConversationError';

jest.deepUnmock('axios');

describe('ConversationRepository', () => {
  const testFactory = new TestFactory();

  let conversation_et = null;
  let self_user_et = null;
  let server = null;
  let storage_service = null;
  const messageSenderId = createRandomUuid();

  const _findConversation = (conversation, conversations) => {
    return ko.utils.arrayFirst(conversations(), _conversation => _conversation.id === conversation.id);
  };

  const _generateConversation = (
    conversation_type = CONVERSATION_TYPE.REGULAR,
    connection_status = ConnectionStatus.ACCEPTED,
  ) => {
    const conversation = new Conversation(createRandomUuid());
    conversation.type(conversation_type);

    const connectionEntity = new ConnectionEntity();
    connectionEntity.conversationId = conversation.id;
    connectionEntity.status(connection_status);
    conversation.connection(connectionEntity);

    return conversation;
  };

  beforeEach(() => {
    server = sinon.fakeServer.create();
    server.autoRespond = true;
    sinon.spy(jQuery, 'ajax');

    return testFactory.exposeConversationActors().then(conversation_repository => {
      amplify.publish(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE, NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
      ({storageService: storage_service} = conversation_repository.conversation_service);

      spyOn(testFactory.event_repository, 'injectEvent').and.returnValue(Promise.resolve({}));
      conversation_et = _generateConversation(CONVERSATION_TYPE.SELF);
      conversation_et.id = payload.conversations.knock.post.conversation;

      const ping_url = `${Config.getConfig().BACKEND_REST}/conversations/${conversation_et.id}/knock`;
      server.respondWith('POST', ping_url, [
        HTTP_STATUS.CREATED,
        {'Content-Type': 'application/json'},
        JSON.stringify(payload.conversations.knock.post),
      ]);

      server.respondWith('GET', `${Config.getConfig().BACKEND_REST}/users?ids=${messageSenderId}`, [
        HTTP_STATUS.OK,
        {'Content-Type': 'application/json'},
        '',
      ]);

      const mark_as_read_url = `${Config.getConfig().BACKEND_REST}/conversations/${conversation_et.id}/self`;
      server.respondWith('PUT', mark_as_read_url, [HTTP_STATUS.OK, {}, '']);

      return conversation_repository.saveConversation(conversation_et);
    });
  });

  afterEach(() => {
    server.restore();
    storage_service.clearStores();
    jQuery.ajax.restore();
    testFactory.conversation_repository.conversationState.conversations.removeAll();
  });

  describe('checkLegalHoldStatus', () => {
    it('injects legal hold system messages when user A discovers that user B is on legal hold when receiving a message from user B for the very first time', async () => {
      const selfUser = UserGenerator.getRandomUser();
      const conversationPartner = UserGenerator.getRandomUser();
      testFactory.user_repository.userState.users.push(conversationPartner);

      const conversationJsonFromBackend = {
        accessModes: ['invite'],
        accessRole: 'activated',
        archived_state: false,
        archived_timestamp: 0,
        creator: conversationPartner.id,
        id: createRandomUuid(),
        last_event_timestamp: 3,
        last_server_timestamp: 3,
        message_timer: null,
        muted_state: false,
        muted_timestamp: 0,
        name: null,
        others: [conversationPartner.id],
        receipt_mode: null,
        status: ConversationStatus.CURRENT_MEMBER,
        team_id: createRandomUuid(),
        type: CONVERSATION_TYPE.REGULAR,
      };

      const [conversationEntity] = ConversationMapper.mapConversations([conversationJsonFromBackend]);
      conversationEntity.participating_user_ets.push(conversationPartner);
      conversationEntity.selfUser(selfUser);
      spyOn(testFactory.conversation_repository.userState, 'self').and.returnValue(selfUser);

      expect(conversationEntity.hasInitializedUsers()).toBe(true);
      expect(conversationEntity.hasLegalHold()).toBe(false);
      expect(conversationEntity.participating_user_ets().length).toBe(1);

      const eventJson = {
        category: MessageCategory.TEXT,
        conversation: conversationEntity.id,
        data: {
          content: 'Decrypted message content',
          expects_read_confirmation: false,
          legal_hold_status: LegalHoldStatus.ENABLED,
          mentions: [],
          previews: [],
          quote: null,
        },
        from: conversationPartner.id,
        from_client_id: 'd9c78d7f6b18b0b3',
        id: createRandomUuid(),
        primary_key: 3,
        time: new Date().toISOString(),
        type: ClientEvent.CONVERSATION.MESSAGE_ADD,
      };

      spyOn(testFactory.conversation_repository.conversation_service, 'postEncryptedMessage').and.callFake(() => {
        const missingClientsError = new Error('Fake missing client error');
        missingClientsError.deleted = {};
        missingClientsError.missing = {
          [conversationPartner.id]: ['1e66e04948938c2c', '53761bec3f10a6d9', 'a9c8c385737b14fe'],
        };
        missingClientsError.redundant = {};
        missingClientsError.time = new Date().toISOString();
        return Promise.reject(missingClientsError);
      });

      spyOn(testFactory.client_service, 'getClientsByUserId').and.returnValue(
        Promise.resolve([
          {
            [eventJson.id]: [
              {
                class: ClientClassification.DESKTOP,
                id: '1e66e04948938c2c',
              },
              {
                class: ClientClassification.LEGAL_HOLD,
                id: '53761bec3f10a6d9',
              },
              {
                class: ClientClassification.DESKTOP,
                id: 'a9c8c385737b14fe',
              },
            ],
          },
        ]),
      );

      const injectLegalHoldMessageSpy = spyOn(testFactory.conversation_repository, 'injectLegalHoldMessage');
      await testFactory.conversation_repository.saveConversation(conversationEntity);
      await testFactory.conversation_repository.checkLegalHoldStatus(conversationEntity, eventJson);

      expect(injectLegalHoldMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          legalHoldStatus: LegalHoldStatus.ENABLED,
        }),
      );
    });
  });

  describe('filtered_conversations', () => {
    it('should not contain the self conversation', () => {
      const self_conversation_et = _generateConversation(CONVERSATION_TYPE.SELF);

      return testFactory.conversation_repository.saveConversation(self_conversation_et).then(() => {
        expect(
          _findConversation(self_conversation_et, testFactory.conversation_repository.conversationState.conversations),
        ).not.toBeUndefined();

        expect(
          _findConversation(
            self_conversation_et,
            testFactory.conversation_repository.conversationState.filtered_conversations,
          ),
        ).toBeUndefined();
      });
    });

    it('should not contain a blocked conversations', () => {
      const blocked_conversation_et = _generateConversation(CONVERSATION_TYPE.ONE_TO_ONE, ConnectionStatus.BLOCKED);

      return testFactory.conversation_repository.saveConversation(blocked_conversation_et).then(() => {
        expect(
          _findConversation(
            blocked_conversation_et,
            testFactory.conversation_repository.conversationState.conversations,
          ),
        ).not.toBeUndefined();

        expect(
          _findConversation(
            blocked_conversation_et,
            testFactory.conversation_repository.conversationState.filtered_conversations,
          ),
        ).toBeUndefined();
      });
    });

    it('should not contain the conversation for a cancelled connection request', () => {
      const cancelled_conversation_et = _generateConversation(CONVERSATION_TYPE.ONE_TO_ONE, ConnectionStatus.CANCELLED);

      return testFactory.conversation_repository.saveConversation(cancelled_conversation_et).then(() => {
        expect(
          _findConversation(
            cancelled_conversation_et,
            testFactory.conversation_repository.conversationState.conversations,
          ),
        ).not.toBeUndefined();

        expect(
          _findConversation(
            cancelled_conversation_et,
            testFactory.conversation_repository.conversationState.filtered_conversations,
          ),
        ).toBeUndefined();
      });
    });

    it('should not contain the conversation for a pending connection request', () => {
      const pending_conversation_et = _generateConversation(CONVERSATION_TYPE.ONE_TO_ONE, ConnectionStatus.PENDING);

      return testFactory.conversation_repository.saveConversation(pending_conversation_et).then(() => {
        expect(
          _findConversation(
            pending_conversation_et,
            testFactory.conversation_repository.conversationState.conversations,
          ),
        ).not.toBeUndefined();

        expect(
          _findConversation(
            pending_conversation_et,
            testFactory.conversation_repository.conversationState.filtered_conversations,
          ),
        ).toBeUndefined();
      });
    });
  });

  describe('get1To1Conversation', () => {
    beforeEach(() => testFactory.conversation_repository.conversationState.conversations([]));

    it('finds an existing 1:1 conversation within a team', () => {
      const team1to1Conversation = {
        access: ['invite'],
        creator: '109da9ca-a495-47a8-ac70-9ffbe924b2d0',
        id: '04ab891e-ccf1-4dba-9d74-bacec64b5b1e',
        last_event: '0.0',
        last_event_time: '1970-01-01T00:00:00.000Z',
        members: {
          others: [{id: 'f718410c-3833-479d-bd80-a5df03f38414', status: 0}],
          self: {
            hidden: false,
            hidden_ref: null,
            id: '109da9ca-a495-47a8-ac70-9ffbe924b2d0',
            otr_archived: false,
            otr_archived_ref: null,
            otr_muted: false,
            otr_muted_ref: null,
            service: null,
            status: 0,
            status_ref: '0.0',
            status_time: '1970-01-01T00:00:00.000Z',
          },
        },
        name: null,
        team: 'cf162e22-20b8-4533-a5ab-d3f5dde39d2c',
        type: 0,
      };

      const [newConversationEntity] = ConversationMapper.mapConversations([team1to1Conversation]);
      testFactory.conversation_repository.conversationState.conversations.push(newConversationEntity);

      const teamId = team1to1Conversation.team;
      const teamMemberId = team1to1Conversation.members.others[0].id;
      const userEntity = new User(teamMemberId);

      const selfUser = UserGenerator.getRandomUser();
      selfUser.teamId = teamId;
      spyOn(testFactory.conversation_repository.userState, 'self').and.returnValue(selfUser);
      userEntity.inTeam(true);
      userEntity.isTeamMember(true);
      userEntity.teamId = teamId;

      return testFactory.conversation_repository.get1To1Conversation(userEntity).then(conversationEntity => {
        expect(conversationEntity).toBe(newConversationEntity);
      });
    });
  });

  describe('getGroupsByName', () => {
    beforeEach(() => {
      const group_a = _generateConversation(CONVERSATION_TYPE.REGULAR);
      group_a.name('Web Dudes');

      const group_b = _generateConversation(CONVERSATION_TYPE.REGULAR);
      group_b.name('René, Benny, Gregor, Lipis');

      const group_c = _generateConversation(CONVERSATION_TYPE.REGULAR);
      self_user_et = new User();
      self_user_et.name('John');
      group_c.participating_user_ets.push(self_user_et);

      const group_cleared = _generateConversation(CONVERSATION_TYPE.REGULAR);
      group_cleared.name('Cleared');
      group_cleared.last_event_timestamp(Date.now() - 1000);
      group_cleared.setTimestamp(Date.now(), Conversation.TIMESTAMP_TYPE.CLEARED);

      const group_removed = _generateConversation(CONVERSATION_TYPE.REGULAR);
      group_removed.name('Removed');
      group_removed.last_event_timestamp(Date.now() - 1000);
      group_removed.setTimestamp(Date.now(), Conversation.TIMESTAMP_TYPE.CLEARED);
      group_removed.status(ConversationStatus.PAST_MEMBER);

      return Promise.all([
        testFactory.conversation_repository.saveConversation(group_a),
        testFactory.conversation_repository.saveConversation(group_b),
        testFactory.conversation_repository.saveConversation(group_c),
        testFactory.conversation_repository.saveConversation(group_cleared),
      ]);
    });

    it('should return expected matches', () => {
      let result = testFactory.conversation_repository.getGroupsByName('Web Dudes');

      expect(result.length).toBe(1);

      result = testFactory.conversation_repository.getGroupsByName('Dudes');

      expect(result.length).toBe(1);

      result = testFactory.conversation_repository.getGroupsByName('e');

      expect(result.length).toBe(3);

      result = testFactory.conversation_repository.getGroupsByName('Rene');

      expect(result.length).toBe(1);

      result = testFactory.conversation_repository.getGroupsByName('John');

      expect(result.length).toBe(1);
    });

    it('should return a cleared group with the user still being member of it', () => {
      const result = testFactory.conversation_repository.getGroupsByName('Cleared');

      expect(result.length).toBe(1);
    });

    it('should not return a cleared group that the user left', () => {
      const result = testFactory.conversation_repository.getGroupsByName('Removed');

      expect(result.length).toBe(0);
    });
  });

  describe('getPrecedingMessages', () => {
    it('gets messages which are not broken by design', async () => {
      spyOn(testFactory.user_repository, 'getUserById').and.returnValue(Promise.resolve(new User()));
      const selfUser = UserGenerator.getRandomUser();
      spyOn(testFactory.conversation_repository.userState, 'self').and.returnValue(selfUser);

      conversation_et = new Conversation(createRandomUuid());
      const messageWithoutTime = {
        conversation: `${conversation_et.id}`,
        data: {content: 'Hello World :)', nonce: 'aeac8355-739b-4dfc-a119-891a52c6a8dc'},
        from: '532af01e-1e24-4366-aacf-33b67d4ee376',
        id: 'aeac8355-739b-4dfc-a119-891a52c6a8dc',
        type: 'conversation.message-add',
      };
      const messageWithTime = {
        conversation: `${conversation_et.id}`,
        data: {content: 'Fifth message', nonce: '5a8cd79a-82bb-49ca-a59e-9a8e76df77fb', previews: []},
        from: '8b497692-7a38-4a5d-8287-e3d1006577d6',
        id: '5a8cd79a-82bb-49ca-a59e-9a8e76df77fb',
        time: '2016-08-04T13:28:33.389Z',
        type: 'conversation.message-add',
      };

      const bad_message_key = `${conversation_et.id}@${messageWithoutTime.from}@NaN`;
      /**
       * The 'events' table uses auto-incremented inbound keys, so there is no need to define a key, when saving a record.
       *  - With Dexie 2.x, specifying a key when saving a record with an auto-inc. inbound key results in an error: "Data provided to an operation does not meet requirements"
       *  - With Dexie 3.x, specifying a key when saving a record with an auto-inc. inbound key just fails silently
       */
      await storage_service.save(StorageSchemata.OBJECT_STORE.EVENTS, bad_message_key, messageWithoutTime);
      await storage_service.save(StorageSchemata.OBJECT_STORE.EVENTS, undefined, messageWithTime);
      const loadedEvents = await testFactory.conversation_repository.getPrecedingMessages(conversation_et);

      expect(loadedEvents.length).toBe(1);
      expect(loadedEvents[0].id).toBe(messageWithTime.id);
    });
  });

  describe('mapConnection', () => {
    let connectionEntity = undefined;

    beforeEach(() => {
      connectionEntity = new ConnectionEntity();
      connectionEntity.conversationId = conversation_et.id;

      const conversation_payload = {
        creator: conversation_et.id,
        id: conversation_et.id,
        last_event: '25.800122000a0b0bc9',
        last_event_time: '2015-03-20T13:41:12.580Z',
        members: {
          others: [],
          self: {
            archived: null,
            id: conversation_et.id,
            last_read: '1.800122000a54449c',
            muted: null,
            muted_time: null,
            status: 0,
            status_ref: '0.0',
            status_time: '2015-01-28T12:53:41.847Z',
          },
        },
        name: null,
        type: 0,
      };

      spyOn(testFactory.conversation_repository, 'fetchConversationById').and.callThrough();
      spyOn(testFactory.conversation_service, 'getConversationById').and.returnValue(
        Promise.resolve(conversation_payload),
      );
    });

    it('should map a connection to an existing conversation', () => {
      return testFactory.conversation_repository.mapConnection(connectionEntity).then(_conversation => {
        expect(testFactory.conversation_repository.fetchConversationById).not.toHaveBeenCalled();
        expect(testFactory.conversation_service.getConversationById).not.toHaveBeenCalled();
        expect(_conversation.connection()).toBe(connectionEntity);
      });
    });

    it('should map a connection to a new conversation', () => {
      connectionEntity.status(ConnectionStatus.ACCEPTED);
      testFactory.conversation_repository.conversationState.conversations.removeAll();

      return testFactory.conversation_repository.mapConnection(connectionEntity).then(_conversation => {
        expect(testFactory.conversation_repository.fetchConversationById).toHaveBeenCalled();
        expect(testFactory.conversation_service.getConversationById).toHaveBeenCalled();
        expect(_conversation.connection()).toBe(connectionEntity);
      });
    });

    it('should map a cancelled connection to an existing conversation and filter it', () => {
      connectionEntity.status(ConnectionStatus.CANCELLED);

      return testFactory.conversation_repository.mapConnection(connectionEntity).then(_conversation => {
        expect(_conversation.connection()).toBe(connectionEntity);
        expect(
          _findConversation(_conversation, testFactory.conversation_repository.conversationState.conversations),
        ).not.toBeUndefined();

        expect(
          _findConversation(
            _conversation,
            testFactory.conversation_repository.conversationState.filtered_conversations,
          ),
        ).toBeUndefined();
      });
    });
  });

  describe('handleConversationEvent', () => {
    it('detects events send by a user not in the conversation', () => {
      const selfUser = UserGenerator.getRandomUser();
      const conversationEntity = _generateConversation(CONVERSATION_TYPE.REGULAR);
      const event = {
        conversation: conversationEntity.id,
        data: {},
        from: messageSenderId,
        id: createRandomUuid(),
        time: '2017-09-06T09:43:36.528Z',
        type: 'conversation.message-add',
      };

      spyOn(testFactory.conversation_repository, 'addMissingMember').and.returnValue(
        Promise.resolve(conversationEntity),
      );
      spyOn(testFactory.conversation_repository, 'getConversationById').and.returnValue(
        Promise.resolve(conversationEntity),
      );
      spyOn(testFactory.conversation_repository.userState, 'self').and.returnValue(selfUser);

      return testFactory.conversation_repository.handleConversationEvent(event).then(() => {
        expect(testFactory.conversation_repository.addMissingMember).toHaveBeenCalledWith(
          conversationEntity,
          [
            {
              domain: null,
              id: event.from,
            },
          ],
          new Date(event.time).getTime() - 1,
        );
      });
    });

    describe('conversation.asset-add', () => {
      beforeEach(() => {
        const matchUsers = new RegExp(`${Config.getConfig().BACKEND_REST}/users\\?ids=([a-z0-9-,]+)`);
        server.respondWith('GET', matchUsers, (xhr, ids) => {
          const users = [];
          for (const userId of ids.split(',')) {
            users.push({
              accent_id: 0,
              assets: [],
              handle: `handle_${userId}`,
              id: userId,
              locale: 'en',
              name: `name_${userId}`,
              picture: [
                {
                  content_length: 19190,
                  content_type: 'image/jpeg',
                  data: null,
                  id: 'ab7eb2f7-7c5b-4e55-ab16-dfc206891e67',
                  info: {
                    correlation_id: '7dfa4adf-454e-4372-a06a-7403baa36e5c',
                    height: 280,
                    nonce: '7dfa4adf-454e-4372-a06a-7403baa36e5c',
                    original_height: 960,
                    original_width: 620,
                    public: true,
                    tag: 'smallProfile',
                    width: 280,
                  },
                },
                {
                  content_length: 82690,
                  content_type: 'image/jpeg',
                  data: null,
                  id: '87c95372-fce7-4215-861a-a3e0fe262e48',
                  info: {
                    correlation_id: '7dfa4adf-454e-4372-a06a-7403baa36e5c',
                    height: 960,
                    nonce: '7dfa4adf-454e-4372-a06a-7403baa36e5c',
                    original_height: 960,
                    original_width: 620,
                    public: true,
                    tag: 'medium',
                    width: 620,
                  },
                },
              ],
            });
          }
          xhr.respond(HTTP_STATUS.OK, {'Content-Type': 'application/json'}, JSON.stringify(users));
        });

        const matchConversations = new RegExp(`${Config.getConfig().BACKEND_REST}/conversations/([a-z0-9-]+)`);
        server.respondWith('GET', matchConversations, (xhr, conversationId) => {
          const conversation = {
            access: ['private'],
            creator: '6761450e-1bd6-4027-a338-1191fe5e349f',
            id: conversationId,
            last_event: '0.0',
            last_event_time: '1970-01-01T00:00:00.000Z',
            members: {
              others: [{id: '6761450e-1bd6-4027-a338-1191fe5e349f', status: 0}],
              self: {
                hidden: false,
                hidden_ref: null,
                id: '8a88604a-430a-42ed-966e-19a35c3d292a',
                otr_archived: false,
                otr_archived_ref: null,
                otr_muted: false,
                otr_muted_ref: null,
                service: null,
                status: 0,
                status_ref: '0.0',
                status_time: '1970-01-01T00:00:00.000Z',
              },
            },
            name: null,
            team: null,
            type: 2,
          };
          xhr.respond(HTTP_STATUS.OK, {'Content-Type': 'application/json'}, JSON.stringify(conversation));
        });
      });

      it("shows a failed message on the sender's side if the upload fails", () => {
        const selfUser = UserGenerator.getRandomUser();
        const conversation_id = createRandomUuid();
        const message_id = createRandomUuid();
        const sending_user_id = selfUser.id;
        spyOn(testFactory.conversation_repository.userState, 'self').and.returnValue(selfUser);
        spyOn(Config, 'getConfig').and.returnValue({FEATURE: {ALLOWED_FILE_UPLOAD_EXTENSIONS: ['*']}});

        const upload_start = {
          category: 512,
          conversation: conversation_id,
          data: {
            content_length: 23089240,
            content_type: 'application/x-msdownload',
            info: {name: 'AirDroid_Desktop_Client_3.4.2.0.exe', nonce: '79072f78-15ee-4d54-a63c-fd46cd5607ae'},
          },
          from: sending_user_id,
          id: message_id,
          primary_key: 107,
          status: 1,
          time: '2017-09-06T09:43:32.278Z',
          type: 'conversation.asset-add',
        };
        const upload_failed = {
          conversation: conversation_id,
          data: {reason: 1, status: 'upload-failed'},
          from: sending_user_id,
          id: message_id,
          status: 1,
          time: '2017-09-06T16:14:08.165Z',
          type: 'conversation.asset-add',
        };

        return testFactory.conversation_repository
          .fetchConversationById(conversation_id)
          .then(fetched_conversation => {
            expect(fetched_conversation).toBeDefined();
            testFactory.conversation_repository.conversationState.activeConversation(fetched_conversation);
            return testFactory.conversation_repository.handleConversationEvent(upload_start);
          })
          .then(() => {
            const number_of_messages = Object.keys(
              testFactory.conversation_repository.conversationState.activeConversation().messages(),
            ).length;

            expect(number_of_messages).toBe(1);
            return testFactory.conversation_repository.handleConversationEvent(upload_failed);
          })
          .then(() => {
            const number_of_messages = Object.keys(
              testFactory.conversation_repository.conversationState.activeConversation().messages(),
            ).length;

            expect(number_of_messages).toBe(1);
          });
      });
    });

    describe('conversation.create', () => {
      let conversationId = null;
      let createEvent = null;

      beforeEach(() => {
        spyOn(testFactory.conversation_repository, 'onCreate').and.callThrough();
        spyOn(testFactory.conversation_repository, 'mapConversations').and.returnValue([
          new Conversation(createRandomUuid()),
        ]);
        spyOn(testFactory.conversation_repository, 'updateParticipatingUserEntities').and.returnValue(true);
        spyOn(testFactory.conversation_repository, 'saveConversation').and.returnValue(false);

        conversationId = createRandomUuid();
        createEvent = {
          conversation: conversationId,
          data: {
            access: ['invite'],
            access_role: 'activated',
            creator: 'c472ba79-0bca-4a74-aaa3-a559a16705d3',
            id: 'c9405f98-e25a-4b1f-ade7-227ea765dff7',
            last_event: '0.0',
            last_event_time: '1970-01-01T00:00:00.000Z',
            members: {
              others: [
                {
                  conversation_role: 'wire_admin',
                  id: 'c472ba79-0bca-4a74-aaa3-a559a16705d3',
                  qualified_id: {
                    domain: 'bella.wire.link',
                    id: 'c472ba79-0bca-4a74-aaa3-a559a16705d3',
                  },
                  status: 0,
                },
              ],
              self: {
                conversation_role: 'wire_member',
                hidden: false,
                hidden_ref: null,
                id: '9dcb21e0-9670-4d05-8590-408f3686c873',
                otr_archived: false,
                otr_archived_ref: null,
                otr_muted: false,
                otr_muted_ref: null,
                otr_muted_status: null,
                service: null,
                status: 0,
                status_ref: '0.0',
                status_time: '1970-01-01T00:00:00.000Z',
              },
            },
            message_timer: null,
            name: '-, benny_bella',
            qualified_id: {
              domain: 'bella.wire.link',
              id: 'c9405f98-e25a-4b1f-ade7-227ea765dff7',
            },
            receipt_mode: null,
            team: null,
            type: 0,
          },
          type: CONVERSATION_EVENT.CREATE,
        };
      });

      it('should process create event for a new conversation created locally', () => {
        return testFactory.conversation_repository.handleConversationEvent(createEvent).then(() => {
          expect(testFactory.conversation_repository.onCreate).toHaveBeenCalled();
          expect(testFactory.conversation_repository.mapConversations).toHaveBeenCalledWith([createEvent.data], 1);
        });
      });

      it('should process create event for a new conversation created remotely', () => {
        const time = new Date();
        createEvent.time = time.toISOString();

        return testFactory.conversation_repository.handleConversationEvent(createEvent).then(() => {
          expect(testFactory.conversation_repository.onCreate).toHaveBeenCalled();
          expect(testFactory.conversation_repository.mapConversations).toHaveBeenCalledWith(
            [createEvent.data],
            time.getTime(),
          );
        });
      });
    });

    describe('conversation.member-join', () => {
      let memberJoinEvent = null;

      beforeEach(() => {
        spyOn(testFactory.conversation_repository, 'onMemberJoin').and.callThrough();
        spyOn(testFactory.conversation_repository, 'updateParticipatingUserEntities').and.callThrough();
        spyOn(testFactory.user_repository, 'getUsersById').and.returnValue(Promise.resolve([]));

        memberJoinEvent = {
          conversation: conversation_et.id,
          data: {
            user_ids: ['9028624e-bfef-490a-ba61-01683f5ccc83'],
          },
          from: 'd5a39ffb-6ce3-4cc8-9048-0e15d031b4c5',
          id: '3.800122000a5dcd58',
          time: '2015-04-27T11:42:31.475Z',
          type: 'conversation.member-join',
        };
      });

      it('should process member-join event when joining a group conversation', () => {
        const selfUser = UserGenerator.getRandomUser();
        spyOn(testFactory.conversation_repository.userState, 'self').and.returnValue(selfUser);

        return testFactory.conversation_repository.handleConversationEvent(memberJoinEvent).then(() => {
          expect(testFactory.conversation_repository.onMemberJoin).toHaveBeenCalled();
          expect(testFactory.conversation_repository.updateParticipatingUserEntities).toHaveBeenCalled();
        });
      });

      it('should ignore member-join event when joining a 1to1 conversation', () => {
        const selfUser = UserGenerator.getRandomUser();
        // conversation has a corresponding pending connection
        const connectionEntity = new ConnectionEntity();
        connectionEntity.conversationId = conversation_et.id;
        connectionEntity.status(ConnectionStatus.PENDING);
        testFactory.connection_repository.addConnectionEntity(connectionEntity);

        spyOn(testFactory.conversation_repository.userState, 'self').and.returnValue(selfUser);

        return testFactory.conversation_repository.handleConversationEvent(memberJoinEvent).then(() => {
          expect(testFactory.conversation_repository.onMemberJoin).toHaveBeenCalled();
          expect(testFactory.conversation_repository.updateParticipatingUserEntities).not.toHaveBeenCalled();
        });
      });
    });

    describe('conversation.message-delete', () => {
      let message_et = undefined;
      const selfUser = UserGenerator.getRandomUser();

      beforeEach(() => {
        conversation_et = _generateConversation(CONVERSATION_TYPE.REGULAR);
        return testFactory.conversation_repository.saveConversation(conversation_et).then(() => {
          message_et = new Message(createRandomUuid());
          message_et.from = selfUser.id;
          conversation_et.addMessage(message_et);

          spyOn(testFactory.conversation_repository, 'addDeleteMessage');
          spyOn(testFactory.conversation_repository, 'onMessageDeleted').and.callThrough();
        });
      });

      afterEach(() => conversation_et.removeMessages());

      it('should not delete message if user is not matching', async () => {
        const message_delete_event = {
          conversation: conversation_et.id,
          data: {
            message_id: message_et.id,
          },
          from: createRandomUuid(),
          id: createRandomUuid(),
          time: new Date().toISOString(),
          type: ClientEvent.CONVERSATION.MESSAGE_DELETE,
        };

        spyOn(testFactory.conversation_repository.userState, 'self').and.returnValue(selfUser);

        expect(conversation_et.getMessage(message_et.id)).toBeDefined();
        await expect(
          testFactory.conversation_repository.handleConversationEvent(message_delete_event),
        ).rejects.toMatchObject({
          type: ConversationError.TYPE.WRONG_USER,
        });
        expect(testFactory.conversation_repository.onMessageDeleted).toHaveBeenCalled();
        expect(conversation_et.getMessage(message_et.id)).toBeDefined();
        expect(testFactory.conversation_repository.addDeleteMessage).not.toHaveBeenCalled();
      });

      it('should delete message if user is self', () => {
        spyOn(testFactory.event_service, 'deleteEvent');
        const message_delete_event = {
          conversation: conversation_et.id,
          data: {
            message_id: message_et.id,
          },
          from: selfUser.id,
          id: createRandomUuid(),
          time: new Date().toISOString(),
          type: ClientEvent.CONVERSATION.MESSAGE_DELETE,
        };

        spyOn(testFactory.conversation_repository.userState, 'self').and.returnValue(selfUser);

        expect(conversation_et.getMessage(message_et.id)).toBeDefined();
        return testFactory.conversation_repository.handleConversationEvent(message_delete_event).then(() => {
          expect(testFactory.conversation_repository.onMessageDeleted).toHaveBeenCalled();
          expect(testFactory.event_service.deleteEvent).toHaveBeenCalledTimes(1);
          expect(testFactory.conversation_repository.addDeleteMessage).not.toHaveBeenCalled();
        });
      });

      it('should delete message and add delete message if user is not self', () => {
        spyOn(testFactory.event_service, 'deleteEvent');
        const other_user_id = createRandomUuid();
        message_et.from = other_user_id;

        const message_delete_event = {
          conversation: conversation_et.id,
          data: {
            message_id: message_et.id,
          },
          from: other_user_id,
          id: createRandomUuid(),
          time: new Date().toISOString(),
          type: ClientEvent.CONVERSATION.MESSAGE_DELETE,
        };

        spyOn(testFactory.conversation_repository.userState, 'self').and.returnValue(selfUser);

        expect(conversation_et.getMessage(message_et.id)).toBeDefined();
        return testFactory.conversation_repository.handleConversationEvent(message_delete_event).then(() => {
          expect(testFactory.conversation_repository.onMessageDeleted).toHaveBeenCalled();
          expect(testFactory.event_service.deleteEvent).toHaveBeenCalledTimes(1);
          expect(testFactory.conversation_repository.addDeleteMessage).toHaveBeenCalled();
        });
      });

      it('should delete message and skip adding delete message for ephemeral messages', () => {
        spyOn(testFactory.event_service, 'deleteEvent');
        const other_user_id = createRandomUuid();
        message_et.from = other_user_id;
        message_et.ephemeral_expires(true);

        const message_delete_event = {
          conversation: conversation_et.id,
          data: {
            message_id: message_et.id,
          },
          from: other_user_id,
          id: createRandomUuid(),
          time: new Date().toISOString(),
          type: ClientEvent.CONVERSATION.MESSAGE_DELETE,
        };

        spyOn(testFactory.conversation_repository.userState, 'self').and.returnValue(selfUser);

        expect(conversation_et.getMessage(message_et.id)).toBeDefined();
        return testFactory.conversation_repository.handleConversationEvent(message_delete_event).then(() => {
          expect(testFactory.conversation_repository.onMessageDeleted).toHaveBeenCalled();
          expect(testFactory.event_service.deleteEvent).toHaveBeenCalledTimes(1);
          expect(testFactory.conversation_repository.addDeleteMessage).not.toHaveBeenCalled();
        });
      });
    });

    describe('conversation.message-hidden', () => {
      let messageId = null;
      const selfUser = UserGenerator.getRandomUser();

      beforeEach(() => {
        conversation_et = _generateConversation(CONVERSATION_TYPE.REGULAR);

        return testFactory.conversation_repository.saveConversation(conversation_et).then(() => {
          const messageToHideEt = new Message(createRandomUuid());
          conversation_et.addMessage(messageToHideEt);

          messageId = messageToHideEt.id;
          spyOn(testFactory.conversation_repository, 'onMessageHidden').and.callThrough();
        });
      });

      it('should not hide message if sender is not self user', async () => {
        const messageHiddenEvent = {
          conversation: conversation_et.id,
          data: {
            conversation_id: conversation_et.id,
            message_id: messageId,
          },
          from: createRandomUuid(),
          id: createRandomUuid(),
          time: new Date().toISOString(),
          type: ClientEvent.CONVERSATION.MESSAGE_HIDDEN,
        };

        expect(conversation_et.getMessage(messageId)).toBeDefined();

        spyOn(testFactory.conversation_repository.userState, 'self').and.returnValue(selfUser);

        await expect(
          testFactory.conversation_repository.handleConversationEvent(messageHiddenEvent),
        ).rejects.toMatchObject({
          type: ConversationError.TYPE.WRONG_USER,
        });
        expect(testFactory.conversation_repository.onMessageHidden).toHaveBeenCalled();
        expect(conversation_et.getMessage(messageId)).toBeDefined();
      });

      it('should hide message if sender is self user', () => {
        spyOn(testFactory.event_service, 'deleteEvent');
        const messageHiddenEvent = {
          conversation: conversation_et.id,
          data: {
            conversation_id: conversation_et.id,
            message_id: messageId,
          },
          from: selfUser.id,
          id: createRandomUuid(),
          time: new Date().toISOString(),
          type: ClientEvent.CONVERSATION.MESSAGE_HIDDEN,
        };

        expect(conversation_et.getMessage(messageId)).toBeDefined();

        spyOn(testFactory.conversation_repository.userState, 'self').and.returnValue(selfUser);

        return testFactory.conversation_repository.handleConversationEvent(messageHiddenEvent).then(() => {
          expect(testFactory.conversation_repository.onMessageHidden).toHaveBeenCalled();
          expect(testFactory.event_service.deleteEvent).toHaveBeenCalledTimes(1);
        });
      });

      it('should not hide message if not send via self conversation', () => {
        spyOn(testFactory.event_service, 'deleteEvent');
        const messageHiddenEvent = {
          conversation: createRandomUuid(),
          data: {
            conversation_id: conversation_et.id,
            message_id: messageId,
          },
          from: selfUser.id,
          id: createRandomUuid(),
          time: new Date().toISOString(),
          type: ClientEvent.CONVERSATION.MESSAGE_HIDDEN,
        };

        expect(conversation_et.getMessage(messageId)).toBeDefined();
        spyOn(testFactory.conversation_repository.userState, 'self').and.returnValue(selfUser);

        return testFactory.conversation_repository.onMessageHidden(messageHiddenEvent).then(() => {
          expect(testFactory.conversation_repository.onMessageHidden).toHaveBeenCalled();
          expect(testFactory.event_service.deleteEvent).toHaveBeenCalledTimes(1);
        });
      });

      it('syncs message deletion with the database', () => {
        const deletedMessagePayload = {
          conversation: createRandomUuid(),
          id: createRandomUuid(),
        };

        const conversationEntity = new Conversation();
        spyOn(conversationEntity, 'removeMessageById');

        const conversationRepository = testFactory.conversation_repository;
        spyOn(conversationRepository.conversationState, 'findConversation').and.returnValue(conversationEntity);

        conversationRepository.deleteLocalMessageEntity({oldObj: deletedMessagePayload});

        expect(conversationRepository.conversationState.findConversation).toHaveBeenCalledWith(
          deletedMessagePayload.conversation,
        );
        expect(conversationEntity.removeMessageById).toHaveBeenCalledWith(deletedMessagePayload.id);
      });
    });
  });

  describe('findConversation', () => {
    let conversationRepository;
    const conversationIds = ['40b05b5f-d906-4276-902c-3fa16af3b2bd', '3dd5a837-a7a5-40c6-b6c9-b1ab155e1e55'];
    beforeEach(() => {
      conversationRepository = testFactory.conversation_repository;

      const conversationEntities = conversationIds.map(id => new Conversation(id));
      conversationRepository.conversationState.conversations(conversationEntities);
    });

    afterEach(() => {
      conversationRepository.conversationState.conversations([]);
    });

    it('does not return any conversation if team is marked for deletion', () => {
      spyOn(conversationRepository.teamState, 'isTeamDeleted').and.returnValue(false);
      conversationIds.forEach(conversationId => {
        expect(conversationRepository.conversationState.findConversation(conversationId)).toBeDefined();
      });

      conversationRepository.teamState.isTeamDeleted.and.returnValue(true);
      conversationIds.forEach(conversationId => {
        expect(conversationRepository.conversationState.findConversation(conversationId)).not.toBeDefined();
      });
    });

    it('returns the conversation if present in the local conversations', () => {
      conversationIds.forEach(conversationId => {
        expect(conversationRepository.conversationState.findConversation(conversationId)).toBeDefined();
      });

      const inexistentConversationIds = [
        'f573c44f-c549-4e8f-a4d5-20fdc7adc789',
        'eece4e13-41d4-4ea8-9aa3-383a710a5137',
      ];
      inexistentConversationIds.forEach(conversationId => {
        expect(conversationRepository.conversationState.findConversation(conversationId)).not.toBeDefined();
      });
    });
  });

  describe('Encryption', () => {
    let anne;
    let bob;
    let jane;
    let john;
    let lara = undefined;

    beforeEach(() => {
      anne = new User();
      anne.name('Anne');

      bob = new User('532af01e-1e24-4366-aacf-33b67d4ee376');
      bob.name('Bob');

      jane = new User(entities.user.jane_roe.id);
      jane.name('Jane');

      john = new User(entities.user.john_doe.id);
      john.name('John');

      const johns_computer = new ClientEntity(false, null);
      johns_computer.id = '83ad5d3c31d3c76b';
      johns_computer.class = 'tabconst';
      john.devices.push(johns_computer);

      lara = new User();
      lara.name('Lara');

      const bobs_computer = new ClientEntity(false, null);
      bobs_computer.id = '74606e4c02b2c7f9';
      bobs_computer.class = 'desktop';

      const bobs_phone = new ClientEntity(false, null);
      bobs_phone.id = '8f63631e129ed19d';
      bobs_phone.class = 'phone';

      bob.devices.push(bobs_computer);
      bob.devices.push(bobs_phone);

      const dudes = _generateConversation(CONVERSATION_TYPE.REGULAR);
      dudes.name('Web Dudes');
      dudes.participating_user_ets.push(bob);
      dudes.participating_user_ets.push(john);

      const gals = _generateConversation(CONVERSATION_TYPE.REGULAR);
      gals.name('Web Gals');
      gals.participating_user_ets.push(anne);
      gals.participating_user_ets.push(jane);
      gals.participating_user_ets.push(lara);

      const mixed_group = _generateConversation(CONVERSATION_TYPE.REGULAR);
      mixed_group.name('Web Dudes & Gals');
      mixed_group.participating_user_ets.push(anne);
      mixed_group.participating_user_ets.push(bob);
      mixed_group.participating_user_ets.push(jane);
      mixed_group.participating_user_ets.push(john);
      mixed_group.participating_user_ets.push(lara);

      return Promise.all([
        testFactory.conversation_repository.saveConversation(dudes),
        testFactory.conversation_repository.saveConversation(gals),
        testFactory.conversation_repository.saveConversation(mixed_group),
      ]);
    });

    it('should know all users participating in a conversation (including the self user)', () => {
      const [, users] = testFactory.conversation_repository.conversationState.conversations();
      return testFactory.conversation_repository.getAllUsersInConversation(users.id, null).then(user_ets => {
        expect(user_ets.length).toBe(3);
        expect(testFactory.conversation_repository.conversationState.conversations().length).toBe(4);
      });
    });

    it('should generate a user-client-map including users with clients', () => {
      const [, dudes] = testFactory.conversation_repository.conversationState.conversations();
      const user_ets = dudes.participating_user_ets();

      return testFactory.message_repository.createRecipients(dudes.id).then(recipients => {
        expect(Object.keys(recipients).length).toBe(2);
        expect(recipients[bob.id].length).toBe(2);
        expect(recipients[john.id].length).toBe(1);
        expect(user_ets.length).toBe(2);
      });
    });
  });

  describe('addMissingMember', () => {
    it('injects a member-join event if unknown user is detected', () => {
      const conversationId = createRandomUuid();
      const event = {conversation: conversationId, from: 'unknown-user-id'};
      spyOn(testFactory.conversation_repository, 'getConversationById').and.returnValue(Promise.resolve({}));
      spyOn(EventBuilder, 'buildMemberJoin').and.returnValue(event);

      return testFactory.conversation_repository
        .addMissingMember({id: conversationId}, ['unknown-user-id'])
        .then(() => {
          expect(testFactory.event_repository.injectEvent).toHaveBeenCalledWith(event, EventRepository.SOURCE.INJECTED);
        });
    });
  });

  describe('shouldSendReadReceipt', () => {
    it('uses the account preference for 1:1 conversations', () => {
      // Set a receipt mode on account-level
      const preferenceMode = 1;
      testFactory.propertyRepository.receiptMode(preferenceMode);

      // Set the opposite receipt mode on conversation-level
      const conversationEntity = _generateConversation(CONVERSATION_TYPE.ONE_TO_ONE);
      conversationEntity.receiptMode(!preferenceMode);

      // Verify that the account-level preference wins
      const shouldSend = testFactory.conversation_repository.expectReadReceipt(conversationEntity);

      expect(shouldSend).toBe(!!preferenceMode);
    });

    it('uses the conversation setting for group conversations', () => {
      // Set a receipt mode on account-level
      const preferenceMode = 1;
      testFactory.propertyRepository.receiptMode(preferenceMode);

      // Set the opposite receipt mode on conversation-level
      const conversationEntity = _generateConversation(CONVERSATION_TYPE.REGULAR);
      conversationEntity.receiptMode(!preferenceMode);

      // Verify that the conversation-level preference wins
      const shouldSend = testFactory.conversation_repository.expectReadReceipt(conversationEntity);

      expect(shouldSend).toBe(!!conversationEntity.receiptMode());
    });
  });

  describe('checkForDeletedConversations', () => {
    it('removes conversations that have been deleted on the backend', async () => {
      const existingGroup = _generateConversation(CONVERSATION_TYPE.REGULAR);
      const deletedGroup = _generateConversation(CONVERSATION_TYPE.REGULAR);
      spyOn(testFactory.conversation_service, 'getConversationById').and.callFake(id => {
        if (id === deletedGroup.id) {
          // eslint-disable-next-line prefer-promise-reject-errors
          return Promise.reject({code: HTTP_STATUS.NOT_FOUND});
        }
        return Promise.resolve();
      });
      testFactory.conversation_repository.saveConversation(existingGroup);
      testFactory.conversation_repository.saveConversation(deletedGroup);
      await testFactory.conversation_repository.checkForDeletedConversations();

      expect(testFactory.conversation_repository.conversationState.conversations().length).toBe(2);
    });
  });

  describe('deleteConversationLocally', () => {});
});
