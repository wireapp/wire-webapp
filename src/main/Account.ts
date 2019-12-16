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

import {APIClient} from '@wireapp/api-client';
import {RegisterData} from '@wireapp/api-client/dist/auth';
import {
  AUTH_COOKIE_KEY,
  AUTH_TABLE_NAME,
  Context,
  Cookie,
  CookieStore,
  LoginData,
} from '@wireapp/api-client/dist/auth/';
import {ClientType, RegisteredClient} from '@wireapp/api-client/dist/client/';
import * as Events from '@wireapp/api-client/dist/event';
import {StatusCode} from '@wireapp/api-client/dist/http/';
import {WebSocketClient} from '@wireapp/api-client/dist/tcp/';
import * as cryptobox from '@wireapp/cryptobox';
import {CRUDEngine, MemoryEngine, error as StoreEngineError} from '@wireapp/store-engine';
import EventEmitter from 'events';
import logdown from 'logdown';
import {LoginSanitizer} from './auth/';
import {BroadcastService} from './broadcast/';
import {ClientInfo, ClientService} from './client/';
import {ConnectionService} from './connection/';
import {
  AssetService,
  ConversationService,
  PayloadBundle,
  PayloadBundleSource,
  PayloadBundleType,
} from './conversation/';
import * as OtrMessage from './conversation/message/OtrMessage';
import {CoreError, NotificationError} from './CoreError';
import {CryptographyService} from './cryptography/';
import {GiphyService} from './giphy/';
import {NotificationHandler, NotificationService} from './notification/';
import {SelfService} from './self/';
import {TeamService} from './team/';
import {UserService} from './user/';

enum TOPIC {
  ERROR = 'Account.TOPIC.ERROR',
}

export interface Account {
  on(event: PayloadBundleType.ASSET, listener: (payload: OtrMessage.FileAssetMessage) => void): this;
  on(event: PayloadBundleType.ASSET_ABORT, listener: (payload: OtrMessage.FileAssetAbortMessage) => void): this;
  on(event: PayloadBundleType.ASSET_IMAGE, listener: (payload: OtrMessage.ImageAssetMessage) => void): this;
  on(event: PayloadBundleType.ASSET_META, listener: (payload: OtrMessage.FileAssetMetaDataMessage) => void): this;
  on(event: PayloadBundleType.CALL, listener: (payload: OtrMessage.CallMessage) => void): this;
  on(event: PayloadBundleType.CLIENT_ACTION, listener: (payload: OtrMessage.ResetSessionMessage) => void): this;
  on(event: PayloadBundleType.CLIENT_ADD, listener: (payload: Events.UserClientAddEvent) => void): this;
  on(event: PayloadBundleType.CLIENT_REMOVE, listener: (payload: Events.UserClientRemoveEvent) => void): this;
  on(event: PayloadBundleType.CONFIRMATION, listener: (payload: OtrMessage.ConfirmationMessage) => void): this;
  on(event: PayloadBundleType.CONNECTION_REQUEST, listener: (payload: Events.UserConnectionEvent) => void): this;
  on(event: PayloadBundleType.USER_UPDATE, listener: (payload: Events.UserUpdateEvent) => void): this;
  on(
    event: PayloadBundleType.CONVERSATION_CLEAR,
    listener: (payload: OtrMessage.ClearConversationMessage) => void,
  ): this;
  on(event: PayloadBundleType.CONVERSATION_RENAME, listener: (payload: Events.ConversationRenameEvent) => void): this;
  on(event: PayloadBundleType.LOCATION, listener: (payload: OtrMessage.LocationMessage) => void): this;
  on(event: PayloadBundleType.MEMBER_JOIN, listener: (payload: Events.TeamMemberJoinEvent) => void): this;
  on(event: PayloadBundleType.MESSAGE_DELETE, listener: (payload: OtrMessage.DeleteMessage) => void): this;
  on(event: PayloadBundleType.MESSAGE_EDIT, listener: (payload: OtrMessage.EditedTextMessage) => void): this;
  on(event: PayloadBundleType.MESSAGE_HIDE, listener: (payload: OtrMessage.HideMessage) => void): this;
  on(event: PayloadBundleType.PING, listener: (payload: OtrMessage.PingMessage) => void): this;
  on(event: PayloadBundleType.REACTION, listener: (payload: OtrMessage.ReactionMessage) => void): this;
  on(event: PayloadBundleType.TEXT, listener: (payload: OtrMessage.TextMessage) => void): this;
  on(
    event: PayloadBundleType.TIMER_UPDATE,
    listener: (payload: Events.ConversationMessageTimerUpdateEvent) => void,
  ): this;
  on(event: PayloadBundleType.TYPING, listener: (payload: Events.ConversationTypingEvent) => void): this;
  on(event: PayloadBundleType.UNKNOWN, listener: (payload: any) => void): this;
  on(event: TOPIC.ERROR, listener: (payload: CoreError) => void): this;
}

