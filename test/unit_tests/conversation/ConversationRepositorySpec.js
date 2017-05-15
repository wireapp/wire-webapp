/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

// grunt test_init && grunt test_run:conversation/ConversationRepository

'use strict';

describe('ConversationRepository', function() {
  const test_factory = new TestFactory();

  let conversation_et = null;
  let self_user_et = null;
  let server = null;
  let storage_service = null;

  const _find_conversation = function(conversation, conversations) {
    return ko.utils.arrayFirst(conversations(), (_conversation) => _conversation.id === conversation.id);
  };

  const _generate_asset_message = function(state, uploaded_on_this_client = false) {
    const file_et = new z.entity.File();
    file_et.uploaded_on_this_client(uploaded_on_this_client);
    file_et.status(state);
    const message_et = new z.entity.ContentMessage(z.util.create_random_uuid());
    message_et.assets.push(file_et);
    return message_et;
  };

  const _generate_conversation = function(conversation_type = z.conversation.ConversationType.REGULAR, connection_status = z.user.ConnectionStatus.ACCEPTED) {
    const conversation = new z.entity.Conversation(z.util.create_random_uuid());
    conversation.type(conversation_type);

    const connection_et = new z.entity.Connection();
    connection_et.conversation_id = conversation.id;
    connection_et.status(connection_status);
    conversation.connection(connection_et);

    return conversation;
  };

  beforeAll(function(done) {
    z.util.protobuf.load_protos('ext/proto/generic-message-proto/messages.proto')
      .then(done)
      .catch(done.fail);
  });

  beforeEach(function(done) {
    server = sinon.fakeServer.create();
    sinon.spy(jQuery, 'ajax');

    test_factory.exposeConversationActors()
      .then(function(conversation_repository) {
        amplify.publish(z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE, z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
        ({storage_service} = conversation_repository.conversation_service);

        conversation_et = _generate_conversation(z.conversation.ConversationType.SELF);
        conversation_et.id = payload.conversations.knock.post.conversation;

        const ping_url = `${test_factory.settings.connection.rest_url}/conversations/${conversation_et.id}/knock`;
        server.respondWith('POST', ping_url, [
          201,
          {'Content-Type': 'application/json'},
          JSON.stringify(payload.conversations.knock.post),
        ]);

        const mark_as_read_url = `${test_factory.settings.connection.rest_url}/conversations/${conversation_et.id}/self`;
        server.respondWith('PUT', mark_as_read_url, [
          200,
          {},
          '',
        ]);

        return conversation_repository.save_conversation(conversation_et);
      })
      .then(done)
      .catch(done.fail);
  });

  afterEach(function() {
    server.restore();
    storage_service.clear_all_stores();
    jQuery.ajax.restore();
  });

  describe('on_conversation_event', function() {
    let member_join_event = null;

    beforeEach(function() {
      spyOn(TestFactory.conversation_repository, '_on_member_join').and.callThrough();

      member_join_event = {
        conversation: conversation_et.id,
        data: {
          user_ids: [],
        },
        from: 'd5a39ffb-6ce3-4cc8-9048-0e15d031b4c5',
        id: '3.800122000a5dcd58',
        time: '2015-04-27T11:42:31.475Z',
        type: 'conversation.member-join',
      };
    });

    it('should process member-join event when joining a group conversation', function(done) {
      TestFactory.conversation_repository.on_conversation_event(member_join_event)
        .then(function() {
          expect(TestFactory.conversation_repository._on_member_join).toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('should ignore member-join event when joining a 1to1 conversation', function(done) {
      // conversation has a corresponding pending connection
      const connection_et_a = new z.entity.Connection();
      connection_et_a.conversation_id = conversation_et.id;
      connection_et_a.status(z.user.ConnectionStatus.PENDING);
      TestFactory.user_repository.connections.push(connection_et_a);

      TestFactory.conversation_repository.on_conversation_event(member_join_event)
        .then(function() {
          expect(TestFactory.conversation_repository._on_member_join).not.toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });
  });

  describe('map_connection', function() {
    let connection_et = undefined;

    beforeEach(function() {
      connection_et = new z.entity.Connection();
      connection_et.conversation_id = conversation_et.id;

      // @formatter:off
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const conversation_payload = {"creator": conversation_et.id, "members": {"self": {"status": 0, "last_read": "1.800122000a54449c", "muted_time": null, "muted": null, "status_time": "2015-01-28T12:53:41.847Z", "status_ref": "0.0", "id": conversation_et.id, "archived": null}, "others": []}, "name": null, "id": conversation_et.id, "type": 0, "last_event_time": "2015-03-20T13:41:12.580Z", "last_event": "25.800122000a0b0bc9"};
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      // @formatter:on

      spyOn(TestFactory.conversation_repository, 'fetch_conversation_by_id').and.callThrough();
      spyOn(TestFactory.conversation_service, 'get_conversation_by_id').and.returnValue(Promise.resolve(conversation_payload));
    });

    it('should map a connection to an existing conversation', function(done) {
      TestFactory.conversation_repository.map_connection(connection_et)
        .then(function(_conversation) {
          expect(TestFactory.conversation_repository.fetch_conversation_by_id).not.toHaveBeenCalled();
          expect(TestFactory.conversation_service.get_conversation_by_id).not.toHaveBeenCalled();
          expect(_conversation.connection()).toBe(connection_et);
          done();
        })
        .catch(done.fail);
    });

    it('should map a connection to a new conversation', function(done) {
      connection_et.status(z.user.ConnectionStatus.ACCEPTED);
      TestFactory.conversation_repository.conversations.removeAll();

      TestFactory.conversation_repository.map_connection(connection_et)
        .then(function(_conversation) {
          expect(TestFactory.conversation_repository.fetch_conversation_by_id).toHaveBeenCalled();
          expect(TestFactory.conversation_service.get_conversation_by_id).toHaveBeenCalled();
          expect(_conversation.connection()).toBe(connection_et);
          done();
        })
        .catch(done.fail);
    });

    it('should map a cancelled connection to an existing conversation and filter it', function(done) {
      connection_et.status(z.user.ConnectionStatus.CANCELLED);

      TestFactory.conversation_repository.map_connection(connection_et)
        .then(function(_conversation) {
          expect(_conversation.connection()).toBe(connection_et);
          expect(_find_conversation(_conversation, TestFactory.conversation_repository.conversations)).not.toBeNull();
          expect(_find_conversation(_conversation, TestFactory.conversation_repository.filtered_conversations)).toBeNull();
          done();
        })
        .catch(done.fail);
    });
  });

  describe('filtered_conversations', function() {
    it('should not contain the self conversation', function(done) {
      const self_conversation_et = _generate_conversation(z.conversation.ConversationType.SELF);

      TestFactory.conversation_repository.save_conversation(self_conversation_et)
        .then(function() {
          expect(_find_conversation(self_conversation_et, TestFactory.conversation_repository.conversations)).not.toBeNull();
          expect(_find_conversation(self_conversation_et, TestFactory.conversation_repository.filtered_conversations)).toBeNull();
          done();
        })
        .catch(done.fail);
    });

    it('should not contain a blocked conversations', function(done) {
      const blocked_conversation_et = _generate_conversation(z.conversation.ConversationType.ONE2ONE, z.user.ConnectionStatus.BLOCKED);

      TestFactory.conversation_repository.save_conversation(blocked_conversation_et)
        .then(function() {
          expect(_find_conversation(blocked_conversation_et, TestFactory.conversation_repository.conversations)).not.toBeNull();
          expect(_find_conversation(blocked_conversation_et, TestFactory.conversation_repository.filtered_conversations)).toBeNull();
          done();
        })
        .catch(done.fail);
    });

    it('should not contain the conversation for a cancelled connection request', function(done) {
      const cancelled_conversation_et = _generate_conversation(z.conversation.ConversationType.ONE2ONE, z.user.ConnectionStatus.CANCELLED);

      TestFactory.conversation_repository.save_conversation(cancelled_conversation_et)
        .then(function() {
          expect(_find_conversation(cancelled_conversation_et, TestFactory.conversation_repository.conversations)).not.toBeNull();
          expect(_find_conversation(cancelled_conversation_et, TestFactory.conversation_repository.filtered_conversations)).toBeNull();
          done();
        })
        .catch(done.fail);
    });

    it('should not contain the conversation for a pending connection request', function(done) {
      const pending_conversation_et = _generate_conversation(z.conversation.ConversationType.ONE2ONE, z.user.ConnectionStatus.PENDING);

      TestFactory.conversation_repository.save_conversation(pending_conversation_et)
        .then(function() {
          expect(_find_conversation(pending_conversation_et, TestFactory.conversation_repository.conversations)).not.toBeNull();
          expect(_find_conversation(pending_conversation_et, TestFactory.conversation_repository.filtered_conversations)).toBeNull();
          done();
        })
        .catch(done.fail);
    });
  });

  describe('get_groups_by_name', function() {
    beforeEach(function(done) {
      const group_a = _generate_conversation(z.conversation.ConversationType.REGULAR);
      group_a.name('Web Dudes');

      const group_b = _generate_conversation(z.conversation.ConversationType.REGULAR);
      group_b.name('René, Benny, Gregor, Lipis');

      const group_c = _generate_conversation(z.conversation.ConversationType.REGULAR);
      self_user_et = new z.entity.User();
      self_user_et.name('John');
      group_c.participating_user_ets.push(self_user_et);

      const group_cleared = _generate_conversation(z.conversation.ConversationType.REGULAR);
      group_cleared.name('Cleared');
      group_cleared.last_event_timestamp(Date.now() - 1000);
      group_cleared.set_timestamp(Date.now(), z.conversation.ConversationUpdateType.CLEARED_TIMESTAMP);

      const group_removed = _generate_conversation(z.conversation.ConversationType.REGULAR);
      group_removed.name('Removed');
      group_removed.last_event_timestamp(Date.now() - 1000);
      group_removed.set_timestamp(Date.now(), z.conversation.ConversationUpdateType.CLEARED_TIMESTAMP);
      group_removed.status(z.conversation.ConversationStatus.PAST_MEMBER);

      Promise.all([
        TestFactory.conversation_repository.save_conversation(group_a),
        TestFactory.conversation_repository.save_conversation(group_b),
        TestFactory.conversation_repository.save_conversation(group_c),
        TestFactory.conversation_repository.save_conversation(group_cleared),
      ])
        .then(done)
        .catch(done.fail);
    });

    it('should return expected matches', function() {
      let result = TestFactory.conversation_repository.get_groups_by_name('Web Dudes');
      expect(result.length).toBe(1);

      result = TestFactory.conversation_repository.get_groups_by_name('Dudes');
      expect(result.length).toBe(1);

      result = TestFactory.conversation_repository.get_groups_by_name('e');
      expect(result.length).toBe(3);

      result = TestFactory.conversation_repository.get_groups_by_name('Rene');
      expect(result.length).toBe(1);

      result = TestFactory.conversation_repository.get_groups_by_name('John');
      expect(result.length).toBe(1);
    });

    it('should return a cleared group with the user still being member of it', function() {
      const result = TestFactory.conversation_repository.get_groups_by_name('Cleared');
      expect(result.length).toBe(1);
    });

    it('should not return a cleared group that the user left', function() {
      const result = TestFactory.conversation_repository.get_groups_by_name('Removed');
      expect(result.length).toBe(0);
    });
  });

  describe('delete_message_everyone', function() {
    beforeEach(function() {
      conversation_et = _generate_conversation(z.conversation.ConversationType.REGULAR);

      spyOn(TestFactory.conversation_repository, '_send_generic_message').and.returnValue(Promise.resolve());
    });

    it('should not delete other users messages', function(done) {
      const user_et = new z.entity.User();
      user_et.is_me = false;
      const message_to_delete_et = new z.entity.Message();
      message_to_delete_et.id = z.util.create_random_uuid();
      message_to_delete_et.user(user_et);
      conversation_et.add_message(message_to_delete_et);

      TestFactory.conversation_repository.delete_message_everyone(conversation_et, message_to_delete_et)
        .then(done.fail)
        .catch(function(error) {
          expect(error).toEqual(jasmine.any(z.conversation.ConversationError));
          expect(error.type).toBe(z.conversation.ConversationError.TYPE.WRONG_USER);
          done();
        });
    });

    xit('should send delete and deletes message for own messages', function(done) {
      const user_et = new z.entity.User();
      user_et.is_me = true;
      const message_to_delete_et = new z.entity.Message();
      message_to_delete_et.id = z.util.create_random_uuid();
      message_to_delete_et.user(user_et);
      conversation_et.add_message(message_to_delete_et);

      expect(conversation_et.get_message_by_id(message_to_delete_et.id)).toBeDefined();

      TestFactory.conversation_repository.delete_message_everyone(conversation_et, message_to_delete_et)
        .then(function() {
          expect(conversation_et.get_message_by_id(message_to_delete_et.id)).not.toBeDefined();
          done();
        })
        .catch(done.fail);
    });
  });

  describe('_on_message_hidden', function() {
    let message_to_hide_et = null;

    beforeEach(function(done) {
      conversation_et = _generate_conversation(z.conversation.ConversationType.REGULAR);

      TestFactory.conversation_repository.save_conversation(conversation_et)
        .then(function() {
          message_to_hide_et = new z.entity.PingMessage();
          message_to_hide_et.id = z.util.create_random_uuid();
          conversation_et.add_message(message_to_hide_et);
          done();
        })
        .catch(done.fail);
    });

    it('should not hide message if sender is not self user', function(done) {
      const event = {
        conversation: conversation_et.id,
        data: {
          message_id: message_to_hide_et.id,
          conversation_id: conversation_et.id,
        },
        from: z.util.create_random_uuid(),
        id: z.util.create_random_uuid(),
        time: new Date().toISOString(),
        type: z.event.Client.CONVERSATION.MESSAGE_HIDDEN,
      };

      expect(conversation_et.get_message_by_id(message_to_hide_et.id)).toBeDefined();

      TestFactory.conversation_repository._on_message_hidden(event)
        .then(done.fail)
        .catch(function() {
          expect(conversation_et.get_message_by_id(message_to_hide_et.id)).toBeDefined();
          done();
        });
    });

    it('should hide message if sender is self user', function(done) {
      const event = {
        conversation: conversation_et.id,
        data: {
          message_id: message_to_hide_et.id,
          conversation_id: conversation_et.id,
        },
        from: TestFactory.user_repository.self().id,
        id: z.util.create_random_uuid(),
        time: new Date().toISOString(),
        type: z.event.Client.CONVERSATION.MESSAGE_HIDDEN,
      };

      expect(conversation_et.get_message_by_id(message_to_hide_et.id)).toBeDefined();

      TestFactory.conversation_repository._on_message_hidden(event)
        .then(function() {
          expect(conversation_et.get_message_by_id(message_to_hide_et.id)).not.toBeDefined();
          done();
        })
        .catch(done.fail);
    });
  });

  describe('_on_message_deleted', function() {
    let message_to_delete_et = null;

    beforeEach(function(done) {
      conversation_et = _generate_conversation(z.conversation.ConversationType.REGULAR);
      TestFactory.conversation_repository.save_conversation(conversation_et)
        .then(function() {
          message_to_delete_et = new z.entity.PingMessage();
          message_to_delete_et.id = z.util.create_random_uuid();
          message_to_delete_et.from = TestFactory.user_repository.self().id;
          conversation_et.add_message(message_to_delete_et);

          spyOn(TestFactory.conversation_repository, 'get_message_in_conversation_by_id').and.returnValue(Promise.resolve(message_to_delete_et));
          spyOn(TestFactory.conversation_repository, '_add_delete_message');
          done();
        })
        .catch(done.fail);
    });

    it('should delete message if user is self', function(done) {
      const event = {
        conversation: conversation_et.id,
        data: {
          message_id: message_to_delete_et.id,
        },
        from: TestFactory.user_repository.self().id,
        id: z.util.create_random_uuid(),
        time: new Date().toISOString(),
        type: z.event.Client.CONVERSATION.MESSAGE_DELETE,
      };

      expect(conversation_et.get_message_by_id(message_to_delete_et.id)).toBeDefined();
      TestFactory.conversation_repository._on_message_deleted(conversation_et, event)
        .then(function() {
          expect(conversation_et.get_message_by_id(message_to_delete_et.id)).not.toBeDefined();
          expect(TestFactory.conversation_repository._add_delete_message).not.toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('should delete message and add delete message if user is not self', function(done) {
      const other_user_id = z.util.create_random_uuid();
      message_to_delete_et.from = other_user_id;

      const event = {
        conversation: conversation_et.id,
        data: {
          message_id: message_to_delete_et.id,
        },
        from: other_user_id,
        id: z.util.create_random_uuid(),
        time: new Date().toISOString(),
        type: z.event.Client.CONVERSATION.MESSAGE_DELETE,
      };

      expect(conversation_et.get_message_by_id(message_to_delete_et.id)).toBeDefined();
      TestFactory.conversation_repository._on_message_deleted(conversation_et, event)
        .then(function() {
          expect(conversation_et.get_message_by_id(message_to_delete_et.id)).not.toBeDefined();
          expect(TestFactory.conversation_repository._add_delete_message).toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('should delete message and skip adding delete message for ephemeral messages', function(done) {
      const other_user_id = z.util.create_random_uuid();
      message_to_delete_et.from = other_user_id;
      message_to_delete_et.ephemeral_expires(true);

      const event = {
        conversation: conversation_et.id,
        data: {
          message_id: message_to_delete_et.id,
        },
        from: other_user_id,
        id: z.util.create_random_uuid(),
        time: new Date().toISOString(),
        type: z.event.Client.CONVERSATION.MESSAGE_DELETE,
      };

      expect(conversation_et.get_message_by_id(message_to_delete_et.id)).toBeDefined();
      TestFactory.conversation_repository._on_message_deleted(conversation_et, event)
        .then(function() {
          expect(conversation_et.get_message_by_id(message_to_delete_et.id)).not.toBeDefined();
          expect(TestFactory.conversation_repository._add_delete_message).not.toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });
  });

  describe('get_number_of_pending_uploads', function() {
    it('should return number of pending uploads if there are pending uploads', function() {
      conversation_et = _generate_conversation(z.conversation.ConversationType.REGULAR);
      conversation_et.add_message(_generate_asset_message(z.assets.AssetTransferState.UPLOADING, true));
      expect(conversation_et.get_number_of_pending_uploads()).toBe(1);

      conversation_et = _generate_conversation(z.conversation.ConversationType.REGULAR);
      conversation_et.add_message(_generate_asset_message(z.assets.AssetTransferState.UPLOADING, true));
      conversation_et.add_message(_generate_asset_message(z.assets.AssetTransferState.UPLOADING));
      expect(conversation_et.get_number_of_pending_uploads()).toBe(1);

      conversation_et = _generate_conversation(z.conversation.ConversationType.REGULAR);
      conversation_et.add_message(_generate_asset_message(z.assets.AssetTransferState.UPLOADING, true));
      conversation_et.add_message(_generate_asset_message(z.assets.AssetTransferState.UPLOADED));
      expect(conversation_et.get_number_of_pending_uploads()).toBe(1);
    });

    it('should return 0 if there are no pending uploads', function() {
      conversation_et.add_message(new z.entity.Message(z.util.create_random_uuid()));
      expect(conversation_et.get_number_of_pending_uploads()).toBe(0);
    });
  });

  describe('asset upload', function() {
    let message_et = null;

    beforeEach(function(done) {
      conversation_et = _generate_conversation(z.conversation.ConversationType.REGULAR);
      TestFactory.conversation_repository.save_conversation(conversation_et)
        .then(function() {
          const file_et = new z.entity.File();
          file_et.status(z.assets.AssetTransferState.UPLOADING);
          message_et = new z.entity.ContentMessage(z.util.create_random_uuid());
          message_et.assets.push(file_et);
          conversation_et.add_message(message_et);

          spyOn(TestFactory.conversation_service, 'update_asset_as_uploaded_in_db');
          spyOn(TestFactory.conversation_service, 'update_asset_as_failed_in_db');
          spyOn(TestFactory.conversation_service, 'update_asset_preview_in_db');
          spyOn(TestFactory.conversation_service, 'delete_message_from_db');
          done();
        })
        .catch(done.fail);
    });

    afterEach(function() {
      conversation_et.remove_messages();
    });

    it('should update original asset when asset upload is complete', function(done) {
      // mocked event response
      const event = {
        conversation: conversation_et.id,
        data: {
          id: z.util.create_random_uuid(),
          otr_key: new Uint8Array([]),
          sha256: new Uint8Array([]),
        },
        from: z.util.create_random_uuid(),
        id: message_et.id,
        time: Date.now(),
        type: z.event.Client.CONVERSATION.ASSET_UPLOAD_COMPLETE,
      };

      TestFactory.conversation_repository._on_asset_upload_complete(conversation_et, event)
        .then(function() {
          expect(TestFactory.conversation_service.update_asset_as_uploaded_in_db).toHaveBeenCalled();
          expect(message_et.assets()[0].original_resource().otr_key).toBe(event.data.otr_key);
          expect(message_et.assets()[0].original_resource().sha256).toBe(event.data.sha256);
          expect(message_et.assets()[0].status()).toBe(z.assets.AssetTransferState.UPLOADED);
          done();
        })
        .catch(done.fail);
    });

    it('should update original asset when asset upload is complete', function(done) {
      // mocked event response
      const event = {
        conversation: conversation_et.id,
        data: {
          id: z.util.create_random_uuid(),
          otr_key: new Uint8Array([]),
          sha256: new Uint8Array([]),
        },
        from: z.util.create_random_uuid(),
        id: message_et.id,
        time: Date.now(),
        type: z.event.Client.CONVERSATION.ASSET_PREVIEW,
      };

      TestFactory.conversation_repository._on_asset_preview(conversation_et, event)
        .then(function() {
          expect(TestFactory.conversation_service.update_asset_preview_in_db).toHaveBeenCalled();
          expect(message_et.assets()[0].preview_resource().otr_key).toBe(event.data.otr_key);
          expect(message_et.assets()[0].preview_resource().sha256).toBe(event.data.sha256);
          expect(message_et.assets()[0].status()).toBe(z.assets.AssetTransferState.UPLOADING);
          done();
        })
        .catch(done.fail);
    });

    it('should update original asset when asset upload failed', function(done) {
      // mocked event response
      const event = {
        conversation: conversation_et.id,
        data: {
          reason: z.assets.AssetUploadFailedReason.FAILED,
        },
        from: z.util.create_random_uuid(),
        id: message_et.id,
        time: Date.now(),
        type: z.event.Client.CONVERSATION.ASSET_UPLOAD_FAILED,
      };

      TestFactory.conversation_repository._on_asset_upload_failed(conversation_et, event)
        .then(function() {
          expect(TestFactory.conversation_service.update_asset_as_failed_in_db).toHaveBeenCalled();
          expect(message_et.assets()[0].status()).toBe(z.assets.AssetTransferState.UPLOAD_FAILED);
          expect(message_et.assets()[0].upload_failed_reason()).toBe(z.assets.AssetUploadFailedReason.FAILED);
          done();
        })
        .catch(done.fail);
    });

    it('should remove original asset message when asset upload was cancelled', function(done) {
      // mocked event response
      const event = {
        conversation: conversation_et.id,
        data: {
          reason: z.assets.AssetUploadFailedReason.CANCELLED,
        },
        from: z.util.create_random_uuid(),
        id: message_et.id,
        time: Date.now(),
        type: z.event.Client.CONVERSATION.ASSET_UPLOAD_FAILED,
      };

      TestFactory.conversation_repository._on_asset_upload_failed(conversation_et, event)
        .then(function() {
          expect(TestFactory.conversation_service.delete_message_from_db).toHaveBeenCalledWith(conversation_et.id, message_et.id);
          expect(conversation_et.get_message_by_id(message_et.id)).toBeUndefined();
          done();
        })
        .catch(done.fail);
    });
  });

  describe('Encryption', function() {
    let anne, bob, jane, john, lara = undefined;

    beforeEach(function(done) {
      anne = new z.entity.User();
      anne.name('Anne');

      bob = new z.entity.User('532af01e-1e24-4366-aacf-33b67d4ee376');
      bob.name('Bob');

      jane = new z.entity.User(entities.user.jane_roe.id);
      jane.name('Jane');

      john = new z.entity.User(entities.user.john_doe.id);
      john.name('John');

      const johns_computer = new z.client.Client({id: '83ad5d3c31d3c76b', class: 'tabconst'});
      john.devices.push(johns_computer);

      lara = new z.entity.User();
      lara.name('Lara');

      const bobs_computer = new z.client.Client({id: '74606e4c02b2c7f9', class: 'desktop'});
      const bobs_phone = new z.client.Client({id: '8f63631e129ed19d', class: 'phone'});

      bob.devices.push(bobs_computer);
      bob.devices.push(bobs_phone);

      const dudes = _generate_conversation(z.conversation.ConversationType.REGULAR);
      dudes.name('Web Dudes');
      dudes.participating_user_ets.push(bob);
      dudes.participating_user_ets.push(john);

      const gals = _generate_conversation(z.conversation.ConversationType.REGULAR);
      gals.name('Web Gals');
      gals.participating_user_ets.push(anne);
      gals.participating_user_ets.push(jane);
      gals.participating_user_ets.push(lara);

      const mixed_group = _generate_conversation(z.conversation.ConversationType.REGULAR);
      mixed_group.name('Web Dudes & Gals');
      mixed_group.participating_user_ets.push(anne);
      mixed_group.participating_user_ets.push(bob);
      mixed_group.participating_user_ets.push(jane);
      mixed_group.participating_user_ets.push(john);
      mixed_group.participating_user_ets.push(lara);

      TestFactory.cryptography_repository.load_session = (session_id) => Promise.resolve(session_id);

      Promise.all([
        TestFactory.conversation_repository.save_conversation(dudes),
        TestFactory.conversation_repository.save_conversation(gals),
        TestFactory.conversation_repository.save_conversation(mixed_group),
      ])
        .then(done)
        .catch(done.fail);
    });

    it('should know all users participating in a conversation (including the self user)', function(done) {
      const [, dudes] = TestFactory.conversation_repository.conversations();
      TestFactory.conversation_repository.get_all_users_in_conversation(dudes.id)
        .then(function(user_ets) {
          expect(user_ets.length).toBe(3);
          expect(user_ets[0] instanceof z.entity.User).toBeTruthy();
          expect(TestFactory.conversation_repository.conversations().length).toBe(4);
          done();
        })
        .catch(done.fail);
    });

    it('should generate a user-client-map including users with clients', function(done) {
      const [, dudes] = TestFactory.conversation_repository.conversations();
      const user_ets = dudes.participating_user_ets();

      TestFactory.conversation_repository.create_user_client_map(dudes.id)
        .then(function(user_client_map) {
          expect(Object.keys(user_client_map).length).toBe(2);
          expect(user_client_map[bob.id].length).toBe(2);
          expect(user_client_map[john.id].length).toBe(1);
          expect(user_ets.length).toBe(2);
          done();
        })
        .catch(done.fail);
    });

    describe('_handle_client_mismatch', function() {
      let client_mismatch = undefined;
      let generic_message = undefined;
      let payload = undefined;

      let john_doe = undefined;
      let jane_roe = undefined;

      beforeAll(function() {
        generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
        generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.TEXT, new z.proto.Text('Test'));

        john_doe = {
          client_id: 'd13a2ec9b6436122',
          user_id: entities.user.john_doe.id,
        };
        jane_roe = {
          client_id: 'edc943ba4d6ef6b1',
          user_id: entities.user.jane_roe.id,
        };
      });

      beforeEach(function() {
        spyOn(TestFactory.user_repository, 'remove_client_from_user').and.returnValue(Promise.resolve());

        payload = {
          sender: '43619b6a2ec22e24',
          recipients: {
            [jane_roe.user_id]: {
              [jane_roe.client_id]: '💣',
            },
          },
        };
      });

      it('should add missing clients to the payload', function(done) {
        spyOn(TestFactory.user_repository, 'add_client_to_user').and.returnValue(Promise.resolve());
        // TODO: Make this fake method available as a utility function for testing
        spyOn(TestFactory.cryptography_repository.cryptography_service, 'get_users_pre_keys').and.callFake(function(user_client_map) {
          return Promise.resolve()
            .then(function() {
              const pre_key_map = {};

              for (const user_id in user_client_map) {
                if (user_client_map.hasOwnProperty(user_id)) {
                  const client_ids = user_client_map[user_id];
                  pre_key_map[user_id] = pre_key_map[user_id] || {};

                  client_ids.forEach(function(client_id) {
                    pre_key_map[user_id][client_id] = {
                      key: 'pQABARn//wKhAFgg3OpuTCUwDZMt1fklZB4M+fjDx/3fyx78gJ6j3H3dM2YDoQChAFggQU1orulueQHLv5YDYqEYl3D4O0zA9d+TaGGXXaBJmK0E9g==',
                      id: 65535,
                    };
                  });
                }
              }

              return pre_key_map;
            });
        });

        client_mismatch = {
          missing: {
            [john_doe.user_id]: [`${john_doe.client_id}`],
          },
          deleted: {},
          redundant: {},
          time: '2016-04-29T10:38:23.002Z',
        };

        TestFactory.conversation_repository._handle_client_mismatch(conversation_et.id, client_mismatch, generic_message, payload)
          .then(function(updated_payload) {
            expect(Object.keys(updated_payload.recipients).length).toBe(2);
            expect(Object.keys(updated_payload.recipients[john_doe.user_id]).length).toBe(1);
            done();
          })
          .catch(done.fail);
      });

      it('should remove the payload of deleted clients', function(done) {
        client_mismatch = {
          missing: {},
          deleted: {
            [jane_roe.user_id]: [`${jane_roe.client_id}`],
          },
          redundant: {},
          time: '2016-04-29T10:38:23.002Z',
        };

        TestFactory.conversation_repository._handle_client_mismatch(conversation_et.id, client_mismatch, generic_message, payload)
          .then(function(updated_payload) {
            expect(TestFactory.user_repository.remove_client_from_user).toHaveBeenCalled();
            expect(Object.keys(updated_payload.recipients).length).toBe(0);
            done();
          })
          .catch(done.fail);
      });

      it('should remove the payload of redundant clients', function(done) {
        client_mismatch = {
          missing: {},
          deleted: {},
          redundant: {
            [jane_roe.user_id]: [`${jane_roe.client_id}`],
          },
          time: '2016-04-29T10:38:23.002Z',
        };

        TestFactory.conversation_repository._handle_client_mismatch(conversation_et.id, client_mismatch, generic_message, payload)
          .then(function(updated_payload) {
            expect(TestFactory.user_repository.remove_client_from_user).not.toHaveBeenCalled();
            expect(Object.keys(updated_payload.recipients).length).toBe(0);
            done();
          })
          .catch(done.fail);
      });
    });
  });

  describe('_should_send_as_external', function() {
    it('should return true for big payload', function(done) {
      const external_conversation_et = _generate_conversation();
      external_conversation_et.participating_user_ids(_.range(128));

      TestFactory.conversation_repository.save_conversation(external_conversation_et)
        .then(function() {
          const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
          generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.TEXT, new z.proto.Text('massive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external messagemassive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external messagemassive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external messagemassive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external message'));

          return TestFactory.conversation_repository._should_send_as_external(external_conversation_et.id, generic_message);
        })
        .then(function(should_send_as_external) {
          expect(should_send_as_external).toBeTruthy();
          done();
        })
        .catch(done.fail);
    });

    it('should return false for small payload', function(done) {
      const external_conversation_et = _generate_conversation();
      external_conversation_et.participating_user_ids([0, 1]);

      TestFactory.conversation_repository.save_conversation(external_conversation_et)
        .then(function() {
          const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
          generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.TEXT, new z.proto.Text('Test'));

          return TestFactory.conversation_repository._should_send_as_external(external_conversation_et.id, generic_message);
        })
        .then(function(should_send_as_external) {
          expect(should_send_as_external).toBeFalsy();
          done();
        })
        .catch(done.fail);
    });
  });

  describe('get_preceding_messages', function() {
    it('gets messages which are not broken by design', function(done) {
      spyOn(TestFactory.user_repository, 'get_user_by_id').and.returnValue(Promise.resolve(new z.entity.User()));

      conversation_et = new z.entity.Conversation(z.util.create_random_uuid());
      // @formatter:off
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const bad_message = {"conversation":`${conversation_et.id}`,"id":"aeac8355-739b-4dfc-a119-891a52c6a8dc","from":"532af01e-1e24-4366-aacf-33b67d4ee376","data":{"content":"Hello World :)","nonce":"aeac8355-739b-4dfc-a119-891a52c6a8dc"},"type":"conversation.message-add"};
      const good_message = {"conversation":`${conversation_et.id}`,"id":"5a8cd79a-82bb-49ca-a59e-9a8e76df77fb","from":"8b497692-7a38-4a5d-8287-e3d1006577d6","time":"2016-08-04T13:28:33.389Z","data":{"content":"Fifth message","nonce":"5a8cd79a-82bb-49ca-a59e-9a8e76df77fb","previews":[]},"type":"conversation.message-add"};
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */
      // @formatter:on

      const bad_message_key = `${conversation_et.id}@${bad_message.from}@NaN`;

      storage_service.save(z.storage.StorageService.OBJECT_STORE.EVENTS, bad_message_key, bad_message)
        .catch(() => storage_service.save(z.storage.StorageService.OBJECT_STORE.EVENTS, undefined, good_message))
        .then(() => TestFactory.conversation_repository.get_preceding_messages(conversation_et))
        .then(function(loaded_events) {
          expect(loaded_events.length).toBe(1);
          done();
        })
        .catch(done.fail);
    });
  });
});

