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
import 'core-js/es7/reflect';

import ko from 'knockout';
import platform from 'platform';
import {container} from 'tsyringe';
import {WebAppEvents} from '@wireapp/webapp-events';

import {getLogger} from 'Util/Logger';
import {t} from 'Util/LocalizerUtil';
import {checkIndexedDb, createRandomUuid, isTemporaryClientAndNonPersistent} from 'Util/util';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {enableLogging} from 'Util/LoggerUtil';
import {Environment} from 'Util/Environment';
import {exposeWrapperGlobals} from 'Util/wrapper';
import {includesString} from 'Util/StringUtil';
import {appendParameter} from 'Util/UrlUtil';
import {APIClient} from '@wireapp/api-client';
import {Config} from '../Config';
import {startNewVersionPolling} from '../lifecycle/newVersionHandler';
import {LoadingViewModel} from '../view_model/LoadingViewModel';
import {PreferenceNotificationRepository} from '../notification/PreferenceNotificationRepository';
import * as UserPermission from '../user/UserPermission';
import {UserRepository} from '../user/UserRepository';
import {serverTimeHandler} from '../time/serverTimeHandler';
import {CallingRepository} from '../calling/CallingRepository';
import {BackupRepository} from '../backup/BackupRepository';
import {BroadcastRepository} from '../broadcast/BroadcastRepository';
import {NotificationRepository} from '../notification/NotificationRepository';
import {IntegrationRepository} from '../integration/IntegrationRepository';
import {IntegrationService} from '../integration/IntegrationService';
import {StorageRepository} from '../storage/StorageRepository';
import {StorageKey} from '../storage/StorageKey';
import {PROPERTIES_TYPE} from '../properties/PropertiesType';
import {EventTrackingRepository} from '../tracking/EventTrackingRepository';
import {ConnectionRepository} from '../connection/ConnectionRepository';
import {CryptographyRepository} from '../cryptography/CryptographyRepository';
import {TeamRepository} from '../team/TeamRepository';
import {SearchRepository} from '../search/SearchRepository';
import {ConversationRepository} from '../conversation/ConversationRepository';
import Dexie from 'dexie';
import {EventRepository} from '../event/EventRepository';
import {EventServiceNoCompound} from '../event/EventServiceNoCompound';
import {EventService} from '../event/EventService';
import {NotificationService} from '../event/NotificationService';
import {QuotedMessageMiddleware} from '../event/preprocessor/QuotedMessageMiddleware';
import {ServiceMiddleware} from '../event/preprocessor/ServiceMiddleware';
import {WebSocketService} from '../event/WebSocketService';
import {ConversationService} from '../conversation/ConversationService';

import {BackendClient} from '../service/BackendClient';
import {SingleInstanceHandler} from './SingleInstanceHandler';

import {AppInitStatisticsValue} from '../telemetry/app_init/AppInitStatisticsValue';
import {AppInitTimingsStep} from '../telemetry/app_init/AppInitTimingsStep';
import {AppInitTelemetry} from '../telemetry/app_init/AppInitTelemetry';
import {MainViewModel} from '../view_model/MainViewModel';
import {ThemeViewModel} from '../view_model/ThemeViewModel';
import {WindowHandler} from '../ui/WindowHandler';

import {Router} from '../router/Router';
import {initRouterBindings} from '../router/routerBindings';

import 'Components/mentionSuggestions';
import './globals';

import {ReceiptsMiddleware} from '../event/preprocessor/ReceiptsMiddleware';

import {getWebsiteUrl} from '../externalRoute';

import {modals} from '../view_model/ModalsViewModel';
import {showInitialModal} from '../user/AvailabilityModal';

