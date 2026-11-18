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

import {createClock} from '@enormora/clock';
import type {Clock} from '@enormora/clock/clock';
import {createFireAndForgetInvoker} from '@enormora/fire-and-forget';
import {isBoolean, isNonEmptyString, isUndefined} from '@sindresorhus/is';
import {once} from 'lodash';
import {asyncNoop, noop} from 'noop-esm';
import {TimeoutError} from 'p-queue';
import {Maybe, task, type Task} from 'true-myth';
import {match} from 'ts-pattern';

import type {CoreCryptoLogLevel} from '@wireapp/core-crypto';

import {AccountService} from './account/';
import {LoginSanitizer} from './auth/';
import {BroadcastService} from './broadcast/';
import {ClientInfo, ClientService} from './client/';
import type {MetaClient} from './client/clientService';
import {ConnectionService} from './connection/';
import {ConnectionState} from './connectionState/connectionState';
import {AssetService, ConversationService} from './conversation/';
import {getQueueLength, pauseMessageSending, resumeMessageSending} from './conversation/message/messageSender';
import {SubconversationService} from './conversation/subconversationService/subconversationService';
import {GiphyService} from './giphy/';
import {LinkPreviewService} from './linkPreview';
import {CoreCryptoConfig} from './messagingProtocols/common.types';
import {InitClientOptions, MLSService} from './messagingProtocols/mls';
import {
  pauseRejoiningMLSConversations,
  queueConversationRejoin,
  resumeRejoiningMLSConversations,
} from './messagingProtocols/mls/conversationRejoinQueue';
import {E2EIServiceExternal, User} from './messagingProtocols/mls/e2eIdentityService';
import {getAllConversationsCallback} from './messagingProtocols/mls/e2eIdentityService/e2eiServiceInternal';
import {
  flushProposalsQueue,
  pauseProposalProcessing,
  resumeProposalProcessing,
} from './messagingProtocols/mls/eventHandler/events/messageAdd/incomingProposalsQueue';
import {CoreCallbacks, SecretCrypto} from './messagingProtocols/mls/types';
import {NewClient, ProteusService} from './messagingProtocols/proteus';
import {CryptoClientType} from './messagingProtocols/proteus/proteusService/cryptoClient';
import {
  createPkiEnvironment,
  wipeCoreCryptoDb,
  CoreCryptoWrapper,
} from './messagingProtocols/proteus/proteusService/cryptoClient/coreCryptoWrapper';
import type {CryptoboxWrapper} from './messagingProtocols/proteus/proteusService/cryptoClient/cryptoboxWrapper';
import {deleteIdentity} from './messagingProtocols/proteus/proteusService/identityClearer';
import {HandledEventPayload, NotificationService, NotificationSource} from './notification/';
import {createFlushableQueue, isQueueFlushedError} from './queue/flushableQueue';
import {sequentialQueueOptions} from './queue/sequentialQueueOptions';
import {createCustomEncryptedStore, createEncryptedStore, EncryptedStore} from './secretStore/encryptedStore';
import {generateSecretKey} from './secretStore/secretKeyGenerator';
import {SelfService} from './self/';
import {CoreDatabase, deleteDB, openDB} from './storage/coreDb';
import {CRUDEngine} from './storage/engine/crudEngine';
import {MemoryEngine} from './storage/engine/memoryEngine';
import {TeamService} from './team/';
import {UserService} from './user/';
import {LocalStorageStore} from './util/localStorageStore';
import {RecurringTaskScheduler} from './util/recurringTaskScheduler';

import {APIClient, BackendFeatures} from '../apiClient/apiClient';
import {Context} from '../apiClient/auth/context';
import {Cookie} from '../apiClient/auth/cookie';
import {CookieStore} from '../apiClient/auth/cookieStore';
import {AUTH_COOKIE_KEY, AUTH_TABLE_NAME} from '../apiClient/auth/index';
import {LoginData} from '../apiClient/auth/loginData';
import {PreKey} from '../apiClient/auth/preKey';
import {RegisterData} from '../apiClient/auth/registerData';
import {ClientCapability} from '../apiClient/client/clientCapability';
import {ClientClassification} from '../apiClient/client/clientClassification';
import {ClientType} from '../apiClient/client/clientType';
import {RegisteredClient} from '../apiClient/client/registeredClient';
import {SUBCONVERSATION_ID} from '../apiClient/conversation/subconversation';
import * as Events from '../apiClient/event';
import {CONVERSATION_EVENT} from '../apiClient/event/conversationEvent';
import {
  ConsumableEvent,
  ConsumableNotification,
  ConsumableNotificationEvent,
  ConsumableNotificationSynchronization,
} from '../apiClient/notification/consumableNotification';
import {Notification} from '../apiClient/notification/notification';
import {
  type WebSocketLifecycleImplementation,
  type WebSocketReconnectContext,
  WEBSOCKET_STATE,
} from '../apiClient/tcp/reconnectingWebsocket';
import {WebSocketClient} from '../apiClient/tcp/webSocketClient';
import {FEATURE_KEY, FEATURE_STATUS} from '../apiClient/team/feature/featureList.types';
import {QualifiedId} from '../apiClient/user/qualifiedId';
import {TypedEventEmitter} from '../commons/TypedEventEmitter/TypedEventEmitter';
import {StringUtil} from '../commons/util';
import {TimeInMillis} from '../commons/util/TimeUtil';
import {getLogger, type LogAttributes, type Logger} from '../logger/getLogger';

type CryptoClientWithProtocol =
  readonly [CryptoClientType.CORE_CRYPTO, CoreCryptoWrapper] | readonly [CryptoClientType.CRYPTOBOX, CryptoboxWrapper];

const defaultCertificateLifetimeInDays = 90;

export type ProcessedEventPayload = HandledEventPayload;
export type WebSocketConnectionContext = Pick<WebSocketReconnectContext, 'attemptId' | 'wrapperGeneration'>;

type WebSocketConnectionCycle = {
  readonly signal: Maybe<AbortSignal>;
  readonly connectCycleId: number;
};

type WebSocketCleanupReason =
  'disconnect' | 'logout' | 'superseded' | 'offline' | 'setup-failed' | 'catchup-failed' | 'consumer-missing';

type WebSocketListenerOptions = {
  readonly onConnectionStateChanged: (state: ConnectionState) => void;
  readonly handleNotification: (notification: ConsumableNotification, source: NotificationSource) => Promise<void>;
  readonly handleLegacyNotification: (notification: Notification, source: NotificationSource) => Promise<void>;
  readonly useLegacy: boolean;
  readonly ownsConnection: () => boolean;
  readonly abortSocket: () => void;
};

type WebSocketListenerSubscription = {
  readonly hasNotificationListener: () => boolean;
  readonly remove: () => void;
};

