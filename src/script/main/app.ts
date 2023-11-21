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

// Polyfill for "tsyringe" dependency injection
// eslint-disable-next-line import/order
import 'core-js/full/reflect';

import {Context} from '@wireapp/api-client/lib/auth';
import {ClientClassification, ClientType} from '@wireapp/api-client/lib/client/';
import {EVENTS as CoreEvents} from '@wireapp/core/lib/Account';
import {amplify} from 'amplify';
import Dexie from 'dexie';
import platform from 'platform';
import {container} from 'tsyringe';

import {Runtime} from '@wireapp/commons';
import {WebAppEvents} from '@wireapp/webapp-events';

import {initializeDataDog} from 'Util/DataDog';
import {DebugUtil} from 'Util/DebugUtil';
import {Environment} from 'Util/Environment';
import {t} from 'Util/LocalizerUtil';
import {getLogger, Logger} from 'Util/Logger';
import {includesString} from 'Util/StringUtil';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {appendParameter} from 'Util/UrlUtil';
import {checkIndexedDb, supportsMLS} from 'Util/util';

import '../../style/default.less';
import {AssetRepository} from '../assets/AssetRepository';
import {AssetService} from '../assets/AssetService';
import {AudioRepository} from '../audio/AudioRepository';
import {SIGN_OUT_REASON} from '../auth/SignOutReason';
import {URLParameter} from '../auth/URLParameter';
import {BackupRepository} from '../backup/BackupRepository';
import {BackupService} from '../backup/BackupService';
import {CacheRepository} from '../cache/CacheRepository';
import {CallingRepository} from '../calling/CallingRepository';
import {ClientRepository, ClientService} from '../client';
import {Configuration} from '../Config';
import {ConnectionRepository} from '../connection/ConnectionRepository';
import {ConnectionService} from '../connection/ConnectionService';
import {ConversationRepository} from '../conversation/ConversationRepository';
import {ConversationService} from '../conversation/ConversationService';
import {MessageRepository} from '../conversation/MessageRepository';
import {CryptographyRepository} from '../cryptography/CryptographyRepository';
import {User} from '../entity/User';
import {AccessTokenError} from '../error/AccessTokenError';
import {AuthError} from '../error/AuthError';
import {BaseError} from '../error/BaseError';
import {ClientError, CLIENT_ERROR_TYPE} from '../error/ClientError';
import {TeamError} from '../error/TeamError';
import {EventRepository} from '../event/EventRepository';
import {EventService} from '../event/EventService';
import {EventServiceNoCompound} from '../event/EventServiceNoCompound';
import {NotificationService} from '../event/NotificationService';
import {EventStorageMiddleware} from '../event/preprocessor/EventStorageMiddleware';
import {QuotedMessageMiddleware} from '../event/preprocessor/QuoteDecoderMiddleware';
import {ReceiptsMiddleware} from '../event/preprocessor/ReceiptsMiddleware';
import {RepliesUpdaterMiddleware} from '../event/preprocessor/RepliesUpdaterMiddleware';
import {ServiceMiddleware} from '../event/preprocessor/ServiceMiddleware';
import {FederationEventProcessor} from '../event/processor/FederationEventProcessor';
import {GiphyRepository} from '../extension/GiphyRepository';
import {GiphyService} from '../extension/GiphyService';
import {getWebsiteUrl} from '../externalRoute';
import {IntegrationRepository} from '../integration/IntegrationRepository';
import {IntegrationService} from '../integration/IntegrationService';
import {startNewVersionPolling} from '../lifecycle/newVersionHandler';
import {MediaRepository} from '../media/MediaRepository';
import {initMLSConversations, registerUninitializedSelfAndTeamConversations} from '../mls';
import {NotificationRepository} from '../notification/NotificationRepository';
import {PreferenceNotificationRepository} from '../notification/PreferenceNotificationRepository';
import {PermissionRepository} from '../permission/PermissionRepository';
import {PropertiesRepository} from '../properties/PropertiesRepository';
import {PropertiesService} from '../properties/PropertiesService';
import {SearchRepository} from '../search/SearchRepository';
import {SelfRepository} from '../self/SelfRepository';
import {SelfService} from '../self/SelfService';
import {APIClient} from '../service/APIClientSingleton';
import {Core} from '../service/CoreSingleton';
import {StorageKey, StorageRepository, StorageService} from '../storage';
import {TeamRepository} from '../team/TeamRepository';
import {AppInitStatisticsValue} from '../telemetry/app_init/AppInitStatisticsValue';
import {AppInitTelemetry} from '../telemetry/app_init/AppInitTelemetry';
import {AppInitTimingsStep} from '../telemetry/app_init/AppInitTimingsStep';
import {serverTimeHandler} from '../time/serverTimeHandler';
import {EventTrackingRepository} from '../tracking/EventTrackingRepository';
import {WindowHandler} from '../ui/WindowHandler';
import {UserRepository} from '../user/UserRepository';
import {UserService} from '../user/UserService';
import {ViewModelRepositories} from '../view_model/MainViewModel';
import {Warnings} from '../view_model/WarningsContainer';