import {URLParameter} from '../auth/URLParameter';
import {SIGN_OUT_REASON} from '../auth/SignOutReason';
import {ClientRepository} from '../client/ClientRepository';
import {WarningsViewModel} from '../view_model/WarningsViewModel';
import {ContentViewModel} from '../view_model/ContentViewModel';
import {AppLockViewModel} from '../view_model/content/AppLockViewModel';
import {CacheRepository} from '../cache/CacheRepository';
import {SelfService} from '../self/SelfService';
import {BroadcastService} from '../broadcast/BroadcastService';
import {PropertiesRepository} from '../properties/PropertiesRepository';
import {PropertiesService} from '../properties/PropertiesService';
import {LinkPreviewRepository} from '../links/LinkPreviewRepository';
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
import {loadValue} from 'Util/StorageUtil';
import {APIClientSingleton} from '../service/APIClientSingleton';
import {ClientService} from '../client/ClientService';
import {ConnectionService} from '../connection/ConnectionService';
import {TeamService} from '../team/TeamService';
import {SearchService} from '../search/SearchService';
import {CryptographyService} from '../cryptography/CryptographyService';
import {AccessTokenError} from '../error/AccessTokenError';
import {ClientError} from '../error/ClientError';
import {AuthError} from '../error/AuthError';
import {AssetRepository} from '../assets/AssetRepository';

function doRedirect(signOutReason) {
  let url = `/auth/${location.search}`;

  const isImmediateSignOutReason = App.CONFIG.SIGN_OUT_REASONS.IMMEDIATE.includes(signOutReason);
  if (isImmediateSignOutReason) {
    url = appendParameter(url, `${URLParameter.REASON}=${signOutReason}`);
  }

  Dexie.delete('/sqleet');
  window.location.replace(url);
}

class App {
  static get CONFIG() {
    return {
      COOKIES_CHECK: {
        COOKIE_NAME: 'cookies_enabled',
      },
      NOTIFICATION_CHECK: TIME_IN_MILLIS.SECOND * 10,
      SIGN_OUT_REASONS: {
        IMMEDIATE: [SIGN_OUT_REASON.ACCOUNT_DELETED, SIGN_OUT_REASON.CLIENT_REMOVED, SIGN_OUT_REASON.SESSION_EXPIRED],
        TEMPORARY_GUEST: [
          SIGN_OUT_REASON.MULTIPLE_TABS,
          SIGN_OUT_REASON.SESSION_EXPIRED,
          SIGN_OUT_REASON.USER_REQUESTED,
        ],
      },
    };
  }

  /**
   * Construct a new app.
   * @param {APIClient} apiClient Configured backend client
   * @param {BackendClient} backendClient Configured backend client
   * @param {Element} appContainer DOM element that will hold the app
   * @param {SQLeetEngine} [encryptedEngine] Encrypted database handler
   */
  constructor(apiClient, backendClient, appContainer, encryptedEngine) {
    this.apiClient = apiClient;
    this.apiClient.on(APIClient.TOPIC.ON_LOGOUT, () => this.logout(SIGN_OUT_REASON.NOT_SIGNED_IN, false));
    this.backendClient = backendClient;
    this.logger = getLogger('App');
    this.appContainer = appContainer;

    new WindowHandler();

    this.service = this._setupServices(encryptedEngine);
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
    this.initApp();
    this.initServiceWorker();
  }

  //##############################################################################
  // Instantiation
  //##############################################################################

