//
// Wire
// Copyright (C) 2017 Wire Swiss GmbH
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see http://www.gnu.org/licenses/.
//

const loadProtocolBuffers = require('@wireapp/protocol-messaging');
import {IncomingNotification} from '@wireapp/api-client/dist/commonjs/conversation/';
import {CryptographyService, GenericMessageType, PayloadBundle} from './crypto/';
import {Context, LoginData, PreKey} from '@wireapp/api-client/dist/commonjs/auth/';
import {
  ConversationEvent,
  ConversationEventType,
  OTRMessageAdd,
} from '@wireapp/api-client/dist/commonjs/conversation/event/';
import {ClientClassification, ClientType, NewClient, RegisteredClient} from '@wireapp/api-client/dist/commonjs/client/';
import {LoginSanitizer} from './auth/';
import {RecordNotFoundError} from '@wireapp/store-engine/dist/commonjs/engine/error/';
import {Root} from 'protobufjs';
import {WebSocketClient} from '@wireapp/api-client/dist/commonjs/tcp/';
import {ConversationService} from './conversation/';
import Client = require('@wireapp/api-client');
import EventEmitter = require('events');

export default class Account extends EventEmitter {
  public static INCOMING = {
    TEXT_MESSAGE: 'Account.INCOMING.TEXT_MESSAGE',
  };
  private apiClient: Client;
  private client: RegisteredClient;
  public context: Context;
  private protocolBuffers: any = {};
  public service: {conversation: ConversationService; crypto: CryptographyService};

  constructor(apiClient: Client = new Client()) {
    super();
    this.apiClient = apiClient;
  }

  private decodeEvent(event: ConversationEvent): Promise<string> {
    return new Promise(resolve => {
      switch (event.type) {
        case ConversationEventType.OTR_MESSAGE_ADD:
          const otrMessage: OTRMessageAdd = event as OTRMessageAdd;
          const sessionId: string = this.service.crypto.constructSessionId(otrMessage.from, otrMessage.data.sender);
          const ciphertext: string = otrMessage.data.text;
          this.service.crypto.decrypt(sessionId, ciphertext).then((decryptedMessage: Uint8Array) => {
            const genericMessage = this.protocolBuffers.GenericMessage.decode(decryptedMessage);
            switch (genericMessage.content) {
              case GenericMessageType.TEXT:
                resolve(genericMessage.text.content);
                break;
              default:
                resolve(undefined);
            }
          });
          break;
      }
    });
  }

  private handleEvent(event: ConversationEvent): Promise<PayloadBundle> {
    const {conversation, from} = event;
    return this.decodeEvent(event).then((content: string) => {
      return {
        content,
        conversation,
        from,
      };
    });
  }

  private handleNotification(notification: IncomingNotification): void {
    for (const event of notification.payload) {
      this.handleEvent(event).then((data: PayloadBundle) => {
        if (data.content) {
          this.emit(Account.INCOMING.TEXT_MESSAGE, data);
        }
      });
    }
  }

  private init(): Promise<void> {
    return loadProtocolBuffers()
      .then((root: Root) => {
        this.protocolBuffers.GenericMessage = root.lookup('GenericMessage');
        this.protocolBuffers.Text = root.lookup('Text');
      })
      .then(() => {
        const crypto: CryptographyService = new CryptographyService(this.apiClient.config.store);
        const conversation: ConversationService = new ConversationService(this.apiClient, this.protocolBuffers, crypto);
        this.service = {
          conversation,
          crypto,
        };
      });
  }

  private initClient(context: Context, loginData: LoginData): Promise<RegisteredClient> {
    this.context = context;
    this.service.conversation.setClientID(<string>this.context.clientID);
    return this.service.crypto.loadClient().catch(error => {
      if (error instanceof RecordNotFoundError) {
        return this.registerClient(loginData);
      }
      throw error;
    });
  }

  public listen(loginData: LoginData, notificationHandler?: Function): Promise<WebSocketClient> {
    return Promise.resolve()
      .then(() => (this.context ? this.context : this.login(loginData, true)))
      .then(() => {
        if (notificationHandler) {
          this.apiClient.transport.ws.on(WebSocketClient.TOPIC.ON_MESSAGE, (notification: IncomingNotification) =>
            notificationHandler(notification)
          );
        } else {
          this.apiClient.transport.ws.on(WebSocketClient.TOPIC.ON_MESSAGE, this.handleNotification.bind(this));
        }
        return this.apiClient.connect();
      });
  }

  public login(loginData: LoginData, initClient: boolean = true): Promise<Context> {
    return this.init()
      .then(() => {
        LoginSanitizer.removeNonPrintableCharacters(loginData);
        return this.apiClient.init();
      })
      .catch((error: Error) => this.apiClient.login(loginData))
      .then((context: Context) => {
        if (initClient) {
          return this.initClient(context, loginData).then(client => {
            this.apiClient.context.clientID = client.id;
          });
        }
        return undefined;
      })
      .then(() => {
        this.context = this.apiClient.context;
        this.service.conversation.setClientID(<string>this.context.clientID);
        return this.context;
      });
  }

  private resetContext(): void {
    delete this.client;
    delete this.context;
    delete this.service;
  }

  public logout(): Promise<void> {
    return this.apiClient.logout().then(() => this.resetContext());
  }

  private registerClient(
    loginData: LoginData,
    clientClassification: ClientClassification = ClientClassification.DESKTOP,
    cookieLabel: string = 'default'
  ): Promise<RegisteredClient> {
    return this.service.crypto
      .createCryptobox()
      .then((serializedPreKeys: Array<PreKey>) => {
        if (this.service.crypto.cryptobox.lastResortPreKey) {
          const newClient: NewClient = {
            class: clientClassification,
            cookie: cookieLabel,
            lastkey: this.service.crypto.cryptobox.serialize_prekey(this.service.crypto.cryptobox.lastResortPreKey),
            password: String(loginData.password),
            prekeys: serializedPreKeys,
            sigkeys: {
              enckey: 'Wuec0oJi9/q9VsgOil9Ds4uhhYwBT+CAUrvi/S9vcz0=',
              mackey: 'Wuec0oJi9/q9VsgOil9Ds4uhhYwBT+CAUrvi/S9vcz0=',
            },
            type: loginData.persist ? ClientType.PERMANENT : ClientType.TEMPORARY,
          };

          return newClient;
        } else {
          throw new Error('Cryptobox got initialized without a last resort PreKey.');
        }
      })
      .then((newClient: NewClient) => this.apiClient.client.api.postClient(newClient))
      .then((client: RegisteredClient) => {
        this.client = client;
        return this.service.crypto.saveClient(client);
      })
      .then(() => this.client);
  }
}
