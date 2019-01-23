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

import {Context, LoginData} from '@wireapp/api-client/dist/commonjs/auth/';
import {ClientType, RegisteredClient} from '@wireapp/api-client/dist/commonjs/client/';
import {IncomingNotification} from '@wireapp/api-client/dist/commonjs/conversation/';
import {
  CONVERSATION_EVENT,
  ConversationEvent,
  ConversationMessageTimerUpdateEvent,
  ConversationOtrMessageAddEvent,
  IncomingEvent,
  USER_EVENT,
  UserConnectionEvent,
  UserEvent,
} from '@wireapp/api-client/dist/commonjs/event/';
import {StatusCode} from '@wireapp/api-client/dist/commonjs/http/';
import {WebSocketClient} from '@wireapp/api-client/dist/commonjs/tcp/';
import * as cryptobox from '@wireapp/cryptobox';
import {GenericMessage} from '@wireapp/protocol-messaging';
import {RecordNotFoundError} from '@wireapp/store-engine/dist/commonjs/engine/error/';
import {LoginSanitizer} from './auth/';
import {BroadcastService} from './broadcast/';
import {ClientInfo, ClientService} from './client/';
import {ConnectionService} from './connection/';
import {
  AssetService,
  ConversationService,
  GenericMessageType,
  PayloadBundleIncoming,
  PayloadBundleState,
  PayloadBundleType,
} from './conversation/';
import {
  AssetContent,
  ClearedContent,
  ConfirmationContent,
  DeletedContent,
  EditedTextContent,
  HiddenContent,
  KnockContent,
  LocationContent,
  ReactionContent,
  TextContent,
} from './conversation/content/';
import {CryptographyService} from './cryptography/';
import {GiphyService} from './giphy/';
import {NotificationService} from './notification/';
import {SelfService} from './self/';
import {TeamService} from './team/';

import {APIClient} from '@wireapp/api-client';
import * as EventEmitter from 'events';
import * as logdown from 'logdown';
import {UserService} from './user/';

class Account extends EventEmitter {
  private readonly logger: logdown.Logger;

  private readonly apiClient: APIClient;
  public service?: {
    asset: AssetService;
    broadcast: BroadcastService;
    client: ClientService;
    connection: ConnectionService;
    conversation: ConversationService;
    cryptography: CryptographyService;
    giphy: GiphyService;
    notification: NotificationService;
    self: SelfService;
    team: TeamService;
    user: UserService;
  };

  constructor(apiClient: APIClient = new APIClient()) {
    super();
    this.apiClient = apiClient;
    this.logger = logdown('@wireapp/core/Account', {
      logger: console,
      markdown: false,
    });
  }

