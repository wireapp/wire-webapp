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

// grunt test_init && grunt test_run:conversation/ConversationRepository

'use strict';

describe('ConversationRepository', () => {
  const test_factory = new TestFactory();

  let conversation_et = null;
  let self_user_et = null;
  let server = null;
  let storage_service = null;

  const _find_conversation = (conversation, conversations) => {
    return ko.utils.arrayFirst(conversations(), _conversation => _conversation.id === conversation.id);
  };

  const _generate_asset_message = (state, uploaded_on_this_client = false) => {
    const file_et = new z.entity.File();
    file_et.uploaded_on_this_client(uploaded_on_this_client);
    file_et.status(state);
    const message_et = new z.entity.ContentMessage(z.util.createRandomUuid());
    message_et.assets.push(file_et);
    return message_et;
  };

  const _generate_conversation = (
    conversation_type = z.conversation.ConversationType.REGULAR,
    connection_status = z.user.ConnectionStatus.ACCEPTED
  ) => {
    const conversation = new z.entity.Conversation(z.util.createRandomUuid());
    conversation.type(conversation_type);

    const connection_et = new z.entity.Connection();
    connection_et.conversation_id = conversation.id;
    connection_et.status(connection_status);
    conversation.connection(connection_et);

    return conversation;
  };

  beforeAll(done => {
    z.util.protobuf
      .loadProtos('ext/proto/generic-message-proto/messages.proto')
      .then(done)
      .catch(done.fail);
  });

  beforeEach(done => {
    server = sinon.fakeServer.create();
    server.autoRespond = true;
    sinon.spy(jQuery, 'ajax');

    test_factory
      .exposeConversationActors()
      .then(conversation_repository => {
        amplify.publish(
          z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE,
          z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET
        );
        ({storageService: storage_service} = conversation_repository.conversation_service);

        conversation_et = _generate_conversation(z.conversation.ConversationType.SELF);
        conversation_et.id = payload.conversations.knock.post.conversation;

        const ping_url = `${test_factory.settings.connection.restUrl}/conversations/${conversation_et.id}/knock`;
        server.respondWith('POST', ping_url, [
          201,
          {'Content-Type': 'application/json'},
          JSON.stringify(payload.conversations.knock.post),
        ]);

        const mark_as_read_url = `${test_factory.settings.connection.restUrl}/conversations/${conversation_et.id}/self`;
        server.respondWith('PUT', mark_as_read_url, [200, {}, '']);

        return conversation_repository.save_conversation(conversation_et);
      })
      .then(done)
      .catch(done.fail);
  });

  afterEach(() => {
    server.restore();
    storage_service.clearStores();
    jQuery.ajax.restore();
    TestFactory.conversation_repository.conversations.removeAll();
  });

  describe('asset upload', () => {
    let message_et = null;

    beforeEach(done => {
      conversation_et = _generate_conversation(z.conversation.ConversationType.REGULAR);
      TestFactory.conversation_repository
        .save_conversation(conversation_et)
        .then(() => {
          const file_et = new z.entity.File();
          file_et.status(z.assets.AssetTransferState.UPLOADING);
          message_et = new z.entity.ContentMessage(z.util.createRandomUuid());
          message_et.assets.push(file_et);
          conversation_et.add_message(message_et);

          spyOn(TestFactory.conversation_service, 'update_asset_as_uploaded_in_db');
          spyOn(TestFactory.conversation_service, 'update_asset_as_failed_in_db');
          spyOn(TestFactory.conversation_service, 'delete_message_from_db');
          done();
        })
        .catch(done.fail);
    });

    afterEach(() => conversation_et.remove_messages());

    it('should update original asset when asset upload is complete', done => {
      // mocked event response
      const event = {
        conversation: conversation_et.id,
        data: {
          id: z.util.createRandomUuid(),
          otr_key: new Uint8Array([]),
          sha256: new Uint8Array([]),
        },
        from: z.util.createRandomUuid(),
        id: message_et.id,
        time: Date.now(),
        type: z.event.Client.CONVERSATION.ASSET_ADD,
      };

      TestFactory.conversation_repository
        ._on_asset_upload_complete(conversation_et, event)
        .then(() => {
          expect(TestFactory.conversation_service.update_asset_as_uploaded_in_db).toHaveBeenCalled();

          const [firstAsset] = message_et.assets();
          expect(firstAsset.original_resource().otrKey).toBe(event.data.otr_key);
          expect(firstAsset.original_resource().sha256).toBe(event.data.sha256);
          expect(firstAsset.status()).toBe(z.assets.AssetTransferState.UPLOADED);
          done();
        })
        .catch(done.fail);
    });
  });

  describe('delete_message_everyone', () => {
    beforeEach(() => {
      conversation_et = _generate_conversation(z.conversation.ConversationType.REGULAR);
      spyOn(TestFactory.conversation_repository, '_sendGenericMessage').and.returnValue(Promise.resolve());
    });

    it('should not delete other users messages', done => {
      const user_et = new z.entity.User();
      user_et.is_me = false;
      const message_to_delete_et = new z.entity.Message(z.util.createRandomUuid());
      message_to_delete_et.user(user_et);
      conversation_et.add_message(message_to_delete_et);

      TestFactory.conversation_repository
        .delete_message_everyone(conversation_et, message_to_delete_et)
        .then(done.fail)
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.conversation.ConversationError));
          expect(error.type).toBe(z.conversation.ConversationError.TYPE.WRONG_USER);
          done();
        });
    });

    xit('should send delete and deletes message for own messages', done => {
      const user_et = new z.entity.User();
      user_et.is_me = true;
      const message_to_delete_et = new z.entity.Message();
      message_to_delete_et.id = z.util.createRandomUuid();
      message_to_delete_et.user(user_et);
      conversation_et.add_message(message_to_delete_et);

      expect(conversation_et.get_message_by_id(message_to_delete_et.id)).toBeDefined();

      TestFactory.conversation_repository
        .delete_message_everyone(conversation_et, message_to_delete_et)
        .then(() => {
          expect(conversation_et.get_message_by_id(message_to_delete_et.id)).not.toBeDefined();
          done();
        })
        .catch(done.fail);
    });
  });

  describe('filtered_conversations', () => {
    it('should not contain the self conversation', done => {
      const self_conversation_et = _generate_conversation(z.conversation.ConversationType.SELF);

      TestFactory.conversation_repository
        .save_conversation(self_conversation_et)
        .then(() => {
          expect(
            _find_conversation(self_conversation_et, TestFactory.conversation_repository.conversations)
          ).not.toBeNull();
          expect(
            _find_conversation(self_conversation_et, TestFactory.conversation_repository.filtered_conversations)
          ).toBeNull();
          done();
        })
        .catch(done.fail);
    });

    it('should not contain a blocked conversations', done => {
      const blocked_conversation_et = _generate_conversation(
        z.conversation.ConversationType.ONE2ONE,
        z.user.ConnectionStatus.BLOCKED
      );

      TestFactory.conversation_repository
        .save_conversation(blocked_conversation_et)
        .then(() => {
          expect(
            _find_conversation(blocked_conversation_et, TestFactory.conversation_repository.conversations)
          ).not.toBeNull();
          expect(
            _find_conversation(blocked_conversation_et, TestFactory.conversation_repository.filtered_conversations)
          ).toBeNull();
          done();
        })
        .catch(done.fail);
    });

    it('should not contain the conversation for a cancelled connection request', done => {
      const cancelled_conversation_et = _generate_conversation(
        z.conversation.ConversationType.ONE2ONE,
        z.user.ConnectionStatus.CANCELLED
      );

      TestFactory.conversation_repository
        .save_conversation(cancelled_conversation_et)
        .then(() => {
          expect(
            _find_conversation(cancelled_conversation_et, TestFactory.conversation_repository.conversations)
          ).not.toBeNull();
          expect(
            _find_conversation(cancelled_conversation_et, TestFactory.conversation_repository.filtered_conversations)
          ).toBeNull();
          done();
        })
        .catch(done.fail);
    });

    it('should not contain the conversation for a pending connection request', done => {
      const pending_conversation_et = _generate_conversation(
        z.conversation.ConversationType.ONE2ONE,
        z.user.ConnectionStatus.PENDING
      );

      TestFactory.conversation_repository
        .save_conversation(pending_conversation_et)
        .then(() => {
          expect(
            _find_conversation(pending_conversation_et, TestFactory.conversation_repository.conversations)
          ).not.toBeNull();
          expect(
            _find_conversation(pending_conversation_et, TestFactory.conversation_repository.filtered_conversations)
          ).toBeNull();
          done();
        })
        .catch(done.fail);
    });
  });

  describe('get_1to1_conversation', () => {
    beforeEach(() => TestFactory.conversation_repository.conversations([]));

    it('finds an existing 1:1 conversation within a team', done => {
      // prettier-ignore
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const team_1to1_conversation = {"access":["invite"],"creator":"109da9ca-a495-47a8-ac70-9ffbe924b2d0","members":{"self":{"hidden_ref":null,"status":0,"service":null,"otr_muted_ref":null,"status_time":"1970-01-01T00:00:00.000Z","hidden":false,"status_ref":"0.0","id":"109da9ca-a495-47a8-ac70-9ffbe924b2d0","otr_archived":false,"otr_muted":false,"otr_archived_ref":null},"others":[{"status":0,"id":"f718410c-3833-479d-bd80-a5df03f38414"}]},"name":null,"team":"cf162e22-20b8-4533-a5ab-d3f5dde39d2c","id":"04ab891e-ccf1-4dba-9d74-bacec64b5b1e","type":0,"last_event_time":"1970-01-01T00:00:00.000Z","last_event":"0.0"};
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */

      const [new_conversation_et] = TestFactory.conversation_repository.conversation_mapper.map_conversations([
        team_1to1_conversation,
      ]);
      TestFactory.conversation_repository.conversations.push(new_conversation_et);

      const team_id = team_1to1_conversation.team;
      const team_member_id = team_1to1_conversation.members.others[0].id;
      const user_et = new z.entity.User(team_member_id);

      TestFactory.conversation_repository
        .get_1to1_conversation(user_et, team_id)
        .then(found_conversation_et => {
          expect(found_conversation_et).toBe(new_conversation_et);
          done();
        })
        .catch(done.fail);
    });
  });

  describe('get_groups_by_name', () => {
    beforeEach(done => {
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
      group_cleared.set_timestamp(Date.now(), z.conversation.TIMESTAMP_TYPE.CLEARED);

      const group_removed = _generate_conversation(z.conversation.ConversationType.REGULAR);
      group_removed.name('Removed');
      group_removed.last_event_timestamp(Date.now() - 1000);
      group_removed.set_timestamp(Date.now(), z.conversation.TIMESTAMP_TYPE.CLEARED);
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

    it('should return expected matches', () => {
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

    it('should return a cleared group with the user still being member of it', () => {
      const result = TestFactory.conversation_repository.get_groups_by_name('Cleared');
      expect(result.length).toBe(1);
    });

    it('should not return a cleared group that the user left', () => {
      const result = TestFactory.conversation_repository.get_groups_by_name('Removed');
      expect(result.length).toBe(0);
    });
  });

  describe('get_number_of_pending_uploads', () => {
    it('should return number of pending uploads if there are pending uploads', () => {
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

    it('should return 0 if there are no pending uploads', () => {
      conversation_et.add_message(new z.entity.Message(z.util.createRandomUuid()));
      expect(conversation_et.get_number_of_pending_uploads()).toBe(0);
    });
  });

  describe('getPrecedingMessages', () => {
    it('gets messages which are not broken by design', done => {
      spyOn(TestFactory.user_repository, 'get_user_by_id').and.returnValue(Promise.resolve(new z.entity.User()));

      conversation_et = new z.entity.Conversation(z.util.createRandomUuid());
      // prettier-ignore
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const bad_message = {"conversation":`${conversation_et.id}`,"id":"aeac8355-739b-4dfc-a119-891a52c6a8dc","from":"532af01e-1e24-4366-aacf-33b67d4ee376","data":{"content":"Hello World :)","nonce":"aeac8355-739b-4dfc-a119-891a52c6a8dc"},"type":"conversation.message-add"};
      // prettier-ignore
      const good_message = {"conversation":`${conversation_et.id}`,"id":"5a8cd79a-82bb-49ca-a59e-9a8e76df77fb","from":"8b497692-7a38-4a5d-8287-e3d1006577d6","time":"2016-08-04T13:28:33.389Z","data":{"content":"Fifth message","nonce":"5a8cd79a-82bb-49ca-a59e-9a8e76df77fb","previews":[]},"type":"conversation.message-add"};
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      const bad_message_key = `${conversation_et.id}@${bad_message.from}@NaN`;

      storage_service
        .save(z.storage.StorageSchemata.OBJECT_STORE.EVENTS, bad_message_key, bad_message)
        .catch(() => storage_service.save(z.storage.StorageSchemata.OBJECT_STORE.EVENTS, undefined, good_message))
        .then(() => TestFactory.conversation_repository.getPrecedingMessages(conversation_et))
        .then(loaded_events => {
          expect(loaded_events.length).toBe(1);
          done();
        })
        .catch(done.fail);
    });
  });

  describe('map_connection', () => {
    let connection_et = undefined;

    beforeEach(() => {
      connection_et = new z.entity.Connection();
      connection_et.conversation_id = conversation_et.id;

      // prettier-ignore
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const conversation_payload = {"creator": conversation_et.id, "members": {"self": {"status": 0, "last_read": "1.800122000a54449c", "muted_time": null, "muted": null, "status_time": "2015-01-28T12:53:41.847Z", "status_ref": "0.0", "id": conversation_et.id, "archived": null}, "others": []}, "name": null, "id": conversation_et.id, "type": 0, "last_event_time": "2015-03-20T13:41:12.580Z", "last_event": "25.800122000a0b0bc9"};
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */

      spyOn(TestFactory.conversation_repository, 'fetch_conversation_by_id').and.callThrough();
      spyOn(TestFactory.conversation_service, 'get_conversation_by_id').and.returnValue(
        Promise.resolve(conversation_payload)
      );
    });

    it('should map a connection to an existing conversation', done => {
      TestFactory.conversation_repository
        .map_connection(connection_et)
        .then(_conversation => {
          expect(TestFactory.conversation_repository.fetch_conversation_by_id).not.toHaveBeenCalled();
          expect(TestFactory.conversation_service.get_conversation_by_id).not.toHaveBeenCalled();
          expect(_conversation.connection()).toBe(connection_et);
          done();
        })
        .catch(done.fail);
    });

    it('should map a connection to a new conversation', done => {
      connection_et.status(z.user.ConnectionStatus.ACCEPTED);
      TestFactory.conversation_repository.conversations.removeAll();

      TestFactory.conversation_repository
        .map_connection(connection_et)
        .then(_conversation => {
          expect(TestFactory.conversation_repository.fetch_conversation_by_id).toHaveBeenCalled();
          expect(TestFactory.conversation_service.get_conversation_by_id).toHaveBeenCalled();
          expect(_conversation.connection()).toBe(connection_et);
          done();
        })
        .catch(done.fail);
    });

    it('should map a cancelled connection to an existing conversation and filter it', done => {
      connection_et.status(z.user.ConnectionStatus.CANCELLED);

      TestFactory.conversation_repository
        .map_connection(connection_et)
        .then(_conversation => {
          expect(_conversation.connection()).toBe(connection_et);
          expect(_find_conversation(_conversation, TestFactory.conversation_repository.conversations)).not.toBeNull();
          expect(
            _find_conversation(_conversation, TestFactory.conversation_repository.filtered_conversations)
          ).toBeNull();
          done();
        })
        .catch(done.fail);
    });
  });

  describe('"_handleConversationEvent"', () => {
    describe('"conversation.asset-add"', () => {
      beforeEach(() => {
        const matchUsers = new RegExp(`${test_factory.settings.connection.restUrl}/users\\?ids=([a-z0-9-,]+)`);
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

        const matchConversations = new RegExp(`${test_factory.settings.connection.restUrl}/conversations/([a-z0-9-]+)`);
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

      it('removes a file upload from the messages list of the sender when the upload gets canceled', done => {
        const conversation_id = z.util.createRandomUuid();
        const message_id = z.util.createRandomUuid();
        const sending_user_id = TestFactory.user_repository.self().id;

        // prettier-ignore
        const upload_start = {"conversation":conversation_id,"from":sending_user_id,"id":message_id,"status":1,"time":"2017-09-06T09:43:32.278Z","data":{"content_length":23089240,"content_type":"application/x-msdownload","info":{"name":"AirDroid_Desktop_Client_3.4.2.0.exe","nonce":"79072f78-15ee-4d54-a63c-fd46cd5607ae"}},"type":"conversation.asset-add","category":512,"primary_key":107};
        // prettier-ignore
        const upload_cancel = {"conversation":conversation_id,"from":sending_user_id,"id":message_id,"status":1,"time":"2017-09-06T09:43:36.528Z","data":{"reason":0,"status":"upload-failed"},"type":"conversation.asset-add"};

        TestFactory.conversation_repository
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
            done();
          })
          .catch(done.fail);
      });

      it('removes a file upload from the messages list of the receiver when the upload gets canceled', done => {
        const conversation_id = z.util.createRandomUuid();
        const message_id = z.util.createRandomUuid();
        const sending_user_id = z.util.createRandomUuid();

        // prettier-ignore
        const upload_start = {"conversation": conversation_id,"from":sending_user_id,"id":message_id,"status":1,"time":"2017-09-06T09:43:32.278Z","data":{"content_length":23089240,"content_type":"application/x-msdownload","info":{"name":"AirDroid_Desktop_Client_3.4.2.0.exe","nonce":"79072f78-15ee-4d54-a63c-fd46cd5607ae"}},"type":"conversation.asset-add","category":512,"primary_key":107};
        // prettier-ignore
        const upload_cancel = {"conversation": conversation_id,"from":sending_user_id,"id":message_id,"status":1,"time":"2017-09-06T09:43:36.528Z","data":{"reason":0,"status":"upload-failed"},"type":"conversation.asset-add"};

        TestFactory.conversation_repository
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
            done();
          })
          .catch(done.fail);
      });

      it("shows a failed message on the sender's side if the upload fails", done => {
        const conversation_id = z.util.createRandomUuid();
        const message_id = z.util.createRandomUuid();
        const sending_user_id = TestFactory.user_repository.self().id;

        // prettier-ignore
        const upload_start = {"conversation":conversation_id,"from":sending_user_id,"id":message_id,"status":1,"time":"2017-09-06T09:43:32.278Z","data":{"content_length":23089240,"content_type":"application/x-msdownload","info":{"name":"AirDroid_Desktop_Client_3.4.2.0.exe","nonce":"79072f78-15ee-4d54-a63c-fd46cd5607ae"}},"type":"conversation.asset-add","category":512,"primary_key":107};
        // prettier-ignore
        const upload_failed = {"conversation":conversation_id,"from":sending_user_id,"id":message_id,"status":1,"time":"2017-09-06T16:14:08.165Z","data":{"reason":1,"status":"upload-failed"},"type":"conversation.asset-add"};

        TestFactory.conversation_repository
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
            done();
          })
          .catch(done.fail);
      });
    });

    describe('"conversation.create"', () => {
      let conversationId = null;
      let createEvent = null;

      beforeEach(() => {
        spyOn(TestFactory.conversation_repository, '_onCreate').and.callThrough();
        spyOn(TestFactory.conversation_repository, 'map_conversations').and.returnValue(true);
        spyOn(TestFactory.conversation_repository, 'updateParticipatingUserEntities').and.returnValue(true);
        spyOn(TestFactory.conversation_repository, 'save_conversation').and.returnValue(false);

        conversationId = z.util.createRandomUuid();
        createEvent = {conversation: conversationId, data: {}, type: z.event.Backend.CONVERSATION.CREATE};
      });

      it('should process create event for a new conversation created locally', done => {
        TestFactory.conversation_repository
          ._handleConversationEvent(createEvent)
          .then(() => {
            expect(TestFactory.conversation_repository._onCreate).toHaveBeenCalled();
            expect(TestFactory.conversation_repository.map_conversations).toHaveBeenCalledWith(createEvent.data, 1);
            done();
          })
          .catch(done.fail);
      });

      it('should process create event for a new conversation created remotely', done => {
        const time = new Date();
        createEvent.time = time.toISOString();

        TestFactory.conversation_repository
          ._handleConversationEvent(createEvent)
          .then(() => {
            expect(TestFactory.conversation_repository._onCreate).toHaveBeenCalled();
            expect(TestFactory.conversation_repository.map_conversations).toHaveBeenCalledWith(
              createEvent.data,
              time.getTime()
            );
            done();
          })
          .catch(done.fail);
      });
    });

    describe('"conversation.member-join"', () => {
      let member_join_event = null;

      beforeEach(() => {
        spyOn(TestFactory.conversation_repository, '_onMemberJoin').and.callThrough();
        spyOn(TestFactory.conversation_repository, 'updateParticipatingUserEntities').and.callThrough();

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

      it('should process member-join event when joining a group conversation', done => {
        TestFactory.conversation_repository
          ._handleConversationEvent(member_join_event)
          .then(() => {
            expect(TestFactory.conversation_repository._onMemberJoin).toHaveBeenCalled();
            expect(TestFactory.conversation_repository.updateParticipatingUserEntities).toHaveBeenCalled();
            done();
          })
          .catch(done.fail);
      });

      it('should ignore member-join event when joining a 1to1 conversation', done => {
        // conversation has a corresponding pending connection
        const connection_et_a = new z.entity.Connection();
        connection_et_a.conversation_id = conversation_et.id;
        connection_et_a.status(z.user.ConnectionStatus.PENDING);
        TestFactory.user_repository.connections.push(connection_et_a);

        TestFactory.conversation_repository
          ._handleConversationEvent(member_join_event)
          .then(() => {
            expect(TestFactory.conversation_repository._onMemberJoin).toHaveBeenCalled();
            expect(TestFactory.conversation_repository.updateParticipatingUserEntities).not.toHaveBeenCalled();
            done();
          })
          .catch(done.fail);
      });
    });

    describe('"conversation.message-delete"', () => {
      let message_et = undefined;

      beforeEach(done => {
        conversation_et = _generate_conversation(z.conversation.ConversationType.REGULAR);
        TestFactory.conversation_repository
          .save_conversation(conversation_et)
          .then(() => {
            message_et = new z.entity.Message(z.util.createRandomUuid());
            message_et.from = TestFactory.user_repository.self().id;
            conversation_et.add_message(message_et);

            spyOn(TestFactory.conversation_repository, '_addDeleteMessage');
            spyOn(TestFactory.conversation_repository, '_onMessageDeleted').and.callThrough();

            done();
          })
          .catch(done.fail);
      });

      afterEach(() => conversation_et.remove_messages());

      it('should not delete message if user is not matching', done => {
        const message_delete_event = {
          conversation: conversation_et.id,
          data: {
            message_id: message_et.id,
          },
          from: z.util.createRandomUuid(),
          id: z.util.createRandomUuid(),
          time: new Date().toISOString(),
          type: z.event.Client.CONVERSATION.MESSAGE_DELETE,
        };

        expect(conversation_et.get_message_by_id(message_et.id)).toBeDefined();
        TestFactory.conversation_repository
          ._handleConversationEvent(message_delete_event)
          .then(done.fail)
          .catch(error => {
            expect(error).toEqual(jasmine.any(z.conversation.ConversationError));
            expect(error.type).toBe(z.conversation.ConversationError.TYPE.WRONG_USER);
            expect(TestFactory.conversation_repository._onMessageDeleted).toHaveBeenCalled();
            expect(conversation_et.get_message_by_id(message_et.id)).toBeDefined();
            expect(TestFactory.conversation_repository._addDeleteMessage).not.toHaveBeenCalled();
            done();
          });
      });

      it('should delete message if user is self', done => {
        const message_delete_event = {
          conversation: conversation_et.id,
          data: {
            message_id: message_et.id,
          },
          from: TestFactory.user_repository.self().id,
          id: z.util.createRandomUuid(),
          time: new Date().toISOString(),
          type: z.event.Client.CONVERSATION.MESSAGE_DELETE,
        };

        expect(conversation_et.get_message_by_id(message_et.id)).toBeDefined();
        TestFactory.conversation_repository
          ._handleConversationEvent(message_delete_event)
          .then(() => {
            expect(TestFactory.conversation_repository._onMessageDeleted).toHaveBeenCalled();
            expect(conversation_et.get_message_by_id(message_et.id)).not.toBeDefined();
            expect(TestFactory.conversation_repository._addDeleteMessage).not.toHaveBeenCalled();
            done();
          })
          .catch(done.fail);
      });

      it('should delete message and add delete message if user is not self', done => {
        const other_user_id = z.util.createRandomUuid();
        message_et.from = other_user_id;

        const message_delete_event = {
          conversation: conversation_et.id,
          data: {
            message_id: message_et.id,
          },
          from: other_user_id,
          id: z.util.createRandomUuid(),
          time: new Date().toISOString(),
          type: z.event.Client.CONVERSATION.MESSAGE_DELETE,
        };

        expect(conversation_et.get_message_by_id(message_et.id)).toBeDefined();
        TestFactory.conversation_repository
          ._handleConversationEvent(message_delete_event)
          .then(() => {
            expect(TestFactory.conversation_repository._onMessageDeleted).toHaveBeenCalled();
            expect(conversation_et.get_message_by_id(message_et.id)).not.toBeDefined();
            expect(TestFactory.conversation_repository._addDeleteMessage).toHaveBeenCalled();
            done();
          })
          .catch(done.fail);
      });

      it('should delete message and skip adding delete message for ephemeral messages', done => {
        const other_user_id = z.util.createRandomUuid();
        message_et.from = other_user_id;
        message_et.ephemeral_expires(true);

        const message_delete_event = {
          conversation: conversation_et.id,
          data: {
            message_id: message_et.id,
          },
          from: other_user_id,
          id: z.util.createRandomUuid(),
          time: new Date().toISOString(),
          type: z.event.Client.CONVERSATION.MESSAGE_DELETE,
        };

        expect(conversation_et.get_message_by_id(message_et.id)).toBeDefined();
        TestFactory.conversation_repository
          ._handleConversationEvent(message_delete_event)
          .then(() => {
            expect(TestFactory.conversation_repository._onMessageDeleted).toHaveBeenCalled();
            expect(conversation_et.get_message_by_id(message_et.id)).not.toBeDefined();
            expect(TestFactory.conversation_repository._addDeleteMessage).not.toHaveBeenCalled();
            done();
          })
          .catch(done.fail);
      });
    });

    describe('"conversation.message-hidden"', () => {
      let messageId = null;

      beforeEach(done => {
        conversation_et = _generate_conversation(z.conversation.ConversationType.REGULAR);

        TestFactory.conversation_repository
          .save_conversation(conversation_et)
          .then(() => {
            const messageToHideEt = new z.entity.Message(z.util.createRandomUuid());
            conversation_et.add_message(messageToHideEt);

            messageId = messageToHideEt.id;
            spyOn(TestFactory.conversation_repository, '_onMessageHidden').and.callThrough();
            done();
          })
          .catch(done.fail);
      });

      it('should not hide message if sender is not self user', done => {
        const messageHiddenEvent = {
          conversation: conversation_et.id,
          data: {
            message_id: messageId,
            conversation_id: conversation_et.id,
          },
          from: z.util.createRandomUuid(),
          id: z.util.createRandomUuid(),
          time: new Date().toISOString(),
          type: z.event.Client.CONVERSATION.MESSAGE_HIDDEN,
        };

        expect(conversation_et.get_message_by_id(messageId)).toBeDefined();

        TestFactory.conversation_repository
          ._handleConversationEvent(messageHiddenEvent)
          .then(done.fail)
          .catch(error => {
            expect(error).toEqual(jasmine.any(z.conversation.ConversationError));
            expect(error.type).toBe(z.conversation.ConversationError.TYPE.WRONG_USER);
            expect(TestFactory.conversation_repository._onMessageHidden).toHaveBeenCalled();
            expect(conversation_et.get_message_by_id(messageId)).toBeDefined();
            done();
          });
      });

      it('should hide message if sender is self user', done => {
        const messageHiddenEvent = {
          conversation: conversation_et.id,
          data: {
            message_id: messageId,
            conversation_id: conversation_et.id,
          },
          from: TestFactory.user_repository.self().id,
          id: z.util.createRandomUuid(),
          time: new Date().toISOString(),
          type: z.event.Client.CONVERSATION.MESSAGE_HIDDEN,
        };

        expect(conversation_et.get_message_by_id(messageId)).toBeDefined();

        TestFactory.conversation_repository
          ._handleConversationEvent(messageHiddenEvent)
          .then(() => {
            expect(TestFactory.conversation_repository._onMessageHidden).toHaveBeenCalled();
            expect(conversation_et.get_message_by_id(messageId)).not.toBeDefined();
            done();
          })
          .catch(done.fail);
      });

      it('should not hide message if not send via self conversation', done => {
        const messageHiddenEvent = {
          conversation: z.util.createRandomUuid(),
          data: {
            message_id: messageId,
            conversation_id: conversation_et.id,
          },
          from: TestFactory.user_repository.self().id,
          id: z.util.createRandomUuid(),
          time: new Date().toISOString(),
          type: z.event.Client.CONVERSATION.MESSAGE_HIDDEN,
        };

        expect(conversation_et.get_message_by_id(messageId)).toBeDefined();

        TestFactory.conversation_repository
          ._onMessageHidden(messageHiddenEvent)
          .then(() => {
            expect(TestFactory.conversation_repository._onMessageHidden).toHaveBeenCalled();
            expect(conversation_et.get_message_by_id(messageId)).not.toBeDefined();
            done();
          })
          .catch(done.fail);
      });
    });
  });

  describe('_shouldSendAsExternal', () => {
    it('should return true for big payload', done => {
      const external_conversation_et = _generate_conversation();
      external_conversation_et.participating_user_ids(_.range(128));

      TestFactory.conversation_repository
        .save_conversation(external_conversation_et)
        .then(() => {
          const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
          generic_message.set(
            z.cryptography.GENERIC_MESSAGE_TYPE.TEXT,
            new z.proto.Text(
              'massive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external messagemassive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external messagemassive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external messagemassive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external message'
            )
          );

          return TestFactory.conversation_repository._shouldSendAsExternal(
            external_conversation_et.id,
            generic_message
          );
        })
        .then(should_send_as_external => {
          expect(should_send_as_external).toBeTruthy();
          done();
        })
        .catch(done.fail);
    });

    it('should return false for small payload', done => {
      const external_conversation_et = _generate_conversation();
      external_conversation_et.participating_user_ids([0, 1]);

      TestFactory.conversation_repository
        .save_conversation(external_conversation_et)
        .then(() => {
          const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
          generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.TEXT, new z.proto.Text('Test'));

          return TestFactory.conversation_repository._shouldSendAsExternal(
            external_conversation_et.id,
            generic_message
          );
        })
        .then(should_send_as_external => {
          expect(should_send_as_external).toBeFalsy();
          done();
        })
        .catch(done.fail);
    });
  });

  describe('Encryption', () => {
    let anne;
    let bob;
    let jane;
    let john;
    let lara = undefined;

    beforeEach(done => {
      anne = new z.entity.User();
      anne.name('Anne');

      bob = new z.entity.User('532af01e-1e24-4366-aacf-33b67d4ee376');
      bob.name('Bob');

      jane = new z.entity.User(entities.user.jane_roe.id);
      jane.name('Jane');

      john = new z.entity.User(entities.user.john_doe.id);
      john.name('John');

      const johns_computer = new z.client.ClientEntity({id: '83ad5d3c31d3c76b', class: 'tabconst'});
      john.devices.push(johns_computer);

      lara = new z.entity.User();
      lara.name('Lara');

      const bobs_computer = new z.client.ClientEntity({id: '74606e4c02b2c7f9', class: 'desktop'});
      const bobs_phone = new z.client.ClientEntity({id: '8f63631e129ed19d', class: 'phone'});

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

      Promise.all([
        TestFactory.conversation_repository.save_conversation(dudes),
        TestFactory.conversation_repository.save_conversation(gals),
        TestFactory.conversation_repository.save_conversation(mixed_group),
      ])
        .then(done)
        .catch(done.fail);
    });

    it('should know all users participating in a conversation (including the self user)', done => {
      const [, dudes] = TestFactory.conversation_repository.conversations();
      TestFactory.conversation_repository
        .get_all_users_in_conversation(dudes.id)
        .then(user_ets => {
          expect(user_ets.length).toBe(3);
          expect(user_ets[0] instanceof z.entity.User).toBeTruthy();
          expect(TestFactory.conversation_repository.conversations().length).toBe(4);
          done();
        })
        .catch(done.fail);
    });

    it('should generate a user-client-map including users with clients', done => {
      const [, dudes] = TestFactory.conversation_repository.conversations();
      const user_ets = dudes.participating_user_ets();

      TestFactory.conversation_repository
        .create_recipients(dudes.id)
        .then(recipients => {
          expect(Object.keys(recipients).length).toBe(2);
          expect(recipients[bob.id].length).toBe(2);
          expect(recipients[john.id].length).toBe(1);
          expect(user_ets.length).toBe(2);
          done();
        })
        .catch(done.fail);
    });
  });
});
