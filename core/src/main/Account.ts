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

import {AxiosError} from 'axios';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {APIClient, BackendFeatures} from '@wireapp/api-client';
import {RegisterData} from '@wireapp/api-client/src/auth';
import {Notification} from '@wireapp/api-client/src/notification/';
import {AUTH_COOKIE_KEY, AUTH_TABLE_NAME, Context, Cookie, CookieStore, LoginData} from '@wireapp/api-client/src/auth/';
import {ClientClassification, ClientType, RegisteredClient} from '@wireapp/api-client/src/client/';
import * as Events from '@wireapp/api-client/src/event';
import {AbortHandler, WebSocketClient} from '@wireapp/api-client/src/tcp/';
import * as cryptobox from '@wireapp/cryptobox';
import {CRUDEngine, MemoryEngine, error as StoreEngineError} from '@wireapp/store-engine';
import {EventEmitter} from 'events';
import logdown from 'logdown';

import {LoginSanitizer} from './auth/';
import {BroadcastService} from './broadcast/';
import {ClientInfo, ClientService} from './client/';
import {ConnectionService} from './connection/';
import {AssetService, ConversationService, PayloadBundleSource, PayloadBundleType} from './conversation/';
import * as OtrMessage from './conversation/message/OtrMessage';
import * as UserMessage from './conversation/message/UserMessage';
import {CoreError} from './CoreError';
import {CryptographyService} from './cryptography/';
import {GiphyService} from './giphy/';
import {HandledEventPayload, NotificationService} from './notification/';
import {SelfService} from './self/';
import {TeamService} from './team/';
import {UserService} from './user/';
import {AccountService} from './account/';
import {LinkPreviewService} from './linkPreview';
import {CoreCrypto} from '@wireapp/core-crypto';
import {WEBSOCKET_STATE} from '@wireapp/api-client/src/tcp/ReconnectingWebsocket';
import {createCustomEncryptedStore, createEncryptedStore, deleteEncryptedStore} from './util/encryptedStore';
import {Encoder} from 'bazinga64';
import {MLSService} from './mls';
import {MLSCallbacks, MLSConfig} from './mls/types';
import {getQueueLength, resumeMessageSending} from './conversation/message/messageSender';

export type ProcessedEventPayload = HandledEventPayload;

enum TOPIC {
  ERROR = 'Account.TOPIC.ERROR',
}

export enum ConnectionState {
  /** The websocket is closed and notifications stream is not being processed */
  CLOSED = 'closed',
  /** The websocket is being opened */
  CONNECTING = 'connecting',
  /** The websocket is open but locked and notifications stream is being processed */
  PROCESSING_NOTIFICATIONS = 'processing_notifications',
  /** The websocket is open and message will go through and notifications stream is fully processed */
  LIVE = 'live',
}

export interface Account {
  on(
    event: PayloadBundleType.ASSET,
    listener: (payload: OtrMessage.FileAssetMessage | OtrMessage.ImageAssetMessage) => void,
  ): this;
  on(event: PayloadBundleType.BUTTON_ACTION, listener: (payload: OtrMessage.ButtonActionMessage) => void): this;
  on(event: PayloadBundleType.ASSET_ABORT, listener: (payload: OtrMessage.FileAssetAbortMessage) => void): this;
  on(event: PayloadBundleType.ASSET_IMAGE, listener: (payload: OtrMessage.ImageAssetMessage) => void): this;
  on(event: PayloadBundleType.ASSET_META, listener: (payload: OtrMessage.FileAssetMetaDataMessage) => void): this;
  on(event: PayloadBundleType.CALL, listener: (payload: OtrMessage.CallMessage) => void): this;
  on(event: PayloadBundleType.CLIENT_ACTION, listener: (payload: OtrMessage.ResetSessionMessage) => void): this;
  on(event: PayloadBundleType.CLIENT_ADD, listener: (payload: UserMessage.UserClientAddMessage) => void): this;
  on(event: PayloadBundleType.CLIENT_REMOVE, listener: (payload: UserMessage.UserClientRemoveMessage) => void): this;
  on(event: PayloadBundleType.CONFIRMATION, listener: (payload: OtrMessage.ConfirmationMessage) => void): this;
  on(event: PayloadBundleType.CONNECTION_REQUEST, listener: (payload: UserMessage.UserConnectionMessage) => void): this;
  on(event: PayloadBundleType.USER_UPDATE, listener: (payload: UserMessage.UserUpdateMessage) => void): this;
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

export type CreateStoreFn = (storeName: string, context: Context) => undefined | Promise<CRUDEngine | undefined>;

interface AccountOptions<T> {
  /** Used to store info in the database (will create a inMemory engine if returns undefined) */
  createStore?: CreateStoreFn;