  public async init(): Promise<void> {
    const assetService = new AssetService(this.apiClient);
    const cryptographyService = new CryptographyService(this.apiClient, this.apiClient.config.store);

    const clientService = new ClientService(this.apiClient, this.apiClient.config.store, cryptographyService);
    const connectionService = new ConnectionService(this.apiClient);
    const giphyService = new GiphyService(this.apiClient);
    const conversationService = new ConversationService(this.apiClient, cryptographyService, assetService);
    const notificationService = new NotificationService(this.apiClient, this.apiClient.config.store);
    const selfService = new SelfService(this.apiClient);
    const teamService = new TeamService(this.apiClient);

    const broadcastService = new BroadcastService(this.apiClient, conversationService, cryptographyService);
    const userService = new UserService(this.apiClient, broadcastService);

    this.service = {
      asset: assetService,
      broadcast: broadcastService,
      client: clientService,
      connection: connectionService,
      conversation: conversationService,
      cryptography: cryptographyService,
      giphy: giphyService,
      notification: notificationService,
      self: selfService,
      team: teamService,
      user: userService,
    };
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
          this.logger.log('Could not find valid client in database');
          return this.registerClient(loginData, clientInfo);
        }
        if (notFoundOnBackend) {
          this.logger.log('Could not find valid client on backend');
          return this.service!.client.getLocalClient().then(client => {
            const shouldDeleteWholeDatabase = client.type === ClientType.TEMPORARY;
            if (shouldDeleteWholeDatabase) {
              this.logger.log('Last client was temporary - Deleting database');
              return this.apiClient.config.store
                .purge()
                .then(() => this.apiClient.init(loginData.clientType))
                .then(() => this.registerClient(loginData, clientInfo));
            }
            this.logger.log('Last client was permanent - Deleting cryptography stores');
            return this.service!.cryptography.deleteCryptographyStores().then(() =>
              this.registerClient(loginData, clientInfo)
            );
          });
        }
        throw error;
      });
  }

  public loadAndValidateLocalClient(): Promise<RegisteredClient> {
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
    if (!this.service) {
      throw new Error('Services are not set.');
    }
    let registeredClient: RegisteredClient;

    return this.service.client
      .register(loginData, clientInfo)
      .then((client: RegisteredClient) => (registeredClient = client))
      .then(() => {
        this.logger.log('Client is created');
        this.apiClient.context!.clientId = registeredClient.id;
        this.service!.conversation.setClientID(registeredClient.id);
        return this.service!.notification.initializeNotificationStream(registeredClient.id);
      })
      .then(() => this.service!.client.synchronizeClients())
      .then(() => ({isNewClient: true, localClient: registeredClient}));
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

  public listen(notificationHandler?: Function): Promise<Account> {
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
    if (decryptedMessage.isSuccess) {
      const genericMessage = GenericMessage.decode(decryptedMessage.value);

      if (genericMessage.content === GenericMessageType.EPHEMERAL) {
        const unwrappedMessage = this.mapGenericMessage(genericMessage.ephemeral, otrMessage);
        unwrappedMessage.id = genericMessage.messageId;
        if (genericMessage.ephemeral) {
          const expireAfterMillis = genericMessage.ephemeral.expireAfterMillis;
          unwrappedMessage.messageTimer =
            typeof expireAfterMillis === 'number' ? expireAfterMillis : expireAfterMillis.toNumber();
        }
        return unwrappedMessage;
      }
      return this.mapGenericMessage(genericMessage, otrMessage);
    }

    throw decryptedMessage.error;
  }

  private mapGenericMessage(genericMessage: any, event: ConversationOtrMessageAddEvent): PayloadBundleIncoming {
    switch (genericMessage.content) {
      case GenericMessageType.TEXT: {
        const {content: text, expectsReadConfirmation, linkPreview: linkPreviews, mentions, quote} = genericMessage[
          GenericMessageType.TEXT
        ];

        const content: TextContent = {expectsReadConfirmation, text};

        if (linkPreviews && linkPreviews.length) {
          content.linkPreviews = linkPreviews;
        }

        if (mentions && mentions.length) {
          content.mentions = mentions;
        }

        if (quote) {
          content.quote = quote;
        }

        return {
          content,
          conversation: event.conversation,
          from: event.from,
          id: genericMessage.messageId,
          messageTimer: 0,
          state: PayloadBundleState.INCOMING,
          timestamp: new Date(event.time).getTime(),
          type: PayloadBundleType.TEXT,
        };
      }
      case GenericMessageType.CONFIRMATION: {
        const {firstMessageId, moreMessageIds, type} = genericMessage[GenericMessageType.CONFIRMATION];

        const content: ConfirmationContent = {firstMessageId, moreMessageIds, type};

        return {
          content,
          conversation: event.conversation,
          from: event.from,
          id: genericMessage.messageId,
          messageTimer: 0,
          state: PayloadBundleState.INCOMING,
          timestamp: new Date(event.time).getTime(),
          type: PayloadBundleType.CONFIRMATION,
        };
      }
      case GenericMessageType.CLEARED: {
        const content: ClearedContent = genericMessage[GenericMessageType.CLEARED];

        return {
          content,
          conversation: event.conversation,
          from: event.from,
          id: genericMessage.messageId,
          messageTimer: 0,
          state: PayloadBundleState.INCOMING,
          timestamp: new Date(event.time).getTime(),
          type: PayloadBundleType.CLEARED,
        };
      }
      case GenericMessageType.DELETED: {
        const originalMessageId = genericMessage[GenericMessageType.DELETED].messageId;

        const content: DeletedContent = {originalMessageId};

        return {
          content,
          conversation: event.conversation,
          from: event.from,
          id: genericMessage.messageId,
          messageTimer: 0,
          state: PayloadBundleState.INCOMING,
          timestamp: new Date(event.time).getTime(),
          type: PayloadBundleType.MESSAGE_DELETE,
        };
      }
      case GenericMessageType.EDITED: {
        const {
          expectsReadConfirmation,
          text: {content: editedText, linkPreview: editedLinkPreviews, mentions: editedMentions, quote: editedQuote},
          replacingMessageId,
        } = genericMessage[GenericMessageType.EDITED];

        const content: EditedTextContent = {
          expectsReadConfirmation,
          originalMessageId: replacingMessageId,
          text: editedText,
        };

        if (editedLinkPreviews && editedLinkPreviews.length) {
          content.linkPreviews = editedLinkPreviews;
        }

        if (editedMentions && editedMentions.length) {
          content.mentions = editedMentions;
        }

        if (editedQuote) {
          content.quote = editedQuote;
        }

        return {
          content,
          conversation: event.conversation,
          from: event.from,
          id: genericMessage.messageId,
          messageTimer: 0,
          state: PayloadBundleState.INCOMING,
          timestamp: new Date(event.time).getTime(),
          type: PayloadBundleType.MESSAGE_EDIT,
        };
      }
      case GenericMessageType.HIDDEN: {
        const {conversationId, messageId} = genericMessage[GenericMessageType.HIDDEN];

        const content: HiddenContent = {
          conversationId,
          originalMessageId: messageId,
        };

        return {
          content,
          conversation: event.conversation,
          from: event.from,
          id: genericMessage.messageId,
          messageTimer: 0,
          state: PayloadBundleState.INCOMING,
          timestamp: new Date(event.time).getTime(),
          type: PayloadBundleType.MESSAGE_HIDE,
        };
      }
      case GenericMessageType.KNOCK: {
        const {expectsReadConfirmation} = genericMessage[GenericMessageType.KNOCK];
        const content: KnockContent = {expectsReadConfirmation};

        return {
          content,
          conversation: event.conversation,
          from: event.from,
          id: genericMessage.messageId,
          messageTimer: 0,
          state: PayloadBundleState.INCOMING,
          timestamp: new Date(event.time).getTime(),
          type: PayloadBundleType.PING,
        };
      }
      case GenericMessageType.LOCATION: {
        const {latitude, longitude, name, zoom} = genericMessage[GenericMessageType.LOCATION];

        const content: LocationContent = {
          latitude,
          longitude,
          name,
          zoom,
        };

        return {
          content,
          conversation: event.conversation,
          from: event.from,
          id: genericMessage.messageId,
          messageTimer: 0,
          state: PayloadBundleState.INCOMING,
          timestamp: new Date(event.time).getTime(),
          type: PayloadBundleType.LOCATION,
        };
      }
      case GenericMessageType.ASSET: {
        const {notUploaded, original, preview, status, uploaded} = genericMessage[GenericMessageType.ASSET];
        const isImage = !!uploaded && !!uploaded.assetId && !!original && !!original.image;

        const content: AssetContent = {
          abortReason: notUploaded,
          original,
          preview,
          status,
          uploaded,
        };

        return {
          content,
          conversation: event.conversation,
          from: event.from,
          id: genericMessage.messageId,
          messageTimer: 0,
          state: PayloadBundleState.INCOMING,
          timestamp: new Date(event.time).getTime(),
          type: isImage ? PayloadBundleType.ASSET_IMAGE : PayloadBundleType.ASSET,
        };
      }
      case GenericMessageType.REACTION: {
        const {emoji, messageId} = genericMessage[GenericMessageType.REACTION];

        const content: ReactionContent = {
          originalMessageId: messageId,
          type: emoji,
        };

        return {
          content,
          conversation: event.conversation,
          from: event.from,
          id: genericMessage.messageId,
          messageTimer: 0,
          state: PayloadBundleState.INCOMING,
          timestamp: new Date(event.time).getTime(),
          type: PayloadBundleType.REACTION,
        };
      }
      default: {
        this.logger.warn(`Unhandled event type "${genericMessage.content}": ${JSON.stringify(genericMessage)}`);
        return {
          content: genericMessage.content,
          conversation: event.conversation,
          from: event.from,
          id: genericMessage.messageId,
          messageTimer: 0,
          state: PayloadBundleState.INCOMING,
          timestamp: new Date(event.time).getTime(),
          type: PayloadBundleType.UNKNOWN,
        };
      }
    }
  }

  private mapConversationEvent(event: ConversationEvent): PayloadBundleIncoming {
    return {
      content: event.data,
      conversation: event.conversation,
      from: event.from,
      id: ConversationService.createId(),
      messageTimer: 0,
      state: PayloadBundleState.INCOMING,
      timestamp: new Date(event.time).getTime(),
      type: this.mapConversationEventType(event.type),
    };
  }

  private mapConversationEventType(type: CONVERSATION_EVENT): PayloadBundleType {
    switch (type) {
      case CONVERSATION_EVENT.MEMBER_JOIN:
        return PayloadBundleType.MEMBER_JOIN;
      case CONVERSATION_EVENT.MESSAGE_TIMER_UPDATE:
        return PayloadBundleType.TIMER_UPDATE;
      case CONVERSATION_EVENT.RENAME:
        return PayloadBundleType.CONVERSATION_RENAME;
      case CONVERSATION_EVENT.TYPING:
        return PayloadBundleType.TYPING;
      default:
        return PayloadBundleType.UNKNOWN;
    }
  }

  private mapUserEvent(event: UserEvent): PayloadBundleIncoming | void {
    if (event.type === USER_EVENT.CONNECTION) {
      const {connection} = event as UserConnectionEvent;
      return {
        content: connection,
        conversation: connection.conversation,
        from: connection.from,
        id: ConversationService.createId(),
        messageTimer: 0,
        state: PayloadBundleState.INCOMING,
        timestamp: new Date(connection.last_update).getTime(),
        type: PayloadBundleType.CONNECTION_REQUEST,
      };
    }
  }

  private async handleEvent(event: IncomingEvent): Promise<PayloadBundleIncoming | void> {
    this.logger.log(`Handling event of type "${event.type}"`, event);
    const ENCRYPTED_EVENTS = [CONVERSATION_EVENT.OTR_MESSAGE_ADD];
    const META_EVENTS = [
      CONVERSATION_EVENT.MEMBER_JOIN,
      CONVERSATION_EVENT.MESSAGE_TIMER_UPDATE,
      CONVERSATION_EVENT.RENAME,
      CONVERSATION_EVENT.TYPING,
    ];
    const USER_EVENTS = [USER_EVENT.CONNECTION];

    if (ENCRYPTED_EVENTS.includes(event.type as CONVERSATION_EVENT)) {
      return this.decodeGenericMessage(event as ConversationOtrMessageAddEvent);
    } else if (META_EVENTS.includes(event.type as CONVERSATION_EVENT)) {
      const {conversation, from} = event as ConversationEvent;
      const metaEvent = {...event, from, conversation};
      return this.mapConversationEvent(metaEvent as ConversationEvent);
    } else if (USER_EVENTS.includes(event.type as USER_EVENT)) {
      return this.mapUserEvent(event as UserEvent);
    }
  }

  private async handleNotification(notification: IncomingNotification): Promise<void> {
    for (const event of notification.payload) {
      let data;

      try {
        data = await this.handleEvent(event);
      } catch (error) {
        this.emit('error', error);
        continue;
      }

      if (data) {
        switch (data.type) {
          case PayloadBundleType.ASSET_IMAGE:
          case PayloadBundleType.CLEARED:
          case PayloadBundleType.CLIENT_ACTION:
          case PayloadBundleType.CONFIRMATION:
          case PayloadBundleType.CONNECTION_REQUEST:
          case PayloadBundleType.LOCATION:
          case PayloadBundleType.MESSAGE_DELETE:
          case PayloadBundleType.MESSAGE_EDIT:
          case PayloadBundleType.MESSAGE_HIDE:
          case PayloadBundleType.PING:
          case PayloadBundleType.REACTION:
          case PayloadBundleType.TEXT:
            this.emit(data.type, data);
            break;
          case PayloadBundleType.ASSET: {
            const assetContent = data.content as AssetContent;
            const isMetaData = !!assetContent && !!assetContent.original && !assetContent.uploaded;
            const isAbort = !!assetContent.abortReason || (!assetContent.original && !assetContent.uploaded);

            if (isMetaData) {
              data.type = PayloadBundleType.ASSET_META;
              this.emit(PayloadBundleType.ASSET_META, data);
            } else if (isAbort) {
              data.type = PayloadBundleType.ASSET_ABORT;
              this.emit(PayloadBundleType.ASSET_ABORT, data);
            } else {
              this.emit(PayloadBundleType.ASSET, data);
            }
            break;
          }
          case PayloadBundleType.TIMER_UPDATE: {
            if (data.type === PayloadBundleType.TIMER_UPDATE) {
              const {
                data: {message_timer},
                conversation,
              } = event as ConversationMessageTimerUpdateEvent;
              const expireAfterMillis = Number(message_timer);
              this.service!.conversation.messageTimer.setConversationLevelTimer(conversation, expireAfterMillis);
            }

            this.emit(data.type, event);
            break;
          }
          case PayloadBundleType.CONVERSATION_RENAME:
          case PayloadBundleType.MEMBER_JOIN:
          case PayloadBundleType.TYPING:
            this.emit(data.type, event);
            break;
        }
      } else {
        const {type, conversation, from} = event as ConversationEvent;
        const conversationText = conversation ? ` in conversation "${conversation}"` : '';
        const fromText = from ? ` from user "${from}".` : '';

        this.logger.log(`Received unsupported event "${type}"${conversationText}${fromText}`, {event});
      }
    }
  }
}

export {Account};
