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
const Logdown = require('logdown');
import {IncomingNotification} from '@wireapp/api-client/dist/commonjs/conversation/index';
import * as cryptobox from '@wireapp/cryptobox';
import {CryptographyService, GenericMessageType, PayloadBundle} from './cryptography/root';
import {ClientService} from './client/root';
import {NotificationService} from './notification/root';
import {Context, LoginData, PreKey} from '@wireapp/api-client/dist/commonjs/auth/index';
import {
  ConversationEvent,
  ConversationEventType,
  OTRMessageAdd,
} from '@wireapp/api-client/dist/commonjs/conversation/event/index';
import {
  ClientClassification,
  ClientType,
  Location,
  NewClient,
  RegisteredClient,
} from '@wireapp/api-client/dist/commonjs/client/index';
import {LoginSanitizer, ClientInfo} from './auth/root';
import {Root} from 'protobufjs';
import {WebSocketClient} from '@wireapp/api-client/dist/commonjs/tcp/index';
import {ConversationService} from './conversation/root';
import Client = require('@wireapp/api-client');
import EventEmitter = require('events');
import {StatusCode} from '@wireapp/api-client/dist/commonjs/http/index';
import {RecordNotFoundError} from '@wireapp/store-engine/dist/commonjs/engine/error/index';

class Account extends EventEmitter {
  public static INCOMING = {
    TEXT_MESSAGE: 'Account.INCOMING.TEXT_MESSAGE',
  };
  private apiClient: Client;
  public context?: Context;
  private protocolBuffers: any = {};
  public service?: {
    client: ClientService;
    conversation: ConversationService;
    cryptography: CryptographyService;
    notification: NotificationService;
  };
  private logger: any = Logdown('@wireapp/core/Account', {
    logger: console,
    markdown: false,
  });

  constructor(apiClient: Client = new Client()) {
    super();
    this.apiClient = apiClient;
  }

