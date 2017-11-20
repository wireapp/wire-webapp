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
const UUID = require('pure-uuid');
import * as Proteus from 'wire-webapp-proteus';
import {
  ClientMismatch,
  IncomingNotification,
  NewOTRMessage,
  OTRRecipients,
  UserClients,
} from '@wireapp/api-client/dist/commonjs/conversation/';
import CryptographyService from './crypto/CryptographyService';
import {Context, LoginData, PreKey} from '@wireapp/api-client/dist/commonjs/auth/';
import {ConversationEvent, ConversationEventType, OTRMessageAdd} from '@wireapp/api-client/dist/commonjs/conversation/event/';
import {CRUDEngine, MemoryEngine} from '@wireapp/store-engine/dist/commonjs/engine/';
import {store} from 'wire-webapp-cryptobox';
import {NewClient, RegisteredClient} from '@wireapp/api-client/dist/commonjs/client/';
import {GenericMessageType, PayloadBundle} from './crypto/';
import {RecordNotFoundError} from '@wireapp/store-engine/dist/commonjs/engine/error/';
import {Root} from 'protobufjs';
import {UserPreKeyBundleMap} from '@wireapp/api-client/dist/commonjs/user/';
import {WebSocketClient} from '@wireapp/api-client/dist/commonjs/tcp/';
import Client = require('@wireapp/api-client');
import EventEmitter = require('events');

export default class Account extends EventEmitter {
  public static INCOMING = {
    TEXT_MESSAGE: 'Account.INCOMING.TEXT_MESSAGE',
  };
  public static STORES = {
    CLIENTS: 'clients',
  };
  public apiClient: Client;
  private client: RegisteredClient;
  public context: Context;
  private cryptographyService: CryptographyService;
  private protocolBuffers: any = {};
  private storeEngine: CRUDEngine;

  constructor(apiClient: Client = new Client({store: new MemoryEngine('temporary')})) {
    super();
    this.apiClient = apiClient;
    this.storeEngine = apiClient.config.store;
    this.cryptographyService = new CryptographyService(this.storeEngine);
  }