export function doRedirect(signOutReason: SIGN_OUT_REASON) {
  let url = `/auth/${location.search}`;

  if (location.hash.startsWith('#/user/') && signOutReason === SIGN_OUT_REASON.NOT_SIGNED_IN) {
    localStorage.setItem(App.LOCAL_STORAGE_LOGIN_REDIRECT_KEY, location.hash);
  }

  const isImmediateSignOutReason = App.CONFIG.SIGN_OUT_REASONS.IMMEDIATE.includes(signOutReason);
  if (isImmediateSignOutReason) {
    url = appendParameter(url, `${URLParameter.REASON}=${signOutReason}`);
  }

  Dexie.delete('/sqleet');
  window.location.replace(url);
}

export class App {
  static readonly LOCAL_STORAGE_LOGIN_REDIRECT_KEY = 'LOGIN_REDIRECT_KEY';
  static readonly LOCAL_STORAGE_LOGIN_CONVERSATION_KEY = 'LOGIN_CONVERSATION_KEY';
  private isLoggingOut = false;
  logger: Logger;
  service: {
    asset: AssetService;
    conversation: ConversationService;
    event: EventService | EventServiceNoCompound;
    integration: IntegrationService;
    notification: NotificationService;
    storage: StorageService;
  };
  repository: ViewModelRepositories = {} as ViewModelRepositories;
  debug?: DebugUtil;
  util?: {debug: DebugUtil};

  static get CONFIG() {
    return {
      COOKIES_CHECK: {
        COOKIE_NAME: 'cookies_enabled',
      },
      NOTIFICATION_CHECK: TIME_IN_MILLIS.SECOND * 10,
      SIGN_OUT_REASONS: {
        IMMEDIATE: [
          SIGN_OUT_REASON.NO_APP_CONFIG,
          SIGN_OUT_REASON.ACCOUNT_DELETED,
          SIGN_OUT_REASON.CLIENT_REMOVED,
          SIGN_OUT_REASON.SESSION_EXPIRED,
        ],
        TEMPORARY_GUEST: [
          SIGN_OUT_REASON.MULTIPLE_TABS,
          SIGN_OUT_REASON.SESSION_EXPIRED,
          SIGN_OUT_REASON.USER_REQUESTED,
        ],
      },
    };
  }

  /**
   * @param core
   * @param apiClient Configured backend client
   */
  constructor(
    private readonly core: Core,
    private readonly apiClient: APIClient,
    private readonly config: Configuration,
  ) {
    this.config = config;
    this.apiClient.on(APIClient.TOPIC.ON_LOGOUT, () => this.logout(SIGN_OUT_REASON.SESSION_EXPIRED, false));
    this.logger = getLogger('App');

    new WindowHandler();

    this.service = this._setupServices();
    this.repository = this._setupRepositories();

    if (config.FEATURE.ENABLE_DEBUG) {
      import('Util/DebugUtil').then(({DebugUtil}) => {
        this.debug = new DebugUtil(this.repository);
        this.util = {debug: this.debug}; // Alias for QA
      });
    }

    this._subscribeToEvents();
    this.initServiceWorker();
  }

  //##############################################################################
  // Instantiation
  //##############################################################################

