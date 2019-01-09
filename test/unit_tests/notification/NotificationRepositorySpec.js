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

  beforeEach(() => {
    return test_factory.exposeNotificationActors().then(() => {
      amplify.publish(z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE, z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET);

      // Create entities
      const conversationMapper = TestFactory.conversation_repository.conversationMapper;
      user_et = TestFactory.user_repository.user_mapper.mapUserFromJson(payload.users.get.one[0]);
      [conversation_et] = conversationMapper.mapConversations([entities.conversation]);
      conversation_et.team_id = undefined;
      const selfUserEntity = new z.entity.User(z.util.createRandomUuid());
      selfUserEntity.is_me = true;
      selfUserEntity.inTeam(true);
      conversation_et.selfUser(selfUserEntity);

      // Notification
      const title = conversation_et.display_name();
      notification_content = {
        options: {
          body: '',
          data: {
            conversationId: conversation_et.id,
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
      TestFactory.notification_repository.permissionState(z.permission.PermissionStatusState.GRANTED);
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

      verify_notification = (_conversation, _message, _expected_body) => {
        return TestFactory.notification_repository.notify(_message, undefined, _conversation).then(() => {
          expect(TestFactory.notification_repository._showNotification).toHaveBeenCalledTimes(1);

          const trigger = TestFactory.notification_repository._createTrigger(message_et, null, conversation_et);
          notification_content.options.body = _expected_body;
          notification_content.options.data.messageType = _message.type;
          notification_content.trigger = trigger;

          if (_conversation.isGroup()) {
            const titleLength = z.notification.NotificationRepository.CONFIG.TITLE_LENGTH;
            const titleText = `${_message.user().first_name()} in ${_conversation.display_name()}`;

            notification_content.title = z.util.StringUtil.truncate(titleText, titleLength, false);
          } else {
            notification_content.title = '…';
          }

          const [firstResultArgs] = TestFactory.notification_repository._showNotification.calls.first().args;

          expect(JSON.stringify(firstResultArgs)).toEqual(JSON.stringify(notification_content));
        });
      };

      verify_notification_ephemeral = (_conversation, _message) => {
        return TestFactory.notification_repository.notify(_message, undefined, _conversation).then(() => {
          expect(TestFactory.notification_repository._showNotification).toHaveBeenCalledTimes(1);

          const trigger = TestFactory.notification_repository._createTrigger(message_et, null, conversation_et);
          notification_content.options.body = z.string.notificationObfuscated;
          notification_content.options.data.messageType = _message.type;
          notification_content.title = z.string.notificationObfuscatedTitle;
          notification_content.trigger = trigger;

          const [firstResultArgs] = TestFactory.notification_repository._showNotification.calls.first().args;

          expect(JSON.stringify(firstResultArgs)).toEqual(JSON.stringify(notification_content));
        });
      };

      verify_notification_obfuscated = (_conversation, _message, _setting) => {
        return TestFactory.notification_repository.notify(_message, undefined, _conversation).then(() => {
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
          notification_content.options.data.messageType = _message.type;

          const [firstResultArgs] = TestFactory.notification_repository._showNotification.calls.first().args;

          expect(JSON.stringify(firstResultArgs)).toEqual(JSON.stringify(notification_content));
        });
      };

      verify_notification_system = (_conversation, _message, _expected_body, _expected_title) => {
        return TestFactory.notification_repository.notify(_message, undefined, _conversation).then(() => {
          expect(TestFactory.notification_repository._showNotification).toHaveBeenCalledTimes(1);

          const trigger = TestFactory.notification_repository._createTrigger(message_et, null, conversation_et);
          notification_content.trigger = trigger;
          notification_content.options.body = _expected_body;
          notification_content.options.data.messageType = _message.type;

          if (_expected_title) {
            notification_content.options.data.conversationId = _conversation.id;
            notification_content.options.tag = _conversation.id;
            notification_content.title = _expected_title;
          }

          const [firstResultArgs] = TestFactory.notification_repository._showNotification.calls.first().args;

          expect(JSON.stringify(firstResultArgs)).toEqual(JSON.stringify(notification_content));
        });
      };
    });
  });

  describe('does not show a notification', () => {
    beforeEach(() => {
      message_et = new z.entity.PingMessage();
      message_et.user(user_et);
    });

    it('if the browser does not support them', () => {
      z.util.Environment.browser.supports.notifications = false;

      return TestFactory.notification_repository.notify(message_et, undefined, conversation_et).then(() => {
        expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();
      });
    });

    it('if the browser tab has focus and conversation is active', () => {
      TestFactory.conversation_repository.active_conversation(conversation_et);
      document.hasFocus = () => true;
      TestFactory.calling_repository.joinedCall = () => true;

      return TestFactory.notification_repository
        .notify(message_et, undefined, conversation_et)
        .then(() => {
          expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();

          window.wire.app.view.content.multitasking.isMinimized = () => false;

          return TestFactory.notification_repository.notify(message_et, undefined, conversation_et);
        })
        .then(() => {
          expect(TestFactory.notification_repository._showNotification).toHaveBeenCalledTimes(1);
        });
    });

    it('if the event was triggered by the user', () => {
      message_et.user().is_me = true;

      return TestFactory.notification_repository.notify(message_et, undefined, conversation_et).then(() => {
        expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();
      });
    });

    it('if the conversation is muted', () => {
      conversation_et.mutedState(z.conversation.NotificationSetting.STATE.NOTHING);

      return TestFactory.notification_repository.notify(message_et, undefined, conversation_et).then(() => {
        expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();
      });
    });

    it('for a successfully completed call', () => {
      message_et = new z.entity.CallMessage();
      message_et.call_message_type = z.message.CALL_MESSAGE_TYPE.DEACTIVATED;
      message_et.finished_reason = z.calling.enum.TERMINATION_REASON.COMPLETED;

      return TestFactory.notification_repository.notify(message_et, undefined, conversation_et).then(() => {
        expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();
      });
    });

    it('if preference is set to none', () => {
      TestFactory.notification_repository.notificationsPreference(z.notification.NotificationPreference.NONE);

      return TestFactory.notification_repository.notify(message_et, undefined, conversation_et).then(() => {
        expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();
      });
    });

    it('if the user permission was denied', () => {
      TestFactory.notification_repository.permissionState(z.permission.PermissionStatusState.DENIED);

      return TestFactory.notification_repository.notify(message_et, undefined, conversation_et).then(() => {
        expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();
      });
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

      it('in a 1:1 conversation', () => {
        conversation_et.type(z.conversation.ConversationType.ONE2ONE);
        return verify_notification(conversation_et, message_et, expected_body);
      });

      it('in a group conversation', () => {
        return verify_notification(conversation_et, message_et, expected_body);
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

      it('in a 1:1 conversation', () => {
        conversation_et.type(z.conversation.ConversationType.ONE2ONE);
        return verify_notification(conversation_et, message_et, expected_body);
      });

      it('in a group conversation', () => {
        return verify_notification(conversation_et, message_et, expected_body);
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

      it('in a 1:1 conversation', () => {
        conversation_et.type(z.conversation.ConversationType.ONE2ONE);
        return verify_notification(conversation_et, message_et, expected_body);
      });

      it('in a group conversation', () => {
        return verify_notification(conversation_et, message_et, expected_body);
      });

      it('when preference is set to obfuscate-message', () => {
        const notification_preference = z.notification.NotificationPreference.OBFUSCATE_MESSAGE;
        TestFactory.notification_repository.notificationsPreference(notification_preference);
        return verify_notification_obfuscated(conversation_et, message_et, notification_preference);
      });

      it('when preference is set to obfuscate', () => {
        const notification_preference = z.notification.NotificationPreference.OBFUSCATE;
        TestFactory.notification_repository.notificationsPreference(notification_preference);
        return verify_notification_obfuscated(conversation_et, message_et, notification_preference);
      });
    });

    describe('for a picture', () => {
      beforeEach(() => {
        message_et.assets.push(new z.entity.MediumImage());
        expected_body = z.string.notificationAssetAdd;
      });

      it('in a 1:1 conversation', () => {
        conversation_et.type(z.conversation.ConversationType.ONE2ONE);
        return verify_notification(conversation_et, message_et, expected_body);
      });

      it('in a group conversation', () => {
        return verify_notification(conversation_et, message_et, expected_body);
      });

      it('when preference is set to obfuscate-message', () => {
        const notification_preference = z.notification.NotificationPreference.OBFUSCATE_MESSAGE;
        TestFactory.notification_repository.notificationsPreference(notification_preference);
        return verify_notification_obfuscated(conversation_et, message_et, notification_preference);
      });

      it('when preference is set to obfuscate', () => {
        const notification_preference = z.notification.NotificationPreference.OBFUSCATE;
        TestFactory.notification_repository.notificationsPreference(notification_preference);
        return verify_notification_obfuscated(conversation_et, message_et, notification_preference);
      });
    });

    describe('for a location', () => {
      beforeEach(() => {
        message_et.assets.push(new z.entity.Location());
        expected_body = z.string.notificationSharedLocation;
      });

      it('in a 1:1 conversation', () => {
        conversation_et.type(z.conversation.ConversationType.ONE2ONE);
        return verify_notification(conversation_et, message_et, expected_body);
      });

      it('in a group conversation', () => {
        return verify_notification(conversation_et, message_et, expected_body);
      });

      it('when preference is set to obfuscate-message', () => {
        const notification_preference = z.notification.NotificationPreference.OBFUSCATE_MESSAGE;
        TestFactory.notification_repository.notificationsPreference(notification_preference);
        return verify_notification_obfuscated(conversation_et, message_et, notification_preference);
      });

      it('when preference is set to obfuscate', () => {
        const notification_preference = z.notification.NotificationPreference.OBFUSCATE;
        TestFactory.notification_repository.notificationsPreference(notification_preference);
        return verify_notification_obfuscated(conversation_et, message_et, notification_preference);
      });
    });

    describe('for ephemeral messages', () => {
      beforeEach(() => {
        message_et.ephemeral_expires(5000);
      });

      it('that contains text', () => {
        message_et.assets.push(new z.entity.Text('id', 'Hello world!'));
        return verify_notification_ephemeral(conversation_et, message_et);
      });

      it('that contains an image', () => {
        message_et.assets.push(new z.entity.Location());
        return verify_notification_ephemeral(conversation_et, message_et);
      });

      it('that contains a location', () => {
        message_et.assets.push(new z.entity.MediumImage());
        return verify_notification_ephemeral(conversation_et, message_et);
      });
    });
  });

  describe('shows a well-formed group notification', () => {
    beforeEach(() => {
      const titleLength = z.notification.NotificationRepository.CONFIG.TITLE_LENGTH;
      const titleText = `${message_et.user().first_name()} in ${conversation_et.display_name()}`;

      notification_content.title = z.util.StringUtil.truncate(titleText, titleLength, false);
    });

    it('if a group is created', () => {
      conversation_et.from = payload.users.get.one[0].id;
      message_et = new z.entity.MemberMessage();
      message_et.user(user_et);
      message_et.type = z.event.Backend.CONVERSATION.CREATE;
      message_et.memberMessageType = z.message.SystemMessageType.CONVERSATION_CREATE;

      const expected_body = `${first_name} started a conversation`;
      return verify_notification_system(conversation_et, message_et, expected_body);
    });

    it('if a group is renamed', () => {
      message_et = new z.entity.RenameMessage();
      message_et.user(user_et);
      message_et.name = 'Lorem Ipsum Conversation';

      const expected_body = `${first_name} renamed the conversation to ${message_et.name}`;
      return verify_notification_system(conversation_et, message_et, expected_body);
    });

    it('if a group message timer is updated', () => {
      message_et = new z.entity.MessageTimerUpdateMessage(5000);
      message_et.user(user_et);

      const expectedBody = `${first_name} set the message timer to 5 seconds`;
      return verify_notification_system(conversation_et, message_et, expectedBody);
    });

    it('if a group message timer is reset', () => {
      message_et = new z.entity.MessageTimerUpdateMessage(null);
      message_et.user(user_et);

      const expectedBody = `${first_name} turned off the message timer`;
      return verify_notification_system(conversation_et, message_et, expectedBody);
    });
  });

  describe('shows a well-formed member notification', () => {
    let other_user_et = undefined;

    beforeEach(() => {
      message_et = new z.entity.MemberMessage();
      message_et.user(user_et);
      message_et.memberMessageType = z.message.SystemMessageType.NORMAL;
      other_user_et = TestFactory.user_repository.user_mapper.mapUserFromJson(payload.users.get.many[1]);
    });

    describe('if people are added', () => {
      beforeEach(() => {
        message_et.type = z.event.Backend.CONVERSATION.MEMBER_JOIN;

        const titleLength = z.notification.NotificationRepository.CONFIG.TITLE_LENGTH;
        const titleText = `${message_et.user().first_name()} in ${conversation_et.display_name()}`;

        notification_content.title = z.util.StringUtil.truncate(titleText, titleLength, false);
      });

      it('with one user being added to the conversation', () => {
        message_et.userEntities([other_user_et]);

        const [first_name_added] = entities.user.jane_roe.name.split(' ');
        const expected_body = `${first_name} added ${first_name_added} to the conversation`;
        return verify_notification_system(conversation_et, message_et, expected_body);
      });

      it('with you being added to the conversation', () => {
        other_user_et.is_me = true;
        message_et.userEntities([other_user_et]);

        const expected_body = `${first_name} added you to the conversation`;
        return verify_notification_system(conversation_et, message_et, expected_body);
      });

      it('with multiple users being added to the conversation', () => {
        const user_ids = [entities.user.john_doe.id, entities.user.jane_roe.id];
        message_et.userIds(user_ids);

        const expected_body = `${first_name} added 2 people to the conversation`;
        return verify_notification_system(conversation_et, message_et, expected_body);
      });
    });

    describe('if people are removed', () => {
      beforeEach(() => {
        message_et.type = z.event.Backend.CONVERSATION.MEMBER_LEAVE;
        const titleLength = z.notification.NotificationRepository.CONFIG.TITLE_LENGTH;
        const titleText = `${message_et.user().first_name()} in ${conversation_et.display_name()}`;

        notification_content.title = z.util.StringUtil.truncate(titleText, titleLength, false);
      });

      it('with one user being removed from the conversation', () => {
        message_et.userEntities([other_user_et]);

        return TestFactory.notification_repository.notify(message_et, undefined, conversation_et).then(() => {
          expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();
        });
      });

      it('with you being removed from the conversation', () => {
        other_user_et.is_me = true;
        message_et.userEntities([other_user_et]);

        const expected_body = `${first_name} removed you from the conversation`;
        return verify_notification_system(conversation_et, message_et, expected_body);
      });

      it('with multiple users being removed from the conversation', () => {
        const user_ets = TestFactory.user_repository.user_mapper.mapUsersFromJson(payload.users.get.many);
        message_et.userEntities(user_ets);

        return TestFactory.notification_repository.notify(message_et, undefined, conversation_et).then(() => {
          expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();
        });
      });

      it('with someone leaving the conversation by himself', () => {
        message_et.userEntities([message_et.user()]);

        return TestFactory.notification_repository.notify(message_et, undefined, conversation_et).then(() => {
          expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('shows a well-formed request notification', () => {
    let connectionEntity = undefined;
    const expected_title = '…';

    beforeEach(() => {
      conversation_et.type(z.conversation.ConversationType.ONE2ONE);

      const connectionMapper = new z.connection.ConnectionMapper();
      connectionEntity = connectionMapper.mapConnectionFromJson(entities.connection);
      message_et = new z.entity.MemberMessage();
      message_et.user(user_et);
    });

    it('if a connection request is incoming', () => {
      connectionEntity.status = 'pending';
      message_et.memberMessageType = z.message.SystemMessageType.CONNECTION_REQUEST;

      const expected_body = z.string.notificationConnectionRequest;
      return verify_notification_system(conversation_et, message_et, expected_body, expected_title);
    });

    it('if your connection request was accepted', () => {
      message_et.memberMessageType = z.message.SystemMessageType.CONNECTION_ACCEPTED;

      const expected_body = z.string.notificationConnectionAccepted;
      return verify_notification_system(conversation_et, message_et, expected_body, expected_title);
    });

    it('if you are automatically connected', () => {
      message_et.memberMessageType = z.message.SystemMessageType.CONNECTION_CONNECTED;

      const expected_body = z.string.notificationConnectionConnected;
      return verify_notification_system(conversation_et, message_et, expected_body, expected_title);
    });
  });

  describe('shows a well-formed ping notification', () => {
    const expected_body = z.string.notificationPing;

    beforeAll(() => {
      user_et = TestFactory.user_repository.user_mapper.mapUserFromJson(payload.users.get.one[0]);
    });

    beforeEach(() => {
      message_et = new z.entity.PingMessage();
      message_et.user(user_et);
    });

    it('in a 1:1 conversation', () => {
      conversation_et.type(z.conversation.ConversationType.ONE2ONE);
      return verify_notification(conversation_et, message_et, expected_body);
    });

    it('in a group conversation', () => {
      return verify_notification(conversation_et, message_et, expected_body);
    });

    it('as an ephemeral message', () => {
      message_et.ephemeral_expires(5000);
      return verify_notification_ephemeral(conversation_et, message_et);
    });
  });

  describe('shouldNotifyInConversation', () => {
    let conversationEntity;
    let messageEntity;

    const userId = z.util.createRandomUuid();
    const shouldNotifyInConversation = z.notification.NotificationRepository.shouldNotifyInConversation;

    function generateTextAsset(selfMentioned = false) {
      const mentionId = selfMentioned ? userId : z.util.createRandomUuid();

      const textEntity = new z.entity.Text(z.util.createRandomUuid(), '@Gregor can you take a look?');
      const mentionEntity = new z.message.MentionEntity(0, 7, mentionId);
      textEntity.mentions([mentionEntity]);

      return textEntity;
    }

    beforeEach(() => {
      const selfUserEntity = new z.entity.User(userId);
      selfUserEntity.is_me = true;
      selfUserEntity.inTeam(true);

      conversationEntity = new z.entity.Conversation(z.util.createRandomUuid());
      conversationEntity.selfUser(selfUserEntity);

      messageEntity = new z.entity.ContentMessage(z.util.createRandomUuid());
      messageEntity.user(selfUserEntity);
    });

    it('returns the correct value for all notifications', () => {
      messageEntity.add_asset(generateTextAsset());
      conversationEntity.mutedState(z.conversation.NotificationSetting.STATE.EVERYTHING);
      const notifyInConversation = shouldNotifyInConversation(conversationEntity, messageEntity, userId);

      expect(notifyInConversation).toBe(true);
    });

    it('returns the correct value for no notifications', () => {
      messageEntity.add_asset(generateTextAsset());
      conversationEntity.mutedState(z.conversation.NotificationSetting.STATE.NOTHING);
      const notifyInConversation = shouldNotifyInConversation(conversationEntity, messageEntity, userId);

      expect(notifyInConversation).toBe(false);
    });

    it('returns the correct value for self mentioned messages', () => {
      messageEntity.add_asset(generateTextAsset(true));
      conversationEntity.mutedState(z.conversation.NotificationSetting.STATE.MENTIONS_AND_REPLIES);
      const notifyInConversation = shouldNotifyInConversation(conversationEntity, messageEntity, userId);

      expect(notifyInConversation).toBe(true);
    });

    it('returns the correct value for non-self mentioned messages', () => {
      messageEntity.add_asset(generateTextAsset());
      conversationEntity.mutedState(z.conversation.NotificationSetting.STATE.MENTIONS_AND_REPLIES);
      const notifyInConversation = shouldNotifyInConversation(conversationEntity, messageEntity, userId);

      expect(notifyInConversation).toBe(false);
    });

    it('returns the correct value for self replies', () => {
      messageEntity.add_asset(generateTextAsset());

      const quoteEntity = new z.message.QuoteEntity({messageId: z.util.createRandomUuid(), userId});
      messageEntity.quote(quoteEntity);

      conversationEntity.mutedState(z.conversation.NotificationSetting.STATE.MENTIONS_AND_REPLIES);
      const notifyInConversation = shouldNotifyInConversation(conversationEntity, messageEntity, userId);

      expect(notifyInConversation).toBe(true);
    });

    it('returns the correct value for non-self replies', () => {
      messageEntity.add_asset(generateTextAsset());

      const quoteEntity = new z.message.QuoteEntity({
        messageId: z.util.createRandomUuid(),
        userId: z.util.createRandomUuid(),
      });
      messageEntity.quote(quoteEntity);

      conversationEntity.mutedState(z.conversation.NotificationSetting.STATE.MENTIONS_AND_REPLIES);
      const notifyInConversation = shouldNotifyInConversation(conversationEntity, messageEntity, userId);

      expect(notifyInConversation).toBe(false);
    });
  });
});
