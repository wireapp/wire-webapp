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

import $ from 'jquery';
import sodium from 'libsodium-wrappers-sumo';
import Dexie from 'dexie';
import {util as ProteusUtil} from '@wireapp/proteus';
import keyboardJS from 'keyboardjs';

import {getLogger} from 'Util/Logger';

import {checkVersion} from '../lifecycle/newVersionHandler';
import {downloadFile} from './util';

import {BackendEvent} from '../event/Backend';
import {StorageSchemata} from '../storage/StorageSchemata';
import {EventRepository} from '../event/EventRepository';

import {h as createElement, init as snabbdomInit} from 'snabbdom';
import style from 'snabbdom/modules/style';

function downloadText(text, filename = 'default.txt') {
  const url = `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
  return downloadFile(url, filename);
}

export class DebugUtil {
  constructor(repositories) {
    const {calling, client, connection, conversation, cryptography, event, user, storage} = repositories;

    this.callingRepository = calling;
    this.clientRepository = client;
    this.conversationRepository = conversation;
    this.connectionRepository = connection;
    this.cryptographyRepository = cryptography;
    this.eventRepository = event;
    this.storageRepository = storage;
    this.userRepository = user;
    this.$ = $;
    this.sodium = sodium;
    this.Dexie = Dexie;

    this.logger = getLogger('DebugUtil');

    this.liveCallingStatsInterval = undefined;
    keyboardJS.bind('alt+ctrl+c', this.toggleLiveCallingStats.bind(this));
  }

  blockAllConnections() {
    const blockUsers = this.userRepository.users().map(userEntity => this.connectionRepository.blockUser(userEntity));
    return Promise.all(blockUsers);
  }

  breakSession(userId, clientId) {
    const sessionId = `${userId}@${clientId}`;
    const cryptobox = this.cryptographyRepository.cryptobox;
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

        const sessionStoreName = StorageSchemata.OBJECT_STORE.SESSIONS;
        return this.storageRepository.storageService.update(sessionStoreName, sessionId, record);
      })
      .then(() => this.logger.log(`Corrupted Session ID '${sessionId}'`));
  }

  triggerVersionCheck(baseVersion) {
    return checkVersion(baseVersion);
  }

  /**
   * Will allow the webapp to generate fake link previews when sending a link in a message.
   *
   * @returns {void} - returns nothing
   */
  enableLinkPreviews() {
    /*
     * To allow the LinkPreviewRepository to generate link previews, we need to expose a fake 'openGraphAsync' method.
     * This function is normally exposed by the desktop wrapper
     */
    window.openGraphAsync = url => {
      return Promise.resolve({
        image: {
          data:
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAYAAAA8AXHiAAADiUlEQVR4nO3dS67cMAwEwHeWuf8dkxOMDVDTJiVXA1pq+FF5EyDJ3+fz+XfCuUp3bzv3Wj1/3Q288bF26rV6wNJr5ICl18gBS6+RA5ZeIwcsvUbOJaxpSTxW9V5HzWkBC6xIwAIrErDAigQssCIBC6xIwAIrkgisu6VXT7Vm4l5HTnkPsIbllPcAa1hOeQ+whuWU9wBrWE55D7CG5ZT3AGtYTnmP18PqmGOnGas1wQILrGm9ggUWWGDts3SwwAILrH2WDhZYYIH1+6V35JSPp1oTrFDAOmSQaQHrkEGmBaxDBpkWsA4ZZFrAOmSQaQHr5Y+1Mn9id6e8B1hglQMWWJGABVYkYIEVCVhgRQIWWJGUYe10qguo3uuqucsBCyywpj0yWGCBBRZYJxywwAJr2iODdQHrcsoXZNpHcErAAisSsMCKBCywIgELrEjAAisSsMCKpPznWCuZ9Fgrv/k0nmq9jo8HLLDAAgusxwdN9JK8+2SvYIEVqQcWWJF6YIEVqbcVrBSCSXg65u+YI7EDsAJLBQusyFLBAiuyVLDAiiwVLLAiSwULrMhSwbr5yxQdgySG7IA1acaOOcAK1Zs0I1g3AQusbZaeqjdpRrBuAhZY2yw9VW/SjGDdBCywtll6qt6kGY+BdZfU706pt9JP4iPo6AeshoAF1uP9gLUQsMAC6+F+wFoIWGCB9XA/r4CVGqT6u4mz0svTc6SS6BWshV6eniMVsMCKBCywIgELrEjAAisSsMCKZBSsnQLWdRI1wSreA+s6YBXvgXUdsIr3wLoOWMV7YF0HrOI9sK4DVvEeWNd5xX/dW00HrGmp9gpWcalggRVZKlhgRZYKFliRpYIFVmSpYIEVWSpYC7CmJfHI1XsdH0FqjkRNsIr3wAILLLCuAxZYkYAFViRggRUJWC+A1bH0ab0+jWenAxZYYE3rFSywwAKrVnPaY1XTDQKsAb2CBRZYYNVq7vSQiV5XZkzsByywIvsBC6zIfsACK7IfsMCK7AcssCL7AQusyH7AAiuyn9fDSs3YUXPSRwBWaMaOmmCBFakJFliRmmCBFakJFliRmmCBFal5BKyO7PQRJPpJ7Gb17reABRZYYP1+N6t3vwUssMAC6/e7Wb37LWCBBRZYv9/N6t1vecU/btvx8UyCvNJr9R5YoYA1AAVYYI09icWtBKwBKMACa+xJLG4lYA1AAdZ5sP4Df5GjbWdSI2IAAAAASUVORK5CYII=',
        },
        title: 'A link to the past',
        url,
      });
    };
  }

  getLastMessagesFromDatabase(amount = 10, conversationId = this.conversationRepository.active_conversation().id) {
    if (this.storageService.db) {
      return this.storageRepository.storageService.db.events.toArray(records => {
        const messages = records.filter(events => events.conversation === conversationId);
        return messages.slice(amount * -1).reverse();
      });
    }
    return [];
  }

  haveISentThisMessageToMyOtherClients(
    messageId,
    conversationId = this.conversationRepository.active_conversation().id,
  ) {
    let recipients = [];

    const clientId = this.clientRepository.currentClient().id;
    const userId = this.userRepository.self().id;

    const isOTRMessage = notification => notification.type === BackendEvent.CONVERSATION.OTR_MESSAGE_ADD;
    const isInCurrentConversation = notification => notification.conversation === conversationId;
    const wasSentByOurCurrentClient = notification =>
      notification.from === userId && notification.data && notification.data.sender === clientId;
    const hasExpectedTimestamp = (notification, dateTime) => notification.time === dateTime.toISOString();

    return this.conversationRepository
      .get_conversation_by_id(conversationId)
      .then(conversation => {
        return this.conversationRepository.get_message_in_conversation_by_id(conversation, messageId);
      })
      .then(message => {
        return this.eventRepository.notificationService
          .getNotifications(undefined, undefined, EventRepository.CONFIG.NOTIFICATION_BATCHES.MAX)
          .then(({notifications}) => ({
            message,
            notifications,
          }));
      })
      .then(({message, notifications}) => {
        const dateTime = new Date(message.timestamp());
        return notifications
          .reduce((accumulator, notification) => accumulator.concat(notification.payload), [])
          .filter(event => {
            return (
              isOTRMessage(event) &&
              isInCurrentConversation(event) &&
              wasSentByOurCurrentClient(event) &&
              hasExpectedTimestamp(event, dateTime)
            );
          });
      })
      .then(filteredEvents => {
        recipients = filteredEvents.map(event => event.data.recipient);
        return this.clientRepository.getClientsForSelf();
      })
      .then(selfClients => {
        const selfClientIds = selfClients.map(client => client.id);
        const missingClients = selfClientIds.filter(id => recipients.includes(id));
        const logMessage = missingClients.length
          ? `Message was sent to all other "${selfClients.length}" clients.`
          : `Message was NOT sent to the following own clients: ${missingClients.join(',')}`;
        this.logger.info(logMessage);
      })
      .catch(error => this.logger.info(`Message was not sent to other clients. Reason: ${error.message}`, error));
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
    const clientId = this.clientRepository.currentClient().id;
    const userId = this.userRepository.self().id;
    const fileName = `cryptobox-${userId}-${clientId}.json`;

    this.cryptographyRepository.cryptobox
      .serialize()
      .then(cryptobox => downloadText(JSON.stringify(cryptobox), fileName));
  }

  getNotificationFromStream(notificationId, notificationIdSince) {
    const clientId = this.clientRepository.currentClient().id;

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
    const localClientId = this.clientRepository.currentClient().id;
    const localUserId = this.userRepository.self().id;

    const _gotNotifications = ({hasMore, notifications}) => {
      const additionalNotifications = !remoteUserId
        ? notifications
        : notifications.filter(notification => {
            const payload = notification.payload;
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
          lastNotification.id,
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
   * @returns {Promise<boolean>} `true` if libsodium is using WebAssembly
   */
  isLibsodiumUsingWASM() {
    return ProteusUtil.WASMUtil.isUsingWASM();
  }

  /**
   * Return the whole call log as string
   * @returns {string} The call log
   */
  getCallingLogs() {
    return this.callingRepository.callLog.join('\n');
  }

  reprocessNotificationStream(conversationId = this.conversationRepository.active_conversation().id) {
    const clientId = this.clientRepository.currentClient().id;

    return this.eventRepository.notificationService
      .getNotifications(clientId, undefined, EventRepository.CONFIG.NOTIFICATION_BATCHES.MAX)
      .then(({notifications}) => {
        this.logger.info(`Fetched "${notifications.length}" notifications for client "${clientId}".`, notifications);

        const isOTRMessage = notification => notification.type === BackendEvent.CONVERSATION.OTR_MESSAGE_ADD;
        const isInCurrentConversation = notification => notification.conversation === conversationId;

        return notifications
          .map(notification => notification.payload)
          .reduce((accumulator, payload) => accumulator.concat(payload))
          .filter(notification => {
            return isOTRMessage(notification) && isInCurrentConversation(notification);
          });
      })
      .then(events => {
        this.logger.info(`Reprocessing "${events.length}" OTR messages...`);
        events.forEach(event => this.eventRepository.processEvent(event, EventRepository.SOURCE.STREAM));
      });
  }

  getActiveCallStats() {
    const activeCall = this.callingRepository.joinedCall();
    if (!activeCall) {
      throw new Error('no active call found');
    }
    return this.callingRepository.getStats(activeCall.conversationId);
  }

  enableFakeMediaDevices() {
    const cameras = [
      {deviceId: 'ff0000', groupId: 'fakeCamera1', kind: 'videoinput', label: 'Red cam'},
      {deviceId: '00ff00', groupId: 'fakeCamera2', kind: 'videoinput', label: 'Green cam'},
      {deviceId: '0000ff', groupId: 'fakeCamera3', kind: 'videoinput', label: 'Blue cam'},
    ];
    const microphones = [
      {deviceId: '440', groupId: 'fakeMic1', kind: 'audioinput', label: 'First mic'},
      {deviceId: '100', groupId: 'fakeMic2', kind: 'audioinput', label: 'Second mic'},
    ];
    navigator.mediaDevices.enumerateDevices = () => Promise.resolve(cameras.concat(microphones));

    navigator.mediaDevices.getUserMedia = constraints => {
      const audio = constraints.audio ? generateAudioTrack(constraints.audio) : [];
      const video = constraints.video ? generateVideoTrack(constraints.video) : [];
      return Promise.resolve(new MediaStream(audio.concat(video)));
    };

    function generateAudioTrack(constraints) {
      const hz = (constraints.deviceId || {}).exact || microphones[0].deviceId;
      const context = new window.AudioContext();
      const osc = context.createOscillator(); // instantiate an oscillator
      osc.type = 'sine'; // this is the default - also square, sawtooth, triangle
      osc.frequency.value = parseInt(hz, 10); // Hz
      const dest = context.createMediaStreamDestination();
      osc.connect(dest); // connect it to the destination
      osc.start(0);

      return dest.stream.getAudioTracks();
    }

    function generateVideoTrack(constraints) {
      const color = (constraints.deviceId || {}).exact || cameras[0].deviceId;
      const width = 300;
      const height = 240;
      const canvas = document.createElement('canvas');
      canvas.height = height;
      canvas.width = width;
      const ctx = canvas.getContext('2d');
      setInterval(() => {
        ctx.fillStyle = `#${color}`;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = `#000`;
        ctx.fillRect(0, 0, Math.random() * 10, Math.random() * 10);
      }, 500);
      const stream = canvas.captureStream(25);
      return stream.getVideoTracks();
    }

    navigator.mediaDevices.ondevicechange();
  }

  toggleLiveCallingStats() {
    const containerId = 'live-calling-stats';
    const containerElement = document.getElementById(containerId);
    if (containerElement) {
      clearInterval(this.liveCallingStatsInterval);
      document.body.removeChild(containerElement);
      return;
    }
    const statsDomElement = document.createElement('div');
    statsDomElement.id = containerId;
    document.body.appendChild(statsDomElement);
    const patch = snabbdomInit([style]);
    let vdom = createElement('div');
    patch(statsDomElement, vdom);

    const renderStats = async participantsStats => {
      return Promise.all(
        participantsStats.map(async participantStats => {
          const rawStats = [];
          participantStats.stats.forEach(stats => {
            if (
              (stats.kind === 'audio' || stats.kind === 'video') &&
              (stats.packetsReceived || stats.packetsSent) &&
              !stats.id.includes('rtcp')
            ) {
              rawStats.push(stats);
            }
          });

          const groupedStats = rawStats.reduce((groups, stats) => {
            groups.sent = groups.sent || [];
            groups.received = groups.received || [];
            if (stats.packetsSent) {
              groups.sent.push(createElement('li', `🡅 ${stats.kind}: ${stats.packetsSent} packets`));
            } else {
              groups.received.push(createElement('li', `🡇 ${stats.kind}: ${stats.packetsReceived} packets`));
            }
            return groups;
          }, {});

          const user = await this.userRepository.get_user_by_id(participantStats.userid);

          return createElement('div', [
            createElement('div', [createElement('strong', user.first_name())]),
            createElement('ul', groupedStats.sent.concat(groupedStats.received)),
          ]);
        }),
      ).then(elements => {
        return createElement(
          `div#${containerId}`,
          {
            style: {
              backgroundColor: 'black',
              color: '#00fb00',
              padding: '1em',
              position: 'absolute',
              right: '0',
              top: '0',
            },
          },
          elements,
        );
      });
    };

    const renderFrame = async () => {
      const participantsStats = await this.getActiveCallStats();
      const newVdom = await renderStats(participantsStats);
      vdom = patch(vdom, newVdom);
    };

    ko.computed(() => {
      const call = this.callingRepository.joinedCall();
      if (call) {
        renderFrame();
        this.liveCallingStatsInterval = setInterval(renderFrame, 500);
      } else {
        vdom = patch(vdom, createElement('div'));
        clearInterval(this.liveCallingStatsInterval);
      }
    });
  }
}