  /**
   * Create all app repositories.
   * @returns {Object} All repositories
   */
  _setupRepositories() {
    const repositories = {};
    const selfService = new SelfService(this.apiClient);
    const sendingMessageQueue = new MessageSender();

    repositories.asset = new AssetRepository(this.service.asset);
    repositories.audio = new AudioRepository();
    repositories.auth = new AuthRepository(this.apiClient);
    repositories.giphy = new GiphyRepository(new GiphyService(this.apiClient));
    repositories.properties = new PropertiesRepository(new PropertiesService(this.apiClient), selfService);
    repositories.serverTime = serverTimeHandler;
    repositories.storage = new StorageRepository(this.service.storage);

    repositories.cryptography = new CryptographyRepository(
      new CryptographyService(this.apiClient),
      repositories.storage,
    );
    repositories.client = new ClientRepository(
      new ClientService(this.apiClient, this.service.storage),
      repositories.cryptography,
    );
    repositories.media = new MediaRepository(new PermissionRepository());
    repositories.user = new UserRepository(
      new UserService(this.apiClient, this.service.storage),
      repositories.asset,
      selfService,
      repositories.client,
      serverTimeHandler,
      repositories.properties,
    );
    repositories.connection = new ConnectionRepository(new ConnectionService(this.apiClient), repositories.user);
    repositories.event = new EventRepository(
      this.service.event,
      this.service.notification,
      this.service.webSocket,
      repositories.cryptography,
      serverTimeHandler,
      repositories.user,
    );
    repositories.search = new SearchRepository(new SearchService(this.apiClient), repositories.user);
    repositories.team = new TeamRepository(new TeamService(this.apiClient), repositories.user);
    repositories.eventTracker = new EventTrackingRepository(repositories.team, repositories.user);

    repositories.conversation = new ConversationRepository(
      this.service.conversation,
      repositories.asset,
      repositories.client,
      repositories.connection,
      repositories.cryptography,
      repositories.event,
      repositories.giphy,
      new LinkPreviewRepository(repositories.asset, repositories.properties),
      sendingMessageQueue,
      serverTimeHandler,
      repositories.team,
      repositories.user,
      repositories.properties,
    );

    const serviceMiddleware = new ServiceMiddleware(repositories.conversation, repositories.user);
    const quotedMessageMiddleware = new QuotedMessageMiddleware(this.service.event);

    const readReceiptMiddleware = new ReceiptsMiddleware(
      this.service.event,
      repositories.user,
      repositories.conversation,
    );

    repositories.event.setEventProcessMiddlewares([
      serviceMiddleware.processEvent.bind(serviceMiddleware),
      quotedMessageMiddleware.processEvent.bind(quotedMessageMiddleware),
      readReceiptMiddleware.processEvent.bind(readReceiptMiddleware),
    ]);
    repositories.backup = new BackupRepository(
      new BackupService(this.service.storage),
      repositories.client,
      repositories.connection,
      repositories.conversation,
      repositories.user,
    );
    repositories.broadcast = new BroadcastRepository(
      new BroadcastService(this.apiClient),
      repositories.client,
      repositories.conversation,
      repositories.cryptography,
      sendingMessageQueue,
      repositories.user,
    );
    repositories.calling = new CallingRepository(
      this.apiClient,
      repositories.conversation,
      repositories.event,
      repositories.media.streamHandler,
      serverTimeHandler,
    );
    repositories.integration = new IntegrationRepository(
      this.service.integration,
      repositories.conversation,
      repositories.team,
    );
    repositories.permission = new PermissionRepository();
    repositories.notification = new NotificationRepository(
      repositories.calling,
      repositories.conversation,
      repositories.permission,
      repositories.user,
    );
    repositories.preferenceNotification = new PreferenceNotificationRepository(repositories.user.self);

    return repositories;
  }

  /**
   * Create all app services.
   * @param {SQLeetEngine} [encryptedEngine] Encrypted database handler
   * @returns {Object} All services
   */
  _setupServices(encryptedEngine) {
    const storageService = new StorageService(encryptedEngine);
    const eventService = Environment.browser.edge
      ? new EventServiceNoCompound(storageService)
      : new EventService(storageService);

    return {
      asset: new AssetService(this.apiClient, this.backendClient),
      conversation: new ConversationService(this.apiClient, eventService, storageService),
      event: eventService,
      integration: new IntegrationService(this.apiClient),
      notification: new NotificationService(this.apiClient, storageService),
      storage: storageService,
      webSocket: new WebSocketService(this.apiClient, this.backendClient),
    };
  }

