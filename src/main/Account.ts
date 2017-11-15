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
  NewOTRMessage,
  OTRRecipients,
  UserClients,
} from '@wireapp/api-client/dist/commonjs/conversation/';
import {Context, LoginData, PreKey} from '@wireapp/api-client/dist/commonjs/auth/';
import {ConversationEvent, OTRMessageAdd} from '@wireapp/api-client/dist/commonjs/conversation/event/';
import {CRUDEngine, MemoryEngine} from '@wireapp/store-engine/dist/commonjs/engine/';
import {Cryptobox, store} from 'wire-webapp-cryptobox';
import {Decoder, Encoder} from 'bazinga64';
import {IncomingNotification} from '@wireapp/api-client/dist/commonjs/conversation/';
import {NewClient, RegisteredClient} from '@wireapp/api-client/dist/commonjs/client/';
import {PayloadBundle, SessionPayloadBundle} from './payload';
import {RecordNotFoundError} from '@wireapp/store-engine/dist/commonjs/engine/error/';
import {Root} from 'protobufjs';
import {UserPreKeyBundleMap} from '@wireapp/api-client/dist/commonjs/user/';
import {WebSocketClient} from '@wireapp/api-client/dist/commonjs/tcp/';
import Client = require('@wireapp/api-client');
import EventEmitter = require('events');

export default class Account extends EventEmitter {
  private apiClient: Client;
  private client: RegisteredClient;
  public context: Context;
  private cryptobox: Cryptobox;
  private loginData: LoginData;
  private protocolBuffers: any = {};
  private storeEngine: CRUDEngine;

  static get STORES() {
    return {
      CLIENTS: 'clients',
    };
  }

  public static INCOMING = {
    TEXT_MESSAGE: 'Account.INCOMING.TEXT_MESSAGE',
  };

  constructor(loginData: LoginData, storeEngine: CRUDEngine = new MemoryEngine('temporary')) {
    super();
    this.loginData = {
      persist: !(storeEngine instanceof MemoryEngine),
      ...loginData,
    };
    this.sanitizeLoginData();
    this.storeEngine = storeEngine;
    this.apiClient = new Client({store: storeEngine});
    this.cryptobox = new Cryptobox(new store.CryptoboxCRUDStore(storeEngine));
  }

  private loadExistingClient(): Promise<RegisteredClient> {
    return this.cryptobox.load().then((initialPreKeys: Array<Proteus.keys.PreKey>) => {
      return this.storeEngine.read<RegisteredClient>(
        Account.STORES.CLIENTS,
        store.CryptoboxCRUDStore.KEYS.LOCAL_IDENTITY
      );
    });
  }

  private sanitizeLoginData(): void {
    const removeNonPrintableCharacters = new RegExp('[^\x20-\x7E]+', 'gm');

    if (this.loginData.email) {
      this.loginData.email = this.loginData.email.replace(removeNonPrintableCharacters, '');
    }

    if (this.loginData.password) {
      this.loginData.password = this.loginData.password.toString().replace(removeNonPrintableCharacters, '');
    }

    if (this.loginData.handle) {
      this.loginData.handle = this.loginData.handle.replace(removeNonPrintableCharacters, '');
    }
  }