  /**
   * Create all app repositories.
   * @returns All repositories
   */
  private _setupRepositories() {
    const repositories: ViewModelRepositories = {} as ViewModelRepositories;
    const selfService = new SelfService();

    repositories.asset = container.resolve(AssetRepository);

    repositories.giphy = new GiphyRepository(new GiphyService());
    repositories.properties = new PropertiesRepository(new PropertiesService(), selfService);
    repositories.serverTime = serverTimeHandler;
    repositories.storage = new StorageRepository();

    repositories.cryptography = new CryptographyRepository();
    repositories.client = new ClientRepository(new ClientService(), repositories.cryptography);
    repositories.media = new MediaRepository(new PermissionRepository());
    repositories.audio = new AudioRepository(repositories.media.devicesHandler);

    repositories.user = new UserRepository(
      new UserService(),
      repositories.asset,
      selfService,
      repositories.client,
      serverTimeHandler,
      repositories.properties,
    );
    repositories.connection = new ConnectionRepository(new ConnectionService(), repositories.user);
    repositories.event = new EventRepository(this.service.event, this.service.notification, serverTimeHandler);
    repositories.search = new SearchRepository(repositories.user);
    repositories.team = new TeamRepository(repositories.user, repositories.asset);

    repositories.message = new MessageRepository(
      /*
       * ToDo: there is a cyclic dependency between message and conversation repos.
       * MessageRepository should NOT depend upon ConversationRepository.
       * We need to remove all usages of conversationRepository inside the messageRepository
       */
      () => repositories.conversation,
      repositories.cryptography,
      repositories.event,
      repositories.properties,
      serverTimeHandler,
      repositories.user,
      repositories.asset,
    );

    repositories.calling = new CallingRepository(
      repositories.message,
      repositories.event,
      repositories.user,
      repositories.media.streamHandler,
      repositories.media.devicesHandler,
      serverTimeHandler,
    );

    repositories.self = new SelfRepository(selfService, repositories.user, repositories.team, repositories.client);

    repositories.conversation = new ConversationRepository(
      this.service.conversation,
      repositories.message,
      repositories.connection,
      repositories.event,
      repositories.team,
      repositories.user,
      repositories.self,
      repositories.properties,
      repositories.calling,
      serverTimeHandler,
    );

    repositories.eventTracker = new EventTrackingRepository(repositories.message);

    repositories.backup = new BackupRepository(new BackupService(), repositories.conversation);

    repositories.integration = new IntegrationRepository(
      this.service.integration,
      repositories.conversation,
      repositories.team,
    );
    repositories.permission = new PermissionRepository();
    repositories.notification = new NotificationRepository(repositories.conversation, repositories.permission);
    repositories.preferenceNotification = new PreferenceNotificationRepository(repositories.user['userState'].self);

    return repositories;
  }

  /**
   * Create all app services.
   * @param Encrypted database handler
   * @returns All services
   */
  private _setupServices() {
    container.registerInstance(StorageService, new StorageService());
    const storageService = container.resolve(StorageService);
    const eventService = Runtime.isEdge() ? new EventServiceNoCompound() : new EventService();

    return {
      asset: container.resolve(AssetService),
      conversation: new ConversationService(eventService),
      event: eventService,
      integration: new IntegrationService(),
      notification: new NotificationService(),
      storage: storageService,
    };
  }

  getAPIContext(): Context | undefined {
    return this.apiClient.context;
  }

  /**
   * Subscribe to amplify events.
   */
  private _subscribeToEvents() {
    amplify.subscribe(WebAppEvents.LIFECYCLE.SIGN_OUT, this.logout);
  }

  //##############################################################################
  // Initialization
  //##############################################################################