type NotificationEventConsumer = (payload: HandledEventPayload, source: NotificationSource) => Promise<void>;
type NotificationStreamProgress = (currentProcessingNotificationTimestamp: string) => void;

type ConsumableNotificationHandlerOptions = {
  readonly handleEvent: NotificationEventConsumer;
  readonly onNotificationStreamProgress: NotificationStreamProgress;
  readonly onConnectionStateChanged: (state: ConnectionState) => void;
  readonly getCurrentWebSocketConnectionContext: () => Maybe<WebSocketConnectionContext>;
  readonly getSocketSignal: () => Maybe<AbortSignal>;
};

type SynchronizationNotificationOptions = {
  readonly notification: ConsumableNotificationSynchronization;
  readonly onConnectionStateChanged: (state: ConnectionState) => void;
  readonly connectionContext: Maybe<WebSocketConnectionContext>;
  readonly signal: Maybe<AbortSignal>;
};

type DecryptConsumableNotificationOptions = {
  readonly notification: ConsumableNotificationEvent;
  readonly handleEvent: NotificationEventConsumer;
  readonly source: NotificationSource;
  readonly onNotificationStreamProgress: NotificationStreamProgress;
  readonly connectionContext: Maybe<WebSocketConnectionContext>;
  readonly signal: Maybe<AbortSignal>;
};

function isSocketCancelled(signal: Maybe<AbortSignal>): boolean {
  return signal.isJust && signal.value.aborted;
}

function abortSocketController(controller: Maybe<AbortController>): void {
  if (controller.isJust) {
    controller.value.abort();
  }
}

export type CreateStoreFn = (storeName: string, key: Uint8Array) => undefined | Promise<CRUDEngine | undefined>;

interface AccountOptions {
  /** Used to store info in the database (will create a inMemory engine if returns undefined) */
  createStore?: CreateStoreFn;
  systemCrypto?: SecretCrypto;
  coreCryptoConfig?: CoreCryptoConfig;
  /** Clock shared by services which need wall time or retry scheduling. */
  clock?: Clock;

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
  SERVICES_CHANGED = 'services_changed',
}

type Events = {
  [EVENTS.NEW_SESSION]: NewClient;
  [EVENTS.SERVICES_CHANGED]: void;
};

export const AccountLocalStorageStore = LocalStorageStore('core_account');

export class Account extends TypedEventEmitter<Events> {
  private readonly apiClient: APIClient;
  private readonly logger: Logger;
  /** this is the client the consumer is currently using. Will be set as soon as `initClient` is called and will be rest upon logout */
  private currentClient?: RegisteredClient;
  private storeEngine?: CRUDEngine;
  private db?: CoreDatabase;
  private encryptedDb?: EncryptedStore<any>;
  private coreCallbacks?: CoreCallbacks;
  private readonly clock: Clock;
  private connectionState: ConnectionState = ConnectionState.CLOSED;
  private webSocketListenerOwnerId = 0;
  private cleanupWebSocketConnection: Maybe<(reason: WebSocketCleanupReason) => void> = Maybe.nothing();

  private readonly isConnectionLive = (): boolean => {
    return this.connectionState === ConnectionState.LIVE;
  };

  /**
   * {@link once}-wrapped {@link MLSService.initialisePendingProposalsTasks}; recreated in
   * {@link resetContext} (login / logout) so each logged-in session runs it at most once after MLS
   * is available on the first catch-up → LIVE hand-off.
   */
  private initialisePendingProposalsTasksOnce: () => Promise<void>;

  private readonly notificationProcessingQueue = createFlushableQueue({
    autoStart: false,
    ...sequentialQueueOptions,
  });

  public setMaxCoreCryptoLogLevel: (level: CoreCryptoLogLevel) => void = () => {
    return undefined;
  };

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
   * @param apiClient The API client supplied by the caller.
   * @param accountOptions
   */
  constructor(
    apiClient: APIClient,
    private readonly options: AccountOptions = {
      nbPrekeys: 100,
      coreCryptoConfig: {wasmFilePath: '', enabled: false},
    },
  ) {
    super();
    this.clock = options.clock ?? createClock();
    this.apiClient = apiClient;
    this.backendFeatures = this.apiClient.backendFeatures;
    this.logger = getLogger('@wireapp/core/Account');
    const accountLogger = this.logger;
    this.recurringTaskScheduler = new RecurringTaskScheduler(
      {
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
      },
      createFireAndForgetInvoker({
        reportError(error) {
          accountLogger.error('failed to execute fire-and-forget action', {error});
        },
      }),
    );

    apiClient.on(APIClient.TOPIC.COOKIE_REFRESH, async (cookie?: Cookie) => {
      if (cookie !== undefined && this.storeEngine !== undefined) {
        try {
          await this.persistCookie(this.storeEngine, cookie);
        } catch (error: unknown) {
          this.logger.error('Failed to save cookie:', {error});
        }
      }
    });

    this.initialisePendingProposalsTasksOnce = this.createInitialisePendingProposalsTasksOnce();
  }

