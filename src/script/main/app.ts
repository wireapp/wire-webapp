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

import ko from 'knockout';
import platform from 'platform';
import {container} from 'tsyringe';
import {ClientType} from '@wireapp/api-client/src/client/';
import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';
import Dexie from 'dexie';
import {Runtime} from '@wireapp/commons';

import {getLogger, Logger} from 'Util/Logger';
import {t} from 'Util/LocalizerUtil';
import {checkIndexedDb, createRandomUuid} from 'Util/util';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {Environment} from 'Util/Environment';
import {DebugUtil} from 'Util/DebugUtil';
import {includesString} from 'Util/StringUtil';
import {appendParameter} from 'Util/UrlUtil';

import {Config} from '../Config';
import {startNewVersionPolling} from '../lifecycle/newVersionHandler';
import {PreferenceNotificationRepository} from '../notification/PreferenceNotificationRepository';
import * as UserPermission from '../user/UserPermission';
import {UserRepository} from '../user/UserRepository';
import {serverTimeHandler} from '../time/serverTimeHandler';
import {CallingRepository} from '../calling/CallingRepository';
import {BackupRepository} from '../backup/BackupRepository';
import {NotificationRepository} from '../notification/NotificationRepository';
import {IntegrationRepository} from '../integration/IntegrationRepository';
import {IntegrationService} from '../integration/IntegrationService';
import {StorageRepository} from '../storage/StorageRepository';
import {StorageKey} from '../storage/StorageKey';
import {EventTrackingRepository} from '../tracking/EventTrackingRepository';
import {ConnectionRepository} from '../connection/ConnectionRepository';
import {CryptographyRepository} from '../cryptography/CryptographyRepository';
import {TeamRepository} from '../team/TeamRepository';
import {SearchRepository} from '../search/SearchRepository';
import {ConversationRepository} from '../conversation/ConversationRepository';
import {EventRepository} from '../event/EventRepository';
import {EventServiceNoCompound} from '../event/EventServiceNoCompound';
import {EventService} from '../event/EventService';
import {NotificationService} from '../event/NotificationService';
import {QuotedMessageMiddleware} from '../event/preprocessor/QuotedMessageMiddleware';
import {ServiceMiddleware} from '../event/preprocessor/ServiceMiddleware';
import {ConversationService} from '../conversation/ConversationService';
import {SingleInstanceHandler} from './SingleInstanceHandler';
import {AppInitStatisticsValue} from '../telemetry/app_init/AppInitStatisticsValue';
import {AppInitTimingsStep} from '../telemetry/app_init/AppInitTimingsStep';
import {AppInitTelemetry} from '../telemetry/app_init/AppInitTelemetry';
import {ViewModelRepositories} from '../view_model/MainViewModel';
import {ThemeViewModel} from '../view_model/ThemeViewModel';
import {WindowHandler} from '../ui/WindowHandler';

import './globals';

import {ReceiptsMiddleware} from '../event/preprocessor/ReceiptsMiddleware';

import {getWebsiteUrl} from '../externalRoute';

