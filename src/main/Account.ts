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

import {Context, LoginData} from '@wireapp/api-client/dist/commonjs/auth/index';
import {ClientType, RegisteredClient} from '@wireapp/api-client/dist/commonjs/client/index';
import {IncomingNotification} from '@wireapp/api-client/dist/commonjs/conversation/index';
import {
  CONVERSATION_EVENT,
  ConversationEvent,
  ConversationMessageTimerUpdateEvent,
  ConversationOtrMessageAddEvent,
  IncomingEvent,
  USER_EVENT,
  UserEvent,
} from '@wireapp/api-client/dist/commonjs/event/index';
import {StatusCode} from '@wireapp/api-client/dist/commonjs/http/index';
import {WebSocketClient} from '@wireapp/api-client/dist/commonjs/tcp/index';
import * as cryptobox from '@wireapp/cryptobox';
import {RecordNotFoundError} from '@wireapp/store-engine/dist/commonjs/engine/error/index';
import * as Long from 'long';
import {Root} from 'protobufjs';
import {LoginSanitizer} from './auth/root';
import {ClientInfo, ClientService} from './client/root';
import {ConnectionService} from './connection/root';
import {
  AssetService,
  ConversationService,
  GenericMessageType,
  PayloadBundleIncoming,
  PayloadBundleState,
} from './conversation/root';
import {CryptographyService} from './cryptography/root';
import {NotificationService} from './notification/root';
import proto from './Protobuf';
import {SelfService} from './self/root';

const logdown = require('logdown');
import Client = require('@wireapp/api-client');
import EventEmitter = require('events');
import {AssetContent, DeletedContent, HiddenContent, TextContent} from './conversation/content/';

class Account extends EventEmitter {
  private readonly logger: any = logdown('@wireapp/core/Account', {
    logger: console,
    markdown: false,
  });

  public static readonly INCOMING = {
    ASSET: 'Account.INCOMING.ASSET',
    CLIENT_ACTION: 'Account.INCOMING.CLIENT_ACTION',
    CONFIRMATION: 'Account.INCOMING.CONFIRMATION',
    CONNECTION: 'Account.INCOMING.CONNECTION',
    DELETED: 'Account.INCOMING.DELETED',
    HIDDEN: 'Account.INCOMING.HIDDEN',
    MESSAGE_TIMER_UPDATE: 'Account.INCOMING.MESSAGE_TIMER_UPDATE',
    PING: 'Account.INCOMING.PING',
    TEXT_MESSAGE: 'Account.INCOMING.TEXT_MESSAGE',
    TYPING: 'Account.INCOMING.TYPING',
  };
  private readonly apiClient: Client;
  private protocolBuffers: any = {};
  public service?: {
    client: ClientService;
    conversation: ConversationService;
    connection: ConnectionService;
    cryptography: CryptographyService;
    notification: NotificationService;
    self: SelfService;
  };

  constructor(apiClient: Client = new Client()) {
    super();
    this.apiClient = apiClient;
  }

  public async init(): Promise<void> {
    this.logger.info('init');

    const root: Root = Root.fromJSON(proto);

    this.protocolBuffers = {
      Asset: root.lookup('Asset'),
      ClientAction: root.lookup('ClientAction'),
      Confirmation: root.lookup('Confirmation'),
      Ephemeral: root.lookup('Ephemeral'),
      External: root.lookup('External'),
      GenericMessage: root.lookup('GenericMessage'),
      Knock: root.lookup('Knock'),
      MessageDelete: root.lookup('MessageDelete'),
      MessageEdit: root.lookup('MessageEdit'),
      MessageHide: root.lookup('MessageHide'),
      Text: root.lookup('Text'),
    };

    const cryptographyService = new CryptographyService(this.apiClient, this.apiClient.config.store);
    const clientService = new ClientService(this.apiClient, this.apiClient.config.store, cryptographyService);
    const connectionService = new ConnectionService(this.apiClient);
    const assetService = new AssetService(this.apiClient);
    const conversationService = new ConversationService(
      this.apiClient,
      this.protocolBuffers,
      cryptographyService,
      assetService
    );
    const notificationService = new NotificationService(this.apiClient, this.apiClient.config.store);
    const selfService = new SelfService(this.apiClient);

    this.service = {
      client: clientService,
      connection: connectionService,
      conversation: conversationService,
      cryptography: cryptographyService,
      notification: notificationService,
      self: selfService,
    };
  }