  /** Number of prekeys to generate when creating a new device (defaults to 2)
   * Prekeys are Diffie-Hellmann public keys which allow offline initiation of a secure Proteus session between two devices.
   * Having a high value will:
   *    - make creating a new device consuming more CPU resources
   *    - make it less likely that all prekeys get consumed while the device is offline and the last resort prekey will not be used to create new session
   * Having a low value will:
   *    - make creating a new device fast
   *    - make it likely that all prekeys get consumed while the device is offline and the last resort prekey will be used to create new session
   */
  nbPrekeys?: number;

  /**
   * Config for MLS devices. Will not load corecrypt or create MLS devices if undefined
   */
  mlsConfig?: MLSConfig<T>;
}

const coreDefaultClient: ClientInfo = {
  classification: ClientClassification.DESKTOP,
  cookieLabel: 'default',
  model: '@wireapp/core',
};

export class Account<T = any> extends EventEmitter {
  private readonly apiClient: APIClient;
  private readonly logger: logdown.Logger;
  private readonly createStore: CreateStoreFn;
  private storeEngine?: CRUDEngine;
  private readonly nbPrekeys: number;
  private readonly mlsConfig?: MLSConfig<T>;
  private coreCryptoClient?: CoreCrypto;

  public static readonly TOPIC = TOPIC;
  public service?: {
    mls: MLSService;
    account: AccountService;
    asset: AssetService;
    broadcast: BroadcastService;
    client: ClientService;
    connection: ConnectionService;
    conversation: ConversationService;
    cryptography: CryptographyService;
    giphy: GiphyService;
    linkPreview: LinkPreviewService;
    notification: NotificationService;
    self: SelfService;
    team: TeamService;
    user: UserService;
  };
  public backendFeatures: BackendFeatures;

