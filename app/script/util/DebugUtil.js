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

window.z = window.z || {};
window.z.util = z.util || {};

z.util.DebugUtil = class DebugUtil {
  constructor(callingRepository, conversationRepository, userRepository) {
    this.callingRepository = callingRepository;
    this.conversationRepository = conversationRepository;
    this.userRepository = userRepository;
    this.logger = new z.util.Logger('z.util.DebugUtil', z.config.LOGGER.OPTIONS);
  }

  blockAllConnections() {
    const blockUsers = wire.app.repository.user.users().map(user_et => this.userRepository.blockUser(user_et));
    return Promise.all(blockUsers);
  }

  breakSession(userId, clientId) {
    const sessionId = `${userId}@${clientId}`;
    const cryptobox = wire.app.repository.cryptography.cryptobox;
    return cryptobox
      .session_load(sessionId)
      .then(cryptoboxSession => {
        cryptoboxSession.session.session_states = {};

        const record = {
          created: Date.now(),
          id: sessionId,
          serialised: cryptoboxSession.session.serialise(),
          version: 'broken_by_qa',
        };

        cryptobox.cachedSessions.set(sessionId, cryptoboxSession);

        const sessionStoreName = z.storage.StorageSchemata.OBJECT_STORE.SESSIONS;
        return wire.app.repository.storage.storageService.update(sessionStoreName, sessionId, record);
      })
      .then(() => this.logger.log(`Corrupted Session ID '${sessionId}'`));
  }

  haveISentThisMessageToMyOtherClients(messageId) {
    const userId = wire.app.repository.user.self().id;
    const conversation = wire.app.repository.conversation.active_conversation();
    const conversationId = conversation.id;
    const clientId = wire.app.repository.client.currentClient().id;
    const message = conversation.get_message_by_id(messageId);
    const dateTime = new Date(message.timestamp());
    let amountOfMessagesSent = 0;

    const isOTRMessage = notification => notification.type === 'conversation.otr-message-add';
    const isInCurrentConversation = notification => notification.conversation === conversationId;
    const wasSentByOurCurrentClient = notification =>
      notification.from === userId && (notification.data && notification.data.sender === clientId);
    const hasExpectedTimestamp = notification => notification.time === dateTime.toISOString();

    return wire.app.repository.event.notificationService
      .getNotifications(undefined, undefined, 10000)
      .then(({notifications}) =>
        notifications
          .map(notification => notification.payload)
          .reduce((acc, payload) => acc.concat(payload))
          .filter(isOTRMessage)
          .filter(isInCurrentConversation)
          .filter(wasSentByOurCurrentClient)
          .filter(hasExpectedTimestamp)
      )
      .then(filteredNotifications => {
        amountOfMessagesSent = filteredNotifications.length;
        return wire.app.repository.client.getClientsForSelf();
      })
      .then(selfClients => selfClients.length === amountOfMessagesSent);
  }

  getEventInfo(event) {
    const debugInformation = {event};

    return this.conversationRepository
      .get_conversation_by_id(event.conversation)
      .then(conversation_et => {
        debugInformation.conversation = conversation_et;
        return this.userRepository.get_user_by_id(event.from);
      })
      .then(user_et => {
        debugInformation.user = user_et;
        const logMessage = `Hey ${this.userRepository.self().name()}, this is for you:`;
        this.logger.warn(logMessage, debugInformation);
        this.logger.warn(`Conversation: ${debugInformation.conversation.name()}`, debugInformation.conversation);
        this.logger.warn(`From: ${debugInformation.user.name()}`, debugInformation.user);
        return debugInformation;
      });
  }

  exportCryptobox() {
    const clientId = wire.app.repository.client.currentClient().id;
    const userId = wire.app.repository.user.self().id;
    const fileName = `cryptobox-${userId}-${clientId}.json`;

    wire.app.repository.cryptography.cryptobox
      .serialize()
      .then(cryptobox => z.util.downloadText(JSON.stringify(cryptobox), fileName));
  }

  getNotificationFromStream(notificationId, notificationIdSince) {
    const clientId = wire.app.repository.client.currentClient().id;

    const _gotNotifications = ({hasMore, notifications}) => {
      const matchingNotifications = notifications.filter(notification => notification.id === notificationId);
      if (matchingNotifications.length) {
        return matchingNotifications[0];
      }

      if (hasMore) {
        const lastNotification = notifications[notifications.length - 1];
        return this.getNotificationFromStream(notificationId, lastNotification.id);
      }
      this.logger.log(`Notification '${notificationId}' was not found in encrypted notification stream`);
    };

    return wire.app.service.notification.getNotifications(clientId, notificationIdSince, 10000).then(_gotNotifications);
  }

  getNotificationsFromStream(remoteUserId, remoteClientId, matchingNotifications = [], notificationIdSince) {
    const localClientId = wire.app.repository.client.currentClient().id;
    const localUserId = wire.app.repository.user.self().id;

    const _gotNotifications = ({hasMore, notifications}) => {
      const additionalNotifications = !remoteUserId
        ? notifications
        : notifications.filter(notification => {
            const {payload} = notification;
            for (const {data, from} of payload) {
              if (data && [localUserId, remoteUserId].includes(from)) {
                const {sender, recipient} = data;
                const incoming_event = sender === remoteClientId && recipient === localClientId;
                const outgoing_event = sender === localClientId && recipient === remoteClientId;
                return incoming_event || outgoing_event;
              }
            }
            return false;
          });

      matchingNotifications = matchingNotifications.concat(additionalNotifications);

      if (hasMore) {
        const lastNotification = notifications[notifications.length - 1];
        return this.getNotificationsFromStream(
          remoteUserId,
          remoteClientId,
          matchingNotifications,
          lastNotification.id
        );
      }

      const logMessage = remoteUserId
        ? `Found '${matchingNotifications.length}' notifications between '${localClientId}' and '${remoteClientId}'`
        : `Found '${matchingNotifications.length}' notifications`;

      this.logger.log(logMessage, matchingNotifications);

      return matchingNotifications;
    };

    const clientScope = remoteUserId === localUserId ? undefined : localClientId;
    return wire.app.service.notification
      .getNotifications(clientScope, notificationIdSince, 10000)
      .then(_gotNotifications);
  }

  getObjectsForDecryptionErrors(sessionId, notificationId) {
    return Promise.all([
      this.getNotificationFromStream(notificationId.toLowerCase()),
      this.getSerialisedIdentity(),
      this.getSerialisedSession(sessionId.toLowerCase()),
    ]).then(resolveArray => {
      return JSON.stringify({
        identity: resolveArray[1],
        notification: resolveArray[0],
        session: resolveArray[2],
      });
    });
  }

  getInfoForClientDecryptionErrors(remoteUserId, remoteClientId) {
    return Promise.all([
      this.getNotificationsFromStream(remoteUserId, remoteClientId),
      this.getSerialisedIdentity(),
      this.getSerialisedSession(`${remoteUserId}@${remoteClientId}`),
    ]).then(resolveArray => {
      return JSON.stringify({
        identity: resolveArray[1],
        notifications: resolveArray[0],
        session: resolveArray[2],
      });
    });
  }

  /**
   * Print call log to console.
   * @returns {undefined} No return value
   */
  logCallMessages() {
    this.callingRepository.printLog();
  }

  logConnectionStatus() {
    this.logger.log('Online Status');
    this.logger.log(`-- Browser online: ${window.navigator.onLine}`);
    this.logger.log(`-- IndexedDB open: ${wire.app.repository.storage.storageService.db.isOpen()}`);
    this.logger.log(`-- WebSocket ready state: ${window.wire.app.service.web_socket.socket.readyState}`);
  }
};
