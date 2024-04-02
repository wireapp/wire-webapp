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

import {
  RegisterData,
  AUTH_COOKIE_KEY,
  AUTH_TABLE_NAME,
  Context,
  Cookie,
  CookieStore,
  LoginData,
  PreKey,
} from '@wireapp/api-client/lib/auth';
import {ClientClassification, ClientType, RegisteredClient} from '@wireapp/api-client/lib/client/';
import {SUBCONVERSATION_ID} from '@wireapp/api-client/lib/conversation';
import * as Events from '@wireapp/api-client/lib/event';
import {CONVERSATION_EVENT} from '@wireapp/api-client/lib/event';
import {Notification} from '@wireapp/api-client/lib/notification/';
import {AbortHandler, WebSocketClient} from '@wireapp/api-client/lib/tcp/';
import {WEBSOCKET_STATE} from '@wireapp/api-client/lib/tcp/ReconnectingWebsocket';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {TimeInMillis} from '@wireapp/commons/lib/util/TimeUtil';
import logdown from 'logdown';

import {APIClient, BackendFeatures} from '@wireapp/api-client';
import {TypedEventEmitter} from '@wireapp/commons';
import {CRUDEngine, MemoryEngine} from '@wireapp/store-engine';

import {AccountService} from './account/';
import {LoginSanitizer} from './auth/';
import {BroadcastService} from './broadcast/';
import {ClientInfo, ClientService} from './client/';
import {ConnectionService} from './connection/';
import {AssetService, ConversationService} from './conversation/';
import {getQueueLength, pauseMessageSending, resumeMessageSending} from './conversation/message/messageSender';
import {SubconversationService} from './conversation/SubconversationService/SubconversationService';
import {GiphyService} from './giphy/';
import {LinkPreviewService} from './linkPreview';
import {MLSService} from './messagingProtocols/mls';
import {
  pauseRejoiningMLSConversations,
  queueConversationRejoin,
  resumeRejoiningMLSConversations,
} from './messagingProtocols/mls/conversationRejoinQueue';
import {E2EIServiceExternal, User} from './messagingProtocols/mls/E2EIdentityService';
import {getTokenCallback} from './messagingProtocols/mls/E2EIdentityService/E2EIServiceInternal';
import {CoreCallbacks, CoreCryptoConfig, SecretCrypto} from './messagingProtocols/mls/types';
import {NewClient, ProteusService} from './messagingProtocols/proteus';
import {CryptoClientType} from './messagingProtocols/proteus/ProteusService/CryptoClient';
import {HandledEventPayload, NotificationService, NotificationSource} from './notification/';
import {createCustomEncryptedStore, createEncryptedStore, EncryptedStore} from './secretStore/encryptedStore';
import {generateSecretKey} from './secretStore/secretKeyGenerator';
import {SelfService} from './self/';
import {CoreDatabase, deleteDB, openDB} from './storage/CoreDB';
import {TeamService} from './team/';
import {UserService} from './user/';
import {RecurringTaskScheduler} from './util/RecurringTaskScheduler';

export type ProcessedEventPayload = HandledEventPayload;

export enum EVENTS {
  /**
   * event triggered when a message from an unknown client is received.
   * An unknown client is a client we don't yet have a session with
   */
  NEW_SESSION = 'new_session',
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

export type CreateStoreFn = (storeName: string, key: Uint8Array) => undefined | Promise<CRUDEngine | undefined>;

interface AccountOptions {
  /** Used to store info in the database (will create a inMemory engine if returns undefined) */
  createStore?: CreateStoreFn;
  systemCrypto?: SecretCrypto;

  /** Number of prekeys to generate when creating a new device (defaults to 2)
   * Prekeys are Diffie-Hellmann public keys which allow offline initiation of a secure Proteus session between two devices.
   * Having a high value will:
   *    - make creating a new device consuming more CPU resources
   *    - make it less likely that all prekeys get consumed while the device is offline and the last resort prekey will not be used to create new session
   * Having a low value will:
   *    - make creating a new device fast
   *    - make it likely that all prekeys get consumed while the device is offline and the last resort prekey will be used to create new session
   */
  nbPrekeys: number;