import {URLParameter} from '../auth/URLParameter';
import {SIGN_OUT_REASON} from '../auth/SignOutReason';
import {ClientRepository} from '../client/ClientRepository';
import {CacheRepository} from '../cache/CacheRepository';
import {SelfService} from '../self/SelfService';
import {PropertiesRepository} from '../properties/PropertiesRepository';
import {PropertiesService} from '../properties/PropertiesService';
import {AssetService} from '../assets/AssetService';
import {UserService} from '../user/UserService';
import {AudioRepository} from '../audio/AudioRepository';
import {MessageSender} from '../message/MessageSender';
import {StorageService} from '../storage';
import {BackupService} from '../backup/BackupService';
import {AuthRepository} from '../auth/AuthRepository';
import {MediaRepository} from '../media/MediaRepository';
import {GiphyRepository} from '../extension/GiphyRepository';
import {GiphyService} from '../extension/GiphyService';
import {PermissionRepository} from '../permission/PermissionRepository';
import {APIClient} from '../service/APIClientSingleton';
import {ClientService} from '../client/ClientService';
import {ConnectionService} from '../connection/ConnectionService';
import {TeamService} from '../team/TeamService';
import {SearchService} from '../search/SearchService';
import {CryptographyService} from '../cryptography/CryptographyService';
import {AccessTokenError, ACCESS_TOKEN_ERROR_TYPE} from '../error/AccessTokenError';
import {ClientError, CLIENT_ERROR_TYPE} from '../error/ClientError';
import {AuthError} from '../error/AuthError';
import {AssetRepository} from '../assets/AssetRepository';
import type {BaseError} from '../error/BaseError';
import type {User} from '../entity/User';
import {MessageRepository} from '../conversation/MessageRepository';
import {TeamError} from '../error/TeamError';
import Warnings from '../view_model/WarningsContainer';
import {Core} from '../service/CoreSingleton';
import {migrateToQualifiedSessionIds} from './sessionIdMigrator';

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
  debug: DebugUtil;
  util: {debug: DebugUtil};
  singleInstanceHandler: SingleInstanceHandler;

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
   * @param encryptedEngine Encrypted database handler
   * @param apiClient Configured backend client
   */
  constructor(private readonly core: Core, private readonly apiClient: APIClient) {
    this.apiClient.on(APIClient.TOPIC.ON_LOGOUT, () => this.logout(SIGN_OUT_REASON.NOT_SIGNED_IN, false));
    this.logger = getLogger('App');

    new WindowHandler();

    this.service = this._setupServices();
    this.repository = this._setupRepositories();
    if (Config.getConfig().FEATURE.ENABLE_DEBUG) {
      import('Util/DebugUtil').then(({DebugUtil}) => {
        this.debug = new DebugUtil(this.repository);
        this.util = {debug: this.debug}; // Alias for QA
      });
    }

    this._publishGlobals();

    const onExtraInstanceStarted = () => this._redirectToLogin(SIGN_OUT_REASON.MULTIPLE_TABS);
    this.singleInstanceHandler = new SingleInstanceHandler(onExtraInstanceStarted);

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
    const sendingMessageQueue = new MessageSender();

    repositories.asset = container.resolve(AssetRepository);

    repositories.auth = new AuthRepository();
    repositories.giphy = new GiphyRepository(new GiphyService());
    repositories.properties = new PropertiesRepository(new PropertiesService(), selfService);
    repositories.serverTime = serverTimeHandler;
    repositories.storage = new StorageRepository();

    repositories.cryptography = new CryptographyRepository(new CryptographyService());
    repositories.client = new ClientRepository(new ClientService(), repositories.cryptography, repositories.storage);
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
    repositories.search = new SearchRepository(new SearchService(), repositories.user);
    repositories.team = new TeamRepository(new TeamService(), repositories.user, repositories.asset);

    repositories.message = new MessageRepository(
      /*
       * ToDo: there is a cyclic dependency between message and conversation repos.
       * MessageRepository should NOT depend upon ConversationRepository.
       * We need to remove all usages of conversationRepository inside the messageRepository
       */
      () => repositories.conversation,
      repositories.cryptography,
      repositories.event,
      sendingMessageQueue,
      repositories.properties,
      serverTimeHandler,
      repositories.user,
      repositories.asset,
    );

    repositories.conversation = new ConversationRepository(
      this.service.conversation,
      repositories.message,
      repositories.connection,
      repositories.event,
      repositories.team,
      repositories.user,
      repositories.properties,
      serverTimeHandler,
    );

    repositories.eventTracker = new EventTrackingRepository(repositories.message);

    const serviceMiddleware = new ServiceMiddleware(repositories.conversation, repositories.user);
    const quotedMessageMiddleware = new QuotedMessageMiddleware(this.service.event);

    const readReceiptMiddleware = new ReceiptsMiddleware(this.service.event, repositories.conversation);

    repositories.event.setEventProcessMiddlewares([
      serviceMiddleware.processEvent.bind(serviceMiddleware),
      quotedMessageMiddleware.processEvent.bind(quotedMessageMiddleware),
      readReceiptMiddleware.processEvent.bind(readReceiptMiddleware),
    ]);
    repositories.backup = new BackupRepository(new BackupService(), repositories.conversation);
    repositories.calling = new CallingRepository(
      repositories.message,
      repositories.event,
      repositories.user,
      repositories.media.streamHandler,
      repositories.media.devicesHandler,
      serverTimeHandler,
    );
    repositories.integration = new IntegrationRepository(
      this.service.integration,
      repositories.conversation,
      repositories.team,
    );
    repositories.permission = new PermissionRepository();
    repositories.notification = new NotificationRepository(repositories.conversation, repositories.permission);
    repositories.preferenceNotification = new PreferenceNotificationRepository(repositories.user['userState'].self);

    repositories.conversation.leaveCall = repositories.calling.leaveCall;
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

  /**
   * Subscribe to amplify events.
   */
  private _subscribeToEvents() {
    amplify.subscribe(WebAppEvents.LIFECYCLE.REFRESH, this.refresh);
    amplify.subscribe(WebAppEvents.LIFECYCLE.SIGN_OUT, this.logout);
    amplify.subscribe(WebAppEvents.CONNECTION.ACCESS_TOKEN.RENEW, async (source: string) => {
      this.logger.info(`Access token refresh triggered by "${source}"...`);
      try {
        await this.apiClient.transport.http.refreshAccessToken();
        amplify.publish(WebAppEvents.CONNECTION.ACCESS_TOKEN.RENEWED);
        this.logger.info(`Refreshed access token.`);
      } catch (error) {
        this.logger.warn(`Logging out user because access token cannot be refreshed: ${error.message}`, error);
        this.logout(SIGN_OUT_REASON.NOT_SIGNED_IN, false);
      }
    });
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
   */
  async initApp(clientType: ClientType, onProgress: (progress: number, message?: string) => void) {
    // add body information
    const osCssClass = Runtime.isMacOS() ? 'os-mac' : 'os-pc';
    const platformCssClass = Runtime.isDesktopApp() ? 'platform-electron' : 'platform-web';
    document.body.classList.add(osCssClass, platformCssClass);

    const isReload = this._isReload();
    this.logger.debug(`App init starts (isReload: '${isReload}')`);
    new ThemeViewModel(this.repository.properties);
    const telemetry = new AppInitTelemetry();
    try {
      const {
        audio: audioRepository,
        calling: callingRepository,
        client: clientRepository,
        connection: connectionRepository,
        conversation: conversationRepository,
        cryptography: cryptographyRepository,
        event: eventRepository,
        eventTracker: eventTrackerRepository,
        properties: propertiesRepository,
        team: teamRepository,
        user: userRepository,
      } = this.repository;
      await checkIndexedDb();
      this._registerSingleInstance();
      onProgress(2.5);
      telemetry.timeStep(AppInitTimingsStep.RECEIVED_ACCESS_TOKEN);

      try {
        await this.core.init(clientType);
      } catch (error) {
        throw new ClientError(CLIENT_ERROR_TYPE.NO_VALID_CLIENT, 'Client has been deleted on backend');
      }

      const selfUser = await this.initiateSelfUser();
      if (this.apiClient.backendFeatures.isFederated) {
        // Migrate all existing session to fully qualified ids (if need be)
        await migrateToQualifiedSessionIds(
          this.repository.storage.storageService.db.sessions,
          this.apiClient.context!.domain,
        );
      }
      onProgress(5, t('initReceivedSelfUser', selfUser.name()));
      telemetry.timeStep(AppInitTimingsStep.RECEIVED_SELF_USER);
      const clientEntity = await this._initiateSelfUserClients();
      callingRepository.initAvs(selfUser, clientEntity().id);
      onProgress(7.5, t('initValidatedClient'));
      telemetry.timeStep(AppInitTimingsStep.VALIDATED_CLIENT);
      telemetry.addStatistic(AppInitStatisticsValue.CLIENT_TYPE, clientEntity().type);

      await cryptographyRepository.init(this.core.service!.cryptography.cryptobox, clientEntity);

      onProgress(10);
      telemetry.timeStep(AppInitTimingsStep.INITIALIZED_CRYPTOGRAPHY);

      await teamRepository.initTeam();

      const conversationEntities = await conversationRepository.getConversations();
      const connectionEntities = await connectionRepository.getConnections();
      onProgress(25, t('initReceivedUserData'));
      telemetry.timeStep(AppInitTimingsStep.RECEIVED_USER_DATA);
      telemetry.addStatistic(AppInitStatisticsValue.CONVERSATIONS, conversationEntities.length, 50);
      telemetry.addStatistic(AppInitStatisticsValue.CONNECTIONS, connectionEntities.length, 50);
      if (connectionEntities.length) {
        await Promise.allSettled(conversationRepository.mapConnections(connectionEntities));
      }
      this._subscribeToUnloadEvents();

      await conversationRepository.conversationRoleRepository.loadTeamRoles();

      await userRepository.loadUsers();

      await eventRepository.connectWebSocket(this.core, ({done, total}) => {
        const baseMessage = t('initDecryption');
        const extraInfo = Config.getConfig().FEATURE.SHOW_LOADING_INFORMATION
          ? ` ${t('initProgress', {number1: done.toString(), number2: total.toString()})}`
          : '';
        onProgress(25 + 50 * (done / total), `${baseMessage}${extraInfo}`);
      });
      const notificationsCount = eventRepository.notificationsTotal;

      telemetry.timeStep(AppInitTimingsStep.UPDATED_FROM_NOTIFICATIONS);
      telemetry.addStatistic(AppInitStatisticsValue.NOTIFICATIONS, notificationsCount, 100);

      eventTrackerRepository.init(propertiesRepository.properties.settings.privacy.telemetry_sharing);
      await conversationRepository.initializeConversations();
      onProgress(97.5, t('initUpdatedFromNotifications', Config.getConfig().BRAND_NAME));

      const clientEntities = await clientRepository.updateClientsForSelf();

      onProgress(99);

      telemetry.addStatistic(AppInitStatisticsValue.CLIENTS, clientEntities.length);
      telemetry.timeStep(AppInitTimingsStep.APP_PRE_LOADED);

      userRepository['userState'].self().devices(clientEntities);
      this.logger.info('App pre-loading completed');
      this._handleUrlParams();
      await conversationRepository.updateConversationsOnAppInit();
      await conversationRepository.conversationLabelRepository.loadLabels();

      telemetry.timeStep(AppInitTimingsStep.APP_LOADED);
      //this._showInterface();

      telemetry.report();
      amplify.publish(WebAppEvents.LIFECYCLE.LOADED);
      //modals.ready();
      //showInitialModal(userRepository['userState'].self().availability());
      telemetry.timeStep(AppInitTimingsStep.UPDATED_CONVERSATIONS);
      if (userRepository['userState'].isActivatedAccount()) {
        // start regularly polling the server to check if there is a new version of Wire
        startNewVersionPolling(Environment.version(false), this.update);
      }
      audioRepository.init(true);
      conversationRepository.cleanupConversations();
      callingRepository.setReady();
      this.logger.info('App fully loaded');
    } catch (error) {
      this._appInitFailure(error, isReload);
    }
  }

  /**
   * Initialize ServiceWorker if supported.
   */
  initServiceWorker(): void {
    if (navigator.serviceWorker) {
      navigator.serviceWorker
        .register(`/sw.js?${Environment.version(false)}`)
        .then(({scope}) => this.logger.info(`ServiceWorker registration successful with scope: ${scope}`));
    }
  }

  private _appInitFailure(error: BaseError, isReload: boolean) {
    let logMessage = `Could not initialize app version '${Environment.version(false)}'`;
    if (Runtime.isDesktopApp()) {
      logMessage += ` - Electron '${platform.os.family}' '${Environment.version()}'`;
    }
    this.logger.warn(`${logMessage}: ${error.message}`, {error});

    const {message, type} = error;
    const isAuthError = error instanceof AuthError;
    if (isAuthError) {
      const isTypeMultipleTabs = type === AuthError.TYPE.MULTIPLE_TABS;
      const signOutReason = isTypeMultipleTabs ? SIGN_OUT_REASON.MULTIPLE_TABS : SIGN_OUT_REASON.INDEXED_DB;
      return this._redirectToLogin(signOutReason);
    }

    this.logger.debug(
      `App reload: '${isReload}', Document referrer: '${document.referrer}', Location: '${window.location.href}'`,
    );
    if (isReload) {
      const isSessionExpired = [AccessTokenError.TYPE.REQUEST_FORBIDDEN, AccessTokenError.TYPE.NOT_FOUND_IN_CACHE];

      if (isSessionExpired.includes(type as ACCESS_TOKEN_ERROR_TYPE)) {
        this.logger.warn(`Session expired on page reload: ${message}`, error);
        return this._redirectToLogin(SIGN_OUT_REASON.SESSION_EXPIRED);
      }

      const isAccessTokenError = error instanceof AccessTokenError;
      const isInvalidClient = type === ClientError.TYPE.NO_VALID_CLIENT;

      if (isInvalidClient) {
        return this._redirectToLogin(SIGN_OUT_REASON.SESSION_EXPIRED);
      }

      if (isAccessTokenError) {
        this.logger.warn('Connectivity issues. Trigger reload.', error);
        return window.location.reload();
      }
    }

    if (navigator.onLine === true) {
      switch (type) {
        case CLIENT_ERROR_TYPE.NO_VALID_CLIENT: {
          this.logger.warn(`Redirecting to login: ${error.message}`, error);
          return this._redirectToLogin(SIGN_OUT_REASON.CLIENT_REMOVED);
        }
        case AccessTokenError.TYPE.NOT_FOUND_IN_CACHE:
        case AccessTokenError.TYPE.RETRIES_EXCEEDED:
        case AccessTokenError.TYPE.REQUEST_FORBIDDEN: {
          this.logger.warn(`Redirecting to login: ${error.message}`, error);
          return this._redirectToLogin(SIGN_OUT_REASON.NOT_SIGNED_IN);
        }
        case TeamError.TYPE.NO_APP_CONFIG: {
          this.logger.warn(`Logging out user: ${error.message}`, error);
          return this._redirectToLogin(SIGN_OUT_REASON.NO_APP_CONFIG);
        }

        default: {
          this.logger.error(`Caused by: ${(error ? error.message : undefined) || error}`, error);

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
   * Check whether we need to set different user information (picture, username).
   * @param userEntity Self user entity
   * @returns Checked user entity
   */
  private _checkUserInformation(userEntity: User) {
    if (userEntity.hasActivatedIdentity()) {
      if (!userEntity.mediumPictureResource()) {
        this.repository.user.setDefaultPicture();
      }
    }

    return userEntity;
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

    await container.resolve(StorageService).init(this.core.storage);
    this.repository.client.init(userEntity);
    await this.repository.properties.init(userEntity);
    this._checkUserInformation(userEntity);

    return userEntity;
  }

  /**
   * Initiate the current client of the self user.
   * @returns Resolves with the local client entity
   */
  private _initiateSelfUserClients() {
    return this.repository.client
      .getValidLocalClient()
      .then(clientObservable => {
        this.repository.event.currentClient = clientObservable;
        return this.repository.client.getClientsForSelf();
      })
      .then(() => this.repository.client['clientState'].currentClient);
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

  //##############################################################################
  // Multiple tabs check
  //##############################################################################

  /**
   * Check that this is the single instance tab of the app.
   * @returns Resolves when page is the first tab
   */
  private _registerSingleInstance(): void {
    const instanceId = createRandomUuid();

    if (this.singleInstanceHandler.registerInstance(instanceId)) {
      return this._registerSingleInstanceCleaning();
    }
    throw new AuthError(AuthError.TYPE.MULTIPLE_TABS, AuthError.MESSAGE.MULTIPLE_TABS);
  }

  private _registerSingleInstanceCleaning() {
    $(window).on('beforeunload', () => {
      this.singleInstanceHandler.deregisterInstance();
    });
  }

  /**
   * Subscribe to 'beforeunload' to stop calls and disconnect the WebSocket.
   */
  private _subscribeToUnloadEvents(): void {
    $(window).on('unload', () => {
      this.logger.info("'window.onunload' was triggered, so we will disconnect from the backend.");
      this.repository.event.disconnectWebSocket();
      this.repository.calling.destroy();

      if (this.repository.user['userState'].isActivatedAccount()) {
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
  readonly logout = (signOutReason: SIGN_OUT_REASON, clearData: boolean): Promise<void> | void => {
    const _redirectToLogin = () => {
      amplify.publish(WebAppEvents.LIFECYCLE.SIGNED_OUT, clearData);
      this._redirectToLogin(signOutReason);
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
        if (error.type === ClientError.TYPE.CLIENT_NOT_SET) {
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
        this.logger.info(`Deleted "${deletedKeys.length}" keys from localStorage.`, deletedKeys);
      }

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

    const _logoutOnBackend = () => {
      this.logger.info(`Logout triggered by '${signOutReason}': Disconnecting user from the backend.`);
      return this.repository.auth
        .logout()
        .then(() => _logout())
        .catch(() => _redirectToLogin());
    };

    if (App.CONFIG.SIGN_OUT_REASONS.IMMEDIATE.includes(signOutReason)) {
      try {
        return _logout();
      } catch (error) {
        this.logger.error(`Logout triggered by '${signOutReason}' and errored: ${error.message}.`);
        _redirectToLogin();
      }
    }

    if (navigator.onLine) {
      return _logoutOnBackend();
    }

    this.logger.warn('No internet access. Continuing when internet connectivity regained.');
    $(window).on('online', () => _logoutOnBackend());
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
  readonly update = (): void => {
    amplify.publish(WebAppEvents.WARNING.SHOW, Warnings.TYPE.LIFECYCLE_UPDATE);
  };

  /**
   * Redirect to the login page after internet connectivity has been verified.
   * @param signOutReason Redirect triggered by session expiration
   */
  private _redirectToLogin(signOutReason: SIGN_OUT_REASON): void {
    this.logger.info(`Redirecting to login after connectivity verification. Reason: ${signOutReason}`);
    const isTemporaryGuestReason = App.CONFIG.SIGN_OUT_REASONS.TEMPORARY_GUEST.includes(signOutReason);
    const isLeavingGuestRoom = isTemporaryGuestReason && this.repository.user['userState'].isTemporaryGuest();
    if (isLeavingGuestRoom) {
      return window.location.replace(getWebsiteUrl());
    }

    doRedirect(signOutReason);
  }

  //##############################################################################
  // Debugging
  //##############################################################################

  private _publishGlobals() {
    window.z.userPermission = ko.observable({});
    ko.pureComputed(() => {
      const selfUser = this.repository.user['userState'].self();
      return selfUser && selfUser.teamRole();
    }).subscribe(role => window.z.userPermission(UserPermission.generatePermissionHelpers(role)));
  }
}