  private init(): Promise<void> {
    const proto = {
      options: {java_package: 'com.waz.model'},
      nested: {
        GenericMessage: {
          oneofs: {
            content: {
              oneof: [
                'text',
                'image',
                'knock',
                'lastRead',
                'cleared',
                'external',
                'clientAction',
                'calling',
                'asset',
                'hidden',
                'location',
                'deleted',
                'edited',
                'confirmation',
                'reaction',
                'ephemeral',
                'availability',
              ],
            },
          },
          fields: {
            messageId: {rule: 'required', type: 'string', id: 1},
            text: {type: 'Text', id: 2},
            image: {type: 'ImageAsset', id: 3},
            knock: {type: 'Knock', id: 4},
            lastRead: {type: 'LastRead', id: 6},
            cleared: {type: 'Cleared', id: 7},
            external: {type: 'External', id: 8},
            clientAction: {type: 'ClientAction', id: 9},
            calling: {type: 'Calling', id: 10},
            asset: {type: 'Asset', id: 11},
            hidden: {type: 'MessageHide', id: 12},
            location: {type: 'Location', id: 13},
            deleted: {type: 'MessageDelete', id: 14},
            edited: {type: 'MessageEdit', id: 15},
            confirmation: {type: 'Confirmation', id: 16},
            reaction: {type: 'Reaction', id: 17},
            ephemeral: {type: 'Ephemeral', id: 18},
            availability: {type: 'Availability', id: 19},
          },
        },
        Availability: {
          fields: {type: {rule: 'required', type: 'Type', id: 1}},
          nested: {Type: {values: {NONE: 0, AVAILABLE: 1, AWAY: 2, BUSY: 3}}},
        },
        Ephemeral: {
          oneofs: {content: {oneof: ['text', 'image', 'knock', 'asset', 'location']}},
          fields: {
            expireAfterMillis: {rule: 'required', type: 'int64', id: 1},
            text: {type: 'Text', id: 2},
            image: {type: 'ImageAsset', id: 3},
            knock: {type: 'Knock', id: 4},
            asset: {type: 'Asset', id: 5},
            location: {type: 'Location', id: 6},
          },
        },
        Text: {
          fields: {
            content: {rule: 'required', type: 'string', id: 1},
            mention: {rule: 'repeated', type: 'Mention', id: 2, options: {packed: false}},
            linkPreview: {rule: 'repeated', type: 'LinkPreview', id: 3, options: {packed: false}},
          },
        },
        Knock: {fields: {hotKnock: {rule: 'required', type: 'bool', id: 1, options: {default: false}}}},
        LinkPreview: {
          oneofs: {preview: {oneof: ['article']}, metaData: {oneof: ['tweet']}},
          fields: {
            url: {rule: 'required', type: 'string', id: 1},
            urlOffset: {rule: 'required', type: 'int32', id: 2},
            article: {type: 'Article', id: 3},
            permanentUrl: {type: 'string', id: 5},
            title: {type: 'string', id: 6},
            summary: {type: 'string', id: 7},
            image: {type: 'Asset', id: 8},
            tweet: {type: 'Tweet', id: 9},
          },
        },
        Tweet: {fields: {author: {type: 'string', id: 1}, username: {type: 'string', id: 2}}},
        Article: {
          fields: {
            permanentUrl: {rule: 'required', type: 'string', id: 1},
            title: {type: 'string', id: 2},
            summary: {type: 'string', id: 3},
            image: {type: 'Asset', id: 4},
          },
        },
        Mention: {
          fields: {
            userId: {rule: 'required', type: 'string', id: 1},
            userName: {rule: 'required', type: 'string', id: 2},
          },
        },
        LastRead: {
          fields: {
            conversationId: {rule: 'required', type: 'string', id: 1},
            lastReadTimestamp: {rule: 'required', type: 'int64', id: 2},
          },
        },
        Cleared: {
          fields: {
            conversationId: {rule: 'required', type: 'string', id: 1},
            clearedTimestamp: {rule: 'required', type: 'int64', id: 2},
          },
        },
        MessageHide: {
          fields: {
            conversationId: {rule: 'required', type: 'string', id: 1},
            messageId: {rule: 'required', type: 'string', id: 2},
          },
        },
        MessageDelete: {fields: {messageId: {rule: 'required', type: 'string', id: 1}}},
        MessageEdit: {
          oneofs: {content: {oneof: ['text']}},
          fields: {replacingMessageId: {rule: 'required', type: 'string', id: 1}, text: {type: 'Text', id: 2}},
        },
        Confirmation: {
          fields: {
            type: {rule: 'required', type: 'Type', id: 2},
            firstMessageId: {rule: 'required', type: 'string', id: 1},
            moreMessageIds: {rule: 'repeated', type: 'string', id: 3},
          },
          nested: {Type: {values: {DELIVERED: 0, READ: 1}}},
        },
        Location: {
          fields: {
            longitude: {rule: 'required', type: 'float', id: 1},
            latitude: {rule: 'required', type: 'float', id: 2},
            name: {type: 'string', id: 3},
            zoom: {type: 'int32', id: 4},
          },
        },
        ImageAsset: {
          fields: {
            tag: {rule: 'required', type: 'string', id: 1},
            width: {rule: 'required', type: 'int32', id: 2},
            height: {rule: 'required', type: 'int32', id: 3},
            originalWidth: {rule: 'required', type: 'int32', id: 4},
            originalHeight: {rule: 'required', type: 'int32', id: 5},
            mimeType: {rule: 'required', type: 'string', id: 6},
            size: {rule: 'required', type: 'int32', id: 7},
            otrKey: {type: 'bytes', id: 8},
            macKey: {type: 'bytes', id: 9},
            mac: {type: 'bytes', id: 10},
            sha256: {type: 'bytes', id: 11},
          },
        },
        Asset: {
          oneofs: {status: {oneof: ['notUploaded', 'uploaded']}},
          fields: {
            original: {type: 'Original', id: 1},
            notUploaded: {type: 'NotUploaded', id: 3},
            uploaded: {type: 'RemoteData', id: 4},
            preview: {type: 'Preview', id: 5},
          },
          nested: {
            Original: {
              oneofs: {metaData: {oneof: ['image', 'video', 'audio']}},
              fields: {
                mimeType: {rule: 'required', type: 'string', id: 1},
                size: {rule: 'required', type: 'uint64', id: 2},
                name: {type: 'string', id: 3},
                image: {type: 'ImageMetaData', id: 4},
                video: {type: 'VideoMetaData', id: 5},
                audio: {type: 'AudioMetaData', id: 6},
                source: {type: 'string', id: 7},
                caption: {type: 'string', id: 8},
              },
            },
            Preview: {
              oneofs: {metaData: {oneof: ['image']}},
              fields: {
                mimeType: {rule: 'required', type: 'string', id: 1},
                size: {rule: 'required', type: 'uint64', id: 2},
                remote: {type: 'RemoteData', id: 3},
                image: {type: 'ImageMetaData', id: 4},
              },
            },
            ImageMetaData: {
              fields: {
                width: {rule: 'required', type: 'int32', id: 1},
                height: {rule: 'required', type: 'int32', id: 2},
                tag: {type: 'string', id: 3},
              },
            },
            VideoMetaData: {
              fields: {
                width: {type: 'int32', id: 1},
                height: {type: 'int32', id: 2},
                durationInMillis: {type: 'uint64', id: 3},
              },
            },
            AudioMetaData: {
              fields: {durationInMillis: {type: 'uint64', id: 1}, normalizedLoudness: {type: 'bytes', id: 3}},
            },
            NotUploaded: {values: {CANCELLED: 0, FAILED: 1}},
            RemoteData: {
              fields: {
                otrKey: {rule: 'required', type: 'bytes', id: 1},
                sha256: {rule: 'required', type: 'bytes', id: 2},
                assetId: {type: 'string', id: 3},
                assetToken: {type: 'string', id: 5},
                encryption: {type: 'EncryptionAlgorithm', id: 6},
              },
            },
          },
        },
        External: {
          fields: {
            otrKey: {rule: 'required', type: 'bytes', id: 1},
            sha256: {type: 'bytes', id: 2},
            encryption: {type: 'EncryptionAlgorithm', id: 3},
          },
        },
        Reaction: {fields: {emoji: {type: 'string', id: 1}, messageId: {rule: 'required', type: 'string', id: 2}}},
        ClientAction: {values: {RESET_SESSION: 0}},
        Calling: {fields: {content: {rule: 'required', type: 'string', id: 1}}},
        EncryptionAlgorithm: {values: {AES_CBC: 0, AES_GCM: 1}},
      },
    };
    return Promise.resolve(Root.fromJSON(proto))
      .then((root: Root) => {
        this.protocolBuffers.External = root.lookup('External');
        this.protocolBuffers.GenericMessage = root.lookup('GenericMessage');
        this.protocolBuffers.Text = root.lookup('Text');
      })
      .then(() => {
        const clientService = new ClientService(this.apiClient, this.apiClient.config.store);
        const cryptographyService = new CryptographyService(this.apiClient, this.apiClient.config.store, clientService);
        const conversationService = new ConversationService(this.apiClient, this.protocolBuffers, cryptographyService);
        const notificationService = new NotificationService(this.apiClient, this.apiClient.config.store);

        this.service = {
          client: clientService,
          conversation: conversationService,
          cryptography: cryptographyService,
          notification: notificationService,
        };
      });
  }