  private registerNewClient(): Promise<RegisteredClient> {
    return this.cryptobox
      .create()
      .then((initialPreKeys: Array<Proteus.keys.PreKey>) => {
        const serializedPreKeys: Array<PreKey> = initialPreKeys
          .map(preKey => {
            const preKeyJson: PreKey = this.cryptobox.serialize_prekey(preKey);
            if (preKeyJson.id !== 65535) return preKeyJson;
            return undefined;
          })
          .filter(serializedPreKey => serializedPreKey);

        // TODO: Make the client values configurable from outside
        const newClient: NewClient = {
          class: 'desktop',
          cookie: 'webapp@1224301118@temporary@1472638149000',
          lastkey: this.cryptobox.serialize_prekey(this.cryptobox.lastResortPreKey),
          password: this.loginData.password.toString(),
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

  private initClient(context: Context): Promise<RegisteredClient> {
    this.context = context;
    return this.loadExistingClient().catch(error => {
      if (error instanceof RecordNotFoundError) {
        return this.registerNewClient();
      }
      throw error;
    });
  }

  public login(): Promise<Context> {
    return this.apiClient
      .init()
      .catch((error: Error) => this.apiClient.login(this.loginData))
      .then((context: Context) => this.initClient(context))
      .then((client: RegisteredClient) => {
        this.apiClient.context.clientID = client.id;
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
      this.cryptobox = undefined;
      this.loginData = undefined;
    });
  }

  private constructSessionId(userId: string, clientId: string): string {
    return `${userId}@${clientId}`;
  }

  private dismantleSessionId(sessionId: string): Array<string> {
    return sessionId.split('@');
  }

  private encryptPayloadForSession(
    sessionId: string,
    typedArray: Uint8Array,
    decodedPreKeyBundle: Uint8Array
  ): Promise<SessionPayloadBundle> {
    return this.cryptobox
      .encrypt(sessionId, typedArray, decodedPreKeyBundle.buffer)
      .then(encryptedPayload => Encoder.toBase64(encryptedPayload).asString)
      .catch(error => '💣')
      .then(encryptedPayload => ({sessionId, encryptedPayload}));
  }

  public encrypt(typedArray: Uint8Array, preKeyBundles: UserPreKeyBundleMap): Promise<OTRRecipients> {
    const recipients: OTRRecipients = {};
    const encryptions: Array<Promise<SessionPayloadBundle>> = [];

    for (const userId in preKeyBundles) {
      recipients[userId] = {};
      for (const clientId in preKeyBundles[userId]) {
        const preKeyPayload = preKeyBundles[userId][clientId];
        const preKey = preKeyPayload.key;

        const sessionId: string = this.constructSessionId(userId, clientId);
        const decodedPreKeyBundle: Uint8Array = Decoder.fromBase64(preKey).asBytes;

        encryptions.push(this.encryptPayloadForSession(sessionId, typedArray, decodedPreKeyBundle));
      }
    }

    return Promise.all(encryptions).then((payloads: Array<SessionPayloadBundle>) => {
      const recipients: OTRRecipients = {};

      if (payloads) {
        payloads.forEach((payload: SessionPayloadBundle) => {
          const sessionId: string = payload.sessionId;
          const encrypted: string = payload.encryptedPayload;
          const [userId, clientId] = this.dismantleSessionId(sessionId);
          recipients[userId] = recipients[userId] || {};
          recipients[userId][clientId] = encrypted;
        });
      }

      return recipients;
    });
  }

  public listen(callback: Function): Promise<WebSocketClient> {
    return Promise.resolve()
      .then(() => {
        if (!this.context) {
          return this.login();
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

  private handleNotification(notification: IncomingNotification): void {
    for (const event of notification.payload) {
      this.handleEvent(event).then((payload: PayloadBundle) => {
        if (payload.content) {
          this.emit(Account.INCOMING.TEXT_MESSAGE, payload);
        }
      });
    }
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

  private decodeEvent(event: ConversationEvent): Promise<string> {
    return new Promise(resolve => {
      switch (event.type) {
        case 'conversation.otr-message-add':
          const otrMessage: OTRMessageAdd = event as OTRMessageAdd;
          this.decrypt(otrMessage).then((decryptedMessage: Uint8Array) => {
            const genericMessage = this.protocolBuffers.GenericMessage.decode(decryptedMessage);
            switch (genericMessage.content) {
              case 'text':
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

  public sendTextMessage(conversationId: string, message: string): Promise<ClientMismatch> {
    const customTextMessage = this.protocolBuffers.GenericMessage.create({
      messageId: new UUID(4).format(),
      text: this.protocolBuffers.Text.create({content: message}),
    });

    return this.getPreKeyBundles(conversationId)
      .then((preKeyBundles: UserPreKeyBundleMap) => {
        const typedArray = this.protocolBuffers.GenericMessage.encode(customTextMessage).finish();
        return this.encrypt(typedArray, preKeyBundles);
      })
      .then(payload => this.sendMessage(conversationId, payload));
  }

  public sendMessage(conversationId: string, recipients: OTRRecipients): Promise<ClientMismatch> {
    const message: NewOTRMessage = {
      recipients,
      sender: this.context.clientID,
    };
    return this.apiClient.conversation.api.postOTRMessage(this.context.clientID, conversationId, message);
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

  public decrypt(event: OTRMessageAdd): Promise<Uint8Array> {
    const ciphertext: string = event.data.text;
    const sessionId: string = this.constructSessionId(event.from, event.data.sender);
    const messageBytes: Uint8Array = Decoder.fromBase64(ciphertext).asBytes;
    return this.cryptobox.decrypt(sessionId, messageBytes.buffer);
  }
}
