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
import {GenericMessage, LegalHoldStatus, Text} from '@wireapp/protocol-messaging';

import {createRandomUuid} from 'Util/util';

import {backendConfig} from '../../api/testResolver';

import {GENERIC_MESSAGE_TYPE} from 'src/script/cryptography/GenericMessageType';
import {Conversation} from 'src/script/entity/Conversation';
import {User} from 'src/script/entity/User';
import {Message} from 'src/script/entity/message/Message';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';

import {ClientEvent} from 'src/script/event/Client';
import {BackendEvent} from 'src/script/event/Backend';
import {WebAppEvents} from 'src/script/event/WebApp';
import {NOTIFICATION_HANDLING_STATE} from 'src/script/event/NotificationHandlingState';
import {EventRepository} from 'src/script/event/EventRepository';
import {ClientEntity} from 'src/script/client/ClientEntity';

import {EventInfoEntity} from 'src/script/conversation/EventInfoEntity';
import {ConversationType} from 'src/script/conversation/ConversationType';
import {ConversationStatus} from 'src/script/conversation/ConversationStatus';
import {ACCESS_ROLE} from 'src/script/conversation/AccessRole';
import {ACCESS_MODE} from 'src/script/conversation/AccessMode';
import {NOTIFICATION_STATE} from 'src/script/conversation/NotificationSetting';
import {ConversationMapper} from 'src/script/conversation/ConversationMapper';
import {ConversationVerificationState} from 'src/script/conversation/ConversationVerificationState';
import {ReceiptMode} from 'src/script/conversation/ReceiptMode';

import {AssetTransferState} from 'src/script/assets/AssetTransferState';
import {StorageSchemata} from 'src/script/storage/StorageSchemata';
import {File} from 'src/script/entity/message/File';

import {ConnectionEntity} from 'src/script/connection/ConnectionEntity';
import {MessageCategory} from 'src/script/message/MessageCategory';
import {UserGenerator} from '../../helper/UserGenerator';

