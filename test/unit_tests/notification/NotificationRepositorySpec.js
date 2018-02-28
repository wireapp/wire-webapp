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

'use strict';

// grunt test_init && grunt test_run:notification/NotificationRepository

window.wire = window.wire || {};
window.wire.app = window.wire.app || {};

describe('z.notification.NotificationRepository', () => {
  const test_factory = new TestFactory();
  let conversation_et = null;
  let message_et = null;
  let user_et = null;
  let verify_notification;
  let verify_notification_ephemeral;
  let verify_notification_obfuscated;
  let verify_notification_system = undefined;

  const [first_name] = entities.user.john_doe.name.split(' ');
  let notification_content = null;

  beforeEach(done => {
    test_factory
      .exposeNotificationActors()
      .then(() => {
        amplify.publish(
          z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE,
          z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET
        );

        // Create entities
        user_et = TestFactory.user_repository.user_mapper.map_user_from_object(payload.users.get.one[0]);
        conversation_et = TestFactory.conversation_repository.conversation_mapper.map_conversations([
          entities.conversation,
        ])[0];
        conversation_et.team_id = undefined;

        // Notification
        const title = conversation_et.display_name();
        notification_content = {
          options: {
            body: '',
            data: {
              conversationId: conversation_et.id,
              messageId: '0',
            },
            icon: '/image/logo/notification.png',
            silent: true,
            tag: conversation_et.id,
          },
          timeout: z.notification.NotificationRepository.CONFIG.TIMEOUT,
          title: z.util.StringUtil.truncate(title, z.notification.NotificationRepository.CONFIG.TITLE_LENGTH, false),
        };

        // Mocks
        document.hasFocus = () => false;
        TestFactory.notification_repository.permissionState = z.notification.PermissionStatusState.GRANTED;
        z.util.Environment.browser.supports.notifications = true;
        window.wire.app = {
          service: {
            asset: {
              generateAssetUrl: () => Promise.resolve('/image/logo/notification.png'),
            },
          },
          view: {
            content: {
              multitasking: {
                isMinimized: () => true,
              },
              state: ko.observable(z.viewModel.ContentViewModel.STATE.CONVERSATION),
            },
          },
        };

        spyOn(TestFactory.notification_repository, '_showNotification');
        spyOn(TestFactory.notification_repository, '_notifySound');

        verify_notification = function(_done, _conversation, _message, _expected_body) {
          TestFactory.notification_repository
            .notify(_message, undefined, _conversation)
            .then(() => {
              expect(TestFactory.notification_repository._showNotification).toHaveBeenCalledTimes(1);

              const trigger = TestFactory.notification_repository._createTrigger(message_et, null, conversation_et);
              notification_content.options.body = _expected_body;
              notification_content.trigger = trigger;

              if (_conversation.is_group()) {
                const titleLength = z.notification.NotificationRepository.CONFIG.TITLE_LENGTH;
                const titleText = `${_message.user().first_name()} in ${_conversation.display_name()}`;

                notification_content.title = z.util.StringUtil.truncate(titleText, titleLength, false);
              } else {
                notification_content.title = '…';
              }

              const [firstResultArgs] = TestFactory.notification_repository._showNotification.calls.first().args;
              expect(JSON.stringify(firstResultArgs)).toEqual(JSON.stringify(notification_content));
              _done();
            })
            .catch(_done.fail);
        };

        verify_notification_ephemeral = function(_done, _conversation, _message) {
          TestFactory.notification_repository
            .notify(_message, undefined, _conversation)
            .then(() => {
              expect(TestFactory.notification_repository._showNotification).toHaveBeenCalledTimes(1);

              const trigger = TestFactory.notification_repository._createTrigger(message_et, null, conversation_et);
              notification_content.options.body = z.string.notificationObfuscated;
              notification_content.title = z.string.notificationObfuscatedTitle;
              notification_content.trigger = trigger;

              const [firstResultArgs] = TestFactory.notification_repository._showNotification.calls.first().args;
              expect(JSON.stringify(firstResultArgs)).toEqual(JSON.stringify(notification_content));
              _done();
            })
            .catch(_done.fail);
        };

        verify_notification_obfuscated = function(_done, _conversation, _message, _setting) {
          TestFactory.notification_repository
            .notify(_message, undefined, _conversation)
            .then(() => {
              expect(TestFactory.notification_repository._showNotification).toHaveBeenCalledTimes(1);

              const trigger = TestFactory.notification_repository._createTrigger(message_et, null, conversation_et);
              notification_content.trigger = trigger;

              const obfuscateMessage = _setting === z.notification.NotificationPreference.OBFUSCATE_MESSAGE;
              if (obfuscateMessage) {
                const titleLength = z.notification.NotificationRepository.CONFIG.TITLE_LENGTH;
                const titleText = `${message_et.user().first_name()} in ${conversation_et.display_name()}`;

                notification_content.options.body = z.string.notificationObfuscated;
                notification_content.title = z.util.StringUtil.truncate(titleText, titleLength, false);
              } else {
                notification_content.options.body = z.string.notificationObfuscated;
                notification_content.title = z.string.notificationObfuscatedTitle;
              }

              const [firstResultArgs] = TestFactory.notification_repository._showNotification.calls.first().args;
              expect(JSON.stringify(firstResultArgs)).toEqual(JSON.stringify(notification_content));
              _done();
            })
            .catch(_done.fail);
        };

        verify_notification_system = function(_done, _conversation, _message, _expected_body, _expected_title) {
          TestFactory.notification_repository
            .notify(_message, undefined, _conversation)
            .then(() => {
              expect(TestFactory.notification_repository._showNotification).toHaveBeenCalledTimes(1);

              const trigger = TestFactory.notification_repository._createTrigger(message_et, null, conversation_et);
              notification_content.trigger = trigger;
              notification_content.options.body = _expected_body;

              if (_expected_title) {
                notification_content.options.data.conversationId = _conversation.id;
                notification_content.options.tag = _conversation.id;
                notification_content.title = _expected_title;
              }

              const [firstResultArgs] = TestFactory.notification_repository._showNotification.calls.first().args;
              expect(JSON.stringify(firstResultArgs)).toEqual(JSON.stringify(notification_content));
              _done();
            })
            .catch(_done.fail);
        };

        done();
      })
      .catch(done.fail);
  });

  describe('does not show a notification', () => {
    beforeEach(() => {
      message_et = new z.entity.PingMessage();
      message_et.user(user_et);
    });

    it('if the browser does not support them', done => {
      z.util.Environment.browser.supports.notifications = false;

      TestFactory.notification_repository
        .notify(message_et, undefined, conversation_et)
        .then(() => {
          expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('if the browser tab has focus and conversation is active', done => {
      TestFactory.conversation_repository.active_conversation(conversation_et);
      document.hasFocus = () => true;
      TestFactory.calling_repository.joinedCall = () => true;

      TestFactory.notification_repository
        .notify(message_et, undefined, conversation_et)
        .then(() => {
          expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();

          window.wire.app.view.content.multitasking.isMinimized = () => false;

          TestFactory.notification_repository.notify(message_et, undefined, conversation_et).then(() => {
            expect(TestFactory.notification_repository._showNotification).toHaveBeenCalledTimes(1);
            done();
          });
        })
        .catch(done.fail);
    });

    it('if the event was triggered by the user', done => {
      message_et.user().is_me = true;

      TestFactory.notification_repository
        .notify(message_et, undefined, conversation_et)
        .then(() => {
          expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('if the conversation is muted', done => {
      conversation_et.muted_state(true);

      TestFactory.notification_repository
        .notify(message_et, undefined, conversation_et)
        .then(() => {
          expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('for a successfully completed call', done => {
      message_et = new z.entity.CallMessage();
      message_et.call_message_type = z.message.CALL_MESSAGE_TYPE.DEACTIVATED;
      message_et.finished_reason = z.calling.enum.TERMINATION_REASON.COMPLETED;

      TestFactory.notification_repository
        .notify(message_et, undefined, conversation_et)
        .then(() => {
          expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('if preference is set to none', done => {
      TestFactory.notification_repository.notificationsPreference(z.notification.NotificationPreference.NONE);

      TestFactory.notification_repository
        .notify(message_et, undefined, conversation_et)
        .then(() => {
          expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('if the user permission was denied', done => {
      TestFactory.notification_repository.permissionState = z.notification.PermissionStatusState.DENIED;

      TestFactory.notification_repository
        .notify(message_et, undefined, conversation_et)
        .then(() => {
          expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });
  });

  describe('shows a well-formed call notification', () => {
    describe('for an incoming call', () => {
      const expected_body = z.string.notificationVoiceChannelActivate;

      beforeEach(() => {
        message_et = new z.entity.CallMessage();
        message_et.call_message_type = z.message.CALL_MESSAGE_TYPE.ACTIVATED;
        message_et.user(user_et);
      });

      it('in a 1:1 conversation', done => {
        conversation_et.type(z.conversation.ConversationType.ONE2ONE);
        verify_notification(done, conversation_et, message_et, expected_body);
      });

      it('in a group conversation', done => {
        verify_notification(done, conversation_et, message_et, expected_body);
      });
    });

    describe('for a missed call', () => {
      const expected_body = z.string.notificationVoiceChannelDeactivate;

      beforeEach(() => {
        message_et = new z.entity.CallMessage();
        message_et.call_message_type = z.message.CALL_MESSAGE_TYPE.DEACTIVATED;
        message_et.finished_reason = z.calling.enum.TERMINATION_REASON.MISSED;
        message_et.user(user_et);
      });

      it('in a 1:1 conversation', done => {
        conversation_et.type(z.conversation.ConversationType.ONE2ONE);
        verify_notification(done, conversation_et, message_et, expected_body);
      });

      it('in a group conversation', done => {
        verify_notification(done, conversation_et, message_et, expected_body);
      });
    });
  });

  describe('shows a well-formed content notification', () => {
    let expected_body = undefined;

    beforeEach(() => {
      message_et = new z.entity.ContentMessage();
      message_et.user(user_et);
    });

    describe('for a text message', () => {
      beforeEach(() => {
        const asset_et = new z.entity.Text('id', 'Lorem ipsum');
        message_et.assets.push(asset_et);
        expected_body = asset_et.text;
      });

      it('in a 1:1 conversation', done => {
        conversation_et.type(z.conversation.ConversationType.ONE2ONE);
        verify_notification(done, conversation_et, message_et, expected_body);
      });

      it('in a group conversation', done => {
        verify_notification(done, conversation_et, message_et, expected_body);
      });

      it('when preference is set to obfuscate-message', done => {
        const notification_preference = z.notification.NotificationPreference.OBFUSCATE_MESSAGE;
        TestFactory.notification_repository.notificationsPreference(notification_preference);
        verify_notification_obfuscated(done, conversation_et, message_et, notification_preference);
      });

      it('when preference is set to obfuscate', done => {
        const notification_preference = z.notification.NotificationPreference.OBFUSCATE;
        TestFactory.notification_repository.notificationsPreference(notification_preference);
        verify_notification_obfuscated(done, conversation_et, message_et, notification_preference);
      });
    });

    describe('for a picture', () => {
      beforeEach(() => {
        message_et.assets.push(new z.entity.MediumImage());
        expected_body = z.string.notificationAssetAdd;
      });

      it('in a 1:1 conversation', done => {
        conversation_et.type(z.conversation.ConversationType.ONE2ONE);
        verify_notification(done, conversation_et, message_et, expected_body);
      });

      it('in a group conversation', done => {
        verify_notification(done, conversation_et, message_et, expected_body);
      });

      it('when preference is set to obfuscate-message', done => {
        const notification_preference = z.notification.NotificationPreference.OBFUSCATE_MESSAGE;
        TestFactory.notification_repository.notificationsPreference(notification_preference);
        verify_notification_obfuscated(done, conversation_et, message_et, notification_preference);
      });

      it('when preference is set to obfuscate', done => {
        const notification_preference = z.notification.NotificationPreference.OBFUSCATE;
        TestFactory.notification_repository.notificationsPreference(notification_preference);
        verify_notification_obfuscated(done, conversation_et, message_et, notification_preference);
      });
    });

    describe('for a location', () => {
      beforeEach(() => {
        message_et.assets.push(new z.entity.Location());
        expected_body = z.string.notificationSharedLocation;
      });

      it('in a 1:1 conversation', done => {
        conversation_et.type(z.conversation.ConversationType.ONE2ONE);
        verify_notification(done, conversation_et, message_et, expected_body);
      });

      it('in a group conversation', done => {
        verify_notification(done, conversation_et, message_et, expected_body);
      });

      it('when preference is set to obfuscate-message', done => {
        const notification_preference = z.notification.NotificationPreference.OBFUSCATE_MESSAGE;
        TestFactory.notification_repository.notificationsPreference(notification_preference);
        verify_notification_obfuscated(done, conversation_et, message_et, notification_preference);
      });

      it('when preference is set to obfuscate', done => {
        const notification_preference = z.notification.NotificationPreference.OBFUSCATE;
        TestFactory.notification_repository.notificationsPreference(notification_preference);
        verify_notification_obfuscated(done, conversation_et, message_et, notification_preference);
      });
    });

    describe('for ephemeral messages', () => {
      beforeEach(() => {
        message_et.ephemeral_expires(5000);
      });

      it('that contains text', done => {
        message_et.assets.push(new z.entity.Text('id', 'Hello world!'));
        verify_notification_ephemeral(done, conversation_et, message_et);
      });

      it('that contains an image', done => {
        message_et.assets.push(new z.entity.Location());
        verify_notification_ephemeral(done, conversation_et, message_et);
      });

      it('that contains a location', done => {
        message_et.assets.push(new z.entity.MediumImage());
        verify_notification_ephemeral(done, conversation_et, message_et);
      });
    });
  });

  describe('shows a well-formed group notification', () => {
    beforeEach(() => {
      const titleLength = z.notification.NotificationRepository.CONFIG.TITLE_LENGTH;
      const titleText = `${message_et.user().first_name()} in ${conversation_et.display_name()}`;

      notification_content.title = z.util.StringUtil.truncate(titleText, titleLength, false);
    });

    it('if a group is created', done => {
      conversation_et.from = payload.users.get.one[0].id;
      message_et = new z.entity.MemberMessage();
      message_et.user(user_et);
      message_et.memberMessageType = z.message.SystemMessageType.CONVERSATION_CREATE;

      const expected_body = `${first_name} started a conversation`;
      verify_notification_system(done, conversation_et, message_et, expected_body);
    });

    it('if a group is renamed', done => {
      message_et = new z.entity.RenameMessage();
      message_et.user(user_et);
      message_et.name = 'Lorem Ipsum Conversation';

      const expected_body = `${first_name} renamed the conversation to ${message_et.name}`;
      verify_notification_system(done, conversation_et, message_et, expected_body);
    });
  });

  describe('shows a well-formed member notification', () => {
    let other_user_et = undefined;

    beforeEach(() => {
      message_et = new z.entity.MemberMessage();
      message_et.user(user_et);
      message_et.memberMessageType = z.message.SystemMessageType.NORMAL;
      other_user_et = TestFactory.user_repository.user_mapper.map_user_from_object(payload.users.get.many[1]);
    });

    describe('if people are added', () => {
      beforeEach(() => {
        message_et.type = z.event.Backend.CONVERSATION.MEMBER_JOIN;

        const titleLength = z.notification.NotificationRepository.CONFIG.TITLE_LENGTH;
        const titleText = `${message_et.user().first_name()} in ${conversation_et.display_name()}`;

        notification_content.title = z.util.StringUtil.truncate(titleText, titleLength, false);
      });

      it('with one user being added to the conversation', done => {
        message_et.userEntities([other_user_et]);

        const [first_name_added] = entities.user.jane_roe.name.split(' ');
        const expected_body = `${first_name} added ${first_name_added} to the conversation`;
        verify_notification_system(done, conversation_et, message_et, expected_body);
      });

      it('with you being added to the conversation', done => {
        other_user_et.is_me = true;
        message_et.userEntities([other_user_et]);

        const expected_body = `${first_name} added you to the conversation`;
        verify_notification_system(done, conversation_et, message_et, expected_body);
      });

      it('with multiple users being added to the conversation', done => {
        const user_ids = [entities.user.john_doe.id, entities.user.jane_roe.id];
        message_et.userIds(user_ids);

        const expected_body = `${first_name} added 2 people to the conversation`;
        verify_notification_system(done, conversation_et, message_et, expected_body);
      });
    });

    describe('if people are removed', () => {
      beforeEach(() => {
        message_et.type = z.event.Backend.CONVERSATION.MEMBER_LEAVE;
        const titleLength = z.notification.NotificationRepository.CONFIG.TITLE_LENGTH;
        const titleText = `${message_et.user().first_name()} in ${conversation_et.display_name()}`;

        notification_content.title = z.util.StringUtil.truncate(titleText, titleLength, false);
      });

      it('with one user being removed from the conversation', done => {
        message_et.userEntities([other_user_et]);

        TestFactory.notification_repository
          .notify(message_et, undefined, conversation_et)
          .then(() => {
            expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();
            done();
          })
          .catch(done.fail);
      });

      it('with you being removed from the conversation', done => {
        other_user_et.is_me = true;
        message_et.userEntities([other_user_et]);

        const expected_body = `${first_name} removed you from the conversation`;
        verify_notification_system(done, conversation_et, message_et, expected_body);
      });

      it('with multiple users being removed from the conversation', done => {
        const user_ets = TestFactory.user_repository.user_mapper.map_users_from_object(payload.users.get.many);
        message_et.userEntities(user_ets);

        TestFactory.notification_repository
          .notify(message_et, undefined, conversation_et)
          .then(() => {
            expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();
            done();
          })
          .catch(done.fail);
      });

      it('with someone leaving the conversation by himself', done => {
        message_et.userEntities([message_et.user()]);

        TestFactory.notification_repository
          .notify(message_et, undefined, conversation_et)
          .then(() => {
            expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();
            done();
          })
          .catch(done.fail);
      });
    });
  });

  describe('shows a well-formed request notification', () => {
    let connection_et = undefined;
    const expected_title = '…';

    beforeEach(() => {
      conversation_et.type(z.conversation.ConversationType.ONE2ONE);

      const user_connection_mapper = new z.user.UserConnectionMapper();
      connection_et = user_connection_mapper.map_user_connection_from_json(entities.connection);
      message_et = new z.entity.MemberMessage();
      message_et.user(user_et);
    });

    it('if a connection request is incoming', done => {
      connection_et.status = 'pending';
      message_et.memberMessageType = z.message.SystemMessageType.CONNECTION_REQUEST;

      const expected_body = z.string.notificationConnectionRequest;
      verify_notification_system(done, conversation_et, message_et, expected_body, expected_title);
    });

    it('if your connection request was accepted', done => {
      message_et.memberMessageType = z.message.SystemMessageType.CONNECTION_ACCEPTED;

      const expected_body = z.string.notificationConnectionAccepted;
      verify_notification_system(done, conversation_et, message_et, expected_body, expected_title);
    });

    it('if you are automatically connected', done => {
      message_et.memberMessageType = z.message.SystemMessageType.CONNECTION_CONNECTED;

      const expected_body = z.string.notificationConnectionConnected;
      verify_notification_system(done, conversation_et, message_et, expected_body, expected_title);
    });
  });

  describe('shows a well-formed ping notification', () => {
    const expected_body = z.string.notificationPing;

    beforeAll(() => {
      user_et = TestFactory.user_repository.user_mapper.map_user_from_object(payload.users.get.one[0]);
    });

    beforeEach(() => {
      message_et = new z.entity.PingMessage();
      message_et.user(user_et);
    });

    it('in a 1:1 conversation', done => {
      conversation_et.type(z.conversation.ConversationType.ONE2ONE);
      verify_notification(done, conversation_et, message_et, expected_body);
    });

    it('in a group conversation', done => {
      verify_notification(done, conversation_et, message_et, expected_body);
    });

    it('as an ephemeral message', done => {
      message_et.ephemeral_expires(5000);
      verify_notification_ephemeral(done, conversation_et, message_et);
    });
  });
});