  /**
   * Initialize the app.
   *
   * @note Locally known clients and sessions must not be touched until after the notification stream has been handled.
   *   Any failure in the Promise chain will result in a logout.
   * @todo Check if we really need to logout the user in all these error cases or how to recover from them
   *
   * @param clientType
   * @param config
   * @param onProgress
   */
  async initApp(clientType: ClientType, onProgress: (progress: number, message?: string) => void) {
    // add body information
    const startTime = Date.now();
    const [apiVersionMin, apiVersionMax] = this.config.SUPPORTED_API_RANGE;
    await this.core.useAPIVersion(apiVersionMin, apiVersionMax, this.config.ENABLE_DEV_BACKEND_API);

    const osCssClass = Runtime.isMacOS() ? 'os-mac' : 'os-pc';
    const platformCssClass = Runtime.isDesktopApp() ? 'platform-electron' : 'platform-web';
    document.body.classList.add(osCssClass, platformCssClass);

    const telemetry = new AppInitTelemetry();

    try {
      const {
        audio: audioRepository,
        calling: callingRepository,
        client: clientRepository,
        connection: connectionRepository,
        conversation: conversationRepository,
        event: eventRepository,
        eventTracker: eventTrackerRepository,
        properties: propertiesRepository,
        team: teamRepository,
        user: userRepository,
        self: selfRepository,
      } = this.repository;
      await checkIndexedDb();
      onProgress(2.5);
      telemetry.timeStep(AppInitTimingsStep.RECEIVED_ACCESS_TOKEN);

      try {
        await this.core.init(clientType);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : error;
        this.logger.error(`Error when initializing core: "${errorMessage}"`, error);
        throw new AccessTokenError(AccessTokenError.TYPE.REQUEST_FORBIDDEN, 'Session has expired');
      }
      const localClient = await this.core.initClient();
      if (!localClient) {
        throw new ClientError(CLIENT_ERROR_TYPE.NO_VALID_CLIENT, 'Client has been deleted on backend');
      }

      this.core.on(CoreEvents.NEW_SESSION, ({userId, clientId}) => {
        const newClient = {class: ClientClassification.UNKNOWN, id: clientId};
        userRepository.addClientToUser(userId, newClient, true);
      });

      const selfUser = await this.initiateSelfUser();

      this.core.configureCoreCallbacks({
        groupIdFromConversationId: async conversationId => {
          const conversation = await conversationRepository.getConversationById(conversationId);
          return conversation?.groupId;
        },
      });

      await initializeDataDog(this.config, selfUser.qualifiedId);

      // Setup all event middleware
      const eventStorageMiddleware = new EventStorageMiddleware(this.service.event, selfUser);
      const serviceMiddleware = new ServiceMiddleware(conversationRepository, userRepository, selfUser);
      const quotedMessageMiddleware = new QuotedMessageMiddleware(this.service.event);
      const readReceiptMiddleware = new ReceiptsMiddleware(this.service.event, conversationRepository, selfUser);
      const repliesUpdaterMiddleware = new RepliesUpdaterMiddleware(this.service.event);

      eventRepository.setEventProcessMiddlewares([
        serviceMiddleware,
        readReceiptMiddleware,
        quotedMessageMiddleware,
        eventStorageMiddleware,
        repliesUpdaterMiddleware,
      ]);
      // Setup all the event processors
      const federationEventProcessor = new FederationEventProcessor(eventRepository, serverTimeHandler, selfUser);
      eventRepository.setEventProcessors([federationEventProcessor]);

      onProgress(5, t('initReceivedSelfUser', selfUser.name()));
      telemetry.timeStep(AppInitTimingsStep.RECEIVED_SELF_USER);
      const clientEntity = await this._initiateSelfUserClients(selfUser, clientRepository);
      callingRepository.initAvs(selfUser, clientEntity.id);
      onProgress(7.5, t('initValidatedClient'));
      telemetry.timeStep(AppInitTimingsStep.VALIDATED_CLIENT);
      telemetry.addStatistic(AppInitStatisticsValue.CLIENT_TYPE, clientEntity.type ?? clientType);

      onProgress(10);
      telemetry.timeStep(AppInitTimingsStep.INITIALIZED_CRYPTOGRAPHY);

      const teamMembers = await teamRepository.initTeam(selfUser.teamId);
      telemetry.timeStep(AppInitTimingsStep.RECEIVED_USER_DATA);

      const connections = await connectionRepository.getConnections();
      telemetry.addStatistic(AppInitStatisticsValue.CONNECTIONS, connections.length, 50);

      const conversations = await conversationRepository.loadConversations();

      await userRepository.loadUsers(selfUser, connections, conversations, teamMembers);

      if (supportsMLS()) {
        //if mls is supported, we need to initialize the callbacks (they are used when decrypting messages)
        conversationRepository.initMLSConversationRecoveredListener();
      }

      onProgress(25, t('initReceivedUserData'));
      telemetry.addStatistic(AppInitStatisticsValue.CONVERSATIONS, conversations.length, 50);
      this._subscribeToUnloadEvents(selfUser);

      await conversationRepository.conversationRoleRepository.loadTeamRoles();

      let totalNotifications = 0;
      await eventRepository.connectWebSocket(this.core, ({done, total}) => {
        const baseMessage = t('initDecryption');
        const extraInfo = this.config.FEATURE.SHOW_LOADING_INFORMATION
          ? ` ${t('initProgress', {number1: done.toString(), number2: total.toString()})}`
          : '';

        totalNotifications = total;
        onProgress(25 + 50 * (done / total), `${baseMessage}${extraInfo}`);
      });

      await conversationRepository.init1To1Conversations(connections, conversations);

      if (supportsMLS()) {
        // Once all the messages have been processed and the message sending queue freed we can now:

        //add the potential `self` and `team` conversations
        await registerUninitializedSelfAndTeamConversations(conversations, selfUser, clientEntity.id, this.core);

        //join all the mls groups we're member of and have not yet joined (eg. we were not send welcome message)
        await initMLSConversations(conversations, this.core);
      }

      telemetry.timeStep(AppInitTimingsStep.UPDATED_FROM_NOTIFICATIONS);
      telemetry.addStatistic(AppInitStatisticsValue.NOTIFICATIONS, totalNotifications, 100);

      eventTrackerRepository.init(propertiesRepository.properties.settings.privacy.telemetry_sharing);
      onProgress(97.5, t('initUpdatedFromNotifications', this.config.BRAND_NAME));

      const clientEntities = await clientRepository.updateClientsForSelf();

      onProgress(99);

      telemetry.addStatistic(AppInitStatisticsValue.CLIENTS, clientEntities.length);
      telemetry.timeStep(AppInitTimingsStep.APP_PRE_LOADED);

      selfUser.devices(clientEntities);

      this._handleUrlParams();
      await conversationRepository.updateConversationsOnAppInit();
      await conversationRepository.conversationLabelRepository.loadLabels();

      await selfRepository.initialisePeriodicSelfSupportedProtocolsCheck();

      amplify.publish(WebAppEvents.LIFECYCLE.LOADED);

      telemetry.timeStep(AppInitTimingsStep.UPDATED_CONVERSATIONS);
      if (selfUser.isActivatedAccount()) {
        // start regularly polling the server to check if there is a new version of Wire
        startNewVersionPolling(Environment.version(false), this.update);
      }
      audioRepository.init(true);
      await conversationRepository.cleanupEphemeralMessages();
      callingRepository.setReady();
      telemetry.timeStep(AppInitTimingsStep.APP_LOADED);

      this.logger.info(`App loaded in ${Date.now() - startTime}ms`);

      return selfUser;
    } catch (error) {
      if (error instanceof BaseError) {
        await this._appInitFailure(error);
        return undefined;
      }
      throw error;
    }
  }