  public login(
    loginData: LoginData,
    initClient: boolean = true,
    clientInfo?: ClientInfo
  ): Promise<Context | undefined> {
    return this.resetContext()
      .then(() => this.init())
      .then(() => LoginSanitizer.removeNonPrintableCharacters(loginData))
      .then(() => this.apiClient.login(loginData))
      .then((context: Context) => {
        return initClient
          ? this.initClient(loginData, clientInfo).then(() => this.apiClient.context)
          : this.apiClient.context;
      });
  }

  private initClient(loginData: LoginData, clientInfo?: ClientInfo): Promise<RegisteredClient> {
    if (!this.service) {
      throw new Error('Services are not set.');
    }
    let loadedClient: RegisteredClient;

    return this.service.cryptography
      .loadLocalClient()
      .then(client => (loadedClient = client))
      .then(() => this.apiClient.client.api.getClient(loadedClient.id))
      .then(() => {
        this.service!.conversation.setClientID(<string>this.apiClient.context!.clientId);
        return loadedClient;
      })
      .catch(error => {
        // There was no client so we need to "create" and "register" a client
        const notFoundInDatabase =
          error instanceof cryptobox.error.CryptoboxError ||
          error.constructor.name === 'CryptoboxError' ||
          error instanceof RecordNotFoundError ||
          error.constructor.name === 'RecordNotFoundError';
        const notFoundOnBackend = error.response && error.response.status === StatusCode.NOT_FOUND;

        if (notFoundInDatabase) {
          return this.registerClient(loginData, clientInfo).then((client: RegisteredClient) => {
            return this.service!.client.synchronizeClients().then(() => client);
          });
        }
        if (notFoundOnBackend) {
          const shouldDeleteWholeDatabase = loadedClient.type === ClientType.TEMPORARY;
          if (shouldDeleteWholeDatabase) {
            return this.apiClient.config.store
              .purge()
              .then(() => this.apiClient.init())
              .then(() => this.registerClient(loginData, clientInfo))
              .then((client: RegisteredClient) => this.service!.client.synchronizeClients().then(() => client));
          }
          return this.service!.cryptography.deleteCryptographyStores()
            .then(() => this.registerClient(loginData, clientInfo))
            .then((client: RegisteredClient) => this.service!.client.synchronizeClients().then(() => client));
        }
        throw error;
      })
      .then((client: RegisteredClient) => this.service!.client.synchronizeClients().then(() => client))
      .catch((error: Error) => {
        throw error;
      });
  }