  private decodeEvent(event: ConversationEvent): Promise<string> {
    return new Promise(resolve => {
      switch (event.type) {
        case ConversationEventType.OTR_MESSAGE_ADD:
          const otrMessage: OTRMessageAdd = event as OTRMessageAdd;
          const sessionId: string = this.cryptographyService.constructSessionId(
            otrMessage.from,
            otrMessage.data.sender
          );
          const ciphertext: string = otrMessage.data.text;
          this.cryptographyService.decrypt(sessionId, ciphertext).then((decryptedMessage: Uint8Array) => {
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

  // TODO: The correct functionality of this function is heavily based on the case that it always runs into the catch block
  public getPreKeyBundles(conversationId: string): Promise<ClientMismatch | UserPreKeyBundleMap> {
    return this.apiClient.conversation.api.postOTRMessage(this.context.clientID, conversationId).catch(error => {
      if (error.response && error.response.status === 412) {
        const recipients: UserClients = error.response.data.missing;
        return this.apiClient.user.api.postMultiPreKeyBundles(recipients);
      }
      throw error;
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

  private initClient(context: Context, loginData: LoginData): Promise<RegisteredClient> {
    this.context = context;
    return this.loadExistingClient().catch(error => {
      if (error instanceof RecordNotFoundError) {
        return this.registerNewClient(loginData);
      }
      throw error;
    });
  }

  public listen(callback: Function, loginData: LoginData): Promise<WebSocketClient> {
    return Promise.resolve()
      .then(() => {
        if (!this.context) {
          return this.login(loginData);
        }
        return undefined;
      })
      .then(() => {
        if (callback) {
          this.apiClient.transport.ws.on(WebSocketClient.TOPIC.ON_MESSAGE, (notification: IncomingNotification) =>
            callback(notification)
          );
        } else {
          this.apiClient.transport.ws.on(WebSocketClient.TOPIC.ON_MESSAGE, this.handleNotification.bind(this));
        }
        return this.apiClient.connect();
      });
  }

  private loadExistingClient(): Promise<RegisteredClient> {
    return this.cryptographyService.cryptobox.load().then((initialPreKeys: Array<Proteus.keys.PreKey>) => {
      return this.storeEngine.read<RegisteredClient>(
        Account.STORES.CLIENTS,
        store.CryptoboxCRUDStore.KEYS.LOCAL_IDENTITY
      );
    });
  }

  public login(loginData: LoginData, initClient: boolean = true): Promise<Context> {
    loginData = this.sanitizeLoginData(loginData);
    return this.apiClient
      .init()
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
        return loadProtocolBuffers();
      })
      .then((root: Root) => {
        this.protocolBuffers.GenericMessage = root.lookup('GenericMessage');
        this.protocolBuffers.Text = root.lookup('Text');
        return this.context;
      });
  }

  public logout(): Promise<void> {
    return this.apiClient.logout().then(() => {
      this.client = undefined;
      this.context = undefined;
      this.cryptographyService = undefined;
    });
  }

  private registerNewClient(loginData: LoginData): Promise<RegisteredClient> {
    return this.cryptographyService.cryptobox
      .create()
      .then((initialPreKeys: Array<Proteus.keys.PreKey>) => {
        const serializedPreKeys: Array<PreKey> = initialPreKeys
          .map(preKey => {
            const preKeyJson: PreKey = this.cryptographyService.cryptobox.serialize_prekey(preKey);
            if (preKeyJson.id !== Proteus.keys.PreKey.MAX_PREKEY_ID) return preKeyJson;
            return undefined;
          })
          .filter(serializedPreKey => serializedPreKey);

        // TODO: Make the client values configurable from outside
        const newClient: NewClient = {
          class: 'desktop',
          cookie: 'webapp@1224301118@temporary@1472638149000',
          lastkey: this.cryptographyService.cryptobox.serialize_prekey(
            this.cryptographyService.cryptobox.lastResortPreKey
          ),
          password: loginData.password.toString(),
          prekeys: serializedPreKeys,
          sigkeys: {
            enckey: 'Wuec0oJi9/q9VsgOil9Ds4uhhYwBT+CAUrvi/S9vcz0=',
            mackey: 'Wuec0oJi9/q9VsgOil9Ds4uhhYwBT+CAUrvi/S9vcz0=',
          },
          type: 'temporary',
        };

        return newClient;
      })
      .then((newClient: NewClient) => this.apiClient.client.api.postClient(newClient))
      .then((client: RegisteredClient) => {
        this.client = client;
        return this.storeEngine.create(Account.STORES.CLIENTS, store.CryptoboxCRUDStore.KEYS.LOCAL_IDENTITY, client);
      })
      .then(() => this.client);
  }

  private sanitizeLoginData(loginData: LoginData): LoginData {
    const removeNonPrintableCharacters = new RegExp('[^\x20-\x7E]+', 'gm');

    if (loginData.email) {
      loginData.email = loginData.email.replace(removeNonPrintableCharacters, '');
    }

    if (loginData.handle) {
      loginData.handle = loginData.handle.replace(removeNonPrintableCharacters, '');
    }

    if (loginData.password) {
      loginData.password = loginData.password.toString().replace(removeNonPrintableCharacters, '');
    }

    return {
      ...loginData,
      persist: !(this.storeEngine instanceof MemoryEngine),
    };
  }

  public sendMessage(conversationId: string, recipients: OTRRecipients): Promise<ClientMismatch> {
    const message: NewOTRMessage = {
      recipients,
      sender: this.context.clientID,
    };
    return this.apiClient.conversation.api.postOTRMessage(this.context.clientID, conversationId, message);
  }

  public sendTextMessage(conversationId: string, message: string): Promise<ClientMismatch> {
    const customTextMessage = this.protocolBuffers.GenericMessage.create({
      messageId: new UUID(4).format(),
      text: this.protocolBuffers.Text.create({content: message}),
    });

    return this.getPreKeyBundles(conversationId)
      .then((preKeyBundles: UserPreKeyBundleMap) => {
        const typedArray = this.protocolBuffers.GenericMessage.encode(customTextMessage).finish();
        return this.cryptographyService.encrypt(typedArray, preKeyBundles);
      })
      .then(payload => this.sendMessage(conversationId, payload));
  }
}