  /**
   * Initialize ServiceWorker if supported.
   */
  private async initServiceWorker() {
    if (navigator.serviceWorker) {
      await navigator.serviceWorker
        .register(`/sw.js?${Environment.version(false)}`)
        .then(({scope}) => this.logger.debug(`ServiceWorker registration successful with scope: ${scope}`));
    }
  }

  private _appInitFailure(error: BaseError) {
    const {message, type} = error;
    let logMessage = `Could not initialize app version '${Environment.version(false)}'`;

    if (Runtime.isDesktopApp()) {
      logMessage += ` - Electron '${platform.os?.family}' '${Environment.version()}'`;
    }

    this.logger.warn(`${logMessage}: ${message}`, {error});

    const isAuthError = error instanceof AuthError;
    if (isAuthError) {
      const isTypeMultipleTabs = type === AuthError.TYPE.MULTIPLE_TABS;
      const signOutReason = isTypeMultipleTabs ? SIGN_OUT_REASON.MULTIPLE_TABS : SIGN_OUT_REASON.INDEXED_DB;
      return this.redirectToLogin(signOutReason);
    }

    if (navigator.onLine === true) {
      const isReload = this._isReload();
      switch (type) {
        case CLIENT_ERROR_TYPE.NO_VALID_CLIENT: {
          this.logger.warn(`Redirecting to login: ${message}`, error);
          return isReload
            ? this.redirectToLogin(SIGN_OUT_REASON.SESSION_EXPIRED)
            : this.redirectToLogin(SIGN_OUT_REASON.CLIENT_REMOVED);
        }
        case AccessTokenError.TYPE.NOT_FOUND_IN_CACHE:
        case AccessTokenError.TYPE.RETRIES_EXCEEDED:
        case AccessTokenError.TYPE.REQUEST_FORBIDDEN: {
          this.logger.warn(`Redirecting to login: ${message}`, error);
          return isReload
            ? this.redirectToLogin(SIGN_OUT_REASON.SESSION_EXPIRED)
            : this.redirectToLogin(SIGN_OUT_REASON.NOT_SIGNED_IN);
        }
        case TeamError.TYPE.NO_APP_CONFIG: {
          this.logger.warn(`Logging out user: ${message}`, error);
          return this.redirectToLogin(SIGN_OUT_REASON.NO_APP_CONFIG);
        }

        default: {
          this.logger.error(`Caused by: ${message || error}`, error);

          const isAccessTokenError = error instanceof AccessTokenError;
          if (isAccessTokenError) {
            this.logger.error(`Could not get access token: ${error.message}. Logging out user.`, error);
          }

          return this.logout(SIGN_OUT_REASON.APP_INIT, false);
        }
      }
    }

    this.logger.warn("No internet connectivity. Refreshing the page to show the browser's offline page...", error);
    window.location.reload();
  }