  // TODO: Split functionality into "create" and "register" client
  public async registerClient(
    loginData: LoginData,
    clientInfo: ClientInfo = {
      classification: ClientClassification.DESKTOP,
      cookieLabel: 'default',
      model: `${pkg.name} v${pkg.version}`,
    }
  ): Promise<RegisteredClient> {
    if (!this.service) {
      throw new Error('Services are not set.');
    }
    if (!this.apiClient.context) {
      throw new Error('Context is not set.');
    }

    const serializedPreKeys: Array<PreKey> = await this.service.cryptography.createCryptobox();

    let newClient: NewClient;
    if (this.service.cryptography.cryptobox.lastResortPreKey) {
      newClient = {
        class: clientInfo.classification,
        cookie: clientInfo.cookieLabel,
        lastkey: this.service.cryptography.cryptobox.serialize_prekey(
          this.service.cryptography.cryptobox.lastResortPreKey
        ),
        location: clientInfo.location,
        password: String(loginData.password),
        prekeys: serializedPreKeys,
        model: clientInfo.model,
        sigkeys: {
          enckey: 'Wuec0oJi9/q9VsgOil9Ds4uhhYwBT+CAUrvi/S9vcz0=',
          mackey: 'Wuec0oJi9/q9VsgOil9Ds4uhhYwBT+CAUrvi/S9vcz0=',
        },
        type: loginData.persist ? ClientType.PERMANENT : ClientType.TEMPORARY,
      };
    } else {
      throw new Error('Cryptobox got initialized without a last resort PreKey.');
    }

    const client = await this.apiClient.client.api.postClient(newClient);
    await this.service.client.createLocalClient(client);
    await this.service.cryptography.loadLocalClient();
    this.apiClient.context!.clientId = client.id;
    this.service!.conversation.setClientID(<string>this.apiClient.context!.clientId);
    await this.service.notification.initializeNotificationStream(client.id);

    return client;
  }

  private resetContext(): Promise<void> {
    return Promise.resolve().then(() => {
      delete this.apiClient.context;
      delete this.service;
    });
  }

  public logout(): Promise<void> {
    return this.apiClient.logout().then(() => this.resetContext());
  }

  public listen(loginData: LoginData, notificationHandler?: Function): Promise<Account> {
    return Promise.resolve()
      .then(() => (this.apiClient.context ? this.apiClient.context : this.login(loginData, true)))
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

  private decodeEvent(event: ConversationEvent): Promise<string> {
    return new Promise(resolve => {
      if (!this.service) {
        throw new Error('Services are not set.');
      }

      switch (event.type) {
        case ConversationEventType.OTR_MESSAGE_ADD: {
          const otrMessage: OTRMessageAdd = event as OTRMessageAdd;
          const sessionId: string = CryptographyService.constructSessionId(otrMessage.from, otrMessage.data.sender);
          const ciphertext: string = otrMessage.data.text;
          this.service.cryptography.decrypt(sessionId, ciphertext).then((decryptedMessage: Uint8Array) => {
            const genericMessage = this.protocolBuffers.GenericMessage.decode(decryptedMessage);
            switch (genericMessage.content) {
              case GenericMessageType.TEXT: {
                resolve(genericMessage.text.content);
                break;
              }
              default:
                resolve(undefined);
            }
          });
          break;
        }
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
}

export {Account};