  /**
   * Config for MLS and proteus devices. Will fallback to the old cryptobox logic if not provided
   */
  coreCryptoConfig?: CoreCryptoConfig;
}

type InitOptions = {
  /** cookie used to identify the current user. Will use the browser cookie if not defined */
  cookie?: Cookie;
};

const coreDefaultClient: ClientInfo = {
  classification: ClientClassification.DESKTOP,
  cookieLabel: 'default',
  model: '@wireapp/core',
};

type Events = {
  [EVENTS.NEW_SESSION]: NewClient;
};

export class Account extends TypedEventEmitter<Events> {
  private readonly apiClient: APIClient;
  private readonly logger: logdown.Logger;
  private readonly coreCryptoConfig?: CoreCryptoConfig;
  private readonly isMlsEnabled: () => Promise<boolean>;
  /** this is the client the consumer is currently using. Will be set as soon as `initClient` is called and will be rest upon logout */
  private currentClient?: RegisteredClient;
  private storeEngine?: CRUDEngine;
  private db?: CoreDatabase;
  private encryptedDb?: EncryptedStore<any>;
  private coreCallbacks?: CoreCallbacks;

  public service?: {
    mls?: MLSService;
    e2eIdentity?: E2EIServiceExternal;
    proteus: ProteusService;
    account: AccountService;
    asset: AssetService;
    broadcast: BroadcastService;
    client: ClientService;
    connection: ConnectionService;
    conversation: ConversationService;
    subconversation: SubconversationService;
    giphy: GiphyService;
    linkPreview: LinkPreviewService;
    notification: NotificationService;
    self: SelfService;
    team: TeamService;
    user: UserService;
  };
  public backendFeatures: BackendFeatures;
  public recurringTaskScheduler: RecurringTaskScheduler;