  /**
   * Initiate the self user by getting it from the backend.
   * @returns Resolves with the self user entity
   */
  private async initiateSelfUser() {
    const userEntity = await this.repository.user.getSelf([{position: 'App.initiateSelfUser', vendor: 'webapp'}]);

    this.logger.info(`Loaded self user with ID '${userEntity.id}'`);

    if (!userEntity.hasActivatedIdentity()) {
      this.logger.info('User does not have an activated identity and seems to be a temporary guest');

      if (!userEntity.isTemporaryGuest()) {
        throw new Error('User does not have an activated identity');
      }
    }

    container.resolve(StorageService).init(this.core.storage);
    this.repository.client.init(userEntity);
    await this.repository.properties.init(userEntity);

    return userEntity;
  }

  /**
   * Initiate the current client of the self user.
   * @returns Resolves with the local client entity
   */
  private async _initiateSelfUserClients(selfUser: User, clientRepository: ClientRepository) {
    // Add the local client to the user
    selfUser.localClient = await clientRepository.getValidLocalClient();
    await this.repository.client.getClientsForSelf();
    return selfUser.localClient;
  }

  /**
   * Handle URL params.
   */
  private _handleUrlParams(): void {
    // Currently no URL params to be handled
  }

  /**
   * Check whether the page has been reloaded.
   */
  private _isReload() {
    const NAVIGATION_TYPE_RELOAD = 1;
    return window.performance.navigation.type === NAVIGATION_TYPE_RELOAD;
  }

  /**
   * Subscribe to 'beforeunload' to stop calls and disconnect the WebSocket.
   */
  private _subscribeToUnloadEvents(selfUser: User): void {
    window.addEventListener('unload', () => {
      this.logger.info("'window.onunload' was triggered, so we will disconnect from the backend.");
      this.repository.event.disconnectWebSocket();
      this.repository.calling.destroy();

      if (selfUser.isActivatedAccount()) {
        if (this.service.storage.isTemporaryAndNonPersistent) {
          this.logout(SIGN_OUT_REASON.CLIENT_REMOVED, true);
        } else {
          this.repository.storage.terminate('window.onunload');
        }
      } else {
        this.repository.conversation.leaveGuestRoom();
        this.repository.storage.deleteDatabase();
      }

      this.repository.notification.clearNotifications();
    });
  }

  //##############################################################################
  // Lifecycle
  //##############################################################################

