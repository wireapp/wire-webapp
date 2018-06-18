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

const logdown = require('logdown');
import Client = require('@wireapp/api-client');
import {Context, LoginData} from '@wireapp/api-client/dist/commonjs/auth/index';
import {ClientType, RegisteredClient} from '@wireapp/api-client/dist/commonjs/client/index';
import {IncomingNotification} from '@wireapp/api-client/dist/commonjs/conversation/index';
import {
  CONVERSATION_EVENT,
  ConversationEvent,
  ConversationOtrMessageAddEvent,
} from '@wireapp/api-client/dist/commonjs/event/index';
import {StatusCode} from '@wireapp/api-client/dist/commonjs/http/index';
import {WebSocketClient} from '@wireapp/api-client/dist/commonjs/tcp/index';
import * as cryptobox from '@wireapp/cryptobox';
import {RecordNotFoundError} from '@wireapp/store-engine/dist/commonjs/engine/error/index';
import EventEmitter = require('events');
import {Root} from 'protobufjs';
import {LoginSanitizer} from './auth/root';
import {ClientInfo, ClientService} from './client/root';
import {
  AssetService,
  ConversationService,
  DecodedMessage,
  GenericMessageType,
  PayloadBundleIncoming,
  PayloadBundleState,
} from './conversation/root';
import {CryptographyService} from './cryptography/root';
import {NotificationService} from './notification/root';
import proto from './Protobuf';
import {SelfService} from './self/root';

class Account extends EventEmitter {
  private readonly logger: any = logdown('@wireapp/core/Account', {
    logger: console,
    markdown: false,
  });

  public static readonly INCOMING = {
    ASSET: 'Account.INCOMING.ASSET',
    CLIENT_ACTION: 'Account.CLIENT_ACTION',
    CONFIRMATION: 'Account.INCOMING.CONFIRMATION',
    PING: 'Account.INCOMING.PING',
    TEXT_MESSAGE: 'Account.INCOMING.TEXT_MESSAGE',
    TYPING: 'Account.INCOMING.TYPING',
  };
  private readonly apiClient: Client;
  private protocolBuffers: any = {};
  public service?: {
    client: ClientService;
    conversation: ConversationService;
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
      MessageEdit: root.lookup('MessageEdit'),
      Text: root.lookup('Text'),
    };

    const cryptographyService = new CryptographyService(this.apiClient, this.apiClient.config.store);
    const clientService = new ClientService(this.apiClient, this.apiClient.config.store, cryptographyService);
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

  private async decodeGenericMessage(otrMessage: ConversationOtrMessageAddEvent): Promise<DecodedMessage> {
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

    return {
      content: genericMessage.text && genericMessage.text.content,
      id: genericMessage.messageId,
      type: genericMessage.content,
    };
  }

  private async handleEvent(event: ConversationEvent): Promise<PayloadBundleIncoming | ConversationEvent | void> {
    this.logger.info('handleEvent');
    const {conversation, from} = event;

    switch (event.type) {
      case CONVERSATION_EVENT.OTR_MESSAGE_ADD: {
        const otrMessage = event as ConversationOtrMessageAddEvent;
        const decodedMessage = await this.decodeGenericMessage(otrMessage);
        return {...decodedMessage, from, conversation, state: PayloadBundleState.INCOMING};
      }
      case CONVERSATION_EVENT.TYPING: {
        return {...event, from, conversation};
      }
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
          case GenericMessageType.KNOCK:
            this.emit(Account.INCOMING.PING, data);
            break;
          case GenericMessageType.TEXT:
            this.emit(Account.INCOMING.TEXT_MESSAGE, data);
            break;
          case CONVERSATION_EVENT.TYPING: {
            this.emit(Account.INCOMING.TYPING, event);
            break;
          }
        }
      }
    }
  }
}

export {Account};
