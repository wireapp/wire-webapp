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
import {ClientCapability, ClientClassification, ClientType, RegisteredClient} from '@wireapp/api-client/lib/client/';
import {SUBCONVERSATION_ID} from '@wireapp/api-client/lib/conversation';
import * as Events from '@wireapp/api-client/lib/event';
import {CONVERSATION_EVENT} from '@wireapp/api-client/lib/event';
import {Notification} from '@wireapp/api-client/lib/notification/';
import {
  ConsumableEvent,
  ConsumableNotification,
  ConsumableNotificationEvent,
  ConsumableNotificationSynchronization,
} from '@wireapp/api-client/lib/notification/ConsumableNotification';
import {WebSocketClient} from '@wireapp/api-client/lib/tcp/';
import {WEBSOCKET_STATE} from '@wireapp/api-client/lib/tcp/ReconnectingWebsocket';
import {FEATURE_KEY, FeatureStatus} from '@wireapp/api-client/lib/team';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {TimeInMillis} from '@wireapp/commons/lib/util/TimeUtil';
import logdown from 'logdown';

import {APIClient, BackendFeatures} from '@wireapp/api-client';
import {LogFactory, TypedEventEmitter} from '@wireapp/commons';
import {PromiseQueue} from '@wireapp/promise-queue';
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
import {CoreCryptoConfig} from './messagingProtocols/common.types';
import {InitClientOptions, MLSService} from './messagingProtocols/mls';
import {
  pauseRejoiningMLSConversations,
  queueConversationRejoin,
  resumeRejoiningMLSConversations,
} from './messagingProtocols/mls/conversationRejoinQueue';
import {E2EIServiceExternal, User} from './messagingProtocols/mls/E2EIdentityService';
import {
  getAllConversationsCallback,
  getTokenCallback,
} from './messagingProtocols/mls/E2EIdentityService/E2EIServiceInternal';
import {
  flushProposalsQueue,
  getProposalQueueLength,
  pauseProposalProcessing,
  resumeProposalProcessing,
} from './messagingProtocols/mls/EventHandler/events/messageAdd/IncomingProposalsQueue';
import {CoreCallbacks, SecretCrypto} from './messagingProtocols/mls/types';
import {NewClient, ProteusService} from './messagingProtocols/proteus';
import {CryptoClientType} from './messagingProtocols/proteus/ProteusService/CryptoClient';
import {wipeCoreCryptoDb} from './messagingProtocols/proteus/ProteusService/CryptoClient/CoreCryptoWrapper';
import {deleteIdentity} from './messagingProtocols/proteus/ProteusService/identityClearer';
import {HandledEventPayload, NotificationService, NotificationSource} from './notification/';
import {createCustomEncryptedStore, createEncryptedStore, EncryptedStore} from './secretStore/encryptedStore';
import {generateSecretKey} from './secretStore/secretKeyGenerator';
import {SelfService} from './self/';
import {CoreDatabase, deleteDB, openDB} from './storage/CoreDB';
import {TeamService} from './team/';
import {UserService} from './user/';
import {LocalStorageStore} from './util/LocalStorageStore';
import {RecurringTaskScheduler} from './util/RecurringTaskScheduler';

export type ProcessedEventPayload = HandledEventPayload;

export enum ConnectionState {
  /** The WebSocket is closed and no notifications are being processed */
  CLOSED = 'closed',

  /** The WebSocket is being opened or reconnected */
  CONNECTING = 'connecting',

  /** The websocket is open but locked and notifications stream is being processed */
  PROCESSING_NOTIFICATIONS = 'processing_notifications',

  /** The WebSocket is open and new messages are processed live in real time */
  LIVE = 'live',
}

export type CreateStoreFn = (storeName: string, key: Uint8Array) => undefined | Promise<CRUDEngine | undefined>;

interface AccountOptions {
  /** Used to store info in the database (will create a inMemory engine if returns undefined) */
  createStore?: CreateStoreFn;
  systemCrypto?: SecretCrypto;
  coreCryptoConfig?: CoreCryptoConfig;

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

export enum EVENTS {
  /**
   * event triggered when a message from an unknown client is received.
   * An unknown client is a client we don't yet have a session with
   */
  NEW_SESSION = 'new_session',
}

type Events = {
  [EVENTS.NEW_SESSION]: NewClient;
};

export const AccountLocalStorageStore = LocalStorageStore('core_account');

export class Account extends TypedEventEmitter<Events> {
  private readonly apiClient: APIClient;
  private readonly logger: logdown.Logger;
  /** this is the client the consumer is currently using. Will be set as soon as `initClient` is called and will be rest upon logout */
  private currentClient?: RegisteredClient;
  private storeEngine?: CRUDEngine;
  private db?: CoreDatabase;
  private encryptedDb?: EncryptedStore<any>;
  private coreCallbacks?: CoreCallbacks;
  private connectionState: ConnectionState = ConnectionState.CLOSED;

