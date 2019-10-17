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

import {Availability} from '@wireapp/protocol-messaging';

import {t} from 'Util/LocalizerUtil';
import {createRandomUuid} from 'Util/util';
import {Environment} from 'Util/Environment';
import {truncate} from 'Util/StringUtil';

import 'src/script/localization/Localizer';

import {Conversation} from 'src/script/entity/Conversation';
import {MediumImage} from 'src/script/entity/message/MediumImage';
import {User} from 'src/script/entity/User';
import {MessageTimerUpdateMessage} from 'src/script/entity/message/MessageTimerUpdateMessage';
import {RenameMessage} from 'src/script/entity/message/RenameMessage';
import {Location} from 'src/script/entity/message/Location';
import {MemberMessage} from 'src/script/entity/message/MemberMessage';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {Text} from 'src/script/entity/message/Text';
import {PingMessage} from 'src/script/entity/message/PingMessage';

import {TERMINATION_REASON} from 'src/script/calling/enum/TerminationReason';
import {NotificationRepository} from 'src/script/notification/NotificationRepository';
import {NotificationPreference} from 'src/script/notification/NotificationPreference';
import {PermissionStatusState} from 'src/script/permission/PermissionStatusState';
import {NOTIFICATION_STATE} from 'src/script/conversation/NotificationSetting';
import {ConversationType} from 'src/script/conversation/ConversationType';
import {BackendEvent} from 'src/script/event/Backend';
import {WebAppEvents} from 'src/script/event/WebApp';
import {NOTIFICATION_HANDLING_STATE} from 'src/script/event/NotificationHandlingState';

import {CallMessage} from 'src/script/entity/message/CallMessage';
import {SystemMessageType} from 'src/script/message/SystemMessageType';
import {CALL_MESSAGE_TYPE} from 'src/script/message/CallMessageType';
import {QuoteEntity} from 'src/script/message/QuoteEntity';
import {MentionEntity} from 'src/script/message/MentionEntity';

import {ConnectionMapper} from 'src/script/connection/ConnectionMapper';
import {ContentViewModel} from 'src/script/view_model/ContentViewModel';

window.wire = window.wire || {};
window.wire.app = window.wire.app || {};