  public login(
    loginData: LoginData,
    initClient: boolean = true,
    clientInfo?: ClientInfo
  ): Promise<Context | undefined> {
    this.logger.info('login');
    return this.resetContext()
      .then(() => this.init())
      .then(() => LoginSanitizer.removeNonPrintableCharacters(loginData))
      .then(() => this.apiClient.login(loginData))
      .then(() => {
        return initClient
          ? this.initClient(loginData, clientInfo).then(() => this.apiClient.context)
          : this.apiClient.context;
      });
  }

  public initClient(
    loginData: LoginData,
    clientInfo?: ClientInfo
  ): Promise<{isNewClient: boolean; localClient: RegisteredClient}> {
    this.logger.info('initClient');
    if (!this.service) {
      throw new Error('Services are not set.');
    }

    return this.loadAndValidateLocalClient()
      .then(localClient => ({isNewClient: false, localClient}))
      .catch(error => {
        // There was no client so we need to "create" and "register" a client
        const notFoundInDatabase =
          error instanceof cryptobox.error.CryptoboxError ||
          error.constructor.name === 'CryptoboxError' ||
          error instanceof RecordNotFoundError ||
          error.constructor.name === 'RecordNotFoundError';
        const notFoundOnBackend = error.response && error.response.status === StatusCode.NOT_FOUND;

        if (notFoundInDatabase) {
          this.logger.info('Could not find valid client in database');
          return this.registerClient(loginData, clientInfo);
        }
        if (notFoundOnBackend) {
          this.logger.info('Could not find valid client on backend');
          return this.service!.client.getLocalClient().then(client => {
            const shouldDeleteWholeDatabase = client.type === ClientType.TEMPORARY;
            if (shouldDeleteWholeDatabase) {
              this.logger.info('Last client was temporary - Deleting database');
              return this.apiClient.config.store
                .purge()
                .then(() => this.apiClient.init(loginData.clientType))
                .then(() => this.registerClient(loginData, clientInfo));
            }
            this.logger.info('Last client was permanent - Deleting cryptography stores');
            return this.service!.cryptography.deleteCryptographyStores().then(() =>
              this.registerClient(loginData, clientInfo)
            );
          });
        }
        throw error;
      });
  }

  public loadAndValidateLocalClient(): Promise<RegisteredClient> {
    this.logger.info('loadAndValidateLocalClient');
    let loadedClient: RegisteredClient;
    return this.service!.cryptography.initCryptobox()
      .then(() => this.service!.client.getLocalClient())
      .then(client => (loadedClient = client))
      .then(() => this.apiClient.client.api.getClient(loadedClient.id))
      .then(() => (this.apiClient.context!.clientId = loadedClient.id))
      .then(() => this.service!.conversation.setClientID(loadedClient.id))
      .then(() => loadedClient);
  }

  private registerClient(
    loginData: LoginData,
    clientInfo?: ClientInfo
  ): Promise<{isNewClient: boolean; localClient: RegisteredClient}> {
    this.logger.info('registerClient');
    if (!this.service) {
      throw new Error('Services are not set.');
    }
    let registeredClient: RegisteredClient;

    return this.service!.client.register(loginData, clientInfo)
      .then((client: RegisteredClient) => (registeredClient = client))
      .then(() => {
        this.logger.info('Client is created');
        this.apiClient.context!.clientId = registeredClient.id;
        this.service!.conversation.setClientID(registeredClient.id);
        return this.service!.notification.initializeNotificationStream(registeredClient.id);
      })
      .then(() => this.service!.client.synchronizeClients())
      .then(() => ({isNewClient: true, localClient: registeredClient}));
  }