describe('ConversationRepository', () => {
  const test_factory = new TestFactory();

  let conversation_et = null;
  let self_user_et = null;
  let server = null;
  let storage_service = null;

  const _find_conversation = (conversation, conversations) => {
    return ko.utils.arrayFirst(conversations(), _conversation => _conversation.id === conversation.id);
  };

  const _generate_conversation = (
    conversation_type = ConversationType.GROUP,
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

    return test_factory.exposeConversationActors().then(conversation_repository => {
      amplify.publish(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE, NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
      ({storageService: storage_service} = conversation_repository.conversation_service);

      spyOn(TestFactory.event_repository, 'injectEvent').and.returnValue(Promise.resolve({}));
      conversation_et = _generate_conversation(ConversationType.SELF);
      conversation_et.id = payload.conversations.knock.post.conversation;

      const ping_url = `${backendConfig.restUrl}/conversations/${conversation_et.id}/knock`;
      server.respondWith('POST', ping_url, [
        201,
        {'Content-Type': 'application/json'},
        JSON.stringify(payload.conversations.knock.post),
      ]);

      const mark_as_read_url = `${backendConfig.restUrl}/conversations/${conversation_et.id}/self`;
      server.respondWith('PUT', mark_as_read_url, [200, {}, '']);

      return conversation_repository.save_conversation(conversation_et);
    });
  });

  afterEach(() => {
    server.restore();
    storage_service.clearStores();
    jQuery.ajax.restore();
    TestFactory.conversation_repository.conversations.removeAll();
  });

  describe('asset upload', () => {
    let message_et = null;

    beforeEach(() => {
      conversation_et = _generate_conversation(ConversationType.GROUP);

      return TestFactory.conversation_repository.save_conversation(conversation_et).then(() => {
        const file_et = new File();
        file_et.status(AssetTransferState.UPLOADING);
        message_et = new ContentMessage(createRandomUuid());
        message_et.assets.push(file_et);
        conversation_et.add_message(message_et);

        spyOn(TestFactory.event_service, 'updateEventAsUploadSucceeded');
        spyOn(TestFactory.event_service, 'updateEventAsUploadFailed');
        spyOn(TestFactory.event_service, 'deleteEvent');
      });
    });

    afterEach(() => conversation_et.remove_messages());

    it('should update original asset when asset upload is complete', () => {
      // mocked event response
      const event = {
        conversation: conversation_et.id,
        data: {
          id: createRandomUuid(),
          otr_key: new Uint8Array([]),
          sha256: new Uint8Array([]),
        },
        from: createRandomUuid(),
        id: message_et.id,
        time: Date.now(),
        type: ClientEvent.CONVERSATION.ASSET_ADD,
      };

      return TestFactory.conversation_repository._on_asset_upload_complete(conversation_et, event).then(() => {
        expect(TestFactory.event_service.updateEventAsUploadSucceeded).toHaveBeenCalled();

        const [firstAsset] = message_et.assets();

        expect(firstAsset.original_resource().otrKey).toBe(event.data.otr_key);
        expect(firstAsset.original_resource().sha256).toBe(event.data.sha256);
        expect(firstAsset.status()).toBe(AssetTransferState.UPLOADED);
      });
    });
  });

  describe('_checkLegalHoldStatus', () => {
    it('injects legal hold system messages when user A discovers that user B is on legal hold when receiving a message from user B for the very first time', async () => {
      const conversationPartner = UserGenerator.getRandomUser();
      TestFactory.user_repository.users.push(conversationPartner);

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
        type: ConversationType.GROUP,
      };

      const conversationEntity = new ConversationMapper().mapConversations([conversationJsonFromBackend])[0];
      conversationEntity.participating_user_ets.push(conversationPartner);
      conversationEntity.selfUser(TestFactory.user_repository.self());

      expect(conversationEntity._isInitialized()).toBe(true);
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

      const missingClientsError = new Error();
      missingClientsError.deleted = {};
      missingClientsError.missing = {
        [conversationPartner.id]: ['1e66e04948938c2c', '53761bec3f10a6d9', 'a9c8c385737b14fe'],
      };
      missingClientsError.redundant = {};
      missingClientsError.time = new Date().toISOString();

      spyOn(TestFactory.conversation_service, 'post_encrypted_message').and.returnValue(
        Promise.reject(missingClientsError),
      );

      spyOn(TestFactory.client_service, 'getClientsByUserId').and.returnValue(
        Promise.resolve([
          {
            class: 'desktop',
            id: '1e66e04948938c2c',
          },
          {
            class: 'legalhold',
            id: '53761bec3f10a6d9',
          },
          {
            class: 'desktop',
            id: 'a9c8c385737b14fe',
          },
        ]),
      );

      spyOn(TestFactory.conversation_repository, 'injectLegalHoldMessage').and.callFake(({legalHoldStatus}) => {
        expect(legalHoldStatus).toBe(LegalHoldStatus.ENABLED);
      });

      await TestFactory.conversation_repository.save_conversation(conversationEntity);
      await TestFactory.conversation_repository._checkLegalHoldStatus(conversationEntity, eventJson);

      expect(TestFactory.conversation_repository.injectLegalHoldMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateAllClients', () => {
    it(`updates a conversation's legal hold status when it discovers during message sending that a legal hold client got removed from a participant`, async () => {
      const conversationPartner = UserGenerator.getRandomUser();
      TestFactory.user_repository.users.push(conversationPartner);

      const conversationJsonFromDb = {
        accessModes: [ACCESS_MODE.INVITE, ACCESS_MODE.CODE],
        accessRole: ACCESS_ROLE.NON_ACTIVATED,
        archived_state: false,
        archived_timestamp: 0,
        cleared_timestamp: 0,
        creator: conversationPartner.id,
        ephemeral_timer: null,
        global_message_timer: null,
        id: createRandomUuid(),
        is_guest: false,
        is_managed: false,
        last_event_timestamp: 1563965225224,
        last_read_timestamp: 1563965225224,
        last_server_timestamp: 1563965229043,
        legal_hold_status: LegalHoldStatus.ENABLED,
        message_timer: null,
        muted_state: NOTIFICATION_STATE.MENTIONS_AND_REPLIES,
        muted_timestamp: 0,
        name: 'Test Group',
        others: [conversationPartner.id],
        receipt_mode: ReceiptMode.DELIVERY_AND_READ,
        status: ConversationStatus.CURRENT_MEMBER,
        team_id: createRandomUuid(),
        type: ConversationType.GROUP,
        verification_state: ConversationVerificationState.UNVERIFIED,
      };

      const clientsPayload = [
        {
          class: 'desktop',
          id: '1e66e04948938c2c',
        },
        {
          class: 'legalhold',
          id: '53761bec3f10a6d9',
        },
        {
          class: 'desktop',
          id: 'a9c8c385737b14fe',
        },
      ];

      for (const clientPayload of clientsPayload) {
        const wasClientAdded = await TestFactory.user_repository.addClientToUser(
          conversationPartner.id,
          clientPayload,
          false,
        );

        expect(wasClientAdded).toBe(true);
      }

      const conversationEntity = new ConversationMapper().mapConversations([conversationJsonFromDb])[0];
      conversationEntity.participating_user_ets.push(conversationPartner);
      conversationEntity.selfUser(TestFactory.user_repository.self());
      // Legal hold status is "on" because our conversation partner has a legal hold client
      expect(conversationEntity.hasLegalHold()).toBe(true);

      await TestFactory.conversation_repository.save_conversation(conversationEntity);

      const missingClientsError = new Error();
      missingClientsError.deleted = {
        // Legal hold client got removed
        [conversationPartner.id]: ['53761bec3f10a6d9'],
      };
      missingClientsError.missing = {};
      missingClientsError.redundant = {};
      missingClientsError.time = new Date().toISOString();

      spyOn(TestFactory.conversation_service, 'post_encrypted_message').and.returnValue(
        Promise.reject(missingClientsError),
      );

      spyOn(TestFactory.client_repository, 'removeClient').and.returnValue(Promise.resolve());

      // Start client discovery of conversation participants
      await TestFactory.conversation_repository.updateAllClients(conversationEntity);

      expect(conversationEntity.hasLegalHold()).toBe(false);
    });
  });

  describe('deleteMessageForEveryone', () => {
    beforeEach(() => {
      conversation_et = _generate_conversation(ConversationType.GROUP);
      spyOn(TestFactory.conversation_repository, '_sendGenericMessage').and.returnValue(Promise.resolve());
    });

    it('should not delete other users messages', done => {
      const user_et = new User();
      user_et.is_me = false;
      const message_to_delete_et = new Message(createRandomUuid());
      message_to_delete_et.user(user_et);
      conversation_et.add_message(message_to_delete_et);

      TestFactory.conversation_repository
        .deleteMessageForEveryone(conversation_et, message_to_delete_et)
        .then(done.fail)
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.error.ConversationError));
          expect(error.type).toBe(z.error.ConversationError.TYPE.WRONG_USER);
          done();
        });
    });

    it('should send delete and deletes message for own messages', () => {
      spyOn(TestFactory.event_service, 'deleteEvent');
      const userEntity = new User();
      userEntity.is_me = true;
      const messageEntityToDelete = new Message();
      messageEntityToDelete.id = createRandomUuid();
      messageEntityToDelete.user(userEntity);
      conversation_et.add_message(messageEntityToDelete);

      spyOn(TestFactory.conversation_repository, 'get_conversation_by_id').and.returnValue(
        Promise.resolve(conversation_et),
      );

      return TestFactory.conversation_repository
        .deleteMessageForEveryone(conversation_et, messageEntityToDelete)
        .then(() => {
          expect(TestFactory.event_service.deleteEvent).toHaveBeenCalledTimes(1);
        });
    });
  });

  describe('filtered_conversations', () => {
    it('should not contain the self conversation', () => {
      const self_conversation_et = _generate_conversation(ConversationType.SELF);

      return TestFactory.conversation_repository.save_conversation(self_conversation_et).then(() => {
        expect(
          _find_conversation(self_conversation_et, TestFactory.conversation_repository.conversations),
        ).not.toBeUndefined();

        expect(
          _find_conversation(self_conversation_et, TestFactory.conversation_repository.filtered_conversations),
        ).toBeUndefined();
      });
    });

    it('should not contain a blocked conversations', () => {
      const blocked_conversation_et = _generate_conversation(ConversationType.ONE2ONE, ConnectionStatus.BLOCKED);

      return TestFactory.conversation_repository.save_conversation(blocked_conversation_et).then(() => {
        expect(
          _find_conversation(blocked_conversation_et, TestFactory.conversation_repository.conversations),
        ).not.toBeUndefined();

        expect(
          _find_conversation(blocked_conversation_et, TestFactory.conversation_repository.filtered_conversations),
        ).toBeUndefined();
      });
    });

    it('should not contain the conversation for a cancelled connection request', () => {
      const cancelled_conversation_et = _generate_conversation(ConversationType.ONE2ONE, ConnectionStatus.CANCELLED);

      return TestFactory.conversation_repository.save_conversation(cancelled_conversation_et).then(() => {
        expect(
          _find_conversation(cancelled_conversation_et, TestFactory.conversation_repository.conversations),
        ).not.toBeUndefined();

        expect(
          _find_conversation(cancelled_conversation_et, TestFactory.conversation_repository.filtered_conversations),
        ).toBeUndefined();
      });
    });

    it('should not contain the conversation for a pending connection request', () => {
      const pending_conversation_et = _generate_conversation(ConversationType.ONE2ONE, ConnectionStatus.PENDING);

      return TestFactory.conversation_repository.save_conversation(pending_conversation_et).then(() => {
        expect(
          _find_conversation(pending_conversation_et, TestFactory.conversation_repository.conversations),
        ).not.toBeUndefined();

        expect(
          _find_conversation(pending_conversation_et, TestFactory.conversation_repository.filtered_conversations),
        ).toBeUndefined();
      });
    });
  });

  describe('get1To1Conversation', () => {
    beforeEach(() => TestFactory.conversation_repository.conversations([]));

    it('finds an existing 1:1 conversation within a team', () => {
      // prettier-ignore
      /* eslint-disable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
      const team1to1Conversation = {
        'access': ['invite'],
        'creator': '109da9ca-a495-47a8-ac70-9ffbe924b2d0',
        'members': {
          'self': {
            'hidden_ref': null,
            'status': 0,
            'service': null,
            'otr_muted_ref': null,
            'status_time': '1970-01-01T00:00:00.000Z',
            'hidden': false,
            'status_ref': '0.0',
            'id': '109da9ca-a495-47a8-ac70-9ffbe924b2d0',
            'otr_archived': false,
            'otr_muted': false,
            'otr_archived_ref': null,
          }, 'others': [{'status': 0, 'id': 'f718410c-3833-479d-bd80-a5df03f38414'}],
        },
        'name': null,
        'team': 'cf162e22-20b8-4533-a5ab-d3f5dde39d2c',
        'id': '04ab891e-ccf1-4dba-9d74-bacec64b5b1e',
        'type': 0,
        'last_event_time': '1970-01-01T00:00:00.000Z',
        'last_event': '0.0',
      };
      /* eslint-disable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */

      const conversationMapper = TestFactory.conversation_repository.conversationMapper;
      const [newConversationEntity] = conversationMapper.mapConversations([team1to1Conversation]);
      TestFactory.conversation_repository.conversations.push(newConversationEntity);

      const teamId = team1to1Conversation.team;
      const teamMemberId = team1to1Conversation.members.others[0].id;
      const userEntity = new User(teamMemberId);
      userEntity.inTeam(true);
      userEntity.isTeamMember(true);
      userEntity.teamId = teamId;

      return TestFactory.conversation_repository.get1To1Conversation(userEntity).then(conversationEntity => {
        expect(conversationEntity).toBe(newConversationEntity);
      });
    });
  });

  describe('getGroupsByName', () => {
    beforeEach(() => {
      const group_a = _generate_conversation(ConversationType.GROUP);
      group_a.name('Web Dudes');

      const group_b = _generate_conversation(ConversationType.GROUP);
      group_b.name('René, Benny, Gregor, Lipis');

      const group_c = _generate_conversation(ConversationType.GROUP);
      self_user_et = new User();
      self_user_et.name('John');
      group_c.participating_user_ets.push(self_user_et);

      const group_cleared = _generate_conversation(ConversationType.GROUP);
      group_cleared.name('Cleared');
      group_cleared.last_event_timestamp(Date.now() - 1000);
      group_cleared.setTimestamp(Date.now(), Conversation.TIMESTAMP_TYPE.CLEARED);

      const group_removed = _generate_conversation(ConversationType.GROUP);
      group_removed.name('Removed');
      group_removed.last_event_timestamp(Date.now() - 1000);
      group_removed.setTimestamp(Date.now(), Conversation.TIMESTAMP_TYPE.CLEARED);
      group_removed.status(ConversationStatus.PAST_MEMBER);

      return Promise.all([
        TestFactory.conversation_repository.save_conversation(group_a),
        TestFactory.conversation_repository.save_conversation(group_b),
        TestFactory.conversation_repository.save_conversation(group_c),
        TestFactory.conversation_repository.save_conversation(group_cleared),
      ]);
    });

    it('should return expected matches', () => {
      let result = TestFactory.conversation_repository.getGroupsByName('Web Dudes');

      expect(result.length).toBe(1);

      result = TestFactory.conversation_repository.getGroupsByName('Dudes');

      expect(result.length).toBe(1);

      result = TestFactory.conversation_repository.getGroupsByName('e');

      expect(result.length).toBe(3);

      result = TestFactory.conversation_repository.getGroupsByName('Rene');

      expect(result.length).toBe(1);

      result = TestFactory.conversation_repository.getGroupsByName('John');

      expect(result.length).toBe(1);
    });

    it('should return a cleared group with the user still being member of it', () => {
      const result = TestFactory.conversation_repository.getGroupsByName('Cleared');

      expect(result.length).toBe(1);
    });

    it('should not return a cleared group that the user left', () => {
      const result = TestFactory.conversation_repository.getGroupsByName('Removed');

      expect(result.length).toBe(0);
    });
  });

  describe('getPrecedingMessages', () => {
    it('gets messages which are not broken by design', () => {
      spyOn(TestFactory.user_repository, 'get_user_by_id').and.returnValue(Promise.resolve(new User()));

      conversation_et = new Conversation(createRandomUuid());
      // prettier-ignore
      /* eslint-disable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
      const bad_message = {
        'conversation': `${conversation_et.id}`,
        'id': 'aeac8355-739b-4dfc-a119-891a52c6a8dc',
        'from': '532af01e-1e24-4366-aacf-33b67d4ee376',
        'data': {'content': 'Hello World :)', 'nonce': 'aeac8355-739b-4dfc-a119-891a52c6a8dc'},
        'type': 'conversation.message-add',
      };
      // prettier-ignore
      const good_message = {
        'conversation': `${conversation_et.id}`,
        'id': '5a8cd79a-82bb-49ca-a59e-9a8e76df77fb',
        'from': '8b497692-7a38-4a5d-8287-e3d1006577d6',
        'time': '2016-08-04T13:28:33.389Z',
        'data': {'content': 'Fifth message', 'nonce': '5a8cd79a-82bb-49ca-a59e-9a8e76df77fb', 'previews': []},
        'type': 'conversation.message-add',
      };
      /* eslint-enable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */

      const bad_message_key = `${conversation_et.id}@${bad_message.from}@NaN`;

      return storage_service
        .save(StorageSchemata.OBJECT_STORE.EVENTS, bad_message_key, bad_message)
        .catch(() => storage_service.save(StorageSchemata.OBJECT_STORE.EVENTS, undefined, good_message))
        .then(() => TestFactory.conversation_repository.getPrecedingMessages(conversation_et))
        .then(loaded_events => {
          expect(loaded_events.length).toBe(1);
        });
    });
  });

  describe('map_connection', () => {
    let connectionEntity = undefined;

    beforeEach(() => {
      connectionEntity = new ConnectionEntity();
      connectionEntity.conversationId = conversation_et.id;

      // prettier-ignore
      /* eslint-disable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
      const conversation_payload = {
        'creator': conversation_et.id,
        'members': {
          'self': {
            'status': 0,
            'last_read': '1.800122000a54449c',
            'muted_time': null,
            'muted': null,
            'status_time': '2015-01-28T12:53:41.847Z',
            'status_ref': '0.0',
            'id': conversation_et.id,
            'archived': null,
          }, 'others': [],
        },
        'name': null,
        'id': conversation_et.id,
        'type': 0,
        'last_event_time': '2015-03-20T13:41:12.580Z',
        'last_event': '25.800122000a0b0bc9',
      };
      /* eslint-disable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */

      spyOn(TestFactory.conversation_repository, 'fetch_conversation_by_id').and.callThrough();
      spyOn(TestFactory.conversation_service, 'get_conversation_by_id').and.returnValue(
        Promise.resolve(conversation_payload),
      );
    });

    it('should map a connection to an existing conversation', () => {
      return TestFactory.conversation_repository.map_connection(connectionEntity).then(_conversation => {
        expect(TestFactory.conversation_repository.fetch_conversation_by_id).not.toHaveBeenCalled();
        expect(TestFactory.conversation_service.get_conversation_by_id).not.toHaveBeenCalled();
        expect(_conversation.connection()).toBe(connectionEntity);
      });
    });

    it('should map a connection to a new conversation', () => {
      connectionEntity.status(ConnectionStatus.ACCEPTED);
      TestFactory.conversation_repository.conversations.removeAll();

      return TestFactory.conversation_repository.map_connection(connectionEntity).then(_conversation => {
        expect(TestFactory.conversation_repository.fetch_conversation_by_id).toHaveBeenCalled();
        expect(TestFactory.conversation_service.get_conversation_by_id).toHaveBeenCalled();
        expect(_conversation.connection()).toBe(connectionEntity);
      });
    });

    it('should map a cancelled connection to an existing conversation and filter it', () => {
      connectionEntity.status(ConnectionStatus.CANCELLED);

      return TestFactory.conversation_repository.map_connection(connectionEntity).then(_conversation => {
        expect(_conversation.connection()).toBe(connectionEntity);
        expect(
          _find_conversation(_conversation, TestFactory.conversation_repository.conversations),
        ).not.toBeUndefined();

        expect(
          _find_conversation(_conversation, TestFactory.conversation_repository.filtered_conversations),
        ).toBeUndefined();
      });
    });
  });

  describe('_handleConversationEvent', () => {
    it('detects events send by a user not in the conversation', () => {
      const conversationEntity = _generate_conversation(ConversationType.GROUP);
      const event = {
        conversation: conversationEntity.id,
        from: createRandomUuid(),
        id: createRandomUuid(),
        time: '2017-09-06T09:43:36.528Z',
        data: {},
        type: 'conversation.message-add',
      };

      spyOn(TestFactory.conversation_repository, 'addMissingMember').and.returnValue(
        Promise.resolve(conversationEntity),
      );
      spyOn(TestFactory.conversation_repository, 'get_conversation_by_id').and.returnValue(
        Promise.resolve(conversationEntity),
      );

      return TestFactory.conversation_repository._handleConversationEvent(event).then(() => {
        expect(TestFactory.conversation_repository.addMissingMember).toHaveBeenCalledWith(
          event.conversation,
          [event.from],
          new Date(event.time).getTime() - 1,
        );
      });
    });

    describe('conversation.asset-add', () => {
      beforeEach(() => {
        const matchUsers = new RegExp(`${backendConfig.restUrl}/users\\?ids=([a-z0-9-,]+)`);
        server.respondWith('GET', matchUsers, (xhr, ids) => {
          const users = [];
          for (const userId of ids.split(',')) {
            users.push({
              handle: `handle_${userId}`,
              locale: 'en',
              accent_id: 0,
              picture: [
                {
                  content_length: 19190,
                  data: null,
                  content_type: 'image/jpeg',
                  id: 'ab7eb2f7-7c5b-4e55-ab16-dfc206891e67',
                  info: {
                    height: 280,
                    tag: 'smallProfile',
                    original_width: 620,
                    width: 280,
                    correlation_id: '7dfa4adf-454e-4372-a06a-7403baa36e5c',
                    original_height: 960,
                    nonce: '7dfa4adf-454e-4372-a06a-7403baa36e5c',
                    public: true,
                  },
                },
                {
                  content_length: 82690,
                  data: null,
                  content_type: 'image/jpeg',
                  id: '87c95372-fce7-4215-861a-a3e0fe262e48',
                  info: {
                    height: 960,
                    tag: 'medium',
                    original_width: 620,
                    width: 620,
                    correlation_id: '7dfa4adf-454e-4372-a06a-7403baa36e5c',
                    original_height: 960,
                    nonce: '7dfa4adf-454e-4372-a06a-7403baa36e5c',
                    public: true,
                  },
                },
              ],
              name: `name_${userId}`,
              id: userId,
              assets: [],
            });
          }
          xhr.respond(200, {'Content-Type': 'application/json'}, JSON.stringify(users));
        });

        const matchConversations = new RegExp(`${backendConfig.restUrl}/conversations/([a-z0-9-]+)`);
        server.respondWith('GET', matchConversations, (xhr, conversationId) => {
          const conversation = {
            access: ['private'],
            creator: '6761450e-1bd6-4027-a338-1191fe5e349f',
            members: {
              self: {
                hidden_ref: null,
                status: 0,
                service: null,
                otr_muted_ref: null,
                status_time: '1970-01-01T00:00:00.000Z',
                hidden: false,
                status_ref: '0.0',
                id: '8a88604a-430a-42ed-966e-19a35c3d292a',
                otr_archived: false,
                otr_muted: false,
                otr_archived_ref: null,
              },
              others: [{status: 0, id: '6761450e-1bd6-4027-a338-1191fe5e349f'}],
            },
            name: null,
            team: null,
            id: conversationId,
            type: 2,
            last_event_time: '1970-01-01T00:00:00.000Z',
            last_event: '0.0',
          };
          xhr.respond(200, {'Content-Type': 'application/json'}, JSON.stringify(conversation));
        });
      });

      it('removes a file upload from the messages list of the sender when the upload gets canceled', () => {
        const conversation_id = createRandomUuid();
        const message_id = createRandomUuid();
        const sending_user_id = TestFactory.user_repository.self().id;

        // prettier-ignore
        const upload_start = {
          'conversation': conversation_id,
          'from': sending_user_id,
          'id': message_id,
          'status': 1,
          'time': '2017-09-06T09:43:32.278Z',
          'data': {
            'content_length': 23089240,
            'content_type': 'application/x-msdownload',
            'info': {'name': 'AirDroid_Desktop_Client_3.4.2.0.exe', 'nonce': '79072f78-15ee-4d54-a63c-fd46cd5607ae'},
          },
          'type': 'conversation.asset-add',
          'category': 512,
          'primary_key': 107,
        };
        // prettier-ignore
        const upload_cancel = {
          'conversation': conversation_id,
          'from': sending_user_id,
          'id': message_id,
          'status': 1,
          'time': '2017-09-06T09:43:36.528Z',
          'data': {'reason': 0, 'status': 'upload-failed'},
          'type': 'conversation.asset-add',
        };

        return TestFactory.conversation_repository
          .fetch_conversation_by_id(conversation_id)
          .then(fetched_conversation => {
            expect(fetched_conversation).toBeDefined();
            TestFactory.conversation_repository.active_conversation(fetched_conversation);
            return TestFactory.conversation_repository._handleConversationEvent(upload_start);
          })
          .then(() => {
            const number_of_messages = Object.keys(TestFactory.conversation_repository.active_conversation().messages())
              .length;

            expect(number_of_messages).toBe(1);
            return TestFactory.conversation_repository._handleConversationEvent(upload_cancel);
          })
          .then(() => {
            const number_of_messages = Object.keys(TestFactory.conversation_repository.active_conversation().messages())
              .length;

            expect(number_of_messages).toBe(0);
          });
      });

      it('removes a file upload from the messages list of the receiver when the upload gets canceled', () => {
        const conversation_id = createRandomUuid();
        const message_id = createRandomUuid();
        const sending_user_id = createRandomUuid();

        // prettier-ignore
        const upload_start = {
          'conversation': conversation_id,
          'from': sending_user_id,
          'id': message_id,
          'status': 1,
          'time': '2017-09-06T09:43:32.278Z',
          'data': {
            'content_length': 23089240,
            'content_type': 'application/x-msdownload',
            'info': {'name': 'AirDroid_Desktop_Client_3.4.2.0.exe', 'nonce': '79072f78-15ee-4d54-a63c-fd46cd5607ae'},
          },
          'type': 'conversation.asset-add',
          'category': 512,
          'primary_key': 107,
        };
        // prettier-ignore
        const upload_cancel = {
          'conversation': conversation_id,
          'from': sending_user_id,
          'id': message_id,
          'status': 1,
          'time': '2017-09-06T09:43:36.528Z',
          'data': {'reason': 0, 'status': 'upload-failed'},
          'type': 'conversation.asset-add',
        };

        return TestFactory.conversation_repository
          .fetch_conversation_by_id(conversation_id)
          .then(fetched_conversation => {
            expect(fetched_conversation).toBeDefined();
            TestFactory.conversation_repository.active_conversation(fetched_conversation);
            return TestFactory.conversation_repository._handleConversationEvent(upload_start);
          })
          .then(() => {
            const number_of_messages = Object.keys(TestFactory.conversation_repository.active_conversation().messages())
              .length;

            expect(number_of_messages).toBe(1);
            return TestFactory.conversation_repository._handleConversationEvent(upload_cancel);
          })
          .then(() => {
            const number_of_messages = Object.keys(TestFactory.conversation_repository.active_conversation().messages())
              .length;

            expect(number_of_messages).toBe(0);
          });
      });

      it("shows a failed message on the sender's side if the upload fails", () => {
        const conversation_id = createRandomUuid();
        const message_id = createRandomUuid();
        const sending_user_id = TestFactory.user_repository.self().id;

        // prettier-ignore
        const upload_start = {
          'conversation': conversation_id,
          'from': sending_user_id,
          'id': message_id,
          'status': 1,
          'time': '2017-09-06T09:43:32.278Z',
          'data': {
            'content_length': 23089240,
            'content_type': 'application/x-msdownload',
            'info': {'name': 'AirDroid_Desktop_Client_3.4.2.0.exe', 'nonce': '79072f78-15ee-4d54-a63c-fd46cd5607ae'},
          },
          'type': 'conversation.asset-add',
          'category': 512,
          'primary_key': 107,
        };
        // prettier-ignore
        const upload_failed = {
          'conversation': conversation_id,
          'from': sending_user_id,
          'id': message_id,
          'status': 1,
          'time': '2017-09-06T16:14:08.165Z',
          'data': {'reason': 1, 'status': 'upload-failed'},
          'type': 'conversation.asset-add',
        };

        return TestFactory.conversation_repository
          .fetch_conversation_by_id(conversation_id)
          .then(fetched_conversation => {
            expect(fetched_conversation).toBeDefined();
            TestFactory.conversation_repository.active_conversation(fetched_conversation);
            return TestFactory.conversation_repository._handleConversationEvent(upload_start);
          })
          .then(() => {
            const number_of_messages = Object.keys(TestFactory.conversation_repository.active_conversation().messages())
              .length;

            expect(number_of_messages).toBe(1);
            return TestFactory.conversation_repository._handleConversationEvent(upload_failed);
          })
          .then(() => {
            const number_of_messages = Object.keys(TestFactory.conversation_repository.active_conversation().messages())
              .length;

            expect(number_of_messages).toBe(1);
          });
      });
    });

    describe('conversation.create', () => {
      let conversationId = null;
      let createEvent = null;

      beforeEach(() => {
        spyOn(TestFactory.conversation_repository, '_onCreate').and.callThrough();
        spyOn(TestFactory.conversation_repository, 'mapConversations').and.returnValue(
          new Conversation(createRandomUuid()),
        );
        spyOn(TestFactory.conversation_repository, 'updateParticipatingUserEntities').and.returnValue(true);
        spyOn(TestFactory.conversation_repository, 'save_conversation').and.returnValue(false);

        conversationId = createRandomUuid();
        createEvent = {conversation: conversationId, data: {}, type: BackendEvent.CONVERSATION.CREATE};
      });

      it('should process create event for a new conversation created locally', () => {
        return TestFactory.conversation_repository._handleConversationEvent(createEvent).then(() => {
          expect(TestFactory.conversation_repository._onCreate).toHaveBeenCalled();
          expect(TestFactory.conversation_repository.mapConversations).toHaveBeenCalledWith(createEvent.data, 1);
        });
      });

      it('should process create event for a new conversation created remotely', () => {
        const time = new Date();
        createEvent.time = time.toISOString();

        return TestFactory.conversation_repository._handleConversationEvent(createEvent).then(() => {
          expect(TestFactory.conversation_repository._onCreate).toHaveBeenCalled();
          expect(TestFactory.conversation_repository.mapConversations).toHaveBeenCalledWith(
            createEvent.data,
            time.getTime(),
          );
        });
      });
    });

    describe('conversation.member-join', () => {
      let memberJoinEvent = null;

      beforeEach(() => {
        spyOn(TestFactory.conversation_repository, '_onMemberJoin').and.callThrough();
        spyOn(TestFactory.conversation_repository, 'updateParticipatingUserEntities').and.callThrough();
        spyOn(TestFactory.user_repository, 'get_users_by_id').and.returnValue(Promise.resolve([]));

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
        return TestFactory.conversation_repository._handleConversationEvent(memberJoinEvent).then(() => {
          expect(TestFactory.conversation_repository._onMemberJoin).toHaveBeenCalled();
          expect(TestFactory.conversation_repository.updateParticipatingUserEntities).toHaveBeenCalled();
        });
      });

      it('should ignore member-join event when joining a 1to1 conversation', () => {
        // conversation has a corresponding pending connection
        const connectionEntity = new ConnectionEntity();
        connectionEntity.conversationId = conversation_et.id;
        connectionEntity.status(ConnectionStatus.PENDING);
        TestFactory.connection_repository.connectionEntities.push(connectionEntity);

        return TestFactory.conversation_repository._handleConversationEvent(memberJoinEvent).then(() => {
          expect(TestFactory.conversation_repository._onMemberJoin).toHaveBeenCalled();
          expect(TestFactory.conversation_repository.updateParticipatingUserEntities).not.toHaveBeenCalled();
        });
      });
    });

    describe('conversation.message-delete', () => {
      let message_et = undefined;

      beforeEach(() => {
        conversation_et = _generate_conversation(ConversationType.GROUP);
        return TestFactory.conversation_repository.save_conversation(conversation_et).then(() => {
          message_et = new Message(createRandomUuid());
          message_et.from = TestFactory.user_repository.self().id;
          conversation_et.add_message(message_et);

          spyOn(TestFactory.conversation_repository, '_addDeleteMessage');
          spyOn(TestFactory.conversation_repository, '_onMessageDeleted').and.callThrough();
        });
      });

      afterEach(() => conversation_et.remove_messages());

      it('should not delete message if user is not matching', done => {
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

        expect(conversation_et.getMessage(message_et.id)).toBeDefined();
        TestFactory.conversation_repository
          ._handleConversationEvent(message_delete_event)
          .then(done.fail)
          .catch(error => {
            expect(error).toEqual(jasmine.any(z.error.ConversationError));
            expect(error.type).toBe(z.error.ConversationError.TYPE.WRONG_USER);
            expect(TestFactory.conversation_repository._onMessageDeleted).toHaveBeenCalled();
            expect(conversation_et.getMessage(message_et.id)).toBeDefined();
            expect(TestFactory.conversation_repository._addDeleteMessage).not.toHaveBeenCalled();
            done();
          });
      });

      it('should delete message if user is self', () => {
        spyOn(TestFactory.event_service, 'deleteEvent');
        const message_delete_event = {
          conversation: conversation_et.id,
          data: {
            message_id: message_et.id,
          },
          from: TestFactory.user_repository.self().id,
          id: createRandomUuid(),
          time: new Date().toISOString(),
          type: ClientEvent.CONVERSATION.MESSAGE_DELETE,
        };

        expect(conversation_et.getMessage(message_et.id)).toBeDefined();
        return TestFactory.conversation_repository._handleConversationEvent(message_delete_event).then(() => {
          expect(TestFactory.conversation_repository._onMessageDeleted).toHaveBeenCalled();
          expect(TestFactory.event_service.deleteEvent).toHaveBeenCalledTimes(1);
          expect(TestFactory.conversation_repository._addDeleteMessage).not.toHaveBeenCalled();
        });
      });

      it('should delete message and add delete message if user is not self', () => {
        spyOn(TestFactory.event_service, 'deleteEvent');
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

        expect(conversation_et.getMessage(message_et.id)).toBeDefined();
        return TestFactory.conversation_repository._handleConversationEvent(message_delete_event).then(() => {
          expect(TestFactory.conversation_repository._onMessageDeleted).toHaveBeenCalled();
          expect(TestFactory.event_service.deleteEvent).toHaveBeenCalledTimes(1);
          expect(TestFactory.conversation_repository._addDeleteMessage).toHaveBeenCalled();
        });
      });

      it('should delete message and skip adding delete message for ephemeral messages', () => {
        spyOn(TestFactory.event_service, 'deleteEvent');
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

        expect(conversation_et.getMessage(message_et.id)).toBeDefined();
        return TestFactory.conversation_repository._handleConversationEvent(message_delete_event).then(() => {
          expect(TestFactory.conversation_repository._onMessageDeleted).toHaveBeenCalled();
          expect(TestFactory.event_service.deleteEvent).toHaveBeenCalledTimes(1);
          expect(TestFactory.conversation_repository._addDeleteMessage).not.toHaveBeenCalled();
        });
      });
    });

    describe('conversation.message-hidden', () => {
      let messageId = null;

      beforeEach(() => {
        conversation_et = _generate_conversation(ConversationType.GROUP);

        return TestFactory.conversation_repository.save_conversation(conversation_et).then(() => {
          const messageToHideEt = new Message(createRandomUuid());
          conversation_et.add_message(messageToHideEt);

          messageId = messageToHideEt.id;
          spyOn(TestFactory.conversation_repository, '_onMessageHidden').and.callThrough();
        });
      });

      it('should not hide message if sender is not self user', done => {
        const messageHiddenEvent = {
          conversation: conversation_et.id,
          data: {
            message_id: messageId,
            conversation_id: conversation_et.id,
          },
          from: createRandomUuid(),
          id: createRandomUuid(),
          time: new Date().toISOString(),
          type: ClientEvent.CONVERSATION.MESSAGE_HIDDEN,
        };

        expect(conversation_et.getMessage(messageId)).toBeDefined();

        TestFactory.conversation_repository
          ._handleConversationEvent(messageHiddenEvent)
          .then(done.fail)
          .catch(error => {
            expect(error).toEqual(jasmine.any(z.error.ConversationError));
            expect(error.type).toBe(z.error.ConversationError.TYPE.WRONG_USER);
            expect(TestFactory.conversation_repository._onMessageHidden).toHaveBeenCalled();
            expect(conversation_et.getMessage(messageId)).toBeDefined();
            done();
          });
      });

      it('should hide message if sender is self user', () => {
        spyOn(TestFactory.event_service, 'deleteEvent');
        const messageHiddenEvent = {
          conversation: conversation_et.id,
          data: {
            message_id: messageId,
            conversation_id: conversation_et.id,
          },
          from: TestFactory.user_repository.self().id,
          id: createRandomUuid(),
          time: new Date().toISOString(),
          type: ClientEvent.CONVERSATION.MESSAGE_HIDDEN,
        };

        expect(conversation_et.getMessage(messageId)).toBeDefined();

        return TestFactory.conversation_repository._handleConversationEvent(messageHiddenEvent).then(() => {
          expect(TestFactory.conversation_repository._onMessageHidden).toHaveBeenCalled();
          expect(TestFactory.event_service.deleteEvent).toHaveBeenCalledTimes(1);
        });
      });

      it('should not hide message if not send via self conversation', () => {
        spyOn(TestFactory.event_service, 'deleteEvent');
        const messageHiddenEvent = {
          conversation: createRandomUuid(),
          data: {
            message_id: messageId,
            conversation_id: conversation_et.id,
          },
          from: TestFactory.user_repository.self().id,
          id: createRandomUuid(),
          time: new Date().toISOString(),
          type: ClientEvent.CONVERSATION.MESSAGE_HIDDEN,
        };

        expect(conversation_et.getMessage(messageId)).toBeDefined();

        return TestFactory.conversation_repository._onMessageHidden(messageHiddenEvent).then(() => {
          expect(TestFactory.conversation_repository._onMessageHidden).toHaveBeenCalled();
          expect(TestFactory.event_service.deleteEvent).toHaveBeenCalledTimes(1);
        });
      });

      it('syncs message deletion with the database', () => {
        const deletedMessagePayload = {
          conversation: createRandomUuid(),
          id: createRandomUuid(),
        };

        const conversationEntity = new Conversation();
        spyOn(conversationEntity, 'remove_message_by_id');

        const conversationRepository = TestFactory.conversation_repository;
        spyOn(conversationRepository, 'find_conversation_by_id').and.returnValue(conversationEntity);

        conversationRepository._deleteLocalMessageEntity({oldObj: deletedMessagePayload});

        expect(conversationRepository.find_conversation_by_id).toHaveBeenCalledWith(deletedMessagePayload.conversation);
        expect(conversationEntity.remove_message_by_id).toHaveBeenCalledWith(deletedMessagePayload.id);
      });
    });
  });

  describe('find_conversation_by_id', () => {
    let conversationRepository;
    const conversationIds = ['40b05b5f-d906-4276-902c-3fa16af3b2bd', '3dd5a837-a7a5-40c6-b6c9-b1ab155e1e55'];
    beforeEach(() => {
      conversationRepository = TestFactory.conversation_repository;

      const conversationEntities = conversationIds.map(id => new Conversation(id));
      conversationRepository.conversations(conversationEntities);
    });

    afterEach(() => {
      conversationRepository.conversations([]);
    });

    it('does not return any conversation if team is marked for deletion', () => {
      spyOn(conversationRepository.teamRepository, 'isTeamDeleted').and.returnValue(false);
      conversationIds.forEach(conversationId => {
        expect(conversationRepository.find_conversation_by_id(conversationId)).toBeDefined();
      });

      conversationRepository.teamRepository.isTeamDeleted.and.returnValue(true);
      conversationIds.forEach(conversationId => {
        expect(conversationRepository.find_conversation_by_id(conversationId)).not.toBeDefined();
      });
    });

    it('returns the conversation if present in the local conversations', () => {
      conversationIds.forEach(conversationId => {
        expect(conversationRepository.find_conversation_by_id(conversationId)).toBeDefined();
      });

      const inexistentConversationIds = [
        'f573c44f-c549-4e8f-a4d5-20fdc7adc789',
        'eece4e13-41d4-4ea8-9aa3-383a710a5137',
      ];
      inexistentConversationIds.forEach(conversationId => {
        expect(conversationRepository.find_conversation_by_id(conversationId)).not.toBeDefined();
      });
    });
  });

  describe('_shouldSendAsExternal', () => {
    it('should return true for big payload', () => {
      const largeConversationEntity = _generate_conversation();
      largeConversationEntity.participating_user_ids(
        Array(128)
          .fill()
          .map((x, i) => i),
      );

      return TestFactory.conversation_repository
        .save_conversation(largeConversationEntity)
        .then(() => {
          const text = new Text({
            content:
              'massive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external messagemassive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external messagemassive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external messagemassive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external message',
          });
          const genericMessage = new GenericMessage({
            [GENERIC_MESSAGE_TYPE.TEXT]: text,
            messageId: createRandomUuid(),
          });

          const eventInfoEntity = new EventInfoEntity(genericMessage, largeConversationEntity.id);
          return TestFactory.conversation_repository._shouldSendAsExternal(eventInfoEntity);
        })
        .then(shouldSendAsExternal => {
          expect(shouldSendAsExternal).toBeTruthy();
        });
    });

    it('should return false for small payload', () => {
      const smallConversationEntity = _generate_conversation();
      smallConversationEntity.participating_user_ids([0, 1]);

      return TestFactory.conversation_repository
        .save_conversation(smallConversationEntity)
        .then(() => {
          const genericMessage = new GenericMessage({
            [GENERIC_MESSAGE_TYPE.TEXT]: new Text({content: 'Test'}),
            messageId: createRandomUuid(),
          });

          const eventInfoEntity = new EventInfoEntity(genericMessage, smallConversationEntity.id);
          return TestFactory.conversation_repository._shouldSendAsExternal(eventInfoEntity);
        })
        .then(shouldSendAsExternal => {
          expect(shouldSendAsExternal).toBeFalsy();
        });
    });
  });

  describe('sendTextWithLinkPreview', () => {
    it('sends ephemeral message (within the range [1 second, 1 year])', () => {
      const conversationRepository = TestFactory.conversation_repository;
      const conversation = _generate_conversation();
      conversationRepository.conversations([conversation]);
      const conversationPromise = Promise.resolve(conversation);

      const inBoundValues = [1000, 5000, 12341234, 31536000000];
      const outOfBoundValues = [1, 999, 31536000001, 31557600000];
      const expectedValues = inBoundValues
        .map(val => val.toString())
        .concat(['1000', '1000', '31536000000', '31536000000']);

      spyOn(conversationRepository, 'get_message_in_conversation_by_id').and.returnValue(
        Promise.resolve(new Message()),
      );
      spyOn(conversationRepository.conversation_service, 'post_encrypted_message').and.returnValue(Promise.resolve({}));
      spyOn(conversationRepository.conversationMapper, 'mapConversations').and.returnValue(conversationPromise);
      spyOn(conversationRepository.cryptography_repository, 'encryptGenericMessage').and.callFake(
        (conversationId, genericMessage) => {
          const {content, ephemeral} = genericMessage;

          expect(content).toBe(GENERIC_MESSAGE_TYPE.EPHEMERAL);
          expect(ephemeral.content).toBe(GENERIC_MESSAGE_TYPE.TEXT);
          expect(ephemeral.expireAfterMillis.toString()).toBe(expectedValues.shift());
          return Promise.resolve({
            recipients: {},
          });
        },
      );

      const sentPromises = inBoundValues.concat(outOfBoundValues).map(expiration => {
        conversation.localMessageTimer(expiration);
        conversation.selfUser(new User(createRandomUuid()));
        const messageText = 'hello there';
        return conversationRepository.sendTextWithLinkPreview(conversation, messageText);
      });
      return Promise.all(sentPromises).then(sentMessages => {
        expect(conversationRepository.conversation_service.post_encrypted_message).toHaveBeenCalledTimes(
          sentMessages.length * 2,
        );
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

      const johns_computer = new ClientEntity();
      johns_computer.id = '83ad5d3c31d3c76b';
      johns_computer.class = 'tabconst';
      john.devices.push(johns_computer);

      lara = new User();
      lara.name('Lara');

      const bobs_computer = new ClientEntity();
      bobs_computer.id = '74606e4c02b2c7f9';
      bobs_computer.class = 'desktop';

      const bobs_phone = new ClientEntity();
      bobs_phone.id = '8f63631e129ed19d';
      bobs_phone.class = 'phone';

      bob.devices.push(bobs_computer);
      bob.devices.push(bobs_phone);

      const dudes = _generate_conversation(ConversationType.GROUP);
      dudes.name('Web Dudes');
      dudes.participating_user_ets.push(bob);
      dudes.participating_user_ets.push(john);

      const gals = _generate_conversation(ConversationType.GROUP);
      gals.name('Web Gals');
      gals.participating_user_ets.push(anne);
      gals.participating_user_ets.push(jane);
      gals.participating_user_ets.push(lara);

      const mixed_group = _generate_conversation(ConversationType.GROUP);
      mixed_group.name('Web Dudes & Gals');
      mixed_group.participating_user_ets.push(anne);
      mixed_group.participating_user_ets.push(bob);
      mixed_group.participating_user_ets.push(jane);
      mixed_group.participating_user_ets.push(john);
      mixed_group.participating_user_ets.push(lara);

      return Promise.all([
        TestFactory.conversation_repository.save_conversation(dudes),
        TestFactory.conversation_repository.save_conversation(gals),
        TestFactory.conversation_repository.save_conversation(mixed_group),
      ]);
    });

    it('should know all users participating in a conversation (including the self user)', () => {
      const [, dudes] = TestFactory.conversation_repository.conversations();
      return TestFactory.conversation_repository.get_all_users_in_conversation(dudes.id).then(user_ets => {
        expect(user_ets.length).toBe(3);
        expect(TestFactory.conversation_repository.conversations().length).toBe(4);
      });
    });

    it('should generate a user-client-map including users with clients', () => {
      const [, dudes] = TestFactory.conversation_repository.conversations();
      const user_ets = dudes.participating_user_ets();

      return TestFactory.conversation_repository.create_recipients(dudes.id).then(recipients => {
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
      spyOn(TestFactory.conversation_repository, 'get_conversation_by_id').and.returnValue(Promise.resolve({}));
      spyOn(z.conversation.EventBuilder, 'buildMemberJoin').and.returnValue(event);

      return TestFactory.conversation_repository.addMissingMember(conversationId, ['unknown-user-id']).then(() => {
        expect(TestFactory.event_repository.injectEvent).toHaveBeenCalledWith(event, EventRepository.SOURCE.INJECTED);
      });
    });
  });

  describe('shouldSendReadReceipt', () => {
    it('uses the account preference for 1:1 conversations', () => {
      // Set a receipt mode on account-level
      const preferenceMode = 1;
      TestFactory.propertyRepository.receiptMode(preferenceMode);

      // Set the opposite receipt mode on conversation-level
      const conversationEntity = _generate_conversation(ConversationType.ONE2ONE);
      conversationEntity.receiptMode(!preferenceMode);

      // Verify that the account-level preference wins
      const shouldSend = TestFactory.conversation_repository.expectReadReceipt(conversationEntity);

      expect(shouldSend).toBe(!!preferenceMode);
    });

    it('uses the conversation setting for group conversations', () => {
      // Set a receipt mode on account-level
      const preferenceMode = 1;
      TestFactory.propertyRepository.receiptMode(preferenceMode);

      // Set the opposite receipt mode on conversation-level
      const conversationEntity = _generate_conversation(ConversationType.GROUP);
      conversationEntity.receiptMode(!preferenceMode);

      // Verify that the conversation-level preference wins
      const shouldSend = TestFactory.conversation_repository.expectReadReceipt(conversationEntity);

      expect(shouldSend).toBe(!!conversationEntity.receiptMode());
    });
  });

  describe('checkForDeletedConversations', () => {
    it('removes conversations that have been deleted on the backend', async () => {
      const existingGroup = _generate_conversation(ConversationType.GROUP);
      const deletedGroup = _generate_conversation(ConversationType.GROUP);
      spyOn(TestFactory.conversation_service, 'get_conversation_by_id').and.callFake(id => {
        if (id === deletedGroup.id) {
          // eslint-disable-next-line prefer-promise-reject-errors
          return Promise.reject({code: 404});
        }
        return Promise.resolve();
      });
      TestFactory.conversation_repository.save_conversation(existingGroup);
      TestFactory.conversation_repository.save_conversation(deletedGroup);
      await TestFactory.conversation_repository.checkForDeletedConversations();

      expect(TestFactory.conversation_repository.conversations().length).toBe(2);
    });
  });

  describe('deleteConversationLocally', () => {});
});