  private readonly notificationProcessingQueue = new PromiseQueue({
    name: 'notification-processing-queue',
    paused: true,
  });

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
    private readonly options: AccountOptions = {
      nbPrekeys: 100,
      coreCryptoConfig: {wasmFilePath: '', enabled: false},
    },
  ) {
    super();
    this.apiClient = apiClient;
    this.backendFeatures = this.apiClient.backendFeatures;
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

    this.logger = LogFactory.getLogger('@wireapp/core/Account');
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
  public useAPIVersion = async (min: number, max: number, allowDev?: boolean) => {
    const features = await this.apiClient.useVersion(min, max, allowDev);
    this.backendFeatures = features;
    return features;
  };

  private readonly persistCookie = (storeEngine: CRUDEngine, cookie: Cookie): Promise<string> => {
    const entity = {expiration: cookie.expiration, zuid: cookie.zuid};
    return storeEngine.updateOrCreate(AUTH_TABLE_NAME, AUTH_COOKIE_KEY, entity);
  };

  public enrollE2EI = async ({
    displayName,
    handle,
    teamId,
    discoveryUrl,
    getOAuthToken,
    getAllConversations,
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
    /** function called to get all conversations */
    getAllConversations: getAllConversationsCallback;
    /** number of seconds the certificate should be valid (default 90 days) */
    certificateTtl?: number;
  }) => {
    const context = this.apiClient.context;
    const domain = context?.domain ?? '';

    if (!this.currentClient) {
      throw new Error('Client has not been initialized - please login first');
    }

    if (!this.service?.mls?.isEnabled || !this.service?.e2eIdentity) {
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
      getAllConversations,
    );
  };

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
  public register = async (registration: RegisterData, clientType: ClientType): Promise<Context> => {
    const context = await this.apiClient.register(registration, clientType);
    await this.initServices(context);
    return context;
  };

  /**
   * Will init the core with an already logged in user
   *
   * @param clientType The type of client the user is using (temporary or permanent)
   */
  public init = async (clientType: ClientType, {cookie}: InitOptions = {}): Promise<Context> => {
    const context = await this.apiClient.init(clientType, cookie);
    await this.initServices(context);
    return context;
  };

  /**
   * Will log the user in with the given credential.
   *
   * @param loginData The credentials of the user
   * @param clientInfo Info about the client to create (name, type...)
   */
  public login = async (loginData: LoginData): Promise<Context> => {
    this.resetContext();
    LoginSanitizer.removeNonPrintableCharacters(loginData);

    const context = await this.apiClient.login(loginData);
    await this.initServices(context);
    return context;
  };

  /**
   * Will register a new client for the current user
   */
  public registerClient = async (
    loginData: LoginData,
    useLegacyNotificationStream: boolean,
    /** will add extra manual entropy to the client's identity being created */
    entropyData?: Uint8Array,
    clientInfo: ClientInfo = coreDefaultClient,
  ): Promise<RegisteredClient> => {
    if (!this.service || !this.apiClient.context || !this.storeEngine) {
      throw new Error('Services are not set or context not initialized.');
    }

    if (typeof useLegacyNotificationStream !== 'boolean') {
      throw new Error('use of legacy notifications must be explicitly set to true or false');
    }

    // we reset the services to re-instantiate a new CryptoClient instance
    await this.initServices(this.apiClient.context);

    const initialPreKeys = await this.service.proteus.createClient(entropyData);

    const client = await this.service.client.register(
      loginData,
      clientInfo,
      initialPreKeys,
      useLegacyNotificationStream,
    );
    const clientId = client.id;

    if (useLegacyNotificationStream) {
      await this.service.notification.legacyInitializeNotificationStream(clientId);
    }
    await this.service.client.synchronizeClients(clientId);
    return client;
  };

  public getLocalClient() {
    return this.service?.client.loadClient();
  }

  /**
   * Will initiate all the cryptographic material of the given registered device and setup all the background tasks.
   *
   * @returns The local existing client or undefined if the client does not exist or is not valid (non existing on backend)
   */
  public initClient = async (client: RegisteredClient, mlsConfig?: InitClientOptions) => {
    if (!this.service || !this.apiClient.context || !this.storeEngine) {
      throw new Error('Services are not set.');
    }
    this.apiClient.context.clientId = client.id;

    // Call /access endpoint with client_id after client initialisation
    await this.apiClient.transport.http.associateClientWithSession(client.id);

    await this.service.proteus.initClient(this.apiClient.context);

    if ((await this.isMLSActiveForClient()) && this.service.mls && mlsConfig) {
      const {userId, domain = ''} = this.apiClient.context;
      await this.service.mls.initClient({id: userId, domain}, client, mlsConfig);
      // initialize schedulers for pending mls proposals once client is initialized
      await this.service.mls.initialisePendingProposalsTasks();

      // initialize scheduler for syncing key packages with backend
      await this.service.mls.schedulePeriodicKeyPackagesBackendSync(client.id);

      // leave stale conference subconversations (e.g after a crash)
      await this.service.subconversation.leaveStaleConferenceSubconversations();
    }

    this.currentClient = client;
    return client;
  };

  private readonly buildCryptoClient = async (
    context: Context,
    storeEngine: CRUDEngine,
    encryptedStore: EncryptedStore,
  ) => {
    const baseConfig = {
      nbPrekeys: this.options.nbPrekeys,
      onNewPrekeys: async (prekeys: PreKey[]) => {
        this.logger.debug(`Received '${prekeys.length}' new PreKeys.`);

        await this.apiClient.api.client.putClient(context.clientId!, {prekeys});
        this.logger.debug(`Successfully uploaded '${prekeys.length}' PreKeys.`);
      },
    };

    if (this.options.coreCryptoConfig?.enabled) {
      const {buildClient} = await import('./messagingProtocols/proteus/ProteusService/CryptoClient/CoreCryptoWrapper');
      const client = await buildClient(
        storeEngine,
        {
          ...baseConfig,
          generateSecretKey: (keyId, keySize) => generateSecretKey({keyId, keySize, secretsDb: encryptedStore}),
        },
        this.options.coreCryptoConfig,
      );
      return [CryptoClientType.CORE_CRYPTO, client] as const;
    }

    const {buildClient} = await import('./messagingProtocols/proteus/ProteusService/CryptoClient/CryptoboxWrapper');
    const client = buildClient(storeEngine, baseConfig);
    return [CryptoClientType.CRYPTOBOX, client] as const;
  };

  /**
   * In order to be able to send MLS messages, the core needs a few information from the consumer.
   * Namely:
   * - is the current user allowed to administrate a specific conversation
   * - what is the groupId of a conversation
   * @param coreCallbacks
   */
  configureCoreCallbacks = (coreCallbacks: CoreCallbacks) => {
    this.coreCallbacks = coreCallbacks;
  };

  private readonly initServices = async (context: Context): Promise<void> => {
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

    const proteusService = new ProteusService(
      this.apiClient,
      cryptoClient,
      {
        onNewClient: payload => this.emit(EVENTS.NEW_SESSION, payload),
        nbPrekeys: this.options.nbPrekeys,
      },
      this.storeEngine,
    );

    const clientService = new ClientService(this.apiClient, proteusService, this.storeEngine);

    if (clientType === CryptoClientType.CORE_CRYPTO && (await this.apiClient.supportsMLS())) {
      mlsService = new MLSService(this.apiClient, cryptoClient.getNativeClient(), this.db, this.recurringTaskScheduler);

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
  };

  private readonly resetContext = (): void => {
    this.currentClient = undefined;
    delete this.apiClient.context;
    delete this.service;
  };

  /**
   * Will logout the current user
   * @param clearData if set to `true` will completely wipe any database that was created by the Account
   */
  public logout = async (data?: {clearAllData?: boolean; clearCryptoData?: boolean}): Promise<void> => {
    this.db?.close();
    this.encryptedDb?.close();

    if (data?.clearAllData) {
      await this.wipeAllData();
    } else if (data?.clearCryptoData) {
      await this.wipeCryptoData();
    }

    await this.apiClient.logout();
    this.resetContext();
  };

  private readonly wipeCommonData = async (): Promise<void> => {
    try {
      await this.service?.client.deleteLocalClient();
    } catch (error) {
      this.logger.error('Failed to delete local client during logout cleanup:', error);
    }

    try {
      if (this.storeEngine) {
        await wipeCoreCryptoDb(this.storeEngine);
      }
    } catch (error) {
      this.logger.error('Failed to wipe crypto database during logout cleanup:', error);
    }

    try {
      // needs to be wiped last
      await this.encryptedDb?.wipe();
    } catch (error) {
      this.logger.error('Failed to delete encrypted database during logout cleanup:', error);
    }
  };

  /**
   * Will delete the identity and history of the current user
   */
  private readonly wipeAllData = async (): Promise<void> => {
    try {
      if (this.storeEngine) {
        await deleteIdentity(this.storeEngine, false);
      }
    } catch (error) {
      this.logger.error('Failed to delete identity during logout cleanup:', error);
    }

    try {
      if (this.db) {
        await deleteDB(this.db);
      }
    } catch (error) {
      this.logger.error('Failed to delete database during logout cleanup:', error);
    }

    await this.wipeCommonData();
  };

  /**
   * Will delete the cryptography and client of the current user
   * Will keep the history intact
   */
  private readonly wipeCryptoData = async (): Promise<void> => {
    try {
      if (this.storeEngine) {
        await deleteIdentity(this.storeEngine, true);
      }
    } catch (error) {
      this.logger.error('Failed to delete identity during logout cleanup:', error);
    }

    await this.wipeCommonData();
  };

  /**
   * return true if the current user has a MLS device that is initialized and ready to use
   */
  public get hasMLSDevice(): boolean {
    return !!this.service?.mls?.isEnabled;
  }

  /**
   * Will download and handle the notification stream since last stored notification id.
   * Once the notification stream has been handled from backend, will then connect to the websocket and start listening to incoming events
   *
   * @param callbacks callbacks that will be called to handle different events
   * @returns close a function that will disconnect from the websocket
   */
  public listen = async ({
    useLegacy,
    onEvent = async () => {},
    onConnectionStateChanged: onConnectionStateChangedCallBack = () => {},
    onNotificationStreamProgress = () => {},
    onMissedNotifications = () => {},
    dryRun = false,
  }: {
    /**
     * Called when a new event arrives from backend
     * @param payload the payload of the event. Contains the raw event received and the decrypted data (if event was encrypted)
     * @param source where the message comes from (either websocket or notification stream)
     */
    onEvent?: (payload: HandledEventPayload, source: NotificationSource) => Promise<void>;

    /**
     * During the notification stream processing, this function will be called whenever a new notification has been processed
     */
    onNotificationStreamProgress?: (currentProcessingNotificationTimestamp: string) => void;

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
     * When set to true, will use the legacy notification stream instead of the new async notifications.
     */
    useLegacy?: boolean;

    /**
     * When set will not decrypt and not store the last notification ID. This is useful if you only want to subscribe to unencrypted backend events
     */
    dryRun?: boolean;
  } = {}): Promise<() => void> => {
    if (!this.currentClient) {
      throw new Error('Client has not been initialized - please login first');
    }

    if (typeof useLegacy !== 'boolean') {
      throw new Error('use of legacy notifications must be explicitly set to true or false');
    }

    const onConnectionStateChanged = this.createConnectionStateChangedHandler(onConnectionStateChangedCallBack);

    const handleEvent = this.createEventHandler(onEvent);

    const handleLegacyNotification = this.createLegacyNotificationHandler(
      handleEvent,
      onNotificationStreamProgress,
      dryRun,
    );
    const handleNotification = this.createNotificationHandler(
      handleEvent,
      onNotificationStreamProgress,
      onConnectionStateChanged,
      dryRun,
    );

    const handleMissedNotifications = this.createLegacyMissedNotificationsHandler(onMissedNotifications);
    const legacyProcessNotificationStream = this.createLegacyNotificationStreamProcessor({
      handleLegacyNotification,
      handleMissedNotifications,
      onConnectionStateChanged,
    });

    this.setupWebSocketListeners(onConnectionStateChanged, handleNotification, handleLegacyNotification);

    const isClientCapableOfConsumableNotifications = this.getClientCapabilities().includes(
      ClientCapability.CONSUMABLE_NOTIFICATIONS,
    );

    const capabilities = [ClientCapability.LEGAL_HOLD_IMPLICIT_CONSENT];

    if (!useLegacy) {
      // let the backend now client is capable of consumable notifications
      capabilities.push(ClientCapability.CONSUMABLE_NOTIFICATIONS);
      this.apiClient.transport.ws.useAsyncNotificationsSocket();
    }

    await this.service?.client.putClientCapabilities(this.currentClient.id, {capabilities});

    /*
     * When enabling async notifications, be aware that the backend maintains a separate queue
     * for new async notifications (/events weboscket endpoint), which only starts populating *after* the client declares support
     * for async notifications.
     *
     * Therefore, after declaring support, it's necessary to perform one final fetch from the legacy
     * system to ensure no notifications are missed—since older notifications won't
     * appear in the new queue.
     *
     * These two systems are separate, and the transition timing
     * is important to avoid missing any messages during the switch.
     *
     * @todo This can be removed when all clients are capable of consumable notifications.
     */
    if (!isClientCapableOfConsumableNotifications && !useLegacy) {
      // do the last legacy sync without connecting to any websockets
      await legacyProcessNotificationStream();
    }

    if (useLegacy) {
      /**
       * immediately lock the websocket to prevent any new messages from being received
       * before legacy notifications endpoint is fetched otherwise it'll update the last notification ID
       * and fetching legacy notifications will return an empty list
       */
      this.apiClient.transport.ws.lock();
    }
    this.apiClient.connect(async abortController => {
      /**
       * This is to avoid passing proposals too early to core crypto
       * @See WPB-18995
       */
      pauseProposalProcessing();
      pauseMessageSending(); // pause message sending while processing notifications, it will be resumed once the processing is done and we have the marker token
      /**
       * resume the notification processing queue
       * it will start processing notifications immediately and pause if web socket connection drops
       * we should start decryption and therefore acknowledging the notifications in order for the backend to
       * send us the next batch of notifications, currently total size of notifications coming from web socket is limited to 500
       * so we need to acknowledge the notifications to let the backend know we are ready for the next batch
       */
      this.notificationProcessingQueue.resume();

      if (useLegacy) {
        await legacyProcessNotificationStream(abortController);
      }
    });

    return () => {
      flushProposalsQueue();
      this.pauseAndFlushNotificationQueue();
      this.apiClient.disconnect();
      onConnectionStateChanged(ConnectionState.CLOSED);
      this.apiClient.transport.ws.removeAllListeners();
    };
  };

  private readonly createConnectionStateChangedHandler = (
    onConnectionStateChanged: (state: ConnectionState) => void,
  ): ((state: ConnectionState) => void) => {
    return (state: ConnectionState): void => {
      this.connectionState = state;
      onConnectionStateChanged(state);
      this.logger.info(`Connection state changed to: ${state}`);
    };
  };

  /**
   * Creates the event handler that is invoked for each decrypted event from the backend.
   * Responsible for handling specific event types like `MESSAGE_TIMER_UPDATE`, and then
   * forwarding the event to the consumer via the `onEvent` callback.
   */
  private readonly createEventHandler = (
    onEvent: (payload: HandledEventPayload, source: NotificationSource) => Promise<void>,
  ) => {
    return async (payload: HandledEventPayload, source: NotificationSource) => {
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

      // Always forward the event to the consumer
      await onEvent(payload, source);
    };
  };

  /**
   * @deprecated This method is used to handle legacy notifications from the backend.
   * It processes notifications from the legacy system, decrypts them, and emits events.
   * It can be replaced with the new notification handling system using `ConsumableNotification`
   * when all clients are capable of handling consumable notifications.
   */
  private readonly createLegacyNotificationHandler = (
    handleEvent: (payload: HandledEventPayload, source: NotificationSource) => Promise<void>,
    onNotificationStreamProgress: (currentProcessingNotificationTimestamp: string) => void,
    dryRun: boolean,
  ) => {
    return async (notification: Notification, source: NotificationSource): Promise<void> => {
      void this.notificationProcessingQueue
        .push(async () => {
          try {
            const start = Date.now();
            const notificationTime = this.getNotificationEventTime(notification.payload[0]);
            this.logger.info(`Processing legacy notifwication "${notification.id}" at ${notificationTime}`, {
              notification,
            });
            this.logger.info(`Total notifications queue length: ${this.notificationProcessingQueue.getLength()}`);
            this.logger.info(`Total pending proposals queue length: ${getProposalQueueLength()}`);
            if (notificationTime) {
              onNotificationStreamProgress(notificationTime);
            }

            const messages = this.service!.notification.handleNotification(notification, source, dryRun);

            for await (const message of messages) {
              await handleEvent(message, source);
            }

            this.logger.info(`Finished processing legacy notification "${notification.id}" in ${Date.now() - start}ms`);
          } catch (error) {
            this.logger.error(
              `Failed to handle legacy notification "${notification.id}": ${(error as any).message}`,
              error,
            );
          }
        })
        .catch(this.handleNotificationQueueError);
    };
  };

  private readonly createNotificationHandler = (
    handleEvent: (payload: HandledEventPayload, source: NotificationSource) => Promise<void>,
    onNotificationStreamProgress: (currentProcessingNotificationTimestamp: string) => void,
    onConnectionStateChanged: (state: ConnectionState) => void,
    dryRun: boolean,
  ) => {
    return async (notification: ConsumableNotification, source: NotificationSource): Promise<void> => {
      try {
        if (notification.type === ConsumableEvent.MISSED) {
          this.reactToMissedNotification();
          return;
        }

        if (notification.type === ConsumableEvent.SYNCHRONIZATION) {
          this.notificationProcessingQueue
            .push(() => this.handleSynchronizationNotification(notification, onConnectionStateChanged))
            .catch(this.handleNotificationQueueError);
          return;
        }

        this.notificationProcessingQueue
          .push(() =>
            this.decryptAckEmitNotification(notification, handleEvent, source, onNotificationStreamProgress, dryRun),
          )
          .catch(this.handleNotificationQueueError);
      } catch (error) {
        this.logger.error(`Failed to handle notification "${notification.type}": ${(error as any).message}`, error);
      }
    };
  };

  private readonly handleNotificationQueueError = (error: unknown) => {
    if (!(error instanceof Error)) {
      throw error;
    }

    switch (error.cause) {
      case PromiseQueue.ERROR_CAUSES.TIMEOUT:
        this.logger.warn('Notification decryption task timed out', error);
        break;
      case PromiseQueue.ERROR_CAUSES.FLUSHED:
        this.logger.info('Notification processing queue was flushed, ignoring error', error);
        break;
    }
  };

  private readonly acknowledgeSynchronizationNotification = (notification: ConsumableNotificationSynchronization) => {
    this.apiClient.transport.ws.acknowledgeConsumableNotificationSynchronization(notification);
  };

  private readonly handleSynchronizationNotification = async (
    notification: ConsumableNotificationSynchronization,
    onConnectionStateChanged: (state: ConnectionState) => void,
  ) => {
    this.acknowledgeSynchronizationNotification(notification);

    const markerId = notification.data.marker_id;
    const currentMarkerId = this.apiClient.transport.http.accessTokenStore.markerToken;

    /**
     * There is a chance that there might be multiple synchronization notifications (markers)
     * in the queue in case websocket connection drops a few times
     * Hence we only want to resume message sending and set the connection state to LIVE
     * if the marker ID matches the current marker ID.
     */
    if (markerId === currentMarkerId) {
      resumeProposalProcessing();
      resumeMessageSending();
      onConnectionStateChanged(ConnectionState.LIVE);
    }
  };

  private readonly decryptAckEmitNotification = async (
    notification: ConsumableNotificationEvent,
    handleEvent: (payload: HandledEventPayload, source: NotificationSource) => Promise<void>,
    source: NotificationSource,
    onNotificationStreamProgress: (currentProcessingNotificationTimestamp: string) => void,
    dryRun: boolean,
  ): Promise<void> => {
    try {
      const payloads = this.service!.notification.handleNotification(notification.data.event, source, dryRun);

      const notificationTime = this.getNotificationEventTime(notification.data.event.payload[0]);
      if (this.connectionState !== ConnectionState.LIVE && notificationTime) {
        onNotificationStreamProgress(notificationTime);
      }

      for await (const payload of payloads ?? []) {
        await handleEvent(payload, source);
      }

      if (!dryRun) {
        this.apiClient.transport.ws.acknowledgeNotification(notification);
      }
    } catch (err) {
      this.logger.error(`Failed to process notification ${notification.data.delivery_tag}`, err);
    }
  };

  public getNotificationEventTime = (backendEvent: Events.BackendEvent) => {
    if ('time' in backendEvent && typeof backendEvent.time === 'string') {
      return backendEvent.time;
    }

    return null;
  };

  /**
   * Returns a function to handle missed notifications — i.e., when the backend indicates
   * that some notifications were lost due to age (typically >28 days).
   * Also handles MLS-specific epoch mismatch recovery by triggering a conversation rejoin.
   *
   * @deprecated This is used to handle legacy missed notifications.
   * It should be replaced with the new notification handling system using `ConsumableNotification`.
   * when all clients are capable of handling consumable notifications.
   */
  private readonly createLegacyMissedNotificationsHandler = (
    onMissedNotifications: (notificationId: string) => void,
  ) => {
    return async (notificationId: string) => {
      if (this.hasMLSDevice) {
        void queueConversationRejoin('all-conversations', () =>
          this.service!.conversation.handleConversationsEpochMismatch(),
        );
      }

      return onMissedNotifications(notificationId);
    };
  };

  /**
   * Returns a processor function for the notification stream (legacy sync).
   * It pauses message sending and MLS rejoining during stream handling to prevent race conditions,
   * then resumes normal operations after sync is complete.
   *
   * @deprecated This is used to do a final sync of the legacy notification stream
   * before switching to the new notification handling system using `ConsumableNotification`.
   * It should be replaced with the new notification handling system when all clients are capable of handling consumable notifications.
   *
   * @param handlers Various logic handlers wired to notification callbacks
   */
  private readonly createLegacyNotificationStreamProcessor = ({
    handleLegacyNotification,
    handleMissedNotifications,
    onConnectionStateChanged,
  }: {
    handleLegacyNotification: (notification: Notification, source: NotificationSource) => Promise<void>;
    handleMissedNotifications: (notificationId: string) => Promise<void>;
    onConnectionStateChanged: (state: ConnectionState) => void;
  }) => {
    return async (abortController?: AbortController) => {
      this.apiClient.transport.ws.lock();
      pauseProposalProcessing();
      pauseMessageSending();
      // We want to avoid triggering rejoins of out-of-sync MLS conversations while we are processing the notification stream
      pauseRejoiningMLSConversations();
      onConnectionStateChanged(ConnectionState.PROCESSING_NOTIFICATIONS);

      const results = await this.service!.notification.legacyProcessNotificationStream(
        async (notification, source) => {
          await handleLegacyNotification(notification, source);
        },
        handleMissedNotifications,
        abortController,
      );

      this.logger.info(
        'Finished inserting notifications for decryption from the legacy endpoint to the process queue',
        results,
      );

      // We need to wait for the notification stream to be fully handled before releasing the message sending queue.
      // This is due to the nature of how message are encrypted, any change in mls epoch needs to happen before we start encrypting any kind of messages
      void this.notificationProcessingQueue
        .push(async () => {
          this.logger.info(`Resuming message sending. ${getQueueLength()} messages to be sent`);
          resumeProposalProcessing();
          resumeMessageSending();
          resumeRejoiningMLSConversations();
          onConnectionStateChanged(ConnectionState.LIVE);
          this.apiClient.transport.ws.unlock();
        })
        .catch(this.handleNotificationQueueError);
    };
  };

  /**
   * In case of a closed connection, we flush the notification processing queue.
   * As we are not acknowledging them before decryption is done
   * they will be resent next time the connection is opened
   * this is to avoid duplicate decryption of notifications
   */
  private readonly pauseAndFlushNotificationQueue = () => {
    this.notificationProcessingQueue.pause();
    this.notificationProcessingQueue.flush();
    this.logger.info('Notification processing queue paused and flushed');
  };

  /**
   * Sets up WebSocket event listeners for:
   * - Incoming backend messages
   * - WebSocket state changes
   * On each new backend message, we pass it to the  notification handler.
   * On state changes, we map raw socket states to public connection states and emit them.
   */
  private readonly setupWebSocketListeners = (
    onConnectionStateChanged: (state: ConnectionState) => void,
    handleNotification: (notification: ConsumableNotification, source: NotificationSource) => Promise<void>,
    handleLegacyNotification: (notification: Notification, source: NotificationSource) => Promise<void>,
  ) => {
    this.apiClient.transport.ws.removeAllListeners(WebSocketClient.TOPIC.ON_MESSAGE);

    this.apiClient.transport.ws.on(WebSocketClient.TOPIC.ON_MESSAGE, notification => {
      if (this.checkIsConsumable(notification)) {
        void handleNotification(notification, NotificationSource.WEBSOCKET);
        return;
      }
      void handleLegacyNotification(notification, NotificationSource.WEBSOCKET);
    });

    this.apiClient.transport.ws.on(WebSocketClient.TOPIC.ON_STATE_CHANGE, wsState => {
      const mapping: Partial<Record<WEBSOCKET_STATE, ConnectionState>> = {
        [WEBSOCKET_STATE.CLOSED]: ConnectionState.CLOSED,
        [WEBSOCKET_STATE.CONNECTING]: ConnectionState.CONNECTING,
      };

      const connectionState = mapping[wsState];

      if (connectionState === ConnectionState.CLOSED) {
        flushProposalsQueue();
        this.pauseAndFlushNotificationQueue();
        this.apiClient.transport.ws.lock();
      }

      if (connectionState) {
        onConnectionStateChanged(connectionState);
      }
    });
  };

  /**
   * Handles logic for reacting to a missed notification event.
   *
   * The backend sends a special "missed notification" signal if it detects
   * that the client has missed one or more notifications. Once this signal is sent,
   * the backend will **stop sending all further notifications** until the client
   * acknowledges the missed state.
   *
   * Because our app currently lacks functionality to perform a full real-time sync
   * while running, we must reload the application to re-fetch the entire state.
   *
   * On first detection of the missed notification:
   * - We set a local storage flag (`has_missing_notification`) to mark that we've
   *   entered this state.
   * - We reload the application so the state can be re-fetched from scratch.
   *
   * On the next load:
   * - If the flag is already present, we acknowledge the missed notification via
   * the WebSocket transport, unblocking the backend so it resumes sending updates
   * then we remove the flag.
   */
  private readonly reactToMissedNotification = () => {
    const localStorageKey = 'has_missing_notification';

    // First-time handling: set flag and reload to trigger full re-fetch of state.
    if (!AccountLocalStorageStore.has(localStorageKey)) {
      AccountLocalStorageStore.add(localStorageKey, 'true');
      window.location.reload();
      return;
    }

    // After reload: acknowledge the missed notification so backend resumes notifications.
    this.apiClient.transport.ws.acknowledgeMissedNotification();
    AccountLocalStorageStore.remove(localStorageKey);
  };

  public getClientCapabilities = () => {
    return this.currentClient?.capabilities || [];
  };

  public checkIsConsumable = (
    notification: Notification | ConsumableNotification,
  ): notification is ConsumableNotification => {
    return 'type' in notification;
  };

  private readonly generateDbName = (context: Context) => {
    const clientType = context.clientType === ClientType.NONE ? '' : `@${context.clientType}`;
    return `wire@${this.apiClient.config.urls.name}@${context.userId}${clientType}`;
  };

  private readonly generateCoreDbName = (context: Context) => {
    return `core-${this.generateDbName(context)}`;
  };

  private readonly generateEncryptedDbName = (context: Context) => {
    return `secrets-${this.generateDbName(context)}`;
  };

  private readonly initEngine = async (context: Context, encryptedStore: EncryptedStore): Promise<CRUDEngine> => {
    const dbName = this.generateDbName(context);
    this.logger.debug(`Initialising store with name "${dbName}"...`);
    const openDb = async () => {
      const dbKey = await generateSecretKey({keyId: 'db-key', keySize: 32, secretsDb: encryptedStore});
      const initializedDb = await this.options.createStore?.(dbName, dbKey.key);
      if (initializedDb) {
        this.logger.debug(`Initialized store with existing engine "${dbName}".`);
        return initializedDb;
      }
      this.logger.debug(`Initialized store with new memory engine "${dbName}".`);
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
  };

  private readonly groupIdFromConversationId = async (
    conversationId: QualifiedId,
    subconversationId?: SUBCONVERSATION_ID,
  ): Promise<string | undefined> => {
    if (!subconversationId) {
      return this.coreCallbacks?.groupIdFromConversationId(conversationId);
    }

    return this.service?.subconversation.getSubconversationGroupId(conversationId, subconversationId);
  };

  public isMLSActiveForClient = async (): Promise<boolean> => {
    // Check for CoreCrypto library, it is required for MLS
    if (!this.options.coreCryptoConfig?.enabled) {
      return false;
    }

    // Check if the backend supports MLS trough removal keys
    if (!(await this.apiClient.supportsMLS())) {
      return false;
    }

    // Check if MLS is enabled for the public via backend feature flag
    const commonConfig = (await this.service?.team.getCommonFeatureConfig()) ?? {};
    return commonConfig[FEATURE_KEY.MLS]?.status === FeatureStatus.ENABLED;
  };
}