  private createInitialisePendingProposalsTasksOnce(): () => Promise<void> {
    return once(async () => {
      if (this.service?.mls === undefined) {
        const errorMessage = 'Failed to initialise pending proposals tasks: MLS service is not set';
        this.logger.error(errorMessage);
        throw new Error(errorMessage);
      }
      await this.service.mls.initialisePendingProposalsTasks();
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
  public useAPIVersion = async (min: number, max: number, allowDev?: boolean): Promise<BackendFeatures> => {
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
    getAllConversations,
    certificateTtl = defaultCertificateLifetimeInDays * (TimeInMillis.DAY / TimeInMillis.SECOND),
  }: {
    /** display name of the user (should match the identity provider) */
    displayName: string;
    /** handle of the user (should match the identity provider) */
    handle: string;
    /** team of the user */
    teamId: string;
    discoveryUrl: string;
    /** function called to get all conversations */
    getAllConversations: getAllConversationsCallback;
    /** number of seconds the certificate should be valid (default 90 days) */
    certificateTtl?: number;
  }): Promise<void> => {
    const context = this.apiClient.context;
    const domain = context?.domain ?? '';

    if (this.currentClient === undefined) {
      throw new Error('Client has not been initialized - please login first');
    }

    if (this.service?.mls?.isEnabled !== true || this.service?.e2eIdentity === undefined) {
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
    if (this.service === undefined || this.apiClient.context === undefined || this.storeEngine === undefined) {
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

  public getLocalClient(): Task<Maybe<MetaClient>, Error> {
    if (isUndefined(this.service)) {
      return task.reject(new Error('Client service is not initialized.'));
    }

    return this.service.client.loadClient();
  }

  /**
   * Will initiate all the cryptographic material of the given registered device and setup all the background tasks.
   *
   * @returns The local existing client or undefined if the client does not exist or is not valid (non existing on backend)
   */
  public initClient = async (client: RegisteredClient, mlsConfig?: InitClientOptions): Promise<RegisteredClient> => {
    if (this.service === undefined || this.apiClient.context === undefined || this.storeEngine === undefined) {
      throw new Error('Services are not set.');
    }
    this.apiClient.context.clientId = client.id;

    // Call /access endpoint with client_id after client initialisation
    await this.apiClient.transport.http.associateClientWithSession(client.id);

    await this.service.proteus.initClient(this.apiClient.context);

    if ((await this.isMLSActiveForClient()) && this.service.mls !== undefined && mlsConfig !== undefined) {
      const {userId, domain = ''} = this.apiClient.context;
      await this.service.mls.initClient({id: userId, domain}, client, mlsConfig);

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
  ): Promise<CryptoClientWithProtocol> => {
    const baseConfig = {
      clock: this.clock,
      nbPrekeys: this.options.nbPrekeys,
      onNewPrekeys: async (prekeys: PreKey[]) => {
        this.logger.debug(`Received '${prekeys.length}' new PreKeys.`);

        const clientId = context.clientId;
        if (isUndefined(clientId)) {
          throw new Error('Client id is not set in the account context.');
        }
        await this.apiClient.api.client.putClient(clientId, {prekeys});
        this.logger.debug(`Successfully uploaded '${prekeys.length}' PreKeys.`);
      },
    };

    if (this.options.coreCryptoConfig?.enabled === true) {
      const {buildClient} = await import('./messagingProtocols/proteus/proteusService/cryptoClient/coreCryptoWrapper');
      const client = await buildClient(
        storeEngine,
        {
          ...baseConfig,
          generateSecretKey: (keyId, keySize) => {
            return generateSecretKey({keyId, keySize, secretsDb: encryptedStore});
          },
        },
        this.options.coreCryptoConfig,
      );
      this.setMaxCoreCryptoLogLevel = client.setMaxLogLevel;
      return [CryptoClientType.CORE_CRYPTO, client] as const;
    }

    const {buildClient} = await import('./messagingProtocols/proteus/proteusService/cryptoClient/cryptoboxWrapper');
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
  configureCoreCallbacks = (coreCallbacks: CoreCallbacks): void => {
    this.coreCallbacks = coreCallbacks;
  };

  private readonly initServices = async (context: Context): Promise<void> => {
    const encryptedStoreName = this.generateEncryptedDbName(context);
    this.encryptedDb =
      this.options.systemCrypto !== undefined
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
        onNewClient: payload => {
          return this.emit(EVENTS.NEW_SESSION, payload);
        },
        nbPrekeys: this.options.nbPrekeys,
      },
      this.storeEngine,
    );

    const clientService = new ClientService(this.apiClient, proteusService, this.storeEngine, this.clock);

    if (clientType === CryptoClientType.CORE_CRYPTO && (await this.apiClient.supportsMLS())) {
      mlsService = new MLSService(this.apiClient, cryptoClient.getNativeClient(), this.db, this.recurringTaskScheduler);

      e2eServiceExternal = new E2EIServiceExternal(
        cryptoClient.getNativeClient(),
        this.apiClient,
        this.db,
        this.recurringTaskScheduler,
        clientService,
        mlsService,
        createPkiEnvironment,
      );
    }

    const connectionService = new ConnectionService(this.apiClient);
    const giphyService = new GiphyService(this.apiClient);
    const linkPreviewService = new LinkPreviewService(assetService);
    const subconversationService = new SubconversationService(this.apiClient, this.db, this.clock, mlsService);
    const conversationService = new ConversationService(
      this.apiClient,
      proteusService,
      this.db,
      this.groupIdFromConversationId,
      subconversationService,
      this.isMLSConversationRecoveryEnabled,
      mlsService,
      this.isConnectionLive,
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
    this.emit(EVENTS.SERVICES_CHANGED);
  };

  private cancelWebSocketConnection(reason: WebSocketCleanupReason): void {
    if (this.cleanupWebSocketConnection.isJust) {
      this.cleanupWebSocketConnection.value(reason);
    }
  }

  private readonly resetContext = (): void => {
    this.cancelWebSocketConnection('logout');
    this.currentClient = undefined;
    this.initialisePendingProposalsTasksOnce = this.createInitialisePendingProposalsTasksOnce();
    this.connectionState = ConnectionState.CLOSED;
    delete this.apiClient.context;
    delete this.service;
    this.emit(EVENTS.SERVICES_CHANGED);
  };

  /**
   * Will logout the current user
   * @param clearData if set to `true` will completely wipe any database that was created by the Account
   */
  public logout = async (data?: {clearAllData?: boolean; clearCryptoData?: boolean}): Promise<void> => {
    this.cancelWebSocketConnection('logout');
    this.db?.close();
    this.encryptedDb?.close();

    if (data?.clearAllData === true) {
      await this.wipeAllData();
    } else if (data?.clearCryptoData === true) {
      await this.wipeCryptoData();
    }

    await this.apiClient.logout();
    this.resetContext();
  };

  private readonly wipeCommonData = async (): Promise<void> => {
    try {
      await this.service?.client.deleteLocalClient();
    } catch (error: unknown) {
      this.logger.error('Failed to delete local client during logout cleanup:', {error});
    }

    try {
      if (this.storeEngine !== undefined) {
        await wipeCoreCryptoDb(this.storeEngine, this.clock);
      }
    } catch (error: unknown) {
      this.logger.error('Failed to wipe crypto database during logout cleanup:', {error});
    }

    try {
      // needs to be wiped last
      await this.encryptedDb?.wipe();
    } catch (error: unknown) {
      this.logger.error('Failed to delete encrypted database during logout cleanup:', {error});
    }
  };

  /**
   * Will delete the identity and history of the current user
   */
  private readonly wipeAllData = async (): Promise<void> => {
    try {
      if (this.storeEngine !== undefined) {
        await deleteIdentity(this.storeEngine, false);
      }
    } catch (error: unknown) {
      this.logger.error('Failed to delete identity during logout cleanup:', {error});
    }

    try {
      if (this.db !== undefined) {
        await deleteDB(this.db);
      }
    } catch (error: unknown) {
      this.logger.error('Failed to delete database during logout cleanup:', {error});
    }

    await this.wipeCommonData();
  };

  /**
   * Will delete the cryptography and client of the current user
   * Will keep the history intact
   */
  private readonly wipeCryptoData = async (): Promise<void> => {
    try {
      if (this.storeEngine !== undefined) {
        await deleteIdentity(this.storeEngine, true);
      }
    } catch (error: unknown) {
      this.logger.error('Failed to delete identity during logout cleanup:', {error});
    }

    await this.wipeCommonData();
  };

  /**
   * return true if the current user has a MLS device that is initialized and ready to use
   */
  public get hasMLSDevice(): boolean {
    return this.service?.mls?.isEnabled === true;
  }

  /**
   * Establishes a notification subscription and starts the socket. The legacy stream
   * catches up on open before buffered notifications are released.
   *
   * @param callbacks callbacks that will be called to handle different events
   * @returns close a function that will disconnect from the websocket
   */
  public listen = async ({
    useLegacy,
    onEvent = asyncNoop,
    onConnectionStateChanged: onConnectionStateChangedCallBack = noop,
    onNotificationStreamProgress = noop,
    onMissedNotifications = noop,
    connectionCycle,
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
    onConnectionStateChanged?: (state: ConnectionState, connectionContext?: WebSocketConnectionContext) => void;

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
     * @deprecated Core doesn't support dryRun mode anymore and this parameter will be removed in future versions
     */
    dryRun?: boolean;

    /** @internal Browser connection cycle. Aborting it also cancels pending initialization. */
    connectionCycle?: WebSocketConnectionCycle;
  } = {}): Promise<() => void> => {
    if (isUndefined(this.currentClient)) {
      throw new Error('Client has not been initialized - please login first');
    }

    if (!isBoolean(useLegacy)) {
      throw new Error('use of legacy notifications must be explicitly set to true or false');
    }

    const implementation = this.webSocketLifecycleImplementation;
    const usesCorrectedLifecycle = implementation === 'corrected';
    const cycleSignal: Maybe<AbortSignal> = usesCorrectedLifecycle
      ? (connectionCycle?.signal ?? Maybe.nothing())
      : Maybe.nothing();
    if (isSocketCancelled(cycleSignal)) {
      return noop;
    }

    this.cancelWebSocketConnection('superseded');
    const account = this;
    const websocket = this.apiClient.transport.ws;
    const ownerCancellation: Maybe<AbortController> = usesCorrectedLifecycle
      ? Maybe.just(new AbortController())
      : Maybe.nothing();
    const ownerSignal = ownerCancellation.map(controller => {
      return controller.signal;
    });
    const listenerOwnerId = ++this.webSocketListenerOwnerId;
    const lifecycle = {listenerOwnerId, connectCycleId: connectionCycle?.connectCycleId, useLegacy, implementation};
    let currentWebSocketConnectionContext: Maybe<WebSocketConnectionContext> = Maybe.nothing();
    let socketCancellation: Maybe<AbortController> = Maybe.nothing();
    let transportInUse = false;
    let legacyMigration: 'none' | 'queued' | 'replay-needed' = 'none';

    function getCurrentWebSocketConnectionContext(): Maybe<WebSocketConnectionContext> {
      return currentWebSocketConnectionContext;
    }

    function getSocketSignal(): Maybe<AbortSignal> {
      return socketCancellation.map(controller => {
        return controller.signal;
      });
    }

    function ownsConnection(): boolean {
      return !isSocketCancelled(ownerSignal);
    }

    function publishConnectionState(state: ConnectionState): void {
      const previousState = account.connectionState;
      account.connectionState = state;
      const notificationListenerRegistered = subscription.hasNotificationListener();
      account.logger.info('Notification connection state changed', {
        subsystem: 'websocket-lifecycle',
        event: 'notification-connection-state-change',
        ...lifecycle,
        ...currentWebSocketConnectionContext.unwrapOr({}),
        previousState,
        state,
        notificationListenerRegistered,
        locked: websocket.isLocked(),
      });

      if (currentWebSocketConnectionContext.isJust) {
        onConnectionStateChangedCallBack(state, currentWebSocketConnectionContext.value);
      } else {
        onConnectionStateChangedCallBack(state);
      }
    }

    function onConnectionStateChanged(state: ConnectionState): void {
      if (!ownsConnection()) {
        return;
      }
      const missingLiveConsumer = state === ConnectionState.LIVE && !subscription.hasNotificationListener();
      if (missingLiveConsumer) {
        account.logger.warn('LIVE transition has no registered notification listener', {
          subsystem: 'websocket-lifecycle',
          event: 'live-consumer-missing',
          ...lifecycle,
          ...currentWebSocketConnectionContext.unwrapOr({}),
        });
        if (usesCorrectedLifecycle) {
          cleanup('consumer-missing');
          return;
        }
      }
      if (state === ConnectionState.LIVE) {
        legacyMigration = 'none';
      }
      publishConnectionState(state);
    }

    function cancelConnectionCycle(): void {
      const reason: unknown = cycleSignal.isJust ? cycleSignal.value.reason : 'disconnect';
      cleanup(reason === 'offline' || reason === 'superseded' ? reason : 'disconnect');
    }

    function logListenerRemoval(reason: WebSocketCleanupReason | 'legacy-listener-replacement'): void {
      account.logger.info('Notification listener removed', {
        subsystem: 'websocket-lifecycle',
        event: 'notification-listener-removed',
        ...lifecycle,
        ...currentWebSocketConnectionContext.unwrapOr({}),
        reason,
        notificationListenerCount: websocket.listenerCount(WebSocketClient.TOPIC.ON_MESSAGE),
        stateListenerCount: websocket.listenerCount(WebSocketClient.TOPIC.ON_STATE_CHANGE),
      });
    }

    function cleanup(reason: WebSocketCleanupReason): void {
      if (!ownsConnection()) {
        return;
      }
      const cleanupContext = {...lifecycle, ...currentWebSocketConnectionContext.unwrapOr({}), reason};
      account.logger.info('Notification connection cleanup started', {
        subsystem: 'websocket-lifecycle',
        event: 'connection-cleanup-start',
        ...cleanupContext,
        state: account.connectionState,
        locked: websocket.isLocked(),
        notificationListenerRegistered: subscription.hasNotificationListener(),
      });
      if (usesCorrectedLifecycle) {
        abortSocketController(ownerCancellation);
        if (cycleSignal.isJust) {
          cycleSignal.value.removeEventListener('abort', cancelConnectionCycle);
        }
        account.cleanupWebSocketConnection = Maybe.nothing();
        subscription.remove();
        logListenerRemoval(reason);
      }
      abortSocketController(socketCancellation);
      flushProposalsQueue();
      account.pauseAndFlushNotificationQueue();
      if (!usesCorrectedLifecycle) {
        // Preserve the rollback cleanup order and listener scope.
        account.apiClient.disconnect();
        publishConnectionState(ConnectionState.CLOSED);
        websocket.removeAllListeners();
        logListenerRemoval(reason);
      } else if (transportInUse) {
        try {
          account.apiClient.disconnect();
        } catch (error: unknown) {
          account.logger.warn('WebSocket disconnect failed during cleanup', {
            subsystem: 'websocket-lifecycle',
            event: 'connection-cleanup-disconnect-failed',
            ...cleanupContext,
            errorName: StringUtil.getSafeErrorDetails(error).errorName,
          });
        }
      }
      account.logger.info('Notification connection cleanup completed', {
        subsystem: 'websocket-lifecycle',
        event: 'connection-cleanup-complete',
        ...cleanupContext,
      });
      if (account.connectionState !== ConnectionState.CLOSED) {
        publishConnectionState(ConnectionState.CLOSED);
      }
    }

    const handleEvent = this.createEventHandler(onEvent);

    const handleLegacyNotification = this.createLegacyNotificationHandler(
      handleEvent,
      onNotificationStreamProgress,
      getCurrentWebSocketConnectionContext,
    );
    const handleNotification = this.createNotificationHandler({
      handleEvent,
      onNotificationStreamProgress,
      onConnectionStateChanged,
      getCurrentWebSocketConnectionContext,
      getSocketSignal: () => {
        return getSocketSignal().orElse(() => {
          return ownerSignal;
        });
      },
    });

    const handleMissedNotifications = this.createLegacyMissedNotificationsHandler(onMissedNotifications);
    const legacyProcessNotificationStream = this.createLegacyNotificationStreamProcessor({
      handleLegacyNotification,
      handleMissedNotifications,
      onConnectionStateChanged,
      getCurrentWebSocketConnectionContext,
      ownsConnection,
      lifecycle,
      checkSocketCancellation: usesCorrectedLifecycle,
      getSocketSignal,
    });

    this.logger.debug('Registering notification listeners', {
      subsystem: 'websocket-lifecycle',
      event: 'notification-listener-register-start',
      ...lifecycle,
    });
    if (!usesCorrectedLifecycle) {
      const listenersToReplace = websocket.listenerCount(WebSocketClient.TOPIC.ON_MESSAGE);
      websocket.removeAllListeners(WebSocketClient.TOPIC.ON_MESSAGE);
      if (listenersToReplace > 0) {
        logListenerRemoval('legacy-listener-replacement');
      }
    }
    const subscription = this.setupWebSocketListeners({
      onConnectionStateChanged,
      handleNotification,
      handleLegacyNotification,
      useLegacy,
      ownsConnection,
      abortSocket: () => {
        abortSocketController(socketCancellation);
        if (legacyMigration !== 'none') {
          legacyMigration = 'replay-needed';
        }
      },
    });
    if (usesCorrectedLifecycle) {
      this.cleanupWebSocketConnection = Maybe.just(cleanup);
      if (cycleSignal.isJust) {
        cycleSignal.value.addEventListener('abort', cancelConnectionCycle, {once: true});
      }
    }
    this.logger.info('Notification listener registered', {
      subsystem: 'websocket-lifecycle',
      event: 'notification-listener-registered',
      ...lifecycle,
      notificationListenerCount: websocket.listenerCount(WebSocketClient.TOPIC.ON_MESSAGE),
      stateListenerCount: websocket.listenerCount(WebSocketClient.TOPIC.ON_STATE_CHANGE),
    });

    function isObsoleteInitialization(): boolean {
      if (ownsConnection()) {
        return false;
      }
      account.logger.debug('Notification connection setup cancelled', {
        subsystem: 'websocket-lifecycle',
        event: 'connection-setup-cancelled',
        ...lifecycle,
        obsolete: true,
      });

      return true;
    }

    async function onSocketOpen(
      abortController: AbortController,
      reconnectContext: WebSocketReconnectContext,
    ): Promise<void> {
      const obsolete = usesCorrectedLifecycle && (!ownsConnection() || abortController.signal.aborted);
      if (obsolete) {
        return;
      }
      if (usesCorrectedLifecycle) {
        abortSocketController(socketCancellation);
        socketCancellation = Maybe.just(abortController);
      }
      currentWebSocketConnectionContext = Maybe.just(reconnectContext);
      account.logger.info('WebSocket opened for notification processing', {
        subsystem: 'websocket-lifecycle',
        event: 'notification-socket-open',
        ...lifecycle,
        ...reconnectContext,
        locked: websocket.isLocked(),
      });
      // Acknowledge received notifications while holding outgoing work until catch-up completes.
      pauseProposalProcessing();
      pauseMessageSending();
      pauseRejoiningMLSConversations();
      account.notificationProcessingQueue.queue.start();

      const needsCatchUp = useLegacy === true || legacyMigration === 'replay-needed';
      if (needsCatchUp) {
        try {
          await legacyProcessNotificationStream(Maybe.just(abortController));
        } catch (error: unknown) {
          account.logger.warn('Legacy notification catch-up failed', {
            subsystem: 'websocket-lifecycle',
            event: 'legacy-catchup-failure',
            ...lifecycle,
            ...reconnectContext,
            obsolete: abortController.signal.aborted,
            errorName: StringUtil.getSafeErrorDetails(error).errorName,
          });

          if (abortController.signal.aborted) {
            return;
          }
          if (usesCorrectedLifecycle) {
            cleanup('catchup-failed');
          } else {
            account.pauseAndFlushNotificationQueue();
            publishConnectionState(ConnectionState.CLOSED);
          }
        }
      }
    }

    const isClientCapableOfConsumableNotifications = this.getClientCapabilities().includes(
      ClientCapability.CONSUMABLE_NOTIFICATIONS,
    );

    const capabilities = [ClientCapability.LEGAL_HOLD_IMPLICIT_CONSENT];

    if (!useLegacy) {
      // let the backend now client is capable of consumable notifications
      capabilities.push(ClientCapability.CONSUMABLE_NOTIFICATIONS);
      if (!usesCorrectedLifecycle) {
        websocket.useAsyncNotificationsSocket();
      }
    }

    this.logger.info(`Client is using the ${useLegacy ? 'legacy' : 'async'} notification stream`);

    try {
      await this.service?.client.putClientCapabilities(this.currentClient.id, {capabilities});
      if (isObsoleteInitialization()) {
        return noop;
      }
      const shouldSwitchSocket = usesCorrectedLifecycle && !useLegacy;
      if (shouldSwitchSocket) {
        websocket.useAsyncNotificationsSocket();
      }

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
        transportInUse = true;
        if (usesCorrectedLifecycle) {
          legacyMigration = 'queued';
        }
        await legacyProcessNotificationStream(ownerCancellation);
        if (isObsoleteInitialization()) {
          return noop;
        }
      }

      if (useLegacy) {
        /**
         * immediately lock the websocket to prevent any new messages from being received
         * before legacy notifications endpoint is fetched otherwise it'll update the last notification ID
         * and fetching legacy notifications will return an empty list
         */
        websocket.lock();
      }
      transportInUse = true;
      this.apiClient.connect(onSocketOpen);
      if (isObsoleteInitialization()) {
        return noop;
      }
      this.logger.info('Notification connection setup completed', {
        subsystem: 'websocket-lifecycle',
        event: 'connection-setup-complete',
        ...lifecycle,
      });
    } catch (error: unknown) {
      if (isObsoleteInitialization()) {
        return noop;
      }
      this.logger.warn('Notification connection setup failed', {
        subsystem: 'websocket-lifecycle',
        event: 'connection-setup-failed',
        ...lifecycle,
        errorName: StringUtil.getSafeErrorDetails(error).errorName,
      });
      if (usesCorrectedLifecycle) {
        cleanup('setup-failed');
      }
      throw error;
    }

    return () => {
      cleanup('disconnect');
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
          const accountServices = this.service;
          if (isUndefined(accountServices)) {
            throw new Error('Services are not set.');
          }
          accountServices.conversation.messageTimer.setConversationLevelTimer(conversation, expireAfterMillis);
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
    getCurrentWebSocketConnectionContext: () => Maybe<WebSocketConnectionContext>,
  ) => {
    return async (notification: Notification, source: NotificationSource): Promise<void> => {
      const connectionContext = getCurrentWebSocketConnectionContext();
      void this.notificationProcessingQueue
        .add(async () => {
          try {
            const firstNotificationPayload = notification.payload[0];
            const notificationTime = isUndefined(firstNotificationPayload)
              ? null
              : this.getNotificationEventTime(firstNotificationPayload);
            if (isNonEmptyString(notificationTime)) {
              onNotificationStreamProgress(notificationTime);
            }

            const accountServices = this.service;
            if (isUndefined(accountServices)) {
              throw new Error('Services are not set.');
            }
            const messages = accountServices.notification.handleNotification(notification, source);

            for await (const message of messages) {
              await handleEvent(message, source);
            }
          } catch (error: unknown) {
            this.logger.error('Legacy notification processing failed', {
              subsystem: 'websocket-lifecycle',
              event: 'legacy-notification-failure',
              ...connectionContext.unwrapOr({}),
              errorName: StringUtil.getSafeErrorDetails(error).errorName,
            });
          }
        })
        .catch(this.handleNotificationQueueError);
    };
  };

  private createNotificationHandler(
    options: ConsumableNotificationHandlerOptions,
  ): (notification: ConsumableNotification, source: NotificationSource) => Promise<void> {
    const {
      handleEvent,
      onNotificationStreamProgress,
      onConnectionStateChanged,
      getCurrentWebSocketConnectionContext,
      getSocketSignal,
    } = options;

    return async (notification: ConsumableNotification, source: NotificationSource): Promise<void> => {
      const signal = getSocketSignal();
      const connectionContext = getCurrentWebSocketConnectionContext();
      try {
        if (notification.type === ConsumableEvent.MISSED) {
          this.reactToMissedNotification();
          return;
        }

        this.notificationProcessingQueue
          .add(() => {
            if (notification.type === ConsumableEvent.SYNCHRONIZATION) {
              return this.handleSynchronizationNotification({
                notification,
                onConnectionStateChanged,
                connectionContext,
                signal,
              });
            }

            return this.decryptAckEmitNotification({
              notification,
              handleEvent,
              source,
              onNotificationStreamProgress,
              connectionContext,
              signal,
            });
          })
          .catch(this.handleNotificationQueueError);
      } catch (error: unknown) {
        this.logger.error('Consumable notification handling failed', {
          subsystem: 'websocket-lifecycle',
          event: 'consumable-notification-handling-failure',
          ...connectionContext.unwrapOr({}),
          errorName: StringUtil.getSafeErrorDetails(error).errorName,
        });
      }
    };
  }

  private readonly handleNotificationQueueError = (error: unknown): void => {
    const preserveLegacyRejection = this.webSocketLifecycleImplementation === 'legacy' && !(error instanceof Error);
    if (preserveLegacyRejection) {
      throw error;
    }

    if (error instanceof TimeoutError) {
      this.logger.warn('Notification decryption task timed out', {error});
      return;
    }

    if (isQueueFlushedError(error)) {
      return;
    }
    this.logger.error('Notification queue task failed', {
      subsystem: 'websocket-lifecycle',
      event: 'notification-queue-task-failed',
      errorName: StringUtil.getSafeErrorDetails(error).errorName,
    });
  };

  private readonly acknowledgeSynchronizationNotification = (
    notification: ConsumableNotificationSynchronization,
  ): void => {
    this.apiClient.transport.ws.acknowledgeConsumableNotificationSynchronization(notification);
  };

  /**
   * Persistence-backed MLS pending-proposals timers: {@link MLSService.initialisePendingProposalsTasks}.
   * Call only at the catch-up → LIVE hand-off, immediately before {@link resumeProposalProcessing}.
   * The MLS call is wrapped with lodash `once` ({@link initialisePendingProposalsTasksOnce}), recreated
   * in {@link resetContext}, so it runs at most once per logged-in session after MLS is available—matching
   * the historical single call from {@link initClient} while keeping the unsafe work off the cold-start path.
   *
   * **Why defer:** rehydrating during {@link Account.initClient} or while notifications are still
   * replaying is unsafe. Persisted `firingDate` values are often in the past, so {@link TaskScheduler}
   * fires auto-commits on the next tick while the backlog is still being applied. That usually surfaces
   * as failing or conflicting commits (for example `mls-stale-message` / delivery rejection), not as a
   * dependable way to “catch up”. “Wrong epoch” skew during replay is not uniquely attributable to
   * proposal commits (recovery / rejoin paths matter too); this method exists to keep **all**
   * rehydrated pending-proposal side effects aligned with a session that has finished ordered replay.
   */
  private readonly rehydrateMlsPendingProposalsTasksOnLiveTransition = async (): Promise<void> => {
    if (this.hasMLSDevice && this.service?.mls !== undefined) {
      await this.initialisePendingProposalsTasksOnce();
    }
  };

  private async handleSynchronizationNotification(options: SynchronizationNotificationOptions): Promise<void> {
    const {notification, onConnectionStateChanged, connectionContext, signal} = options;
    if (isSocketCancelled(signal)) {
      return;
    }
    const markerId = notification.data.marker_id;
    const currentMarkerId = this.apiClient.transport.http.accessTokenStore.markerToken;
    const markerMatched = markerId === currentMarkerId;
    this.logger.debug('Consumable synchronization marker received', {
      subsystem: 'websocket-lifecycle',
      event: 'async-sync-marker-received',
      ...connectionContext.unwrapOr({}),
      markerPresent: markerId.length > 0,
      markerMatched,
    });
    this.acknowledgeSynchronizationNotification(notification);
    /**
     * There is a chance that there might be multiple synchronization notifications (markers)
     * in the queue in case websocket connection drops a few times
     * Hence we only want to resume message sending and set the connection state to LIVE
     * if the marker ID matches the current marker ID.
     */
    if (markerMatched) {
      await this.rehydrateMlsPendingProposalsTasksOnLiveTransition();
      if (isSocketCancelled(signal)) {
        return;
      }
      const accountServices = this.service;
      if (isUndefined(accountServices)) {
        throw new Error('Services are not set.');
      }
      await accountServices.conversation.runDeferredEpochRecovery();
      if (isSocketCancelled(signal)) {
        return;
      }
      resumeProposalProcessing();
      resumeMessageSending();
      resumeRejoiningMLSConversations();
      onConnectionStateChanged(ConnectionState.LIVE);
    }
  }

  private async decryptAckEmitNotification(options: DecryptConsumableNotificationOptions): Promise<void> {
    const {notification, handleEvent, source, onNotificationStreamProgress, connectionContext, signal} = options;
    if (isSocketCancelled(signal)) {
      return;
    }
    try {
      const accountServices = this.service;
      if (isUndefined(accountServices)) {
        throw new Error('Services are not set.');
      }
      const payloads = accountServices.notification.handleNotification(notification.data.event, source);

      const firstEventPayload = notification.data.event.payload[0];
      const notificationTime =
        firstEventPayload !== undefined ? this.getNotificationEventTime(firstEventPayload) : null;
      if (!this.isConnectionLive() && isNonEmptyString(notificationTime)) {
        onNotificationStreamProgress(notificationTime);
      }

      for await (const payload of payloads ?? []) {
        await handleEvent(payload, source);
      }

      if (!isSocketCancelled(signal)) {
        this.apiClient.transport.ws.acknowledgeNotification(notification);
      }
    } catch (error: unknown) {
      this.logger.error('Consumable notification processing failed', {
        subsystem: 'websocket-lifecycle',
        event: 'consumable-notification-processing-failure',
        ...connectionContext.unwrapOr({}),
        errorName: StringUtil.getSafeErrorDetails(error).errorName,
      });
    }
  }

  public getNotificationEventTime = (backendEvent: Events.BackendEvent): string | null => {
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
        void queueConversationRejoin('all-conversations', () => {
          const accountServices = this.service;
          if (isUndefined(accountServices)) {
            throw new Error('Services are not set.');
          }

          return accountServices.conversation.handleConversationsEpochMismatch();
        });
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
    getCurrentWebSocketConnectionContext = () => {
      return Maybe.nothing();
    },
    ownsConnection = () => {
      return true;
    },
    getSocketSignal = () => {
      return Maybe.nothing();
    },
    lifecycle,
    checkSocketCancellation = false,
  }: {
    handleLegacyNotification: (notification: Notification, source: NotificationSource) => Promise<void>;
    handleMissedNotifications: (notificationId: string) => Promise<void>;
    onConnectionStateChanged: (state: ConnectionState) => void;
    getCurrentWebSocketConnectionContext?: () => Maybe<WebSocketConnectionContext>;
    ownsConnection?: () => boolean;
    getSocketSignal?: () => Maybe<AbortSignal>;
    lifecycle?: LogAttributes;
    checkSocketCancellation?: boolean;
  }) => {
    return async (abortController: Maybe<AbortController> = Maybe.nothing()) => {
      const abortSignal = abortController.map(controller => {
        return controller.signal;
      });
      function isObsolete(): boolean {
        return !ownsConnection() || (checkSocketCancellation && isSocketCancelled(abortSignal));
      }

      if (isObsolete()) {
        return;
      }
      this.apiClient.transport.ws.lock();
      this.logger.info('Legacy notification catch-up started', {
        subsystem: 'websocket-lifecycle',
        event: 'legacy-catchup-start',
        ...lifecycle,
        ...getCurrentWebSocketConnectionContext().unwrapOr({}),
        locked: this.apiClient.transport.ws.isLocked(),
      });
      pauseProposalProcessing();
      pauseMessageSending();
      pauseRejoiningMLSConversations();
      onConnectionStateChanged(ConnectionState.PROCESSING_NOTIFICATIONS);
      if (isObsolete()) {
        return;
      }

      const accountServices = this.service;
      if (isUndefined(accountServices)) {
        throw new Error('Services are not set.');
      }
      const results = await accountServices.notification.legacyProcessNotificationStream(
        async (notification, source) => {
          if (!isObsolete()) {
            await handleLegacyNotification(notification, source);
          }
        },
        notificationId => {
          if (!isObsolete()) {
            void handleMissedNotifications(notificationId);
          }
        },
        abortController.unwrapOr(undefined),
      );

      if (isObsolete()) {
        return;
      }

      // We need to wait for the notification stream to be fully handled before releasing the message sending queue.
      // This is due to the nature of how message are encrypted, any change in mls epoch needs to happen before we start encrypting any kind of messages
      void this.notificationProcessingQueue
        .add(async () => {
          const socketSignal = getSocketSignal();
          function isObsoleteTransition(): boolean {
            return isObsolete() || isSocketCancelled(socketSignal);
          }

          if (isObsoleteTransition()) {
            return;
          }
          const connectionContext = getCurrentWebSocketConnectionContext();
          await this.rehydrateMlsPendingProposalsTasksOnLiveTransition();
          if (isObsoleteTransition()) {
            return;
          }
          await this.service?.conversation.runDeferredEpochRecovery();
          if (isObsoleteTransition()) {
            return;
          }
          this.logger.info('Legacy notification catch-up completed', {
            subsystem: 'websocket-lifecycle',
            event: 'legacy-catchup-complete',
            ...lifecycle,
            ...connectionContext.unwrapOr({}),
            ...results,
            pendingMessages: getQueueLength(),
          });
          resumeProposalProcessing();
          resumeMessageSending();
          resumeRejoiningMLSConversations();
          onConnectionStateChanged(ConnectionState.LIVE);
          if (!isObsoleteTransition()) {
            this.apiClient.transport.ws.unlock();
          }
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
  private readonly pauseAndFlushNotificationQueue = (): void => {
    this.notificationProcessingQueue.queue.pause();
    this.notificationProcessingQueue.flush();
    this.logger.info('Notification processing queue paused and flushed');
  };

  public readonly pauseNotificationQueue = (): void => {
    this.notificationProcessingQueue.queue.pause();
    this.logger.info('Notification processing queue paused');
  };

  public readonly resumeNotificationQueue = (): void => {
    this.notificationProcessingQueue.queue.start();
    this.logger.info('Notification processing queue resumed');
  };

  /**
   * Sets up WebSocket event listeners for:
   * - Incoming backend messages
   * - WebSocket state changes
   * On each new backend message, we pass it to the  notification handler.
   * On state changes, we map raw socket states to public connection states and emit them.
   */
  private setupWebSocketListeners(options: WebSocketListenerOptions): WebSocketListenerSubscription {
    const {
      onConnectionStateChanged,
      handleNotification,
      handleLegacyNotification,
      useLegacy,
      ownsConnection,
      abortSocket,
    } = options;
    const account = this;
    const websocket = this.apiClient.transport.ws;

    function onNotification(notification: Notification | ConsumableNotification): void {
      if (!ownsConnection()) {
        return;
      }
      if (Account.checkIsConsumable(notification)) {
        void handleNotification(notification, NotificationSource.WEBSOCKET);
        return;
      }
      void handleLegacyNotification(notification, NotificationSource.WEBSOCKET);
    }

    function onSocketStateChanged(socketState: WEBSOCKET_STATE): void {
      if (!ownsConnection()) {
        return;
      }
      match(socketState)
        .with(WEBSOCKET_STATE.CLOSED, () => {
          abortSocket();
          flushProposalsQueue();
          account.pauseAndFlushNotificationQueue();
          if (useLegacy) {
            websocket.lock();
          }
          onConnectionStateChanged(ConnectionState.CLOSED);
        })
        .with(WEBSOCKET_STATE.CONNECTING, () => {
          onConnectionStateChanged(ConnectionState.CONNECTING);
        })
        .otherwise(noop);
    }

    websocket.on(WebSocketClient.TOPIC.ON_MESSAGE, onNotification);
    websocket.on(WebSocketClient.TOPIC.ON_STATE_CHANGE, onSocketStateChanged);

    return {
      hasNotificationListener() {
        return websocket.listeners(WebSocketClient.TOPIC.ON_MESSAGE).includes(onNotification);
      },
      remove() {
        websocket.removeListener(WebSocketClient.TOPIC.ON_MESSAGE, onNotification);
        websocket.removeListener(WebSocketClient.TOPIC.ON_STATE_CHANGE, onSocketStateChanged);
      },
    };
  }

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
  private readonly reactToMissedNotification = (): void => {
    this.logger.info('Reacting to missed notification from consumable async websocket');
    const localStorageKey = 'has_missing_notification';

    // First-time handling: set flag and reload to trigger full re-fetch of state.
    if (!AccountLocalStorageStore.has(localStorageKey)) {
      this.logger.info('First missed notification detected, reloading to recover state');
      AccountLocalStorageStore.add(localStorageKey, 'true');
      window.location.reload();
      return;
    }

    this.logger.info('Missed notification previously detected, acknowledging to resume updates');
    // After reload: acknowledge the missed notification so backend resumes notifications.
    this.apiClient.transport.ws.acknowledgeMissedNotification();
    AccountLocalStorageStore.remove(localStorageKey);
  };

  public getClientCapabilities = (): ClientCapability[] => {
    return this.currentClient?.capabilities ?? [];
  };

  public static checkIsConsumable = (
    notification: Notification | ConsumableNotification,
  ): notification is ConsumableNotification => {
    return 'type' in notification;
  };

  public static checkIsLegacyNotification = (
    notification: Notification | ConsumableNotification,
  ): notification is Notification => {
    return !Account.checkIsConsumable(notification);
  };

  private readonly generateDbName = (context: Context): string => {
    const clientType = context.clientType === ClientType.NONE ? '' : `@${context.clientType}`;
    return `wire@${this.apiClient.config.urls.name}@${context.userId}${clientType}`;
  };

  private readonly generateCoreDbName = (context: Context): string => {
    return `core-${this.generateDbName(context)}`;
  };

  private readonly generateEncryptedDbName = (context: Context): string => {
    return `secrets-${this.generateDbName(context)}`;
  };

  private readonly initEngine = async (context: Context, encryptedStore: EncryptedStore): Promise<CRUDEngine> => {
    const dbName = this.generateDbName(context);
    this.logger.debug(`Initialising store with name "${dbName}"...`);
    const openDb = async (): Promise<CRUDEngine | MemoryEngine> => {
      const dbKey = await generateSecretKey({keyId: 'db-key', keySize: 32, secretsDb: encryptedStore});
      const initializedDb = await this.options.createStore?.(dbName, dbKey.key);
      if (initializedDb !== undefined) {
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
    if (cookie !== undefined) {
      await this.persistCookie(storeEngine, cookie);
    }
    return storeEngine;
  };

  private readonly groupIdFromConversationId = async (
    conversationId: QualifiedId,
    subconversationId?: SUBCONVERSATION_ID,
  ): Promise<string | undefined> => {
    if (subconversationId === undefined) {
      return this.coreCallbacks?.groupIdFromConversationId(conversationId);
    }

    return this.service?.subconversation.getSubconversationGroupId(conversationId, subconversationId);
  };

  public isMLSActiveForClient = async (): Promise<boolean> => {
    // Check for CoreCrypto library, it is required for MLS
    if (this.options.coreCryptoConfig?.enabled !== true) {
      return false;
    }

    // Check if the backend supports MLS trough removal keys
    if (!(await this.apiClient.supportsMLS())) {
      return false;
    }

    // Check if MLS is enabled for the public via backend feature flag
    const commonConfig = (await this.service?.team.getCommonFeatureConfig()) ?? {};

    return commonConfig[FEATURE_KEY.MLS]?.status === FEATURE_STATUS.ENABLED;
  };

  private readonly isMLSConversationRecoveryEnabled = async (): Promise<boolean> => {
    const commonConfig = (await this.service?.team.getCommonFeatureConfig()) ?? {};
    return commonConfig[FEATURE_KEY.ALLOWED_GLOBAL_OPERATIONS]?.config?.mlsConversationReset === true;
  };

  /**
   * Checks the health of the WebSocket connection by sending a ping and waiting for a pong response.
   * This is a non-disruptive check that does not close or reconnect the socket.
   * @returns A promise that resolves to true if the socket responds with a pong within the timeout, false otherwise.
   *
   * @example
   * const healthy = await account.isWebsocketHealthy();
   * if (!healthy) {
   *   // handle unhealthy websocket
   * }
   */
  public get webSocketLifecycleImplementation(): WebSocketLifecycleImplementation {
    return this.apiClient.transport.ws.lifecycleImplementation;
  }

  public isWebsocketHealthy = async (): Promise<boolean> => {
    const usesCorrectedLifecycle = this.webSocketLifecycleImplementation === 'corrected';
    const missingConsumer = this.apiClient.transport.ws.listenerCount(WebSocketClient.TOPIC.ON_MESSAGE) === 0;
    if (usesCorrectedLifecycle && missingConsumer) {
      return false;
    }

    return this.apiClient.transport.ws.checkHealth();
  };
}
