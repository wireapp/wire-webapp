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

'use strict';

// grunt test_init && grunt test_run:system_notification/SystemNotificationRepository

window.wire = window.wire || {};
window.wire.app = window.wire.app || {};

describe('z.system_notification.SystemNotificationRepository', function() {
  const test_factory = new TestFactory();
  let conversation_et = null;
  let message_et = null;
  let user_et = null;
  let verify_notification,
    verify_notification_ephemeral,
    verify_notification_obfuscated,
    verify_notification_system = undefined;

  const first_name = `${entities.user.john_doe.name.split(' ')[0]}`;
  let notification_content = null;

  beforeEach(done => {
    test_factory
      .exposeSystemNotificationActors()
      .then(function() {
        amplify.publish(
          z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE,
          z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET,
        );

        // Create entities
        user_et = TestFactory.user_repository.user_mapper.map_user_from_object(
          payload.users.get.one[0],
        );
        conversation_et = TestFactory.conversation_repository.conversation_mapper.map_conversation(
          entities.conversation,
        );
        conversation_et.team_id = undefined;

        // Notification
        notification_content = {
          options: {
            body: '',
            data: {
              conversation_id: conversation_et.id,
              message_id: '0',
            },
            icon: '/image/logo/notification.png',
            silent: true,
            tag: conversation_et.id,
          },
          timeout:
            z.system_notification.SystemNotificationRepository.CONFIG.TIMEOUT,
          title: z.util.StringUtil.truncate(
            conversation_et.display_name(),
            z.system_notification.SystemNotificationRepository.CONFIG
              .TITLE_LENGTH,
            false,
          ),
        };

        // Mocks
        document.hasFocus = () => false;
        TestFactory.system_notification_repository.permission_state =
          z.system_notification.PermissionStatusState.GRANTED;
        z.util.Environment.browser.supports.notifications = true;
        window.wire.app = {
          service: {
            asset: {
              generate_asset_url() {
                return '/image/logo/notification.png';
              },
            },
          },
          view: {
            content: {
              content_state: ko.observable(
                z.ViewModel.content.CONTENT_STATE.CONVERSATION,
              ),
              multitasking: {
                is_minimized() {
                  return true;
                },
              },
            },
          },
        };

        spyOn(TestFactory.system_notification_repository, '_show_notification');
        spyOn(TestFactory.system_notification_repository, '_notify_sound');

        verify_notification = function(
          _done,
          _conversation,
          _message,
          _expected_body,
        ) {
          TestFactory.system_notification_repository
            .notify(_conversation, _message)
            .then(function() {
              notification_content.options.body = _expected_body;
              if (_conversation.is_group()) {
                const title = `${_message
                  .user()
                  .first_name()} in ${_conversation.display_name()}`;
                notification_content.title = z.util.StringUtil.truncate(
                  title,
                  z.system_notification.SystemNotificationRepository.CONFIG
                    .TITLE_LENGTH,
                  false,
                );
              } else {
                notification_content.title = '…';
              }
              notification_content.trigger = TestFactory.system_notification_repository._create_trigger(
                conversation_et,
                message_et,
              );

              const result = JSON.stringify(
                TestFactory.system_notification_repository._show_notification.calls.first()
                  .args[0],
              );
              expect(result).toEqual(JSON.stringify(notification_content));
              expect(
                TestFactory.system_notification_repository._show_notification,
              ).toHaveBeenCalledTimes(1);
              _done();
            })
            .catch(_done.fail);
        };

        verify_notification_ephemeral = function(
          _done,
          _conversation,
          _message,
        ) {
          TestFactory.system_notification_repository
            .notify(_conversation, _message)
            .then(function() {
              notification_content.options.body =
                z.string.system_notification_obfuscated;
              notification_content.title =
                z.string.system_notification_obfuscated_title;
              notification_content.trigger = TestFactory.system_notification_repository._create_trigger(
                conversation_et,
                message_et,
              );

              const result = JSON.stringify(
                TestFactory.system_notification_repository._show_notification.calls.first()
                  .args[0],
              );
              expect(result).toEqual(JSON.stringify(notification_content));
              expect(
                TestFactory.system_notification_repository._show_notification,
              ).toHaveBeenCalledTimes(1);
              _done();
            })
            .catch(_done.fail);
        };

        verify_notification_obfuscated = function(
          _done,
          _conversation,
          _message,
          _setting,
        ) {
          TestFactory.system_notification_repository
            .notify(_conversation, _message)
            .then(function() {
              if (
                _setting ===
                z.system_notification.SystemNotificationPreference
                  .OBFUSCATE_MESSAGE
              ) {
                const title = `${message_et
                  .user()
                  .first_name()} in ${conversation_et.display_name()}`;
                notification_content.options.body =
                  z.string.system_notification_obfuscated;
                notification_content.title = z.util.StringUtil.truncate(
                  title,
                  z.system_notification.SystemNotificationRepository.CONFIG
                    .TITLE_LENGTH,
                  false,
                );
              } else {
                notification_content.options.body =
                  z.string.system_notification_obfuscated;
                notification_content.title =
                  z.string.system_notification_obfuscated_title;
              }
              notification_content.trigger = TestFactory.system_notification_repository._create_trigger(
                conversation_et,
                message_et,
              );

              const result = JSON.stringify(
                TestFactory.system_notification_repository._show_notification.calls.first()
                  .args[0],
              );
              expect(result).toEqual(JSON.stringify(notification_content));
              expect(
                TestFactory.system_notification_repository._show_notification,
              ).toHaveBeenCalledTimes(1);
              _done();
            })
            .catch(_done.fail);
        };

        verify_notification_system = function(
          _done,
          _conversation,
          _message,
          _expected_body,
          _expected_title,
        ) {
          TestFactory.system_notification_repository
            .notify(_conversation, _message)
            .then(function() {
              notification_content.options.body = _expected_body;
              if (_expected_title) {
                notification_content.options.data.conversation_id =
                  _conversation.id;
                notification_content.options.tag = _conversation.id;
                notification_content.title = _expected_title;
              }
              notification_content.trigger = TestFactory.system_notification_repository._create_trigger(
                conversation_et,
                message_et,
              );

              const result = JSON.stringify(
                TestFactory.system_notification_repository._show_notification.calls.first()
                  .args[0],
              );
              expect(result).toEqual(JSON.stringify(notification_content));
              expect(
                TestFactory.system_notification_repository._show_notification,
              ).toHaveBeenCalledTimes(1);
              _done();
            })
            .catch(_done.fail);
        };

        done();
      })
      .catch(done.fail);
  });

  describe('does not show a notification', function() {
    beforeEach(function() {
      message_et = new z.entity.PingMessage();
      message_et.user(user_et);
    });

    it('if the browser does not support them', function(done) {
      z.util.Environment.browser.supports.notifications = false;

      TestFactory.system_notification_repository
        .notify(conversation_et, message_et)
        .then(function() {
          expect(
            TestFactory.system_notification_repository._show_notification,
          ).not.toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('if the browser tab has focus and conversation is active', function(
      done,
    ) {
      TestFactory.conversation_repository.active_conversation(conversation_et);
      document.hasFocus = () => true;
      TestFactory.v2_call_center.joined_call = () => true;

      TestFactory.system_notification_repository
        .notify(conversation_et, message_et)
        .then(function() {
          expect(
            TestFactory.system_notification_repository._show_notification,
          ).not.toHaveBeenCalled();

          window.wire.app.view.content.multitasking.is_minimized = () => false;

          TestFactory.system_notification_repository
            .notify(conversation_et, message_et)
            .then(function() {
              expect(
                TestFactory.system_notification_repository._show_notification,
              ).toHaveBeenCalledTimes(1);
              done();
            });
        })
        .catch(done.fail);
    });

    it('if the event was triggered by the user', function(done) {
      message_et.user().is_me = true;

      TestFactory.system_notification_repository
        .notify(conversation_et, message_et)
        .then(function() {
          expect(
            TestFactory.system_notification_repository._show_notification,
          ).not.toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('if the conversation is muted', function(done) {
      conversation_et.muted_state(true);

      TestFactory.system_notification_repository
        .notify(conversation_et, message_et)
        .then(function() {
          expect(
            TestFactory.system_notification_repository._show_notification,
          ).not.toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('for a successfully completed call', function(done) {
      message_et = new z.entity.CallMessage();
      message_et.call_message_type = z.message.CALL_MESSAGE_TYPE.DEACTIVATED;
      message_et.finished_reason = z.calling.enum.TERMINATION_REASON.COMPLETED;

      TestFactory.system_notification_repository
        .notify(conversation_et, message_et)
        .then(function() {
          expect(
            TestFactory.system_notification_repository._show_notification,
          ).not.toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('if preference is set to none', function(done) {
      TestFactory.system_notification_repository.notifications_preference(
        z.system_notification.SystemNotificationPreference.NONE,
      );

      TestFactory.system_notification_repository
        .notify(conversation_et, message_et)
        .then(function() {
          expect(
            TestFactory.system_notification_repository._show_notification,
          ).not.toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('if the user permission was denied', function(done) {
      TestFactory.system_notification_repository.permission_state =
        z.system_notification.PermissionStatusState.DENIED;

      TestFactory.system_notification_repository
        .notify(conversation_et, message_et)
        .then(function() {
          expect(
            TestFactory.system_notification_repository._show_notification,
          ).not.toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });
  });

  describe('shows a well-formed call notification', function() {
    describe('for an incoming call', function() {
      const expected_body = z.string.system_notification_voice_channel_activate;

      beforeEach(function() {
        message_et = new z.entity.CallMessage();
        message_et.call_message_type = z.message.CALL_MESSAGE_TYPE.ACTIVATED;
        message_et.user(user_et);
      });

      it('in a 1:1 conversation', function(done) {
        conversation_et.type(z.conversation.ConversationType.ONE2ONE);
        verify_notification(done, conversation_et, message_et, expected_body);
      });

      it('in a group conversation', function(done) {
        verify_notification(done, conversation_et, message_et, expected_body);
      });
    });

    describe('for a missed call', function() {
      const expected_body =
        z.string.system_notification_voice_channel_deactivate;

      beforeEach(function() {
        message_et = new z.entity.CallMessage();
        message_et.call_message_type = z.message.CALL_MESSAGE_TYPE.DEACTIVATED;
        message_et.finished_reason = z.calling.enum.TERMINATION_REASON.MISSED;
        message_et.user(user_et);
      });

      it('in a 1:1 conversation', function(done) {
        conversation_et.type(z.conversation.ConversationType.ONE2ONE);
        verify_notification(done, conversation_et, message_et, expected_body);
      });

      it('in a group conversation', function(done) {
        verify_notification(done, conversation_et, message_et, expected_body);
      });
    });
  });

  describe('shows a well-formed content notification', function() {
    let expected_body = undefined;

    beforeEach(function() {
      message_et = new z.entity.ContentMessage();
      message_et.user(user_et);
    });

    describe('for a text message', function() {
      beforeEach(function() {
        const asset_et = new z.entity.Text('id', 'Lorem ipsum');
        message_et.assets.push(asset_et);
        expected_body = asset_et.text;
      });

      it('in a 1:1 conversation', function(done) {
        conversation_et.type(z.conversation.ConversationType.ONE2ONE);
        verify_notification(done, conversation_et, message_et, expected_body);
      });

      it('in a group conversation', function(done) {
        verify_notification(done, conversation_et, message_et, expected_body);
      });

      it('when preference is set to obfuscate-message', function(done) {
        const notification_preference =
          z.system_notification.SystemNotificationPreference.OBFUSCATE_MESSAGE;
        TestFactory.system_notification_repository.notifications_preference(
          notification_preference,
        );
        verify_notification_obfuscated(
          done,
          conversation_et,
          message_et,
          notification_preference,
        );
      });

      it('when preference is set to obfuscate', function(done) {
        const notification_preference =
          z.system_notification.SystemNotificationPreference.OBFUSCATE;
        TestFactory.system_notification_repository.notifications_preference(
          notification_preference,
        );
        verify_notification_obfuscated(
          done,
          conversation_et,
          message_et,
          notification_preference,
        );
      });
    });

    describe('for a picture', function() {
      beforeEach(function() {
        message_et.assets.push(new z.entity.MediumImage());
        expected_body = z.string.system_notification_asset_add;
      });

      it('in a 1:1 conversation', function(done) {
        conversation_et.type(z.conversation.ConversationType.ONE2ONE);
        verify_notification(done, conversation_et, message_et, expected_body);
      });

      it('in a group conversation', function(done) {
        verify_notification(done, conversation_et, message_et, expected_body);
      });

      it('when preference is set to obfuscate-message', function(done) {
        const notification_preference =
          z.system_notification.SystemNotificationPreference.OBFUSCATE_MESSAGE;
        TestFactory.system_notification_repository.notifications_preference(
          notification_preference,
        );
        verify_notification_obfuscated(
          done,
          conversation_et,
          message_et,
          notification_preference,
        );
      });

      it('when preference is set to obfuscate', function(done) {
        const notification_preference =
          z.system_notification.SystemNotificationPreference.OBFUSCATE;
        TestFactory.system_notification_repository.notifications_preference(
          notification_preference,
        );
        verify_notification_obfuscated(
          done,
          conversation_et,
          message_et,
          notification_preference,
        );
      });
    });

    describe('for a location', function() {
      beforeEach(function() {
        message_et.assets.push(new z.entity.Location());
        expected_body = z.string.system_notification_shared_location;
      });

      it('in a 1:1 conversation', function(done) {
        conversation_et.type(z.conversation.ConversationType.ONE2ONE);
        verify_notification(done, conversation_et, message_et, expected_body);
      });

      it('in a group conversation', function(done) {
        verify_notification(done, conversation_et, message_et, expected_body);
      });

      it('when preference is set to obfuscate-message', function(done) {
        const notification_preference =
          z.system_notification.SystemNotificationPreference.OBFUSCATE_MESSAGE;
        TestFactory.system_notification_repository.notifications_preference(
          notification_preference,
        );
        verify_notification_obfuscated(
          done,
          conversation_et,
          message_et,
          notification_preference,
        );
      });

      it('when preference is set to obfuscate', function(done) {
        const notification_preference =
          z.system_notification.SystemNotificationPreference.OBFUSCATE;
        TestFactory.system_notification_repository.notifications_preference(
          notification_preference,
        );
        verify_notification_obfuscated(
          done,
          conversation_et,
          message_et,
          notification_preference,
        );
      });
    });

    describe('for ephemeral messages', function() {
      beforeEach(function() {
        message_et.ephemeral_expires(5000);
      });

      it('that contains text', function(done) {
        message_et.assets.push(new z.entity.Text('id', 'Hello world!'));
        verify_notification_ephemeral(done, conversation_et, message_et);
      });

      it('that contains an image', function(done) {
        message_et.assets.push(new z.entity.Location());
        verify_notification_ephemeral(done, conversation_et, message_et);
      });

      it('that contains a location', function(done) {
        message_et.assets.push(new z.entity.MediumImage());
        verify_notification_ephemeral(done, conversation_et, message_et);
      });
    });
  });

  describe('shows a well-formed group notification', function() {
    beforeEach(function() {
      const title = `${message_et
        .user()
        .first_name()} in ${conversation_et.display_name()}`;
      notification_content.title = z.util.StringUtil.truncate(
        title,
        z.system_notification.SystemNotificationRepository.CONFIG.TITLE_LENGTH,
        false,
      );
    });

    it('if a group is created', function(done) {
      conversation_et.from = payload.users.get.one[0].id;
      message_et = new z.entity.MemberMessage();
      message_et.user(user_et);
      message_et.member_message_type =
        z.message.SystemMessageType.CONVERSATION_CREATE;

      const expected_body = `${first_name} started a conversation`;
      verify_notification_system(
        done,
        conversation_et,
        message_et,
        expected_body,
      );
    });

    it('if a group is renamed', function(done) {
      message_et = new z.entity.RenameMessage();
      message_et.user(user_et);
      message_et.name = 'Lorem Ipsum Conversation';

      const expected_body = `${first_name} renamed the conversation to ${message_et.name}`;
      verify_notification_system(
        done,
        conversation_et,
        message_et,
        expected_body,
      );
    });
  });

  describe('shows a well-formed member notification', function() {
    let other_user_et = undefined;

    beforeEach(function() {
      message_et = new z.entity.MemberMessage();
      message_et.user(user_et);
      message_et.member_message_type = z.message.SystemMessageType.NORMAL;
      other_user_et = TestFactory.user_repository.user_mapper.map_user_from_object(
        payload.users.get.many[1],
      );
    });

    describe('if people are added', function() {
      beforeEach(function() {
        message_et.type = z.event.Backend.CONVERSATION.MEMBER_JOIN;
        const title = `${message_et
          .user()
          .first_name()} in ${conversation_et.display_name()}`;
        notification_content.title = z.util.StringUtil.truncate(
          title,
          z.system_notification.SystemNotificationRepository.CONFIG
            .TITLE_LENGTH,
          false,
        );
      });

      it('with one user being added to the conversation', function(done) {
        message_et.user_ets([other_user_et]);

        const first_name_added = `${entities.user.jane_roe.name.split(' ')[0]}`;
        const expected_body = `${first_name} added ${first_name_added} to the conversation`;
        verify_notification_system(
          done,
          conversation_et,
          message_et,
          expected_body,
        );
      });

      it('with you being added to the conversation', function(done) {
        other_user_et.is_me = true;
        message_et.user_ets([other_user_et]);

        const expected_body = `${first_name} added you to the conversation`;
        verify_notification_system(
          done,
          conversation_et,
          message_et,
          expected_body,
        );
      });

      it('with multiple users being added to the conversation', function(done) {
        const user_ids = [entities.user.john_doe.id, entities.user.jane_roe.id];
        message_et.user_ids(user_ids);

        const expected_body = `${first_name} added 2 people to the conversation`;
        verify_notification_system(
          done,
          conversation_et,
          message_et,
          expected_body,
        );
      });
    });

    describe('if people are removed', function() {
      beforeEach(function() {
        message_et.type = z.event.Backend.CONVERSATION.MEMBER_LEAVE;
        const title = `${message_et
          .user()
          .first_name()} in ${conversation_et.display_name()}`;
        notification_content.title = z.util.StringUtil.truncate(
          title,
          z.system_notification.SystemNotificationRepository.CONFIG
            .TITLE_LENGTH,
          false,
        );
      });

      it('with one user being removed from the conversation', function(done) {
        message_et.user_ets([other_user_et]);

        const first_name_removed = `${entities.user.jane_roe.name.split(
          ' ',
        )[0]}`;
        const expected_body = `${first_name} removed ${first_name_removed} from the conversation`;
        verify_notification_system(
          done,
          conversation_et,
          message_et,
          expected_body,
        );
      });

      it('with you being removed from the conversation', function(done) {
        other_user_et.is_me = true;
        message_et.user_ets([other_user_et]);

        const expected_body = `${first_name} removed you from the conversation`;
        verify_notification_system(
          done,
          conversation_et,
          message_et,
          expected_body,
        );
      });

      it('with multiple users being removed from the conversation', function(
        done,
      ) {
        const user_ets = TestFactory.user_repository.user_mapper.map_users_from_object(
          payload.users.get.many,
        );
        message_et.user_ets(user_ets);

        const expected_body = `${first_name} removed 2 people from the conversation`;
        verify_notification_system(
          done,
          conversation_et,
          message_et,
          expected_body,
        );
      });

      it('with someone leaving the conversation by himself', function(done) {
        message_et.user_ets([message_et.user()]);

        const expected_body = `${first_name} left the conversation`;
        verify_notification_system(
          done,
          conversation_et,
          message_et,
          expected_body,
        );
      });
    });
  });

  describe('shows a well-formed request notification', function() {
    let connection_et = undefined;
    const expected_title = '…';

    beforeEach(function() {
      conversation_et.type(z.conversation.ConversationType.ONE2ONE);

      const user_connection_mapper = new z.user.UserConnectionMapper();
      connection_et = user_connection_mapper.map_user_connection_from_json(
        entities.connection,
      );
      message_et = new z.entity.MemberMessage();
      message_et.user(user_et);
    });

    it('if a connection request is incoming', function(done) {
      connection_et.status = 'pending';
      message_et.member_message_type =
        z.message.SystemMessageType.CONNECTION_REQUEST;

      const expected_body = z.string.system_notification_connection_request;
      verify_notification_system(
        done,
        conversation_et,
        message_et,
        expected_body,
        expected_title,
      );
    });

    it('if your connection request was accepted', function(done) {
      message_et.member_message_type =
        z.message.SystemMessageType.CONNECTION_ACCEPTED;

      const expected_body = z.string.system_notification_connection_accepted;
      verify_notification_system(
        done,
        conversation_et,
        message_et,
        expected_body,
        expected_title,
      );
    });

    it('if you are automatically connected', function(done) {
      message_et.member_message_type =
        z.message.SystemMessageType.CONNECTION_CONNECTED;

      const expected_body = z.string.system_notification_connection_connected;
      verify_notification_system(
        done,
        conversation_et,
        message_et,
        expected_body,
        expected_title,
      );
    });
  });

  describe('shows a well-formed ping notification', function() {
    const expected_body = z.string.system_notification_ping;

    beforeAll(function() {
      user_et = TestFactory.user_repository.user_mapper.map_user_from_object(
        payload.users.get.one[0],
      );
    });

    beforeEach(function() {
      message_et = new z.entity.PingMessage();
      message_et.user(user_et);
    });

    it('in a 1:1 conversation', function(done) {
      conversation_et.type(z.conversation.ConversationType.ONE2ONE);
      verify_notification(done, conversation_et, message_et, expected_body);
    });

    it('in a group conversation', function(done) {
      verify_notification(done, conversation_et, message_et, expected_body);
    });

    it('as an ephemeral message', function(done) {
      message_et.ephemeral_expires(5000);
      verify_notification_ephemeral(done, conversation_et, message_et);
    });
  });
});