  /**
   * Subscribe to amplify events.
   * @returns {undefined} No return value
   */
  _subscribeToEvents() {
    amplify.subscribe(WebAppEvents.LIFECYCLE.REFRESH, this.refresh.bind(this));
    amplify.subscribe(WebAppEvents.LIFECYCLE.SIGN_OUT, this.logout.bind(this));
    amplify.subscribe(WebAppEvents.CONNECTION.ACCESS_TOKEN.RENEW, async source => {
      this.logger.info(`Access token refresh triggered by "${source}"...`);
      const apiClient = container.resolve(APIClientSingleton).getClient();
      try {
        await apiClient.transport.http.refreshAccessToken();
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
   * @param {boolean} [isReload=_isReload()] App init after page reload
   * @returns {undefined} No return value
   */
  async initApp() {
    const isReload = this._isReload();
    this.logger.debug(`App init starts (isReload: '${isReload}')`);
    new ThemeViewModel(this.repository.properties);
    const loadingView = new LoadingViewModel();
    const telemetry = new AppInitTelemetry();
    try {
      const {
        auth: authRepository,
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
      loadingView.updateProgress(2.5);
      telemetry.time_step(AppInitTimingsStep.RECEIVED_ACCESS_TOKEN);
      await authRepository.init();
      await this._initiateSelfUser();
      loadingView.updateProgress(5, t('initReceivedSelfUser', userRepository.self().name()));
      telemetry.time_step(AppInitTimingsStep.RECEIVED_SELF_USER);
      const clientEntity = await this._initiateSelfUserClients();
      const selfUser = userRepository.self();
      callingRepository.initAvs(selfUser, clientEntity.id);
      loadingView.updateProgress(7.5, t('initValidatedClient'));
      telemetry.time_step(AppInitTimingsStep.VALIDATED_CLIENT);
      telemetry.add_statistic(AppInitStatisticsValue.CLIENT_TYPE, clientEntity.type);

      await cryptographyRepository.initCryptobox();
      loadingView.updateProgress(10);
      telemetry.time_step(AppInitTimingsStep.INITIALIZED_CRYPTOGRAPHY);

      await teamRepository.initTeam();

      eventRepository.connectWebSocket();
      const conversationEntities = await conversationRepository.getConversations();
      const connectionEntities = await connectionRepository.getConnections();
      loadingView.updateProgress(25, t('initReceivedUserData'));

      telemetry.time_step(AppInitTimingsStep.RECEIVED_USER_DATA);
      telemetry.add_statistic(AppInitStatisticsValue.CONVERSATIONS, conversationEntities.length, 50);
      telemetry.add_statistic(AppInitStatisticsValue.CONNECTIONS, connectionEntities.length, 50);

      conversationRepository.map_connections(connectionRepository.connectionEntities());
      this._subscribeToUnloadEvents();

      await conversationRepository.conversationRoleRepository.loadTeamRoles();

      await userRepository.loadUsers();

      const notificationsCount = await eventRepository.initializeFromStream();

      telemetry.time_step(AppInitTimingsStep.UPDATED_FROM_NOTIFICATIONS);
      telemetry.add_statistic(AppInitStatisticsValue.NOTIFICATIONS, notificationsCount, 100);

      eventTrackerRepository.init(propertiesRepository.properties.settings.privacy.improve_wire);
      await conversationRepository.initialize_conversations();
      loadingView.updateProgress(97.5, t('initUpdatedFromNotifications', Config.getConfig().BRAND_NAME));

      this._watchOnlineStatus();
      const clientEntities = await clientRepository.updateClientsForSelf();

      loadingView.updateProgress(99);

      telemetry.add_statistic(AppInitStatisticsValue.CLIENTS, clientEntities.length);
      telemetry.time_step(AppInitTimingsStep.APP_PRE_LOADED);

      userRepository.self().devices(clientEntities);
      this.logger.info('App pre-loading completed');
      await this._handleUrlParams();
      await conversationRepository.updateConversationsOnAppInit();
      await conversationRepository.conversationLabelRepository.loadLabels();

      telemetry.time_step(AppInitTimingsStep.APP_LOADED);
      this._showInterface();
      this.applock = new AppLockViewModel(clientRepository, userRepository.self);

      loadingView.removeFromView();
      telemetry.report();
      amplify.publish(WebAppEvents.LIFECYCLE.LOADED);
      modals.ready();
      showInitialModal(userRepository.self().availability());
      telemetry.time_step(AppInitTimingsStep.UPDATED_CONVERSATIONS);
      if (userRepository.isActivatedAccount()) {
        // start regularly polling the server to check if there is a new version of Wire
        startNewVersionPolling(Environment.version(false, true), this.update.bind(this));
      }
      audioRepository.init(true);
      conversationRepository.cleanup_conversations();
      callingRepository.setReady();
      this.logger.info('App fully loaded');
    } catch (error) {
      this._appInitFailure(error, isReload);
    }
  }

  /**
   * Initialize ServiceWorker if supported.
   * @returns {undefined} No return value
   */
  initServiceWorker() {
    if (navigator.serviceWorker) {
      navigator.serviceWorker
        .register(`/sw.js?${Environment.version(false)}`)
        .then(({scope}) => this.logger.info(`ServiceWorker registration successful with scope: ${scope}`));
    }
  }

  /**
   * Behavior when internet connection is re-established.
   * @returns {undefined} No return value
   */
  onInternetConnectionGained() {
    this.logger.info('Internet connection regained. Re-establishing WebSocket connection...');
    this.backendClient.executeOnConnectivity(BackendClient.CONNECTIVITY_CHECK_TRIGGER.CONNECTION_REGAINED).then(() => {
      amplify.publish(WebAppEvents.WARNING.DISMISS, WarningsViewModel.TYPE.NO_INTERNET);
      amplify.publish(WebAppEvents.WARNING.SHOW, WarningsViewModel.TYPE.CONNECTIVITY_RECONNECT);
      this.repository.event.reconnectWebSocket(WebSocketService.CHANGE_TRIGGER.ONLINE);
    });
  }

  /**
   * Reflect internet connection loss in the UI.
   * @returns {undefined} No return value
   */
  onInternetConnectionLost() {
    this.logger.warn('Internet connection lost');
    this.repository.event.disconnectWebSocket(WebSocketService.CHANGE_TRIGGER.OFFLINE);
    amplify.publish(WebAppEvents.WARNING.SHOW, WarningsViewModel.TYPE.NO_INTERNET);
  }

  _appInitFailure(error, isReload) {
    let logMessage = `Could not initialize app version '${Environment.version(false)}'`;
    if (Environment.desktop) {
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

      if (isSessionExpired.includes(type)) {
        this.logger.warn(`Session expired on page reload: ${message}`, error);
        return this._redirectToLogin(SIGN_OUT_REASON.SESSION_EXPIRED);
      }

      const isAccessTokenError = error instanceof AccessTokenError;
      const isInvalidClient = type === ClientError.TYPE.NO_VALID_CLIENT;

      if (isInvalidClient) {
        return this._redirectToLogin(SIGN_OUT_REASON.SESSION_EXPIRED);
      }

      if (isAccessTokenError) {
        this.logger.warn('Connectivity issues. Trigger reload on regained connectivity.', error);
        const triggerSource = isAccessTokenError
          ? BackendClient.CONNECTIVITY_CHECK_TRIGGER.ACCESS_TOKEN_RETRIEVAL
          : BackendClient.CONNECTIVITY_CHECK_TRIGGER.APP_INIT_RELOAD;
        return this.backendClient.executeOnConnectivity(triggerSource).then(() => window.location.reload());
      }
    }

    if (navigator.onLine) {
      switch (type) {
        case AccessTokenError.TYPE.NOT_FOUND_IN_CACHE:
        case AccessTokenError.TYPE.RETRIES_EXCEEDED:
        case AccessTokenError.TYPE.REQUEST_FORBIDDEN: {
          this.logger.warn(`Redirecting to login: ${error.message}`, error);
          return this._redirectToLogin(SIGN_OUT_REASON.NOT_SIGNED_IN);
        }

        default: {
          this.logger.error(`Caused by: ${(error ? error.message : undefined) || error}`, error);

          const isAccessTokenError = error instanceof AccessTokenError;
          if (isAccessTokenError) {
            this.logger.error(`Could not get access token: ${error.message}. Logging out user.`, error);
          } else {
            Raygun.send(error);
          }

          return this.logout(SIGN_OUT_REASON.APP_INIT, false);
        }
      }
    }

    this.logger.warn('No connectivity. Trigger reload on regained connectivity.', error);
    this._watchOnlineStatus();
  }

  /**
   * Check whether we need to set different user information (picture, username).
   * @param {User} userEntity Self user entity
   * @returns {User} Checked user entity
   */
  _checkUserInformation(userEntity) {
    if (userEntity.hasActivatedIdentity()) {
      if (!userEntity.mediumPictureResource()) {
        this.repository.user.setDefaultPicture();
      }
      if (!userEntity.username()) {
        this.repository.user.getUsernameSuggestion();
      }
    }

    return userEntity;
  }

  /**
   * Initiate the self user by getting it from the backend.
   * @returns {Promise<User>} Resolves with the self user entity
   */
  async _initiateSelfUser() {
    const userEntity = await this.repository.user.getSelf();

    this.logger.info(`Loaded self user with ID '${userEntity.id}'`);

    if (!userEntity.hasActivatedIdentity()) {
      this.logger.info('User does not have an activated identity and seems to be a temporary guest');

      if (!userEntity.isTemporaryGuest()) {
        throw new Error('User does not have an activated identity');
      }
    }

    await this.service.storage.init(userEntity.id);
    await this.repository.client.init(userEntity);
    await this.repository.properties.init(userEntity);
    await this._checkUserInformation(userEntity);

    return userEntity;
  }

  /**
   * Initiate the current client of the self user.
   * @returns {Promise<Client>} Resolves with the local client entity
   */
  _initiateSelfUserClients() {
    return this.repository.client
      .getValidLocalClient()
      .then(clientObservable => {
        this.repository.cryptography.currentClient = clientObservable;
        this.repository.event.currentClient = clientObservable;
        return this.repository.client.getClientsForSelf();
      })
      .then(() => this.repository.client.currentClient());
  }

  /**
   * Handle URL params.
   * @private
   * @returns {undefined} No return value
   */
  _handleUrlParams() {
    // Currently no URL params to be handled
  }

  /**
   * Check whether the page has been reloaded.
   * @private
   * @returns {boolean} `true` if it is a page refresh
   */
  _isReload() {
    const NAVIGATION_TYPE_RELOAD = 1;
    return window.performance.navigation.type === NAVIGATION_TYPE_RELOAD;
  }

  //##############################################################################
  // Multiple tabs check
  //##############################################################################

  /**
   * Check that this is the single instance tab of the app.
   * @returns {void} Resolves when page is the first tab
   */
  _registerSingleInstance() {
    const instanceId = createRandomUuid();

    if (this.singleInstanceHandler.registerInstance(instanceId)) {
      return this._registerSingleInstanceCleaning();
    }
    throw new AuthError(AuthError.TYPE.MULTIPLE_TABS, AuthError.MESSAGE.MULTIPLE_TABS);
  }

  _registerSingleInstanceCleaning() {
    $(window).on('beforeunload', () => {
      this.singleInstanceHandler.deregisterInstance();
    });
  }

  /**
   * Hide the loading spinner and show the application UI.
   * @returns {undefined} No return value
   */
  _showInterface() {
    const mainView = new MainViewModel(this.repository);
    ko.applyBindings(mainView, this.appContainer);

    this.repository.notification.setContentViewModelStates(mainView.content.state, mainView.multitasking);

    const conversationEntity = this.repository.conversation.getMostRecentConversation();

    this.logger.info('Showing application UI');
    if (this.repository.user.isTemporaryGuest()) {
      mainView.list.showTemporaryGuest();
    } else if (this.repository.user.shouldChangeUsername()) {
      mainView.list.showTakeover();
    } else if (conversationEntity) {
      mainView.content.showConversation(conversationEntity);
    } else if (this.repository.user.connect_requests().length) {
      amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentViewModel.STATE.CONNECTION_REQUESTS);
    }

    const router = new Router({
      '/conversation/:conversationId': conversationId => mainView.content.showConversation(conversationId),
      '/user/:userId': userId => {
        mainView.content.userModal.showUser(userId, () => router.navigate('/'));
      },
    });
    initRouterBindings(router);

    this.appContainer.dataset.uieValue = 'is-loaded';

    this.repository.properties.checkPrivacyPermission().then(() => {
      window.setTimeout(() => this.repository.notification.checkPermission(), App.CONFIG.NOTIFICATION_CHECK);
    });
  }

  /**
   * Subscribe to 'beforeunload' to stop calls and disconnect the WebSocket.
   * @returns {undefined} No return value
   */
  _subscribeToUnloadEvents() {
    $(window).on('unload', () => {
      this.logger.info("'window.onunload' was triggered, so we will disconnect from the backend.");
      this.repository.event.disconnectWebSocket(WebSocketService.CHANGE_TRIGGER.PAGE_NAVIGATION);
      this.repository.calling.destroy();

      if (this.repository.user.isActivatedAccount()) {
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

  /**
   * Subscribe to 'navigator.onLine' related events.
   * @returns {undefined} No return value
   */
  _watchOnlineStatus() {
    this.logger.info('Watching internet connectivity status');
    $(window).on('offline', this.onInternetConnectionLost.bind(this));
    $(window).on('online', this.onInternetConnectionGained.bind(this));
  }

  //##############################################################################
  // Lifecycle
  //##############################################################################

  /**
   * Logs the user out on the backend and deletes cached data.
   *
   * @param {SIGN_OUT_REASON} signOutReason Cause for logout
   * @param {boolean} clearData Keep data in database
   * @returns {undefined} No return value
   */
  logout(signOutReason, clearData) {
    const _redirectToLogin = () => {
      amplify.publish(WebAppEvents.LIFECYCLE.SIGNED_OUT, clearData);
      this._redirectToLogin(signOutReason);
    };

    const _logout = async () => {
      // Disconnect from our backend, end tracking and clear cached data
      this.repository.event.disconnectWebSocket(WebSocketService.CHANGE_TRIGGER.LOGOUT);

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

      const selfUser = this.repository.user.self();
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
        _logout();
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
  }

  /**
   * Refresh the web app or desktop wrapper
   * @returns {undefined} No return value
   */
  refresh() {
    this.logger.info('Refresh to update started');
    if (Environment.desktop) {
      // if we are in a desktop env, we just warn the wrapper that we need to reload. It then decide what should be done
      return amplify.publish(WebAppEvents.LIFECYCLE.RESTART);
    }

    window.location.reload();
    window.focus();
  }

  /**
   * Notify about found update
   * @returns {undefined} No return value
   */
  update() {
    amplify.publish(WebAppEvents.WARNING.SHOW, WarningsViewModel.TYPE.LIFECYCLE_UPDATE);
  }

  /**
   * Redirect to the login page after internet connectivity has been verified.
   * @param {SIGN_OUT_REASON} signOutReason Redirect triggered by session expiration
   * @returns {undefined} No return value
   */
  _redirectToLogin(signOutReason) {
    this.logger.info(`Redirecting to login after connectivity verification. Reason: ${signOutReason}`);
    this.backendClient.executeOnConnectivity(BackendClient.CONNECTIVITY_CHECK_TRIGGER.LOGIN_REDIRECT).then(() => {
      const isTemporaryGuestReason = App.CONFIG.SIGN_OUT_REASONS.TEMPORARY_GUEST.includes(signOutReason);
      const isLeavingGuestRoom = isTemporaryGuestReason && this.repository.user.isTemporaryGuest();
      if (isLeavingGuestRoom) {
        return window.location.replace(getWebsiteUrl());
      }

      doRedirect(signOutReason);
    });
  }

  //##############################################################################
  // Debugging
  //##############################################################################

  /**
   * Disable debugging on any environment.
   * @returns {undefined} No return value
   */
  disableDebugging() {
    Config.getConfig().LOGGER.OPTIONS.domains['app.wire.com'] = () => 0;
    this.repository.properties.savePreference(PROPERTIES_TYPE.ENABLE_DEBUGGING, false);
  }

  /**
   * Enable debugging on any environment.
   * @returns {undefined} No return value
   */
  enableDebugging() {
    Config.getConfig().LOGGER.OPTIONS.domains['app.wire.com'] = () => 300;
    this.repository.properties.savePreference(PROPERTIES_TYPE.ENABLE_DEBUGGING, true);
  }

  /**
   * Report call telemetry to Raygun for analysis.
   * @returns {undefined} No return value
   */
  reportCall() {
    this.repository.calling.reportCall();
  }

  _publishGlobals() {
    window.z.userPermission = ko.observable({});
    ko.pureComputed(() => {
      const selfUser = this.repository.user.self();
      return selfUser && selfUser.teamRole();
    }).subscribe(role => window.z.userPermission(UserPermission.generatePermissionHelpers(role)));
  }
}

//##############################################################################
// Setting up the App
//##############################################################################

$(async () => {
  enableLogging(Config.getConfig().FEATURE.ENABLE_DEBUG);
  exposeWrapperGlobals();
  const appContainer = document.getElementById('wire-main');
  if (appContainer) {
    const apiClient = container.resolve(APIClientSingleton).getClient();
    const backendClient = container.resolve(BackendClient);
    backendClient.setSettings({
      restUrl: Config.getConfig().BACKEND_REST,
      webSocketUrl: Config.getConfig().BACKEND_WS,
    });
    const shouldPersist = loadValue(StorageKey.AUTH.PERSIST);
    if (shouldPersist === undefined) {
      doRedirect(SIGN_OUT_REASON.NOT_SIGNED_IN);
    } else if (isTemporaryClientAndNonPersistent(shouldPersist)) {
      const engine = await StorageService.getUninitializedEngine();
      wire.app = new App(apiClient, backendClient, appContainer, engine);
    } else {
      wire.app = new App(apiClient, backendClient, appContainer);
    }
  }
});

export {App};