  private resetContext(): Promise<void> {
    this.logger.info('resetContext');
    return Promise.resolve().then(() => {
      delete this.apiClient.context;
      delete this.service;
    });
  }

  public logout(): Promise<void> {
    this.logger.info('logout');
    return this.apiClient.logout().then(() => this.resetContext());
  }

  public listen(notificationHandler?: Function): Promise<Account> {
    this.logger.info('listen');
    if (!this.apiClient.context) {
      throw new Error('Context is not set - Please login first');
    }
    return Promise.resolve()
      .then(() => {
        this.apiClient.transport.ws.removeAllListeners(WebSocketClient.TOPIC.ON_MESSAGE);

        if (notificationHandler) {
          this.apiClient.transport.ws.on(WebSocketClient.TOPIC.ON_MESSAGE, (notification: IncomingNotification) =>
            notificationHandler(notification)
          );
        } else {
          this.apiClient.transport.ws.on(WebSocketClient.TOPIC.ON_MESSAGE, this.handleNotification.bind(this));
        }
        return this.apiClient.connect();
      })
      .then(() => this);
  }

  private async decodeGenericMessage(otrMessage: ConversationOtrMessageAddEvent): Promise<PayloadBundleIncoming> {
    if (!this.service) {
      throw new Error('Services are not set.');
    }

    const {
      from,
      data: {sender, text: cipherText},
    } = otrMessage;

    const sessionId = CryptographyService.constructSessionId(from, sender);
    const decryptedMessage = await this.service.cryptography.decrypt(sessionId, cipherText);
    const genericMessage = this.protocolBuffers.GenericMessage.decode(decryptedMessage);

    if (genericMessage.content === GenericMessageType.EPHEMERAL) {
      const unwrappedMessage = this.mapGenericMessage(genericMessage.ephemeral, otrMessage);
      const expireAfterMillis = genericMessage.ephemeral.expireAfterMillis;
      unwrappedMessage.messageTimer = expireAfterMillis.toNumber
        ? (expireAfterMillis as Long).toNumber()
        : expireAfterMillis;
      return unwrappedMessage;
    } else {
      return this.mapGenericMessage(genericMessage, otrMessage);
    }
  }

  private mapGenericMessage(genericMessage: any, event: ConversationOtrMessageAddEvent): PayloadBundleIncoming {
    switch (genericMessage.content) {
      case GenericMessageType.TEXT: {
        const content: TextContent = {
          text: genericMessage.text.content,
        };
        return {
          content,
          conversation: event.conversation,
          from: event.from,
          id: genericMessage.messageId,
          messageTimer: 0,
          state: PayloadBundleState.INCOMING,
          timestamp: new Date(event.time).getTime(),
          type: genericMessage.content,
        };
      }
      case GenericMessageType.DELETED: {
        const content: DeletedContent = {
          originalMessageId: genericMessage.deleted.messageId,
        };
        return {
          content,
          conversation: event.conversation,
          from: event.from,
          id: genericMessage.messageId,
          messageTimer: 0,
          state: PayloadBundleState.INCOMING,
          timestamp: new Date(event.time).getTime(),
          type: genericMessage.content,
        };
      }
      case GenericMessageType.HIDDEN: {
        const content: HiddenContent = {
          conversationId: genericMessage.hidden.conversationId,
          originalMessageId: genericMessage.hidden.messageId,
        };
        return {
          content,
          conversation: event.from,
          from: event.from,
          id: genericMessage.messageId,
          messageTimer: 0,
          state: PayloadBundleState.INCOMING,
          timestamp: new Date(event.time).getTime(),
          type: genericMessage.content,
        };
      }
      case GenericMessageType.ASSET: {
        const content: AssetContent = {
          abortReason: genericMessage.asset.not_uploaded,
          original: genericMessage.asset.original,
          preview: genericMessage.asset.preview,
          uploaded: genericMessage.asset.uploaded,
        };
        return {
          content,
          conversation: event.from,
          from: event.from,
          id: genericMessage.messageId,
          messageTimer: 0,
          state: PayloadBundleState.INCOMING,
          timestamp: new Date(event.time).getTime(),
          type: genericMessage.content,
        };
      }
      default: {
        this.logger.warn(`Unhandled event type "${genericMessage.content}": ${JSON.stringify(genericMessage)}`);
        return {
          conversation: event.conversation,
          from: event.from,
          id: genericMessage.messageId,
          messageTimer: 0,
          state: PayloadBundleState.INCOMING,
          timestamp: new Date(event.time).getTime(),
          type: genericMessage.content,
        };
      }
    }
  }

