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

import {ConnectionStatus} from '@wireapp/api-client/lib/connection';
import {CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation';
import {CONVERSATION_EVENT} from '@wireapp/api-client/lib/event';
import {NotificationPreference} from '@wireapp/api-client/lib/user/data';
import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {Runtime} from '@wireapp/commons';
import {Availability} from '@wireapp/protocol-messaging';
import {WebAppEvents} from '@wireapp/webapp-events';

import {AudioRepository} from 'Repositories/audio/AudioRepository';
import {CallingRepository} from 'Repositories/calling/CallingRepository';
import {CallingViewMode, CallState} from 'Repositories/calling/CallState';
import {TERMINATION_REASON} from 'Repositories/calling/enum/TerminationReason';
import {ConnectionEntity} from 'Repositories/connection/ConnectionEntity';
import {ConnectionMapper} from 'Repositories/connection/ConnectionMapper';
import {ConversationMapper} from 'Repositories/conversation/ConversationMapper';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {NOTIFICATION_STATE} from 'Repositories/conversation/NotificationSetting';
import {Conversation} from 'Repositories/entity/Conversation';
import {CallMessage} from 'Repositories/entity/message/CallMessage';
import {CompositeMessage} from 'Repositories/entity/message/CompositeMessage';
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {Location} from 'Repositories/entity/message/Location';
import {MediumImage} from 'Repositories/entity/message/MediumImage';
import {MemberMessage} from 'Repositories/entity/message/MemberMessage';
import {Message} from 'Repositories/entity/message/Message';
import {MessageTimerUpdateMessage} from 'Repositories/entity/message/MessageTimerUpdateMessage';
import {PingMessage} from 'Repositories/entity/message/PingMessage';
import {RenameMessage} from 'Repositories/entity/message/RenameMessage';
import {Text} from 'Repositories/entity/message/Text';
import {User} from 'Repositories/entity/User';
import {NOTIFICATION_HANDLING_STATE} from 'Repositories/event/NotificationHandlingState';
import {PermissionRepository} from 'Repositories/permission/PermissionRepository';
import {PermissionStatusState} from 'Repositories/permission/PermissionStatusState';
import {UserMapper} from 'Repositories/user/UserMapper';
import {UserState} from 'Repositories/user/UserState';
import 'src/script/localization/Localizer';
import {CALL_MESSAGE_TYPE} from 'src/script/message/CallMessageType';
import {MentionEntity} from 'src/script/message/MentionEntity';
import {QuoteEntity} from 'src/script/message/QuoteEntity';
import {SystemMessageType} from 'src/script/message/SystemMessageType';
import {ContentState, useAppState} from 'src/script/page/useAppState';
import {entities, payload} from 'test/api/payloads';
import {t} from 'Util/LocalizerUtil';
import {truncate} from 'Util/StringUtil';
import {createUuid} from 'Util/uuid';

import {NotificationRepository} from './NotificationRepository';

function buildNotificationRepository() {
  const userState = container.resolve(UserState);
  const notificationRepository = new NotificationRepository(
    {} as any,
    new PermissionRepository(),
    new AudioRepository(),
    {} as CallingRepository,
    userState,
    container.resolve(ConversationState),
    container.resolve(CallState),
  );

  return [notificationRepository, {userState}] as const;
}

(window as any).Notification = jest.fn();

describe('NotificationRepository', () => {
  const userState = container.resolve(UserState);
  let notificationRepository: NotificationRepository;
  const userMapper = new UserMapper({} as any);
  let conversation: Conversation;
  let message: Message;
  let user: User;
  let verifyNotification: (...args: any[]) => void;
  let verifyNotificationEphemeral: (...args: any[]) => void;
  let verifyNotificationObfuscated: (...args: any[]) => void;
  let verifyNotificationSystem: (...args: any[]) => void;
  let createTruncatedTitle: (name: string, conversationName: string) => string;
  let calculateTitleLength: (sectionString: string) => number;

  let notification_content: any;

  beforeEach(() => {
    [notificationRepository] = buildNotificationRepository();
    amplify.publish(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE, NOTIFICATION_HANDLING_STATE.WEB_SOCKET);

    // Create entities
    user = userMapper.mapUserFromJson(payload.users.get.one[0], '');
    [conversation] = ConversationMapper.mapConversations([entities.conversation]);
    const selfUserEntity = new User(createUuid());
    selfUserEntity.isMe = true;
    selfUserEntity.teamId = createUuid();
    conversation.selfUser(selfUserEntity);
    userState.self(selfUserEntity);

    // Notification
    const title = conversation.display_name();
    notification_content = {
      options: {
        body: '',
        data: {
          conversationId: {domain: conversation.domain, id: conversation.id},
        },
        icon: '/image/logo/notification.png',
        silent: true,
        tag: conversation.id,
      },
      timeout: NotificationRepository.CONFIG.TIMEOUT,
      title: truncate(title, NotificationRepository.CONFIG.TITLE_MAX_LENGTH, false),
    };

    // Mocks
    document.hasFocus = () => false;
    notificationRepository.updatePermissionState(PermissionStatusState.GRANTED);
    spyOn(Runtime, 'isSupportingNotifications').and.returnValue(true);
    spyOn(notificationRepository['assetRepository'], 'getObjectUrl').and.returnValue(
      Promise.resolve('/image/logo/notification.png'),
    );

    const {setContentState} = useAppState.getState();
    setContentState(ContentState.CONVERSATION);
    const showNotificationSpy = jest.spyOn(notificationRepository as any, 'showNotification');

    calculateTitleLength = sectionString => {
      const defaultSectionLength = NotificationRepository.CONFIG.TITLE_LENGTH;
      const length = defaultSectionLength - sectionString.length + defaultSectionLength;

      return length > defaultSectionLength ? length : defaultSectionLength;
    };

    createTruncatedTitle = (name, conversationName) => {
      const titleLength = NotificationRepository.CONFIG.TITLE_MAX_LENGTH;

      const titleText = `${truncate(name, calculateTitleLength(conversationName), false)} in ${truncate(
        conversationName,
        calculateTitleLength(name),
        false,
      )}`;
      return truncate(titleText, titleLength, false);
    };

    verifyNotification = (_conversation, _message, _expected_body) => {
      return notificationRepository.notify(_message, undefined, _conversation).then(() => {
        expect(showNotificationSpy).toHaveBeenCalledTimes(1);

        const trigger = notificationRepository['createTrigger'](message, undefined, conversation);
        notification_content.options.body = _expected_body;
        notification_content.options.data.messageType = _message.type;
        notification_content.trigger = trigger;

        if (_conversation.isGroup()) {
          notification_content.title = createTruncatedTitle(_message.user().name(), _conversation.display_name());
        } else {
          notification_content.title = 'Name not available';
        }

        const [firstResultArgs] = showNotificationSpy.mock.calls[0];

        expect(JSON.stringify(firstResultArgs)).toEqual(JSON.stringify(notification_content));
      });
    };

    verifyNotificationEphemeral = (_conversation, _message) => {
      return notificationRepository.notify(_message, undefined, _conversation).then(() => {
        expect(notificationRepository['showNotification']).toHaveBeenCalledTimes(1);

        const trigger = notificationRepository['createTrigger'](message, undefined, conversation);
        notification_content.options.body = t('notificationObfuscated');
        notification_content.options.data.messageType = _message.type;
        notification_content.title = t('notificationObfuscatedTitle');
        notification_content.trigger = trigger;

        const [firstResultArgs] = showNotificationSpy.mock.calls[0];

        expect(JSON.stringify(firstResultArgs)).toEqual(JSON.stringify(notification_content));
      });
    };

    verifyNotificationObfuscated = (_conversation, _message, _setting) => {
      return notificationRepository.notify(_message, undefined, _conversation).then(() => {
        expect(notificationRepository['showNotification']).toHaveBeenCalledTimes(1);

        const trigger = notificationRepository['createTrigger'](message, undefined, conversation);
        notification_content.trigger = trigger;

        const obfuscateMessage = _setting === NotificationPreference.OBFUSCATE_MESSAGE;
        if (obfuscateMessage) {
          notification_content.options.body = t('notificationObfuscated');
          notification_content.title = createTruncatedTitle(_message.user().name(), _conversation.display_name());
        } else {
          notification_content.options.body = t('notificationObfuscated');
          notification_content.title = t('notificationObfuscatedTitle');
        }
        notification_content.options.data.messageType = _message.type;

        const [firstResultArgs] = showNotificationSpy.mock.calls[0];

        expect(JSON.stringify(firstResultArgs)).toEqual(JSON.stringify(notification_content));
      });
    };

    verifyNotificationSystem = (_conversation, _message, _expected_body, _expected_title) => {
      return notificationRepository.notify(_message, undefined, _conversation).then(() => {
        expect(notificationRepository['showNotification']).toHaveBeenCalledTimes(1);

        const trigger = notificationRepository['createTrigger'](message, undefined, conversation);
        notification_content.trigger = trigger;
        notification_content.options.body = _expected_body;
        notification_content.options.data.messageType = _message.type;

        if (_expected_title) {
          notification_content.options.data.conversationId = {domain: _conversation.domain, id: _conversation.id};
          notification_content.options.tag = _conversation.id;
          notification_content.title = _expected_title;
        }

        const [firstResultArgs] = showNotificationSpy.mock.calls[0];

        expect(JSON.stringify(firstResultArgs)).toEqual(JSON.stringify(notification_content));
      });
    };
  });

  describe('does not show a notification', () => {
    beforeEach(() => {
      message = new PingMessage() as any;
      message.user(user);
    });

    it('if the browser does not support them', () => {
      jest.spyOn(Runtime, 'isSupportingNotifications').mockReturnValue(false);
      return notificationRepository.notify(message, undefined, conversation).then(() => {
        expect(notificationRepository['showNotification']).not.toHaveBeenCalled();
      });
    });

    it('if the browser tab has focus and conversation is active', () => {
      const conversationState = container.resolve(ConversationState);
      const callState = container.resolve(CallState);
      conversationState.activeConversation(conversation);
      document.hasFocus = () => true;
      spyOn(callState, 'joinedCall').and.returnValue(true);
      jest.spyOn(callState, 'viewMode').mockReturnValueOnce(CallingViewMode.MINIMIZED);

      return notificationRepository
        .notify(message, undefined, conversation)
        .then(() => {
          expect(notificationRepository['showNotification']).not.toHaveBeenCalled();

          jest.spyOn(callState, 'viewMode').mockReturnValueOnce(CallingViewMode.DETACHED_WINDOW);

          return notificationRepository.notify(message, undefined, conversation);
        })
        .then(() => {
          expect(notificationRepository['showNotification']).toHaveBeenCalledTimes(1);
        });
    });

    it('if the event was triggered by the user', () => {
      message.user().isMe = true;

      return notificationRepository.notify(message, undefined, conversation).then(() => {
        expect(notificationRepository['showNotification']).not.toHaveBeenCalled();
      });
    });

    it('if the conversation is muted', () => {
      conversation.mutedState(NOTIFICATION_STATE.NOTHING);

      return notificationRepository.notify(message, undefined, conversation).then(() => {
        expect(notificationRepository['showNotification']).not.toHaveBeenCalled();
      });
    });

    it('for a successfully completed call', () => {
      message = new CallMessage(CALL_MESSAGE_TYPE.DEACTIVATED, TERMINATION_REASON.COMPLETED) as any;

      return notificationRepository.notify(message, undefined, conversation).then(() => {
        expect(notificationRepository['showNotification']).not.toHaveBeenCalled();
      });
    });

    it('if preference is set to none', () => {
      notificationRepository.updatedNotificationsProperty(NotificationPreference.NONE);

      return notificationRepository.notify(message, undefined, conversation).then(() => {
        expect(notificationRepository['showNotification']).not.toHaveBeenCalled();
      });
    });

    it('if the user permission was denied', () => {
      notificationRepository.updatePermissionState(PermissionStatusState.DENIED);

      return notificationRepository.notify(message, undefined, conversation).then(() => {
        expect(notificationRepository['showNotification']).not.toHaveBeenCalled();
      });
    });
  });

  describe('reacts according to availability status', () => {
    let allMessageTypes: Record<string, any>;
    function generateTextAsset() {
      const textEntity = new Text(createUuid(), 'hey there');
      return textEntity;
    }

    beforeEach(() => {
      const mentionMessage = new ContentMessage(createUuid());
      mentionMessage.addAsset(generateTextAsset());
      spyOn(mentionMessage, 'isUserMentioned').and.returnValue(true);

      const textMessage = new ContentMessage(createUuid());
      textMessage.addAsset(generateTextAsset());
      const compositeMessage = new CompositeMessage(createUuid());
      compositeMessage.addAsset(generateTextAsset());

      const callMessage = new CallMessage(CALL_MESSAGE_TYPE.ACTIVATED);
      allMessageTypes = {
        call: callMessage,
        composite: compositeMessage,
        content: textMessage,
        mention: mentionMessage,
        ping: new PingMessage(),
      };
    });

    it('filters all notifications (but composite) if user is "away"', () => {
      userState.self().availability(Availability.Type.AWAY);
      notificationRepository.updatePermissionState(PermissionStatusState.GRANTED);

      const testPromises = Object.values(allMessageTypes).map(messageEntity => {
        return notificationRepository.notify(messageEntity, undefined, conversation).then(() => {
          if (messageEntity.isComposite()) {
            expect(notificationRepository['showNotification']).toHaveBeenCalled();
          } else {
            expect(notificationRepository['showNotification']).not.toHaveBeenCalled();
          }
        });
      });

      return Promise.all(testPromises);
    });

    it('filters content and ping messages when user is "busy"', () => {
      userState.self().availability(Availability.Type.BUSY);
      notificationRepository.updatePermissionState(PermissionStatusState.GRANTED);

      const ignoredMessages = Object.entries(allMessageTypes)
        .filter(([type]) => ['content', 'ping'].includes(type))
        .map(([, message]) => message);

      const testPromises = ignoredMessages.map(messageEntity => {
        return notificationRepository.notify(messageEntity, undefined, conversation);
      });

      return Promise.all(testPromises).then(() => {
        expect(notificationRepository['showNotification']).not.toHaveBeenCalled();
      });
    });

    it('allows mentions, calls and composite when user is "busy"', () => {
      userState.self().availability(Availability.Type.BUSY);
      notificationRepository.updatePermissionState(PermissionStatusState.GRANTED);

      const notifiedMessages = Object.entries(allMessageTypes)
        .filter(([type]) => ['mention', 'call', 'composite'].includes(type))
        .map(([, message]) => message);

      const testPromises = notifiedMessages.map(messageEntity => {
        return notificationRepository.notify(messageEntity, undefined, conversation);
      });

      return Promise.all(testPromises).then(() => {
        expect(notificationRepository['showNotification']).toHaveBeenCalledTimes(notifiedMessages.length);
      });
    });
  });

  describe('shows a well-formed call notification', () => {
    describe('for an incoming call', () => {
      const expected_body = t('notificationVoiceChannelActivate');

      beforeEach(() => {
        message = new CallMessage(CALL_MESSAGE_TYPE.ACTIVATED) as any;
        message.user(user);
      });

      it('in a 1:1 conversation', () => {
        conversation.type(CONVERSATION_TYPE.ONE_TO_ONE);
        return verifyNotification(conversation, message, expected_body);
      });

      it('in a group conversation', () => {
        return verifyNotification(conversation, message, expected_body);
      });
    });

    describe('for a missed call', () => {
      const expected_body = t('notificationVoiceChannelDeactivate');

      beforeEach(() => {
        message = new CallMessage(CALL_MESSAGE_TYPE.DEACTIVATED, TERMINATION_REASON.MISSED) as any;
        message.user(user);
      });

      it('in a 1:1 conversation', () => {
        conversation.type(CONVERSATION_TYPE.ONE_TO_ONE);
        return verifyNotification(conversation, message, expected_body);
      });

      it('in a group conversation', () => {
        return verifyNotification(conversation, message, expected_body);
      });
    });
  });

  describe('shows a well-formed content notification', () => {
    let expected_body: string;
    let textMessage: ContentMessage;

    beforeEach(() => {
      textMessage = new ContentMessage();
      textMessage.user(user);
    });

    describe('for a text message', () => {
      beforeEach(() => {
        const asset_et = new Text('id', 'Lorem ipsum');
        textMessage.assets.push(asset_et);
        expected_body = asset_et.text;
      });

      it('in a 1:1 conversation', () => {
        conversation.type(CONVERSATION_TYPE.ONE_TO_ONE);
        return verifyNotification(conversation, textMessage, expected_body);
      });

      it('in a group conversation', () => {
        return verifyNotification(conversation, textMessage, expected_body);
      });

      it('when preference is set to obfuscate-message', () => {
        const notification_preference = NotificationPreference.OBFUSCATE_MESSAGE;
        notificationRepository.updatedNotificationsProperty(notification_preference);
        return verifyNotificationObfuscated(conversation, textMessage, notification_preference);
      });

      it('when preference is set to obfuscate', () => {
        const notification_preference = NotificationPreference.OBFUSCATE;
        notificationRepository.updatedNotificationsProperty(notification_preference);
        return verifyNotificationObfuscated(conversation, textMessage, notification_preference);
      });
    });

    describe('for a picture', () => {
      beforeEach(() => {
        textMessage.assets.push(new MediumImage('image'));
        expected_body = t('notificationAssetAdd');
      });

      it('in a 1:1 conversation', () => {
        conversation.type(CONVERSATION_TYPE.ONE_TO_ONE);
        return verifyNotification(conversation, textMessage, expected_body);
      });

      it('in a group conversation', () => {
        return verifyNotification(conversation, textMessage, expected_body);
      });

      it('when preference is set to obfuscate-message', () => {
        const notification_preference = NotificationPreference.OBFUSCATE_MESSAGE;
        notificationRepository.updatedNotificationsProperty(notification_preference);
        return verifyNotificationObfuscated(conversation, textMessage, notification_preference);
      });

      it('when preference is set to obfuscate', () => {
        const notification_preference = NotificationPreference.OBFUSCATE;
        notificationRepository.updatedNotificationsProperty(notification_preference);
        return verifyNotificationObfuscated(conversation, textMessage, notification_preference);
      });
    });

    describe('for a location', () => {
      beforeEach(() => {
        textMessage.assets.push(new Location());
        expected_body = t('notificationSharedLocation');
      });

      it('in a 1:1 conversation', () => {
        conversation.type(CONVERSATION_TYPE.ONE_TO_ONE);
        return verifyNotification(conversation, textMessage, expected_body);
      });

      it('in a group conversation', () => {
        return verifyNotification(conversation, textMessage, expected_body);
      });

      it('when preference is set to obfuscate-message', () => {
        const notification_preference = NotificationPreference.OBFUSCATE_MESSAGE;
        notificationRepository.updatedNotificationsProperty(notification_preference);
        return verifyNotificationObfuscated(conversation, textMessage, notification_preference);
      });

      it('when preference is set to obfuscate', () => {
        const notification_preference = NotificationPreference.OBFUSCATE;
        notificationRepository.updatedNotificationsProperty(notification_preference);
        expect(expected_body).toBeDefined();
        return verifyNotificationObfuscated(conversation, textMessage, notification_preference);
      });
    });

    describe('for ephemeral messages', () => {
      beforeEach(() => {
        textMessage.ephemeral_expires(5000);
      });

      it('that contains text', () => {
        textMessage.assets.push(new Text('id', 'Hello world!'));
        return verifyNotificationEphemeral(conversation, textMessage);
      });

      it('that contains an image', () => {
        textMessage.assets.push(new Location());
        return verifyNotificationEphemeral(conversation, textMessage);
      });

      it('that contains a location', () => {
        textMessage.assets.push(new MediumImage('image'));
        return verifyNotificationEphemeral(conversation, textMessage);
      });
    });
  });

  describe('shows a well-formed group notification', () => {
    beforeEach(() => {
      notification_content.title = createTruncatedTitle(user.name(), conversation.display_name());
    });

    it('if a group is created', () => {
      (conversation as any).from = payload.users.get.one[0].id;
      message = new MemberMessage() as any;
      message.user(user);
      message.type = CONVERSATION_EVENT.CREATE;
      (message as any).memberMessageType = SystemMessageType.CONVERSATION_CREATE;

      const expected_body = `${user.name()} started a conversation`;
      expect(expected_body).toBeDefined();
      return verifyNotificationSystem(conversation, message, expected_body);
    });

    it('if a group is renamed', () => {
      const renameMessage = new RenameMessage('Lorem Ipsum Conversation');
      renameMessage.user(user);

      const expected_body = `${user.name()} renamed the conversation to ${renameMessage.name}`;
      expect(expected_body).toBeDefined();
      return verifyNotificationSystem(conversation, renameMessage, expected_body);
    });

    it('if a group message timer is updated', () => {
      message = new MessageTimerUpdateMessage(5000);
      message.user(user);

      const expectedBody = `${user.name()} set the message timer to 5 ${t('ephemeralUnitsSeconds')}`;
      expect(expectedBody).toBeDefined();
      return verifyNotificationSystem(conversation, message, expectedBody);
    });

    it('if a group message timer is reset', () => {
      message = new MessageTimerUpdateMessage(null);
      message.user(user);

      const expectedBody = `${user.name()} turned off the message timer`;
      expect(expectedBody).toBeDefined();
      return verifyNotificationSystem(conversation, message, expectedBody);
    });
  });

  describe('shows a well-formed member notification', () => {
    let otherUser: User;
    let memberMessage: MemberMessage;

    beforeEach(() => {
      memberMessage = new MemberMessage();
      memberMessage.user(user);
      (memberMessage as any).memberMessageType = SystemMessageType.NORMAL;
      otherUser = userMapper.mapUserFromJson(payload.users.get.many[1], '');
    });

    describe('if people are added', () => {
      beforeEach(() => {
        memberMessage.type = CONVERSATION_EVENT.MEMBER_JOIN;
        notification_content.title = createTruncatedTitle(user.name(), conversation.display_name());
      });

      it('with one user being added to the conversation', () => {
        memberMessage.userEntities([otherUser]);

        const user_name_added = entities.user.jane_roe.name;
        const expected_body = `${user.name()} added ${user_name_added} to the conversation`;
        expect(expected_body).toBeDefined();
        return verifyNotificationSystem(conversation, memberMessage, expected_body);
      });

      it('with you being added to the conversation', () => {
        otherUser.isMe = true;
        memberMessage.userEntities([otherUser]);

        const expected_body = `${user.name()} added you to the conversation`;
        expect(expected_body).toBeDefined();
        return verifyNotificationSystem(conversation, memberMessage, expected_body);
      });

      it('with multiple users being added to the conversation', () => {
        const user_ids = [entities.user.john_doe.id, entities.user.jane_roe.id];
        memberMessage.userIds(user_ids);

        const expected_body = `${user.name()} added 2 people to the conversation`;
        expect(expected_body).toBeDefined();
        return verifyNotificationSystem(conversation, memberMessage, expected_body);
      });
    });

    describe('if people are removed', () => {
      beforeEach(() => {
        memberMessage.type = CONVERSATION_EVENT.MEMBER_LEAVE;

        notification_content.title = createTruncatedTitle(user.name(), conversation.display_name());
      });

      it('with one user being removed from the conversation', () => {
        memberMessage.userEntities([otherUser]);

        return notificationRepository.notify(memberMessage, undefined, conversation).then(() => {
          expect(notificationRepository['showNotification']).not.toHaveBeenCalled();
        });
      });

      it('with you being removed from the conversation', () => {
        otherUser.isMe = true;
        memberMessage.userEntities([otherUser]);

        const expected_body = `${user.name()} removed you from the conversation`;
        expect(expected_body).toBeDefined();
        return verifyNotificationSystem(conversation, memberMessage, expected_body);
      });

      it('with multiple users being removed from the conversation', () => {
        const user_ets = userMapper.mapUsersFromJson(payload.users.get.many, '');
        memberMessage.userEntities(user_ets);

        return notificationRepository.notify(memberMessage, undefined, conversation).then(() => {
          expect(notificationRepository['showNotification']).not.toHaveBeenCalled();
        });
      });

      it('with someone leaving the conversation by himself', () => {
        memberMessage.userEntities([memberMessage.user()]);

        return notificationRepository.notify(memberMessage, undefined, conversation).then(() => {
          expect(notificationRepository['showNotification']).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('shows a well-formed request notification', () => {
    let connectionEntity: ConnectionEntity;
    const expected_title = 'Name not available';
    let memberMessage: MemberMessage;

    beforeEach(() => {
      conversation.type(CONVERSATION_TYPE.ONE_TO_ONE);

      connectionEntity = ConnectionMapper.mapConnectionFromJson(entities.connection);
      memberMessage = new MemberMessage();
      memberMessage.user(user);
    });

    it('if a connection request is incoming', () => {
      connectionEntity.status(ConnectionStatus.PENDING);
      memberMessage.memberMessageType = SystemMessageType.CONNECTION_REQUEST;

      const expected_body = t('notificationConnectionRequest');
      expect(expected_body).toBeDefined();
      return verifyNotificationSystem(conversation, memberMessage, expected_body, expected_title);
    });

    it('if your connection request was accepted', () => {
      memberMessage.memberMessageType = SystemMessageType.CONNECTION_ACCEPTED;

      const expected_body = t('notificationConnectionAccepted');
      expect(expected_body).toBeDefined();
      return verifyNotificationSystem(conversation, memberMessage, expected_body, expected_title);
    });

    it('if you are automatically connected', () => {
      memberMessage.memberMessageType = SystemMessageType.CONNECTION_CONNECTED;

      const expected_body = t('notificationConnectionConnected');
      expect(expected_body).toBeDefined();
      return verifyNotificationSystem(conversation, memberMessage, expected_body, expected_title);
    });
  });

  describe('shows a well-formed ping notification', () => {
    const expected_body = t('notificationPing');

    beforeAll(() => {
      user = userMapper.mapUserFromJson(payload.users.get.one[0], '');
    });

    beforeEach(() => {
      message = new PingMessage();
      message.user(user);
    });

    it('in a 1:1 conversation', () => {
      conversation.type(CONVERSATION_TYPE.ONE_TO_ONE);
      return verifyNotification(conversation, message, expected_body);
    });

    it('in a group conversation', () => {
      return verifyNotification(conversation, message, expected_body);
    });

    it('as an ephemeral message', () => {
      message.ephemeral_expires(5000);
      return verifyNotificationEphemeral(conversation, message);
    });
  });

  describe('shows a well-formed composite notification', () => {
    let compositeMessage: CompositeMessage;
    beforeEach(() => {
      compositeMessage = new CompositeMessage();
      compositeMessage.addAsset(new Text(createUuid(), '## headline!'));
    });

    it('even if notifications are disabled in preferences', () => {
      notificationRepository.updatedNotificationsProperty(NotificationPreference.NONE);

      return notificationRepository.notify(compositeMessage, undefined, conversation).then(() => {
        expect(notificationRepository['showNotification']).toHaveBeenCalled();
      });
    });

    it('even if notifications are disabled in conversation settings', () => {
      conversation.mutedState(NOTIFICATION_STATE.NOTHING);
      return notificationRepository.notify(compositeMessage, undefined, conversation).then(() => {
        expect(notificationRepository['showNotification']).toHaveBeenCalled();
      });
    });
  });

  describe('shouldNotifyInConversation', () => {
    let conversationEntity: Conversation;
    let messageEntity: ContentMessage;

    const userId = {domain: '', id: createUuid()};
    const shouldNotifyInConversation = NotificationRepository.shouldNotifyInConversation;

    function generateTextAsset(selfMentioned = false) {
      const mentionId = selfMentioned ? userId.id : createUuid();

      const textEntity = new Text(createUuid(), '@Gregor can you take a look?');
      const mentionEntity = new MentionEntity(0, 7, mentionId, userId.domain);
      textEntity.mentions([mentionEntity]);

      return textEntity;
    }

    beforeEach(() => {
      const selfUserEntity = new User(userId.id);
      selfUserEntity.isMe = true;
      selfUserEntity.teamId = createUuid();

      conversationEntity = new Conversation(createUuid());
      conversationEntity.selfUser(selfUserEntity);

      messageEntity = new ContentMessage(createUuid());
      messageEntity.user(selfUserEntity);
    });

    it('returns the correct value for all notifications', () => {
      messageEntity.addAsset(generateTextAsset());
      conversationEntity.mutedState(NOTIFICATION_STATE.EVERYTHING);
      const notifyInConversation = shouldNotifyInConversation(conversationEntity, messageEntity, userId);

      expect(notifyInConversation).toBe(true);
    });

    it('returns the correct value for no notifications', () => {
      messageEntity.addAsset(generateTextAsset());
      conversationEntity.mutedState(NOTIFICATION_STATE.NOTHING);
      const notifyInConversation = shouldNotifyInConversation(conversationEntity, messageEntity, userId);

      expect(notifyInConversation).toBe(false);
    });

    it('returns the correct value for self mentioned messages', () => {
      messageEntity.addAsset(generateTextAsset(true));
      conversationEntity.mutedState(NOTIFICATION_STATE.MENTIONS_AND_REPLIES);
      const notifyInConversation = shouldNotifyInConversation(conversationEntity, messageEntity, userId);

      expect(notifyInConversation).toBe(true);
    });

    it('returns the correct value for non-self mentioned messages', () => {
      messageEntity.addAsset(generateTextAsset());
      conversationEntity.mutedState(NOTIFICATION_STATE.MENTIONS_AND_REPLIES);
      const notifyInConversation = shouldNotifyInConversation(conversationEntity, messageEntity, userId);

      expect(notifyInConversation).toBe(false);
    });

    it('returns the correct value for self replies', () => {
      messageEntity.addAsset(generateTextAsset());

      const quoteEntity = new QuoteEntity({messageId: createUuid(), userId: userId.id});
      messageEntity.quote(quoteEntity);

      conversationEntity.mutedState(NOTIFICATION_STATE.MENTIONS_AND_REPLIES);
      const notifyInConversation = shouldNotifyInConversation(conversationEntity, messageEntity, userId);

      expect(notifyInConversation).toBe(true);
    });

    it('returns the correct value for non-self replies', () => {
      messageEntity.addAsset(generateTextAsset());

      const quoteEntity = new QuoteEntity({
        messageId: createUuid(),
        userId: createUuid(),
      });
      messageEntity.quote(quoteEntity);

      conversationEntity.mutedState(NOTIFICATION_STATE.MENTIONS_AND_REPLIES);
      const notifyInConversation = shouldNotifyInConversation(conversationEntity, messageEntity, userId);

      expect(notifyInConversation).toBe(false);
    });
  });
});