export type StoreEngineProvider = (storeName: string) => Promise<CRUDEngine>;

export class Account extends EventEmitter {
  private readonly logger: logdown.Logger;
  private readonly storeEngineProvider: StoreEngineProvider;
  private readonly apiClient: APIClient;
  private storeEngine?: CRUDEngine;

  public static readonly TOPIC = TOPIC;
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

  constructor(apiClient: APIClient = new APIClient(), storeEngineProvider?: StoreEngineProvider) {
    super();
    this.apiClient = apiClient;
    if (storeEngineProvider) {
      this.storeEngineProvider = storeEngineProvider;
    } else {
      this.storeEngineProvider = async (storeName: string) => {
        const engine = new MemoryEngine();
        await engine.init(storeName);
        return engine;
      };
    }

    apiClient.on(APIClient.TOPIC.COOKIE_REFRESH, async (cookie?: Cookie) => {
      if (cookie && this.storeEngine) {
        try {
          await this.persistCookie(this.storeEngine, cookie);
        } catch (error) {
          this.logger.error(`Failed to save cookie: ${error.message}`, error);
        }
      }
    });

    this.logger = logdown('@wireapp/core/Account', {
      logger: console,
      markdown: false,
    });
  }

  private persistCookie(storeEngine: CRUDEngine, cookie: Cookie): Promise<string> {
    const entity = {expiration: cookie.expiration, zuid: cookie.zuid};
    return storeEngine.updateOrCreate(AUTH_TABLE_NAME, AUTH_COOKIE_KEY, entity);
  }

  get clientId(): string {
    return this.apiClient.validatedClientId;
  }

  get userId(): string {
    return this.apiClient.validatedUserId;
  }

  public async register(registration: RegisterData, clientType: ClientType): Promise<Context> {
    const context = await this.apiClient.register(registration, clientType);
    const storeEngine = await this.initEngine(context);
    await this.initServices(storeEngine);
    return context;
  }

  public async init(clientType: ClientType): Promise<Context> {
    const context = await this.apiClient.init(clientType);
    const storeEngine = await this.initEngine(context);
    await this.initServices(storeEngine);
    return context;
  }