  /**
   * Logs the user out on the backend and deletes cached data.
   *
   * @param signOutReason Cause for logout
   * @param clearData Keep data in database
   */
  private readonly logout = (signOutReason: SIGN_OUT_REASON, clearData: boolean): Promise<void> | void => {
    if (this.isLoggingOut) {
      // Avoid triggering another logout flow if we currently are logging out.
      // This could happen if we trigger the logout flow while the user token is already invalid.
      // This will cause the api to fail and to trigger the `logout` event
      return;
    }
    this.isLoggingOut = true;
    const _redirectToLogin = () => {
      amplify.publish(WebAppEvents.LIFECYCLE.SIGNED_OUT, clearData);
      this.redirectToLogin(signOutReason);
    };

    const _logout = async () => {
      // Disconnect from our backend, end tracking and clear cached data
      this.repository.event.disconnectWebSocket();

      // Clear Local Storage (but don't delete the cookie label if you were logged in with a permanent client)
      const keysToKeep = [StorageKey.AUTH.SHOW_LOGIN];

      let keepPermanentDatabase = !clearData;

      try {
        keepPermanentDatabase = this.repository.client.isCurrentClientPermanent() && !clearData;
      } catch (error) {
        if (error instanceof ClientError && error.type === ClientError.TYPE.CLIENT_NOT_SET) {
          keepPermanentDatabase = false;
        }
      }

      if (keepPermanentDatabase) {
        keysToKeep.push(StorageKey.AUTH.PERSIST);
      }

      const selfUser = this.repository.user['userState'].self();
      if (selfUser) {
        const cookieLabelKey = this.repository.client.constructCookieLabelKey(selfUser.email() || selfUser.phone());

        Object.keys(amplify.store()).forEach(keyInAmplifyStore => {
          const isCookieLabelKey = keyInAmplifyStore === cookieLabelKey;
          const deleteLabelKey = isCookieLabelKey && clearData;
          const isCookieLabel = includesString(keyInAmplifyStore, StorageKey.AUTH.COOKIE_LABEL);

          if (!deleteLabelKey && isCookieLabel) {
            keysToKeep.push(keyInAmplifyStore);
          }
        });

        const keepConversationInput = signOutReason === SIGN_OUT_REASON.SESSION_EXPIRED;
        const deletedKeys = CacheRepository.clearLocalStorage(keepConversationInput, keysToKeep);
        this.logger.debug(`Deleted "${deletedKeys.length}" keys from localStorage.`, deletedKeys);
      }
      const shouldWipeIdentity = clearData || signOutReason === SIGN_OUT_REASON.CLIENT_REMOVED;

      if (shouldWipeIdentity) {
        localStorage.clear();
      }

      await this.core.logout(shouldWipeIdentity);
      if (clearData) {
        // Info: This async call cannot be awaited in an "beforeunload" scenario, so we call it without waiting for it in order to delete the CacheStorage in the background.
        CacheRepository.clearCacheStorage();

        try {
          await this.repository.storage.deleteDatabase();
        } catch (error) {
          this.logger.error('Failed to delete database before logout', error);
        }
      }

      return _redirectToLogin();
    };

    const _logoutOnBackend = async () => {
      this.logger.info(`Logout triggered by '${signOutReason}': Disconnecting user from the backend.`);
      try {
        await _logout();
      } catch (e) {
        _redirectToLogin();
      }
    };

    if (App.CONFIG.SIGN_OUT_REASONS.IMMEDIATE.includes(signOutReason)) {
      try {
        return _logout();
      } catch (error) {
        if (error instanceof BaseError) {
          this.logger.error(`Logout triggered by '${signOutReason}' and errored: ${error.message}.`);
          _redirectToLogin();
        }
      }
    }

    if (navigator.onLine) {
      return _logoutOnBackend();
    }

    this.logger.warn('No internet access. Continuing when internet connectivity regained.');
    window.addEventListener('online', () => _logoutOnBackend());
  };

  /**
   * Refresh the web app or desktop wrapper
   */
  readonly refresh = (): void => {
    this.logger.info('Refresh to update started');
    if (Runtime.isDesktopApp()) {
      // if we are in a desktop env, we just warn the wrapper that we need to reload. It then decide what should be done
      amplify.publish(WebAppEvents.LIFECYCLE.RESTART);
      return;
    }

    window.location.reload();
    window.focus();
  };

  /**
   * Notify about found update
   */
  private readonly update = (): void => {
    Warnings.showWarning(Warnings.TYPE.LIFECYCLE_UPDATE);
  };

  /**
   * Redirect to the login page after internet connectivity has been verified.
   * @param signOutReason Redirect triggered by session expiration
   */
  redirectToLogin(signOutReason: SIGN_OUT_REASON): void {
    this.logger.info(`Redirecting to login after connectivity verification. Reason: ${signOutReason}`);
    const isTemporaryGuestReason = App.CONFIG.SIGN_OUT_REASONS.TEMPORARY_GUEST.includes(signOutReason);
    const isLeavingGuestRoom = isTemporaryGuestReason && this.repository.user['userState'].self()?.isTemporaryGuest();

    if (isLeavingGuestRoom) {
      const websiteUrl = getWebsiteUrl();

      if (websiteUrl) {
        return window.location.replace(websiteUrl);
      }
    }

    doRedirect(signOutReason);
  }
}