  /**
   * @param apiClient The apiClient instance to use in the core (will create a new new one if undefined)
   * @param accountOptions
   */
  constructor(
    apiClient: APIClient = new APIClient(),
    {createStore = () => undefined, nbPrekeys = 2, mlsConfig}: AccountOptions<T> = {},
  ) {
    super();
    this.apiClient = apiClient;
    this.backendFeatures = this.apiClient.backendFeatures;
    this.mlsConfig = mlsConfig;
    this.nbPrekeys = nbPrekeys;
    this.createStore = createStore;

    apiClient.on(APIClient.TOPIC.COOKIE_REFRESH, async (cookie?: Cookie) => {
      if (cookie && this.storeEngine) {
        try {
          await this.persistCookie(this.storeEngine, cookie);
        } catch (error) {
          this.logger.error(`Failed to save cookie: ${(error as Error).message}`, error);
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

  /**
   * Will register a new user to the backend
   *
   * @param registration The user's data
   * @param clientType Type of client to create (temporary or permanent)
   */
  public async register(registration: RegisterData, clientType: ClientType): Promise<Context> {
    const context = await this.apiClient.register(registration, clientType);
    await this.initServices(context);
    return context;
  }

  /**
   * Will init the core with an aleady existing client (both on backend and local)
   * Will fail if local client cannot be found
   *
   * @param clientType The type of client the user is using (temporary or permanent)
   * @param cookie The cookie to identify the user against backend (will use the browser's one if not given)
   */
  public async init(clientType: ClientType, cookie?: Cookie, initClient: boolean = true): Promise<Context> {
    const context = await this.apiClient.init(clientType, cookie);
    await this.initServices(context);

    // Assumption: client gets only initialized once
    if (initClient) {
      await this.initClient({clientType});

      if (this.mlsConfig) {
        // initialize schedulers for pending mls proposals once client is initialized
        await this.service?.notification.checkExistingPendingProposals();

        // initialize schedulers for renewing key materials
        await this.service?.notification.checkForKeyMaterialsUpdate();

        // initialize scheduler for syncing key packages with backend
        await this.service?.notification.checkForKeyPackagesBackendSync();
      }
    }
    return context;
  }

  /**
   * Will log the user in with the given credential.
   * Will also create the local client and store it in DB
   *
   * @param loginData The credentials of the user
   * @param initClient Should the call also create the local client
   * @param clientInfo Info about the client to create (name, type...)
   */
  public async login(
    loginData: LoginData,
    initClient: boolean = true,
    clientInfo: ClientInfo = coreDefaultClient,
  ): Promise<Context> {
    this.resetContext();
    LoginSanitizer.removeNonPrintableCharacters(loginData);

    const context = await this.apiClient.login(loginData);
    await this.initServices(context);

    if (initClient) {
      await this.initClient(loginData, clientInfo);
    }

    return context;
  }

  /**
   * Will try to get the load the local client from local DB.
   * If clientInfo are provided, will also create the client on backend and DB
   * If clientInfo are not provideo, the method will fail if local client cannot be found
   *
   * @param loginData User's credentials
   * @param clientInfo Will allow creating the client if the local client cannot be found (else will fail if local client is not found)
   * @param entropyData Additional entropy data
   * @returns The local existing client or newly created client
   */
  public async initClient(
    loginData: LoginData,
    clientInfo?: ClientInfo,
    entropyData?: Uint8Array,
  ): Promise<{isNewClient: boolean; localClient: RegisteredClient}> {
    if (!this.service) {
      throw new Error('Services are not set.');
    }

    try {
      const localClient = await this.loadAndValidateLocalClient(entropyData);
      return {isNewClient: false, localClient};
    } catch (error) {
      if (!clientInfo) {
        // If no client info provided, the client should not be created
        throw error;
      }
      // There was no client so we need to "create" and "register" a client
      const notFoundInDatabase =
        error instanceof cryptobox.error.CryptoboxError ||
        (error as Error).constructor.name === 'CryptoboxError' ||
        error instanceof StoreEngineError.RecordNotFoundError ||
        (error as Error).constructor.name === StoreEngineError.RecordNotFoundError.name;
      const notFoundOnBackend = (error as AxiosError).response?.status === HTTP_STATUS.NOT_FOUND;

      if (notFoundInDatabase) {
        this.logger.log(`Could not find valid client in database "${this.storeEngine?.storeName}".`);
        return this.registerClient(loginData, clientInfo, entropyData);
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

          return this.registerClient(loginData, clientInfo, entropyData);
        }

        this.logger.log('Last client was permanent - Deleting cryptography stores');
        await this.service!.cryptography.deleteCryptographyStores();
        return this.registerClient(loginData, clientInfo, entropyData);
      }

      throw error;
    }
  }

  /**
   * In order to be able to send MLS messages, the core needs a few information from the consumer.
   * Namely:
   * - is the current user allowed to administrate a specific conversation
   * - what is the groupId of a conversation
   * @param mlsCallbacks
   */
  configureMLSCallbacks(mlsCallbacks: MLSCallbacks) {
    this.service?.mls.configureMLSCallbacks(mlsCallbacks);
  }

  public async initServices(context: Context): Promise<void> {
    this.storeEngine = await this.initEngine(context);
    const accountService = new AccountService(this.apiClient);
    const assetService = new AssetService(this.apiClient);
    const cryptographyService = new CryptographyService(this.apiClient, this.storeEngine, {
      // We want to encrypt with fully qualified session ids, only if the backend is federated with other backends
      useQualifiedIds: this.backendFeatures.isFederated,
      nbPrekeys: this.nbPrekeys,
    });

    const clientService = new ClientService(this.apiClient, this.storeEngine, cryptographyService);
    const mlsService = new MLSService(this.mlsConfig, this.apiClient, () => this.coreCryptoClient);
    const connectionService = new ConnectionService(this.apiClient);
    const giphyService = new GiphyService(this.apiClient);
    const linkPreviewService = new LinkPreviewService(assetService);
    const notificationService = new NotificationService(
      this.apiClient,
      cryptographyService,
      mlsService,
      this.storeEngine,
    );
    const conversationService = new ConversationService(
      this.apiClient,
      cryptographyService,
      {
        // We can use qualified ids to send messages as long as the backend supports federated endpoints
        useQualifiedIds: this.backendFeatures.federationEndpoints,
      },
      notificationService,
      mlsService,
    );

    const selfService = new SelfService(this.apiClient);
    const teamService = new TeamService(this.apiClient);

    const broadcastService = new BroadcastService(this.apiClient, cryptographyService);
    const userService = new UserService(this.apiClient, broadcastService, conversationService, connectionService);

    this.service = {
      mls: mlsService,
      account: accountService,
      asset: assetService,
      broadcast: broadcastService,
      client: clientService,
      connection: connectionService,
      conversation: conversationService,
      cryptography: cryptographyService,
      giphy: giphyService,
      linkPreview: linkPreviewService,
      notification: notificationService,
      self: selfService,
      team: teamService,
      user: userService,
    };
  }

  public async loadAndValidateLocalClient(entropyData?: Uint8Array): Promise<RegisteredClient> {
    await this.service!.cryptography.initCryptobox();

    const loadedClient = await this.service!.client.getLocalClient();
    await this.apiClient.api.client.getClient(loadedClient.id);
    this.apiClient.context!.clientId = loadedClient.id;
    if (this.mlsConfig) {
      this.coreCryptoClient = await this.createMLSClient(
        loadedClient,
        this.apiClient.context!,
        this.mlsConfig,
        entropyData,
      );
    }

    return loadedClient;
  }

  private async createMLSClient(
    client: RegisteredClient,
    context: Context,
    mlsConfig: MLSConfig,
    entropyData?: Uint8Array,
  ) {
    if (!this.service) {
      throw new Error('Services are not set.');
    }
    const coreCryptoKeyId = 'corecrypto-key';
    const {CoreCrypto} = await import('@wireapp/core-crypto');
    const dbName = this.generateSecretsDbName(context);

    const secretStore = mlsConfig.secretsCrypto
      ? await createCustomEncryptedStore(dbName, mlsConfig.secretsCrypto)
      : await createEncryptedStore(dbName);

    let key = await secretStore.getsecretValue(coreCryptoKeyId);
    let isNewMLSDevice = false;
    if (!key) {
      key = window.crypto.getRandomValues(new Uint8Array(16));
      await secretStore.saveSecretValue(coreCryptoKeyId, key);
      // Keeping track that this device is a new MLS device (but can be an old proteus device)
      isNewMLSDevice = true;
    }

    const {userId, domain} = this.apiClient.context!;
    const mlsClient = await CoreCrypto.init({
      databaseName: `corecrypto-${this.generateDbName(context)}`,
      key: Encoder.toBase64(key).asString,
      clientId: `${userId}:${client.id}@${domain}`,
      wasmFilePath: mlsConfig.coreCrypoWasmFilePath,
      entropySeed: entropyData,
    });

    if (isNewMLSDevice) {
      // If the device is new, we need to upload keypackages and public key to the backend
      await this.service.mls.uploadMLSPublicKeys(await mlsClient.clientPublicKey(), client.id);
      await this.service.mls.uploadMLSKeyPackages(await mlsClient.clientKeypackages(this.nbPrekeys), client.id);
    }

    return mlsClient;
  }

  private async registerClient(
    loginData: LoginData,
    clientInfo: ClientInfo = coreDefaultClient,
    entropyData?: Uint8Array,
  ): Promise<{isNewClient: boolean; localClient: RegisteredClient}> {
    if (!this.service) {
      throw new Error('Services are not set.');
    }
    this.logger.info(`Creating new client {mls: ${!!this.mlsConfig}}`);
    const registeredClient = await this.service.client.register(loginData, clientInfo, entropyData);
    if (this.mlsConfig) {
      this.coreCryptoClient = await this.createMLSClient(
        registeredClient,
        this.apiClient.context!,
        this.mlsConfig,
        entropyData,
      );
    }
    this.apiClient.context!.clientId = registeredClient.id;
    this.logger.info('Client is created');

    await this.service!.notification.initializeNotificationStream();
    await this.service!.client.synchronizeClients();
    await this.service!.cryptography.initCryptobox();

    return {isNewClient: true, localClient: registeredClient};
  }

  private resetContext(): void {
    delete this.apiClient.context;
    delete this.service;
  }

  /**
   * Will logout the current user
   * @param clearData if set to `true` will completely wipe any database that was created by the Account
   */
  public async logout(clearData: boolean = false): Promise<void> {
    if (clearData && this.coreCryptoClient) {
      await this.coreCryptoClient.wipe();
      await deleteEncryptedStore(this.generateSecretsDbName(this.apiClient.context!));
    }
    await this.apiClient.logout();
    this.resetContext();
  }

  /**
   * Will download and handle the notification stream since last stored notification id.
   * Once the notification stream has been handled from backend, will then connect to the websocket and start listening to incoming events
   *
   * @param callbacks callbacks that will be called to handle different events
   * @returns close a function that will disconnect from the websocket
   */
  public listen({
    onEvent = () => {},
    onConnectionStateChanged = () => {},
    onNotificationStreamProgress = () => {},
    onMissedNotifications = () => {},
    dryRun = false,
  }: {
    /**
     * Called when a new event arrives from backend
     * @param payload the payload of the event. Contains the raw event received and the decrypted data (if event was encrypted)
     * @param source where the message comes from (either websocket or notification stream)
     */
    onEvent?: (payload: HandledEventPayload, source: PayloadBundleSource) => void;

    /**
     * During the notification stream processing, this function will be called whenever a new notification has been processed
     */
    onNotificationStreamProgress?: ({done, total}: {done: number; total: number}) => void;

    /**
     * called when the connection stateh with the backend has changed
     */
    onConnectionStateChanged?: (state: ConnectionState) => void;

    /**
     * called when we detect lost notification from backend.
     * When a client doesn't log in for a while (28 days, as of now) notifications that are older than 28 days will be deleted from backend.
     * If the client query the backend for the notifications since a particular notification ID and this ID doesn't exist anymore on the backend, we deduce that some messages were not sync before they were removed from backend.
     * We can then detect that something was wrong and warn the consumer that there might be some missing old messages
     * @param  {string} notificationId
     */
    onMissedNotifications?: (notificationId: string) => void;

    /**
     * When set will not decrypt and not store the last notification ID. This is useful if you only want to subscribe to unencrypted backend events
     */
    dryRun?: boolean;
  } = {}): () => void {
    if (!this.apiClient.context) {
      throw new Error('Context is not set - please login first');
    }

    const handleEvent = async (payload: HandledEventPayload, source: PayloadBundleSource) => {
      const {mappedEvent} = payload;
      switch (mappedEvent?.type) {
        case PayloadBundleType.TIMER_UPDATE: {
          const {
            data: {message_timer},
            conversation,
          } = payload.event as Events.ConversationMessageTimerUpdateEvent;
          const expireAfterMillis = Number(message_timer);
          this.service!.conversation.messageTimer.setConversationLevelTimer(conversation, expireAfterMillis);
          break;
        }
      }
      onEvent(payload, source);
      if (mappedEvent) {
        this.emit(mappedEvent.type, payload.mappedEvent);
      }
    };

    const handleNotification = async (notification: Notification, source: PayloadBundleSource): Promise<void> => {
      try {
        const messages = this.service!.notification.handleNotification(notification, source, dryRun);
        for await (const message of messages) {
          await handleEvent(message, source);
        }
      } catch (error) {
        this.logger.error(`Failed to handle notification ID "${notification.id}": ${(error as any).message}`, error);
      }
    };

    this.apiClient.transport.ws.removeAllListeners(WebSocketClient.TOPIC.ON_MESSAGE);
    this.apiClient.transport.ws.on(WebSocketClient.TOPIC.ON_MESSAGE, notification =>
      handleNotification(notification, PayloadBundleSource.WEBSOCKET),
    );
    this.apiClient.transport.ws.on(WebSocketClient.TOPIC.ON_STATE_CHANGE, wsState => {
      const mapping: Partial<Record<WEBSOCKET_STATE, ConnectionState>> = {
        [WEBSOCKET_STATE.CLOSED]: ConnectionState.CLOSED,
        [WEBSOCKET_STATE.CONNECTING]: ConnectionState.CONNECTING,
      };
      const connectionState = mapping[wsState];
      if (connectionState) {
        onConnectionStateChanged(connectionState);
      }
    });

    const processNotificationStream = async (abortHandler: AbortHandler) => {
      // Lock websocket in order to buffer any message that arrives while we handle the notification stream
      this.apiClient.transport.ws.lock();
      onConnectionStateChanged(ConnectionState.PROCESSING_NOTIFICATIONS);
      const results = await this.service!.notification.processNotificationStream(
        async (notification, source, progress) => {
          await handleNotification(notification, source);
          onNotificationStreamProgress(progress);
        },
        onMissedNotifications,
        abortHandler,
      );
      this.logger.log(`Finished processing notifications ${JSON.stringify(results)}`, results);
      if (abortHandler.isAborted()) {
        this.logger.warn('Ending connection process as websocket was closed');
        return;
      }
      onConnectionStateChanged(ConnectionState.LIVE);
      // We can now unlock the websocket and let the new messages being handled and decrypted
      this.apiClient.transport.ws.unlock();
      // We need to wait for the notification stream to be fully handled before releasing the message sending queue.
      // This is due to the nature of how message are encrypted, any change in mls epoch needs to happen before we start encrypting any kind of messages
      this.logger.info(`Resuming message sending. ${getQueueLength()} messages to be sent`);
      resumeMessageSending();
    };
    this.apiClient.connect(processNotificationStream);

    return () => {
      this.apiClient.disconnect();
      onConnectionStateChanged(ConnectionState.CLOSED);
      this.apiClient.transport.ws.removeAllListeners();
    };
  }

  private generateDbName(context: Context) {
    const clientType = context.clientType === ClientType.NONE ? '' : `@${context.clientType}`;
    return `wire@${this.apiClient.config.urls.name}@${context.userId}${clientType}`;
  }

  private generateSecretsDbName(context: Context) {
    return `secrets-${this.generateDbName(context)}`;
  }

  private async initEngine(context: Context): Promise<CRUDEngine> {
    const dbName = this.generateDbName(context);
    this.logger.log(`Initialising store with name "${dbName}"...`);
    const openDb = async () => {
      const initializedDb = await this.createStore(dbName, context);
      if (initializedDb) {
        this.logger.log(`Initialized store with existing engine "${dbName}".`);
        return initializedDb;
      }
      this.logger.log(`Initialized store with new memory engine "${dbName}".`);
      const memoryEngine = new MemoryEngine();
      await memoryEngine.init(dbName);
      return memoryEngine;
    };
    const storeEngine = await openDb();
    const cookie = CookieStore.getCookie();
    if (cookie) {
      await this.persistCookie(storeEngine, cookie);
    }
    return storeEngine;
  }
}