  /**
   * @param apiClient The apiClient instance to use in the core (will create a new new one if undefined)
   * @param accountOptions
   */
  constructor(
    apiClient: APIClient = new APIClient(),
    private options: AccountOptions = {nbPrekeys: 100},
  ) {
    super();
    this.apiClient = apiClient;
    this.backendFeatures = this.apiClient.backendFeatures;
    this.coreCryptoConfig = options.coreCryptoConfig;
    this.isMlsEnabled = async () => !!this.coreCryptoConfig?.mls && (await this.apiClient.supportsMLS());
    this.recurringTaskScheduler = new RecurringTaskScheduler({
      get: async key => {
        const task = await this.db?.get('recurringTasks', key);
        return task?.firingDate;
      },
      set: async (key, timestamp) => {
        await this.db?.put('recurringTasks', {key, firingDate: timestamp}, key);
      },
      delete: async key => {
        await this.db?.delete('recurringTasks', key);
      },
    });

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

  /**
   * Will set the APIClient to use a specific version of the API (by default uses version 0)
   * It will fetch the API Config and use the highest possible version
   * @param min mininum version to use
   * @param max maximum version to use
   * @param allowDev allow the api-client to use development version of the api (if present). The dev version also need to be listed on the supportedVersions given as parameters
   *   If we have version 2 that is a dev version, this is going to be the output of those calls
   *   - useVersion(0, 2, true) > version 2 is used
   *   - useVersion(0, 2) > version 1 is used
   *   - useVersion(0, 1, true) > version 1 is used
   * @return The highest version that is both supported by client and backend
   */
  public async useAPIVersion(min: number, max: number, allowDev?: boolean) {
    const features = await this.apiClient.useVersion(min, max, allowDev);
    this.backendFeatures = features;
    return features;
  }

  private persistCookie(storeEngine: CRUDEngine, cookie: Cookie): Promise<string> {
    const entity = {expiration: cookie.expiration, zuid: cookie.zuid};
    return storeEngine.updateOrCreate(AUTH_TABLE_NAME, AUTH_COOKIE_KEY, entity);
  }

  public async enrollE2EI({
    displayName,
    handle,
    teamId,
    discoveryUrl,
    getOAuthToken,
    certificateTtl = 90 * (TimeInMillis.DAY / 1000),
  }: {
    /** display name of the user (should match the identity provider) */
    displayName: string;
    /** handle of the user (should match the identity provider) */
    handle: string;
    /** team of the user */
    teamId: string;
    discoveryUrl: string;
    /** function called to get the oauth token */
    getOAuthToken: getTokenCallback;
    /** number of seconds the certificate should be valid (default 90 days) */
    certificateTtl?: number;
  }) {
    const context = this.apiClient.context;
    const domain = context?.domain ?? '';

    if (!this.currentClient) {
      throw new Error('Client has not been initialized - please login first');
    }

    if (!this.service?.mls || !this.service?.e2eIdentity) {
      throw new Error('MLS not initialized, unable to enroll E2EI');
    }

    const user: User = {
      displayName,
      handle,
      domain,
      teamId,
      id: this.userId,
    };

    return this.service.mls.enrollE2EI(
      discoveryUrl,
      user,
      this.currentClient,
      this.options.nbPrekeys,
      certificateTtl,
      getOAuthToken,
    );
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
   * Will init the core with an already logged in user
   *
   * @param clientType The type of client the user is using (temporary or permanent)
   */
  public async init(clientType: ClientType, {cookie}: InitOptions = {}): Promise<Context> {
    const context = await this.apiClient.init(clientType, cookie);
    await this.initServices(context);
    return context;
  }

  /**
   * Will log the user in with the given credential.
   *
   * @param loginData The credentials of the user
   * @param clientInfo Info about the client to create (name, type...)
   */
  public async login(loginData: LoginData): Promise<Context> {
    this.resetContext();
    LoginSanitizer.removeNonPrintableCharacters(loginData);

    const context = await this.apiClient.login(loginData);
    await this.initServices(context);

    return context;
  }

  /**
   * Will register a new client for the current user
   */
  public async registerClient(
    loginData: LoginData,
    clientInfo: ClientInfo = coreDefaultClient,
    /** will add extra manual entropy to the client's identity being created */
    entropyData?: Uint8Array,
  ): Promise<RegisteredClient> {
    if (!this.service || !this.apiClient.context || !this.storeEngine) {
      throw new Error('Services are not set or context not initialized.');
    }
    // we reset the services to re-instantiate a new CryptoClient instance
    await this.initServices(this.apiClient.context);
    const initialPreKeys = await this.service.proteus.createClient(entropyData);

    const client = await this.service.client.register(loginData, clientInfo, initialPreKeys);
    const clientId = client.id;

    await this.service.notification.initializeNotificationStream(clientId);
    await this.service.client.synchronizeClients(clientId);
    return client;
  }

  public getLocalClient() {
    return this.service?.client.loadClient();
  }

  /**
   * Will initiate all the cryptographic material of the given registered device and setup all the background tasks.
   *
   * @returns The local existing client or undefined if the client does not exist or is not valid (non existing on backend)
   */
  public async initClient(client: RegisteredClient, willEnrollE2ei: boolean = false) {
    if (!this.service || !this.apiClient.context || !this.storeEngine) {
      throw new Error('Services are not set.');
    }
    this.apiClient.context.clientId = client.id;

    // Call /access endpoint with client_id after client initialisation
    await this.apiClient.transport.http.associateClientWithSession(client.id);

    await this.service.proteus.initClient(this.storeEngine, this.apiClient.context);
    if (this.service.mls) {
      const {userId, domain = ''} = this.apiClient.context;
      await this.service.mls.initClient({id: userId, domain}, client, willEnrollE2ei);
      // initialize schedulers for pending mls proposals once client is initialized
      await this.service.mls.initialisePendingProposalsTasks();

      // initialize scheduler for syncing key packages with backend
      await this.service.mls.schedulePeriodicKeyPackagesBackendSync(client.id);

      // leave stale conference subconversations (e.g after a crash)
      await this.service.subconversation.leaveStaleConferenceSubconversations();
    }

    this.currentClient = client;
    return client;
  }

  private async buildCryptoClient(context: Context, storeEngine: CRUDEngine, encryptedStore: EncryptedStore) {
    const baseConfig = {
      nbPrekeys: this.options.nbPrekeys,
      onNewPrekeys: async (prekeys: PreKey[]) => {
        this.logger.debug(`Received '${prekeys.length}' new PreKeys.`);

        await this.apiClient.api.client.putClient(context.clientId!, {prekeys});
        this.logger.debug(`Successfully uploaded '${prekeys.length}' PreKeys.`);
      },
    };

    const coreCryptoConfig = this.coreCryptoConfig;
    if (coreCryptoConfig) {
      const {buildClient} = await import('./messagingProtocols/proteus/ProteusService/CryptoClient/CoreCryptoWrapper');
      const client = await buildClient(storeEngine, {
        ...baseConfig,
        ...coreCryptoConfig,
        generateSecretKey: keyId => generateSecretKey({keyId, keySize: 16, secretsDb: encryptedStore}),
      });
      return [CryptoClientType.CORE_CRYPTO, client] as const;
    }

    const {buildClient} = await import('./messagingProtocols/proteus/ProteusService/CryptoClient/CryptoboxWrapper');
    const client = buildClient(storeEngine, baseConfig);
    return [CryptoClientType.CRYPTOBOX, client] as const;
  }

  /**
   * In order to be able to send MLS messages, the core needs a few information from the consumer.
   * Namely:
   * - is the current user allowed to administrate a specific conversation
   * - what is the groupId of a conversation
   * @param coreCallbacks
   */
  configureCoreCallbacks(coreCallbacks: CoreCallbacks) {
    this.coreCallbacks = coreCallbacks;
  }

  public async initServices(context: Context): Promise<void> {
    const encryptedStoreName = this.generateEncryptedDbName(context);
    this.encryptedDb = this.options.systemCrypto
      ? await createCustomEncryptedStore(encryptedStoreName, this.options.systemCrypto)
      : await createEncryptedStore(encryptedStoreName);
    this.db = await openDB(this.generateCoreDbName(context));
    this.storeEngine = await this.initEngine(context, this.encryptedDb);

    const accountService = new AccountService(this.apiClient);
    const assetService = new AssetService(this.apiClient);

    const [clientType, cryptoClient] = await this.buildCryptoClient(context, this.storeEngine, this.encryptedDb);
    this.logger.info(`CryptoClient of type ${clientType} created (version ${cryptoClient.version})`);

    let mlsService: MLSService | undefined;
    let e2eServiceExternal: E2EIServiceExternal | undefined;

    const proteusService = new ProteusService(this.apiClient, cryptoClient, {
      onNewClient: payload => this.emit(EVENTS.NEW_SESSION, payload),
      nbPrekeys: this.options.nbPrekeys,
    });

    const clientService = new ClientService(this.apiClient, proteusService, this.storeEngine);

    if (clientType === CryptoClientType.CORE_CRYPTO && (await this.isMlsEnabled())) {
      mlsService = new MLSService(
        this.apiClient,
        cryptoClient.getNativeClient(),
        this.db,
        this.recurringTaskScheduler,
        {
          ...this.coreCryptoConfig?.mls,
        },
      );

      e2eServiceExternal = new E2EIServiceExternal(
        cryptoClient.getNativeClient(),
        this.db,
        this.recurringTaskScheduler,
        clientService,
        mlsService,
      );
    }

    const connectionService = new ConnectionService(this.apiClient);
    const giphyService = new GiphyService(this.apiClient);
    const linkPreviewService = new LinkPreviewService(assetService);
    const subconversationService = new SubconversationService(this.apiClient, this.db, mlsService);
    const conversationService = new ConversationService(
      this.apiClient,
      proteusService,
      this.db,
      this.groupIdFromConversationId,
      subconversationService,
      mlsService,
    );
    const notificationService = new NotificationService(this.apiClient, this.storeEngine, conversationService);

    const selfService = new SelfService(this.apiClient);
    const teamService = new TeamService(this.apiClient);

    const broadcastService = new BroadcastService(this.apiClient, proteusService);
    const userService = new UserService(this.apiClient);

    this.service = {
      e2eIdentity: e2eServiceExternal,
      mls: mlsService,
      proteus: proteusService,
      account: accountService,
      asset: assetService,
      broadcast: broadcastService,
      client: clientService,
      connection: connectionService,
      conversation: conversationService,
      subconversation: subconversationService,
      giphy: giphyService,
      linkPreview: linkPreviewService,
      notification: notificationService,
      self: selfService,
      team: teamService,
      user: userService,
    };
  }

  private resetContext(): void {
    this.currentClient = undefined;
    delete this.apiClient.context;
    delete this.service;
  }

  /**
   * Will logout the current user
   * @param clearData if set to `true` will completely wipe any database that was created by the Account
   */
  public async logout(clearData: boolean = false): Promise<void> {
    this.db?.close();
    this.encryptedDb?.close();
    if (clearData) {
      await this.wipe();
    }
    await this.apiClient.logout();
    this.resetContext();
  }

  /**
   * Will delete the identity of the current user
   */
  private async wipe(): Promise<void> {
    await this.service?.proteus.wipe(this.storeEngine);
    if (this.db) {
      await deleteDB(this.db);
    }
    await this.encryptedDb?.wipe();
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
    onEvent?: (payload: HandledEventPayload, source: NotificationSource) => void;

    /**
     * During the notification stream processing, this function will be called whenever a new notification has been processed
     */
    onNotificationStreamProgress?: ({done, total}: {done: number; total: number}) => void;

    /**
     * called when the connection state with the backend has changed
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
    if (!this.currentClient) {
      throw new Error('Client has not been initialized - please login first');
    }

    const handleEvent = async (payload: HandledEventPayload, source: NotificationSource) => {
      const {event} = payload;
      switch (event?.type) {
        case CONVERSATION_EVENT.MESSAGE_TIMER_UPDATE: {
          const {
            data: {message_timer},
            conversation,
          } = event as Events.ConversationMessageTimerUpdateEvent;
          const expireAfterMillis = Number(message_timer);
          this.service!.conversation.messageTimer.setConversationLevelTimer(conversation, expireAfterMillis);
          break;
        }
      }
      await onEvent(payload, source);
    };

    const handleNotification = async (notification: Notification, source: NotificationSource): Promise<void> => {
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
      handleNotification(notification, NotificationSource.WEBSOCKET),
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

    const handleMissedNotifications = async (notificationId: string) => {
      if (this.service?.mls) {
        queueConversationRejoin('all-conversations', () =>
          this.service!.conversation.handleConversationsEpochMismatch(),
        );
      }
      return onMissedNotifications(notificationId);
    };

    const processNotificationStream = async (abortHandler: AbortHandler) => {
      // Lock websocket in order to buffer any message that arrives while we handle the notification stream
      this.apiClient.transport.ws.lock();
      pauseMessageSending();
      // We want to avoid triggering rejoins of out-of-sync MLS conversations while we are processing the notification stream
      pauseRejoiningMLSConversations();
      onConnectionStateChanged(ConnectionState.PROCESSING_NOTIFICATIONS);

      const results = await this.service!.notification.processNotificationStream(
        async (notification, source, progress) => {
          await handleNotification(notification, source);
          onNotificationStreamProgress(progress);
        },
        handleMissedNotifications,
        abortHandler,
      );
      this.logger.info(`Finished processing notifications ${JSON.stringify(results)}`, results);

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
      resumeRejoiningMLSConversations();
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

  private generateCoreDbName(context: Context) {
    return `core-${this.generateDbName(context)}`;
  }

  private generateEncryptedDbName(context: Context) {
    return `secrets-${this.generateDbName(context)}`;
  }

  private async initEngine(context: Context, encryptedStore: EncryptedStore): Promise<CRUDEngine> {
    const dbName = this.generateDbName(context);
    this.logger.log(`Initialising store with name "${dbName}"...`);
    const openDb = async () => {
      const dbKey = await generateSecretKey({keyId: 'db-key', keySize: 32, secretsDb: encryptedStore});
      const initializedDb = await this.options.createStore?.(dbName, dbKey.key);
      if (initializedDb) {
        this.logger.info(`Initialized store with existing engine "${dbName}".`);
        return initializedDb;
      }
      this.logger.info(`Initialized store with new memory engine "${dbName}".`);
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

  private groupIdFromConversationId = async (
    conversationId: QualifiedId,
    subconversationId?: SUBCONVERSATION_ID,
  ): Promise<string | undefined> => {
    if (!subconversationId) {
      return this.coreCallbacks?.groupIdFromConversationId(conversationId);
    }

    return this.service?.subconversation.getSubconversationGroupId(conversationId, subconversationId);
  };
}