  private async handleEvent(
    event: IncomingEvent
  ): Promise<PayloadBundleIncoming | ConversationEvent | UserEvent | void> {
    this.logger.info('handleEvent', event.type);

    const ENCRYPTED_EVENTS = [CONVERSATION_EVENT.OTR_MESSAGE_ADD];
    const META_EVENTS = [CONVERSATION_EVENT.MESSAGE_TIMER_UPDATE, CONVERSATION_EVENT.TYPING];
    const USER_EVENTS = [USER_EVENT.CONNECTION];

    if (ENCRYPTED_EVENTS.includes(event.type as CONVERSATION_EVENT)) {
      return this.decodeGenericMessage(event as ConversationOtrMessageAddEvent);
    } else if (META_EVENTS.includes(event.type as CONVERSATION_EVENT)) {
      const {conversation, from} = event as ConversationEvent;
      const metaEvent = {...event, from, conversation};
      return metaEvent as ConversationEvent;
    } else if (USER_EVENTS.includes(event.type as USER_EVENT)) {
      return event as UserEvent;
    }
  }

  private async handleNotification(notification: IncomingNotification): Promise<void> {
    this.logger.info('handleNotification');
    for (const event of notification.payload) {
      const data = await this.handleEvent(event);
      if (data) {
        switch (data.type) {
          case GenericMessageType.ASSET:
            this.emit(Account.INCOMING.ASSET, data);
            break;
          case GenericMessageType.CLIENT_ACTION:
            this.emit(Account.INCOMING.CLIENT_ACTION, data);
            break;
          case GenericMessageType.CONFIRMATION:
            this.emit(Account.INCOMING.CONFIRMATION, data);
            break;
          case GenericMessageType.DELETED:
            this.emit(Account.INCOMING.DELETED, data);
            break;
          case GenericMessageType.HIDDEN:
            this.emit(Account.INCOMING.HIDDEN, data);
            break;
          case GenericMessageType.KNOCK:
            this.emit(Account.INCOMING.PING, data);
            break;
          case GenericMessageType.TEXT:
            this.emit(Account.INCOMING.TEXT_MESSAGE, data);
            break;
          case CONVERSATION_EVENT.MESSAGE_TIMER_UPDATE: {
            const {
              data: {message_timer},
              conversation,
            } = data as ConversationMessageTimerUpdateEvent;
            const expireAfterMillis = Number(message_timer);
            this.logger.info(
              `Received "${expireAfterMillis}" ms timer on conversation level for conversation "${conversation}".`
            );
            this.service!.conversation.messageTimer.setConversationLevelTimer(conversation, expireAfterMillis);
            this.emit(Account.INCOMING.MESSAGE_TIMER_UPDATE, event);
            break;
          }
          case CONVERSATION_EVENT.TYPING: {
            this.emit(Account.INCOMING.TYPING, event);
            break;
          }
          case USER_EVENT.CONNECTION: {
            this.emit(Account.INCOMING.CONNECTION, event);
            break;
          }
        }
      } else {
        this.logger.info(
          `Received unsupported event "${event.type}"` + (event as ConversationEvent).conversation
            ? `in conversation "${(event as ConversationEvent).conversation}"`
            : '' + (event as ConversationEvent).from
              ? `from user "${(event as ConversationEvent).from}"`
              : '' + '.',
          event
        );
      }
    }
  }
}

export {Account};
