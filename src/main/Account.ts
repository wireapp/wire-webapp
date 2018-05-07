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

const pkg = require('../package.json');
const logdown = require('logdown');
import {IncomingNotification} from '@wireapp/api-client/dist/commonjs/conversation/index';
import * as cryptobox from '@wireapp/cryptobox';
import {CryptographyService, PayloadBundle} from './cryptography/root';
import {ClientService, ClientInfo} from './client/root';
import {NotificationService} from './notification/root';
import {Context, LoginData, PreKey} from '@wireapp/api-client/dist/commonjs/auth/index';
import {
  ConversationEvent,
  CONVERSATION_EVENT,
  ConversationOtrMessageAddEvent,
} from '@wireapp/api-client/dist/commonjs/event/index';
import {
  ClientClassification,
  ClientType,
  Location,
  NewClient,
  RegisteredClient,
} from '@wireapp/api-client/dist/commonjs/client/index';
import {LoginSanitizer} from './auth/root';
import {Root} from 'protobufjs';
import {WebSocketClient} from '@wireapp/api-client/dist/commonjs/tcp/index';
import {AssetService, ConversationService, DecodedEvent, GenericMessageType} from './conversation/root';
import {SelfService} from './self/root';
import Client = require('@wireapp/api-client');
import EventEmitter = require('events');
import {StatusCode} from '@wireapp/api-client/dist/commonjs/http/index';
import {RecordNotFoundError} from '@wireapp/store-engine/dist/commonjs/engine/error/index';
import proto from './Protobuf';

class Account extends EventEmitter {
  private logger: any = logdown('@wireapp/core/Account', {
    logger: console,
    markdown: false,
  });

  public static readonly INCOMING = {
    ASSET: 'Account.INCOMING.ASSET',
    CONFIRMATION: 'Account.INCOMING.CONFIRMATION',
    PING: 'Account.INCOMFING.PING',
    TEXT_MESSAGE: 'Account.INCOMING.TEXT_MESSAGE',
  };
  private apiClient: Client;
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

  private async init(): Promise<void> {
    this.logger.info('init');

    const root: Root = Root.fromJSON(proto);

    this.protocolBuffers = {
      Asset: root.lookup('Asset'),
      Confirmation: root.lookup('Confirmation'),
      External: root.lookup('External'),
      GenericMessage: root.lookup('GenericMessage'),
      Knock: root.lookup('Knock'),
      Text: root.lookup('Text'),
    };

    const cryptographyService = new CryptographyService(this.apiClient, this.apiClient.config.store);
    const clientService = new ClientService(this.apiClient, this.apiClient.config.store, cryptographyService);
    const assetService = new AssetService(this.apiClient, this.protocolBuffers, cryptographyService);
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

  private initClient(
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
        let registeredClient: RegisteredClient;

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
                .then(() => this.apiClient.init(loginData.persist ? ClientType.PERMANENT : ClientType.TEMPORARY))
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

  private decodeEvent(event: ConversationEvent): Promise<DecodedEvent> {
    this.logger.info('decodeEvent');
    return new Promise(resolve => {
      if (!this.service) {
        throw new Error('Services are not set.');
      }

      switch (event.type) {
        case CONVERSATION_EVENT.OTR_MESSAGE_ADD: {
          const otrMessage: ConversationOtrMessageAddEvent = event as ConversationOtrMessageAddEvent;
          const sessionId: string = CryptographyService.constructSessionId(otrMessage.from, otrMessage.data.sender);
          const ciphertext: string = otrMessage.data.text;
          this.service.cryptography.decrypt(sessionId, ciphertext).then((decryptedMessage: Uint8Array) => {
            const genericMessage = this.protocolBuffers.GenericMessage.decode(decryptedMessage);
            resolve({
              content: genericMessage.text && genericMessage.text.content,
              id: genericMessage.messageId,
              type: genericMessage.content,
            });
          });
          break;
        }
      }
    });
  }

  private handleEvent(event: ConversationEvent): Promise<PayloadBundle> {
    this.logger.info('handleEvent');
    const {conversation, from} = event;
    return this.decodeEvent(event).then(data => Object.assign(data, {from, conversation}));
  }

  private handleNotification(notification: IncomingNotification): void {
    this.logger.info('handleNotification');
    for (const event of notification.payload) {
      this.handleEvent(event).then((data: PayloadBundle) => {
        switch (data.type) {
          case GenericMessageType.TEXT:
            this.emit(Account.INCOMING.TEXT_MESSAGE, data);
            break;
          case GenericMessageType.ASSET:
            this.emit(Account.INCOMING.ASSET, data);
            break;
          case GenericMessageType.CONFIRMATION:
            this.emit(Account.INCOMING.CONFIRMATION, data);
            break;
          case GenericMessageType.KNOCK:
            this.emit(Account.INCOMING.PING, data);
            break;
        }
      });
    }
  }
}

export {Account};