describe('NotificationRepository', () => {
  const test_factory = new TestFactory();
  let conversationEt = null;
  let messageEt = null;
  let userEt = null;
  let verify_notification;
  let verify_notification_ephemeral;
  let verify_notification_obfuscated;
  let verify_notification_system = undefined;

  const [first_name] = entities.user.john_doe.name.split(' ');
  let notification_content = null;
  const contentViewModelState = {};

  beforeEach(() => {
    return test_factory.exposeNotificationActors().then(() => {
      amplify.publish(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE, NOTIFICATION_HANDLING_STATE.WEB_SOCKET);

      // Create entities
      const conversationMapper = TestFactory.conversation_repository.conversationMapper;
      userEt = TestFactory.user_repository.user_mapper.mapUserFromJson(payload.users.get.one[0]);
      [conversationEt] = conversationMapper.mapConversations([entities.conversation]);
      conversationEt.team_id = undefined;
      const selfUserEntity = new User(createRandomUuid());
      selfUserEntity.isMe = true;
      selfUserEntity.inTeam(true);
      conversationEt.selfUser(selfUserEntity);

      // Notification
      const title = conversationEt.display_name();
      notification_content = {
        options: {
          body: '',
          data: {
            conversationId: conversationEt.id,
          },
          icon: '/image/logo/notification.png',
          silent: true,
          tag: conversationEt.id,
        },
        timeout: NotificationRepository.CONFIG.TIMEOUT,
        title: truncate(title, NotificationRepository.CONFIG.TITLE_LENGTH, false),
      };

      // Mocks
      document.hasFocus = () => false;
      TestFactory.notification_repository.permissionState(PermissionStatusState.GRANTED);
      Environment.browser.supports.notifications = true;
      TestFactory.notification_repository.__test__assignEnvironment(Environment);
      window.wire.app = {
        service: {asset: {generateAssetUrl: () => Promise.resolve('/image/logo/notification.png')}},
      };
      contentViewModelState.state = ko.observable(ContentViewModel.STATE.CONVERSATION);
      contentViewModelState.multitasking = {
        isMinimized: () => true,
      };
      TestFactory.notification_repository.setContentViewModelStates(
        contentViewModelState.state,
        contentViewModelState.multitasking,
      );

      spyOn(TestFactory.notification_repository, '_showNotification');
      spyOn(TestFactory.notification_repository, '_notifySound');

      verify_notification = (_conversation, _message, _expected_body) => {
        return TestFactory.notification_repository.notify(_message, undefined, _conversation).then(() => {
          expect(TestFactory.notification_repository._showNotification).toHaveBeenCalledTimes(1);

          const trigger = TestFactory.notification_repository._createTrigger(messageEt, null, conversationEt);
          notification_content.options.body = _expected_body;
          notification_content.options.data.messageType = _message.type;
          notification_content.trigger = trigger;

          if (_conversation.isGroup()) {
            const titleLength = NotificationRepository.CONFIG.TITLE_LENGTH;
            const titleText = `${_message.user().first_name()} in ${_conversation.display_name()}`;

            notification_content.title = truncate(titleText, titleLength, false);
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

          const trigger = TestFactory.notification_repository._createTrigger(messageEt, null, conversationEt);
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

          const trigger = TestFactory.notification_repository._createTrigger(messageEt, null, conversationEt);
          notification_content.trigger = trigger;

          const obfuscateMessage = _setting === NotificationPreference.OBFUSCATE_MESSAGE;
          if (obfuscateMessage) {
            const titleLength = NotificationRepository.CONFIG.TITLE_LENGTH;
            const titleText = `${messageEt.user().first_name()} in ${conversationEt.display_name()}`;

            notification_content.options.body = z.string.notificationObfuscated;
            notification_content.title = truncate(titleText, titleLength, false);
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

          const trigger = TestFactory.notification_repository._createTrigger(messageEt, null, conversationEt);
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
      messageEt = new PingMessage();
      messageEt.user(userEt);
    });

    it('if the browser does not support them', () => {
      Environment.browser.supports.notifications = false;
      TestFactory.notification_repository.__test__assignEnvironment(Environment);

      return TestFactory.notification_repository.notify(messageEt, undefined, conversationEt).then(() => {
        expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();
      });
    });

    it('if the browser tab has focus and conversation is active', () => {
      TestFactory.conversation_repository.active_conversation(conversationEt);
      document.hasFocus = () => true;
      TestFactory.calling_repository.joinedCall = () => true;

      return TestFactory.notification_repository
        .notify(messageEt, undefined, conversationEt)
        .then(() => {
          expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();

          contentViewModelState.multitasking.isMinimized = () => false;

          return TestFactory.notification_repository.notify(messageEt, undefined, conversationEt);
        })
        .then(() => {
          expect(TestFactory.notification_repository._showNotification).toHaveBeenCalledTimes(1);
        });
    });

    it('if the event was triggered by the user', () => {
      messageEt.user().isMe = true;

      return TestFactory.notification_repository.notify(messageEt, undefined, conversationEt).then(() => {
        expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();
      });
    });

    it('if the conversation is muted', () => {
      conversationEt.mutedState(NOTIFICATION_STATE.NOTHING);

      return TestFactory.notification_repository.notify(messageEt, undefined, conversationEt).then(() => {
        expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();
      });
    });

    it('for a successfully completed call', () => {
      messageEt = new CallMessage();
      messageEt.call_message_type = CALL_MESSAGE_TYPE.DEACTIVATED;
      messageEt.finished_reason = TERMINATION_REASON.COMPLETED;

      return TestFactory.notification_repository.notify(messageEt, undefined, conversationEt).then(() => {
        expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();
      });
    });

    it('if preference is set to none', () => {
      TestFactory.notification_repository.notificationsPreference(NotificationPreference.NONE);

      return TestFactory.notification_repository.notify(messageEt, undefined, conversationEt).then(() => {
        expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();
      });
    });

    it('if the user permission was denied', () => {
      TestFactory.notification_repository.permissionState(PermissionStatusState.DENIED);

      return TestFactory.notification_repository.notify(messageEt, undefined, conversationEt).then(() => {
        expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();
      });
    });
  });

  describe('reacts according to availability status', () => {
    let allMessageTypes;
    function generateTextAsset() {
      const textEntity = new Text(createRandomUuid(), 'hey there');
      return textEntity;
    }

    beforeEach(() => {
      const mentionMessage = new ContentMessage(createRandomUuid());
      mentionMessage.add_asset(generateTextAsset());
      spyOn(mentionMessage, 'isUserMentioned').and.returnValue(true);

      const textMessage = new ContentMessage(createRandomUuid());
      textMessage.add_asset(generateTextAsset());

      const callMessage = new CallMessage();
      callMessage.call_message_type = CALL_MESSAGE_TYPE.ACTIVATED;
      allMessageTypes = {
        call: callMessage,
        content: textMessage,
        mention: mentionMessage,
        ping: new PingMessage(),
      };
    });

    it('filters all notifications if user is "away"', () => {
      spyOn(TestFactory.notification_repository, 'selfUser').and.callFake(() => {
        return Object.assign({}, TestFactory.user_repository.self(), {
          availability: () => Availability.Type.AWAY,
        });
      });
      TestFactory.notification_repository.permissionState(PermissionStatusState.GRANTED);

      const testPromises = Object.values(allMessageTypes).map(messageEntity => {
        return TestFactory.notification_repository.notify(messageEntity, undefined, conversationEt).then(() => {
          expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();
        });
      });

      return Promise.all(testPromises);
    });

    it('filters content and ping messages when user is "busy"', () => {
      spyOn(TestFactory.notification_repository, 'selfUser').and.callFake(() => {
        return Object.assign({}, TestFactory.user_repository.self(), {
          availability: () => Availability.Type.BUSY,
        });
      });
      TestFactory.notification_repository.permissionState(PermissionStatusState.GRANTED);

      const ignoredMessages = Object.entries(allMessageTypes)
        .filter(([type]) => ['content', 'ping'].includes(type))
        .map(([, message]) => message);

      const testPromises = ignoredMessages.map(messageEntity => {
        return TestFactory.notification_repository.notify(messageEntity, undefined, conversationEt);
      });

      return Promise.all(testPromises).then(() => {
        expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();
      });
    });

    it('it allows mentions and calls when user is "busy"', () => {
      spyOn(TestFactory.notification_repository, 'selfUser').and.callFake(() => {
        return Object.assign({}, TestFactory.user_repository.self(), {
          availability: () => Availability.Type.BUSY,
        });
      });
      TestFactory.notification_repository.permissionState(PermissionStatusState.GRANTED);

      const notifiedMessages = Object.entries(allMessageTypes)
        .filter(([type]) => ['mention', 'call'].includes(type))
        .map(([, message]) => message);

      const testPromises = notifiedMessages.map(messageEntity => {
        return TestFactory.notification_repository.notify(messageEntity, undefined, conversationEt);
      });

      return Promise.all(testPromises).then(() => {
        expect(TestFactory.notification_repository._showNotification).toHaveBeenCalledTimes(notifiedMessages.length);
      });
    });
  });

  describe('shows a well-formed call notification', () => {
    describe('for an incoming call', () => {
      const expected_body = z.string.notificationVoiceChannelActivate;

      beforeEach(() => {
        messageEt = new CallMessage();
        messageEt.call_message_type = CALL_MESSAGE_TYPE.ACTIVATED;
        messageEt.user(userEt);
      });

      it('in a 1:1 conversation', () => {
        conversationEt.type(ConversationType.ONE2ONE);
        return verify_notification(conversationEt, messageEt, expected_body);
      });

      it('in a group conversation', () => {
        return verify_notification(conversationEt, messageEt, expected_body);
      });
    });

    describe('for a missed call', () => {
      const expected_body = z.string.notificationVoiceChannelDeactivate;

      beforeEach(() => {
        messageEt = new CallMessage();
        messageEt.call_message_type = CALL_MESSAGE_TYPE.DEACTIVATED;
        messageEt.finished_reason = TERMINATION_REASON.MISSED;
        messageEt.user(userEt);
      });

      it('in a 1:1 conversation', () => {
        conversationEt.type(ConversationType.ONE2ONE);
        return verify_notification(conversationEt, messageEt, expected_body);
      });

      it('in a group conversation', () => {
        return verify_notification(conversationEt, messageEt, expected_body);
      });
    });
  });

  describe('shows a well-formed content notification', () => {
    let expected_body = undefined;

    beforeEach(() => {
      messageEt = new ContentMessage();
      messageEt.user(userEt);
    });

    describe('for a text message', () => {
      beforeEach(() => {
        const assetEt = new Text('id', 'Lorem ipsum');
        messageEt.assets.push(assetEt);
        expected_body = assetEt.text;
      });

      it('in a 1:1 conversation', () => {
        conversationEt.type(ConversationType.ONE2ONE);
        return verify_notification(conversationEt, messageEt, expected_body);
      });

      it('in a group conversation', () => {
        return verify_notification(conversationEt, messageEt, expected_body);
      });

      it('when preference is set to obfuscate-message', () => {
        const notification_preference = NotificationPreference.OBFUSCATE_MESSAGE;
        TestFactory.notification_repository.notificationsPreference(notification_preference);
        return verify_notification_obfuscated(conversationEt, messageEt, notification_preference);
      });

      it('when preference is set to obfuscate', () => {
        const notification_preference = NotificationPreference.OBFUSCATE;
        TestFactory.notification_repository.notificationsPreference(notification_preference);
        return verify_notification_obfuscated(conversationEt, messageEt, notification_preference);
      });
    });

    describe('for a picture', () => {
      beforeEach(() => {
        messageEt.assets.push(new MediumImage());
        expected_body = z.string.notificationAssetAdd;
      });

      it('in a 1:1 conversation', () => {
        conversationEt.type(ConversationType.ONE2ONE);
        return verify_notification(conversationEt, messageEt, expected_body);
      });

      it('in a group conversation', () => {
        return verify_notification(conversationEt, messageEt, expected_body);
      });

      it('when preference is set to obfuscate-message', () => {
        const notification_preference = NotificationPreference.OBFUSCATE_MESSAGE;
        TestFactory.notification_repository.notificationsPreference(notification_preference);
        return verify_notification_obfuscated(conversationEt, messageEt, notification_preference);
      });

      it('when preference is set to obfuscate', () => {
        const notification_preference = NotificationPreference.OBFUSCATE;
        TestFactory.notification_repository.notificationsPreference(notification_preference);
        return verify_notification_obfuscated(conversationEt, messageEt, notification_preference);
      });
    });

    describe('for a location', () => {
      beforeEach(() => {
        messageEt.assets.push(new Location());
        expected_body = z.string.notificationSharedLocation;
      });

      it('in a 1:1 conversation', () => {
        conversationEt.type(ConversationType.ONE2ONE);
        return verify_notification(conversationEt, messageEt, expected_body);
      });

      it('in a group conversation', () => {
        return verify_notification(conversationEt, messageEt, expected_body);
      });

      it('when preference is set to obfuscate-message', () => {
        const notification_preference = NotificationPreference.OBFUSCATE_MESSAGE;
        TestFactory.notification_repository.notificationsPreference(notification_preference);
        return verify_notification_obfuscated(conversationEt, messageEt, notification_preference);
      });

      it('when preference is set to obfuscate', () => {
        const notification_preference = NotificationPreference.OBFUSCATE;
        TestFactory.notification_repository.notificationsPreference(notification_preference);
        return verify_notification_obfuscated(conversationEt, messageEt, notification_preference);
      });
    });

    describe('for ephemeral messages', () => {
      beforeEach(() => {
        messageEt.ephemeral_expires(5000);
      });

      it('that contains text', () => {
        messageEt.assets.push(new Text('id', 'Hello world!'));
        return verify_notification_ephemeral(conversationEt, messageEt);
      });

      it('that contains an image', () => {
        messageEt.assets.push(new Location());
        return verify_notification_ephemeral(conversationEt, messageEt);
      });

      it('that contains a location', () => {
        messageEt.assets.push(new MediumImage());
        return verify_notification_ephemeral(conversationEt, messageEt);
      });
    });
  });

  describe('shows a well-formed group notification', () => {
    beforeEach(() => {
      const titleLength = NotificationRepository.CONFIG.TITLE_LENGTH;
      const titleText = `${messageEt.user().first_name()} in ${conversationEt.display_name()}`;

      notification_content.title = truncate(titleText, titleLength, false);
    });

    it('if a group is created', () => {
      conversationEt.from = payload.users.get.one[0].id;
      messageEt = new MemberMessage();
      messageEt.user(userEt);
      messageEt.type = BackendEvent.CONVERSATION.CREATE;
      messageEt.memberMessageType = SystemMessageType.CONVERSATION_CREATE;

      const expected_body = `${first_name} started a conversation`;
      return verify_notification_system(conversationEt, messageEt, expected_body);
    });

    it('if a group is renamed', () => {
      messageEt = new RenameMessage();
      messageEt.user(userEt);
      messageEt.name = 'Lorem Ipsum Conversation';

      const expected_body = `${first_name} renamed the conversation to ${messageEt.name}`;
      return verify_notification_system(conversationEt, messageEt, expected_body);
    });

    it('if a group message timer is updated', () => {
      messageEt = new MessageTimerUpdateMessage(5000);
      messageEt.user(userEt);

      const expectedBody = `${first_name} set the message timer to 5 ${t('ephemeralUnitsSeconds')}`;
      return verify_notification_system(conversationEt, messageEt, expectedBody);
    });

    it('if a group message timer is reset', () => {
      messageEt = new MessageTimerUpdateMessage(null);
      messageEt.user(userEt);

      const expectedBody = `${first_name} turned off the message timer`;
      return verify_notification_system(conversationEt, messageEt, expectedBody);
    });
  });

  describe('shows a well-formed member notification', () => {
    let other_user_et = undefined;

    beforeEach(() => {
      messageEt = new MemberMessage();
      messageEt.user(userEt);
      messageEt.memberMessageType = SystemMessageType.NORMAL;
      other_user_et = TestFactory.user_repository.user_mapper.mapUserFromJson(payload.users.get.many[1]);
    });

    describe('if people are added', () => {
      beforeEach(() => {
        messageEt.type = BackendEvent.CONVERSATION.MEMBER_JOIN;

        const titleLength = NotificationRepository.CONFIG.TITLE_LENGTH;
        const titleText = `${messageEt.user().first_name()} in ${conversationEt.display_name()}`;

        notification_content.title = truncate(titleText, titleLength, false);
      });

      it('with one user being added to the conversation', () => {
        messageEt.userEntities([other_user_et]);

        const [first_name_added] = entities.user.jane_roe.name.split(' ');
        const expected_body = `${first_name} added ${first_name_added} to the conversation`;
        return verify_notification_system(conversationEt, messageEt, expected_body);
      });

      it('with you being added to the conversation', () => {
        other_user_et.isMe = true;
        messageEt.userEntities([other_user_et]);

        const expected_body = `${first_name} added you to the conversation`;
        return verify_notification_system(conversationEt, messageEt, expected_body);
      });

      it('with multiple users being added to the conversation', () => {
        const user_ids = [entities.user.john_doe.id, entities.user.jane_roe.id];
        messageEt.userIds(user_ids);

        const expected_body = `${first_name} added 2 people to the conversation`;
        return verify_notification_system(conversationEt, messageEt, expected_body);
      });
    });

    describe('if people are removed', () => {
      beforeEach(() => {
        messageEt.type = BackendEvent.CONVERSATION.MEMBER_LEAVE;
        const titleLength = NotificationRepository.CONFIG.TITLE_LENGTH;
        const titleText = `${messageEt.user().first_name()} in ${conversationEt.display_name()}`;

        notification_content.title = truncate(titleText, titleLength, false);
      });

      it('with one user being removed from the conversation', () => {
        messageEt.userEntities([other_user_et]);

        return TestFactory.notification_repository.notify(messageEt, undefined, conversationEt).then(() => {
          expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();
        });
      });

      it('with you being removed from the conversation', () => {
        other_user_et.isMe = true;
        messageEt.userEntities([other_user_et]);

        const expected_body = `${first_name} removed you from the conversation`;
        return verify_notification_system(conversationEt, messageEt, expected_body);
      });

      it('with multiple users being removed from the conversation', () => {
        const userEts = TestFactory.user_repository.user_mapper.mapUsersFromJson(payload.users.get.many);
        messageEt.userEntities(userEts);

        return TestFactory.notification_repository.notify(messageEt, undefined, conversationEt).then(() => {
          expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();
        });
      });

      it('with someone leaving the conversation by himself', () => {
        messageEt.userEntities([messageEt.user()]);

        return TestFactory.notification_repository.notify(messageEt, undefined, conversationEt).then(() => {
          expect(TestFactory.notification_repository._showNotification).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('shows a well-formed request notification', () => {
    let connectionEntity = undefined;
    const expected_title = '…';

    beforeEach(() => {
      conversationEt.type(ConversationType.ONE2ONE);

      const connectionMapper = new ConnectionMapper();
      connectionEntity = connectionMapper.mapConnectionFromJson(entities.connection);
      messageEt = new MemberMessage();
      messageEt.user(userEt);
    });

    it('if a connection request is incoming', () => {
      connectionEntity.status = 'pending';
      messageEt.memberMessageType = SystemMessageType.CONNECTION_REQUEST;

      const expected_body = z.string.notificationConnectionRequest;
      return verify_notification_system(conversationEt, messageEt, expected_body, expected_title);
    });

    it('if your connection request was accepted', () => {
      messageEt.memberMessageType = SystemMessageType.CONNECTION_ACCEPTED;

      const expected_body = z.string.notificationConnectionAccepted;
      return verify_notification_system(conversationEt, messageEt, expected_body, expected_title);
    });

    it('if you are automatically connected', () => {
      messageEt.memberMessageType = SystemMessageType.CONNECTION_CONNECTED;

      const expected_body = z.string.notificationConnectionConnected;
      return verify_notification_system(conversationEt, messageEt, expected_body, expected_title);
    });
  });

  describe('shows a well-formed ping notification', () => {
    const expected_body = z.string.notificationPing;

    beforeAll(() => {
      userEt = TestFactory.user_repository.user_mapper.mapUserFromJson(payload.users.get.one[0]);
    });

    beforeEach(() => {
      messageEt = new PingMessage();
      messageEt.user(userEt);
    });

    it('in a 1:1 conversation', () => {
      conversationEt.type(ConversationType.ONE2ONE);
      return verify_notification(conversationEt, messageEt, expected_body);
    });

    it('in a group conversation', () => {
      return verify_notification(conversationEt, messageEt, expected_body);
    });

    it('as an ephemeral message', () => {
      messageEt.ephemeral_expires(5000);
      return verify_notification_ephemeral(conversationEt, messageEt);
    });
  });

  describe('shouldNotifyInConversation', () => {
    let conversationEntity;
    let messageEntity;

    const userId = createRandomUuid();
    const shouldNotifyInConversation = NotificationRepository.shouldNotifyInConversation;

    function generateTextAsset(selfMentioned = false) {
      const mentionId = selfMentioned ? userId : createRandomUuid();

      const textEntity = new Text(createRandomUuid(), '@Gregor can you take a look?');
      const mentionEntity = new MentionEntity(0, 7, mentionId);
      textEntity.mentions([mentionEntity]);

      return textEntity;
    }

    beforeEach(() => {
      const selfUserEntity = new User(userId);
      selfUserEntity.isMe = true;
      selfUserEntity.inTeam(true);

      conversationEntity = new Conversation(createRandomUuid());
      conversationEntity.selfUser(selfUserEntity);

      messageEntity = new ContentMessage(createRandomUuid());
      messageEntity.user(selfUserEntity);
    });

    it('returns the correct value for all notifications', () => {
      messageEntity.add_asset(generateTextAsset());
      conversationEntity.mutedState(NOTIFICATION_STATE.EVERYTHING);
      const notifyInConversation = shouldNotifyInConversation(conversationEntity, messageEntity, userId);

      expect(notifyInConversation).toBe(true);
    });

    it('returns the correct value for no notifications', () => {
      messageEntity.add_asset(generateTextAsset());
      conversationEntity.mutedState(NOTIFICATION_STATE.NOTHING);
      const notifyInConversation = shouldNotifyInConversation(conversationEntity, messageEntity, userId);

      expect(notifyInConversation).toBe(false);
    });

    it('returns the correct value for self mentioned messages', () => {
      messageEntity.add_asset(generateTextAsset(true));
      conversationEntity.mutedState(NOTIFICATION_STATE.MENTIONS_AND_REPLIES);
      const notifyInConversation = shouldNotifyInConversation(conversationEntity, messageEntity, userId);

      expect(notifyInConversation).toBe(true);
    });

    it('returns the correct value for non-self mentioned messages', () => {
      messageEntity.add_asset(generateTextAsset());
      conversationEntity.mutedState(NOTIFICATION_STATE.MENTIONS_AND_REPLIES);
      const notifyInConversation = shouldNotifyInConversation(conversationEntity, messageEntity, userId);

      expect(notifyInConversation).toBe(false);
    });

    it('returns the correct value for self replies', () => {
      messageEntity.add_asset(generateTextAsset());

      const quoteEntity = new QuoteEntity({messageId: createRandomUuid(), userId});
      messageEntity.quote(quoteEntity);

      conversationEntity.mutedState(NOTIFICATION_STATE.MENTIONS_AND_REPLIES);
      const notifyInConversation = shouldNotifyInConversation(conversationEntity, messageEntity, userId);

      expect(notifyInConversation).toBe(true);
    });

    it('returns the correct value for non-self replies', () => {
      messageEntity.add_asset(generateTextAsset());

      const quoteEntity = new QuoteEntity({
        messageId: createRandomUuid(),
        userId: createRandomUuid(),
      });
      messageEntity.quote(quoteEntity);

      conversationEntity.mutedState(NOTIFICATION_STATE.MENTIONS_AND_REPLIES);
      const notifyInConversation = shouldNotifyInConversation(conversationEntity, messageEntity, userId);

      expect(notifyInConversation).toBe(false);
    });
  });
});