  public async initServices(storeEngine: CRUDEngine): Promise<void> {
    const assetService = new AssetService(this.apiClient);
    const cryptographyService = new CryptographyService(this.apiClient, storeEngine);

    const clientService = new ClientService(this.apiClient, storeEngine, cryptographyService);
    const connectionService = new ConnectionService(this.apiClient);
    const giphyService = new GiphyService(this.apiClient);
    const conversationService = new ConversationService(this.apiClient, cryptographyService, assetService);
    const notificationService = new NotificationService(this.apiClient, cryptographyService, storeEngine);
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

  public async login(loginData: LoginData, initClient: boolean = true, clientInfo?: ClientInfo): Promise<Context> {
    this.resetContext();
    LoginSanitizer.removeNonPrintableCharacters(loginData);

    const context = await this.apiClient.login(loginData);
    const storeEngine = await this.initEngine(context);
    await this.initServices(storeEngine);

    if (initClient) {
      await this.initClient(loginData, clientInfo);
    }

    return context;
  }

  public async initClient(
    loginData: LoginData,
    clientInfo?: ClientInfo,
  ): Promise<{isNewClient: boolean; localClient: RegisteredClient}> {
    if (!this.service) {
      throw new Error('Services are not set.');
    }

    try {
      const localClient = await this.loadAndValidateLocalClient();
      return {isNewClient: false, localClient};
    } catch (error) {
      // There was no client so we need to "create" and "register" a client
      const notFoundInDatabase =
        error instanceof cryptobox.error.CryptoboxError ||
        error.constructor.name === 'CryptoboxError' ||
        error instanceof StoreEngineError.RecordNotFoundError ||
        error.constructor.name === StoreEngineError.RecordNotFoundError.constructor.name;
      const notFoundOnBackend = error.response?.status === StatusCode.NOT_FOUND;

      if (notFoundInDatabase) {
        this.logger.log('Could not find valid client in database');
        return this.registerClient(loginData, clientInfo);
      }

      if (notFoundOnBackend) {
        this.logger.log('Could not find valid client on backend');
        const client = await this.service!.client.getLocalClient();
        const shouldDeleteWholeDatabase = client.type === ClientType.TEMPORARY;
        if (shouldDeleteWholeDatabase) {
          this.logger.log('Last client was temporary - Deleting database');

          if (this.storeEngine) {
            await this.storeEngine.clearTables();
          }
          const context = await this.apiClient.init(loginData.clientType);
          await this.initEngine(context);

          return this.registerClient(loginData, clientInfo);
        }

        this.logger.log('Last client was permanent - Deleting cryptography stores');
        await this.service!.cryptography.deleteCryptographyStores();
        return this.registerClient(loginData, clientInfo);
      }

      throw error;
    }
  }

  public async loadAndValidateLocalClient(): Promise<RegisteredClient> {
    await this.service!.cryptography.initCryptobox();

    const loadedClient = await this.service!.client.getLocalClient();
    await this.apiClient.client.api.getClient(loadedClient.id);
    this.apiClient.context!.clientId = loadedClient.id;

    return loadedClient;
  }

  private async registerClient(
    loginData: LoginData,
    clientInfo?: ClientInfo,
  ): Promise<{isNewClient: boolean; localClient: RegisteredClient}> {
    if (!this.service) {
      throw new Error('Services are not set.');
    }
    const registeredClient = await this.service.client.register(loginData, clientInfo);
    this.apiClient.context!.clientId = registeredClient.id;
    this.logger.log('Client is created');

    await this.service!.notification.initializeNotificationStream();
    await this.service!.client.synchronizeClients();

    return {isNewClient: true, localClient: registeredClient};
  }

  private resetContext(): void {
    delete this.apiClient.context;
    delete this.service;
  }

  public async logout(): Promise<void> {
    await this.apiClient.logout();
    this.resetContext();
  }

  public async listen(
    notificationHandler: NotificationHandler = this.service!.notification.handleNotification,
  ): Promise<Account> {
    if (!this.apiClient.context) {
      throw new Error('Context is not set - please login first');
    }

    this.apiClient.transport.ws.removeAllListeners(WebSocketClient.TOPIC.ON_MESSAGE);
    this.apiClient.transport.ws.on(WebSocketClient.TOPIC.ON_MESSAGE, notification => {
      notificationHandler(notification, PayloadBundleSource.WEBSOCKET).catch(error => {
        this.logger.error(`Failed to handle notification ID "${notification.id}": ${error.message}`, error);
      });
    });

    this.service!.notification.removeAllListeners(NotificationService.TOPIC.NOTIFICATION_ERROR);
    this.service!.notification.on(NotificationService.TOPIC.NOTIFICATION_ERROR, this.handleError);

    for (const payloadType of Object.values(PayloadBundleType)) {
      this.service!.notification.removeAllListeners(payloadType);
      this.service!.notification.on(payloadType as any, this.handlePayload);
    }

    const onBeforeConnect = async () => this.service!.notification.handleNotificationStream(notificationHandler);
    await this.apiClient.connect(onBeforeConnect);
    return this;
  }

  private readonly handlePayload = async (payload: PayloadBundle): Promise<void> => {
    switch (payload.type) {
      case PayloadBundleType.TIMER_UPDATE: {
        const {
          data: {message_timer},
          conversation,
        } = (payload as unknown) as Events.ConversationMessageTimerUpdateEvent;
        const expireAfterMillis = Number(message_timer);
        this.service!.conversation.messageTimer.setConversationLevelTimer(conversation, expireAfterMillis);
        break;
      }
    }
    this.emit(payload.type, payload);
  };

  private readonly handleError = (accountError: NotificationError): void => {
    this.emit(Account.TOPIC.ERROR, accountError);
  };

  private async initEngine(context: Context): Promise<CRUDEngine> {
    const clientType = context.clientType === ClientType.NONE ? '' : `@${context.clientType}`;
    const dbName = `wire@${this.apiClient.config.urls.name}@${context.userId}${clientType}`;
    this.logger.log(`Initialising store with name "${dbName}"...`);
    this.storeEngine = await this.storeEngineProvider(dbName);
    const cookie = CookieStore.getCookie();
    if (cookie) {
      await this.persistCookie(this.storeEngine, cookie);
    }
    return this.storeEngine;
  }
}
