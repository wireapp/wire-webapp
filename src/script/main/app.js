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

import {getLogger} from 'Util/Logger';
import {t} from 'Util/LocalizerUtil';
import {checkIndexedDb, createRandomUuid} from 'Util/util';
import {DebugUtil} from 'Util/DebugUtil';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {enableLogging} from 'Util/LoggerUtil';
import {Environment} from 'Util/Environment';
import {exposeWrapperGlobals} from 'Util/wrapper';
import {includesString} from 'Util/StringUtil';
import {isSameLocation} from 'Util/ValidationUtil';
import {appendParameter} from 'Util/UrlUtil';

import {Config} from '../auth/config';
import {startNewVersionPolling} from '../lifecycle/newVersionHandler';
import {LoadingViewModel} from '../view_model/LoadingViewModel';
import {PreferenceNotificationRepository} from '../notification/PreferenceNotificationRepository';
import * as UserPermission from '../user/UserPermission';
import {UserRepository} from '../user/UserRepository';
import {serverTimeHandler} from '../time/serverTimeHandler';
import {CallingRepository} from '../calling/CallingRepository';
import {BackupRepository} from '../backup/BackupRepository';
import {VideoGridRepository} from '../calling/VideoGridRepository';
import {BroadcastRepository} from '../broadcast/BroadcastRepository';
import {ConnectService} from '../connect/ConnectService';
import {ConnectRepository} from '../connect/ConnectRepository';
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

import 'Components/mentionSuggestions.js';
import './globals';

import {ReceiptsMiddleware} from '../event/preprocessor/ReceiptsMiddleware';

import {getWebsiteUrl} from '../externalRoute';

import {resolve, graph} from '../config/appResolver';
import {modals} from '../view_model/ModalsViewModel';
import {showInitialModal} from '../user/AvailabilityModal';
import {WebAppEvents} from '../event/WebApp';

import {URLParameter} from '../auth/URLParameter';
import {SIGN_OUT_REASON} from '../auth/SignOutReason';
import {ClientRepository} from '../client/ClientRepository';
import {WarningsViewModel} from '../view_model/WarningsViewModel';
import {ContentViewModel} from '../view_model/ContentViewModel';

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
   * @param {BackendClient} backendClient - Configured backend client
   * @param {Element} appContainer - DOM element that will hold the app
   */
  constructor(backendClient, appContainer) {
    this.backendClient = backendClient;
    this.logger = getLogger('App');
    this.appContainer = appContainer;

    new WindowHandler();

    this.service = this._setupServices();
    this.repository = this._setupRepositories();
    if (Config.FEATURE.ENABLE_DEBUG) {
      this.util = {debug: new DebugUtil(this.repository)};
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

    repositories.audio = resolve(graph.AudioRepository);
    repositories.auth = resolve(graph.AuthRepository);
    repositories.giphy = resolve(graph.GiphyRepository);
    repositories.properties = resolve(graph.PropertiesRepository);
    repositories.serverTime = serverTimeHandler;
    repositories.storage = new StorageRepository(this.service.storage);

    repositories.cryptography = new CryptographyRepository(resolve(graph.BackendClient), repositories.storage);
    const storageService = resolve(graph.StorageService);
    repositories.client = new ClientRepository(this.backendClient, storageService, repositories.cryptography);
    repositories.media = resolve(graph.MediaRepository);
    repositories.user = new UserRepository(
      resolve(graph.UserService),
      this.service.asset,
      resolve(graph.SelfService),
      repositories.client,
      serverTimeHandler,
      repositories.properties
    );
    repositories.connection = new ConnectionRepository(this.backendClient, repositories.user);
    repositories.event = new EventRepository(
      this.service.event,
      this.service.notification,
      this.service.webSocket,
      this.service.conversation,
      repositories.cryptography,
      serverTimeHandler,
      repositories.user
    );
    repositories.connect = new ConnectRepository(this.service.connect, repositories.properties);
    repositories.search = new SearchRepository(resolve(graph.BackendClient), repositories.user);
    repositories.team = new TeamRepository(resolve(graph.BackendClient), repositories.user);
    repositories.eventTracker = new EventTrackingRepository(repositories.team, repositories.user);

    repositories.conversation = new ConversationRepository(
      this.service.conversation,
      this.service.asset,
      repositories.client,
      repositories.connection,
      repositories.cryptography,
      repositories.event,
      repositories.giphy,
      resolve(graph.LinkPreviewRepository),
      resolve(graph.MessageSender),
      serverTimeHandler,
      repositories.team,
      repositories.user,
      repositories.properties,
      resolve(graph.AssetUploader)
    );

    const serviceMiddleware = new ServiceMiddleware(repositories.conversation, repositories.user);
    const quotedMessageMiddleware = new QuotedMessageMiddleware(this.service.event);

    const readReceiptMiddleware = new ReceiptsMiddleware(
      this.service.event,
      repositories.user,
      repositories.conversation
    );

    repositories.event.setEventProcessMiddlewares([
      serviceMiddleware.processEvent.bind(serviceMiddleware),
      quotedMessageMiddleware.processEvent.bind(quotedMessageMiddleware),
      readReceiptMiddleware.processEvent.bind(readReceiptMiddleware),
    ]);
    repositories.backup = new BackupRepository(
      resolve(graph.BackupService),
      repositories.client,
      repositories.connection,
      repositories.conversation,
      repositories.user
    );
    repositories.broadcast = new BroadcastRepository(
      resolve(graph.BroadcastService),
      repositories.client,
      repositories.conversation,
      repositories.cryptography,
      resolve(graph.MessageSender),
      repositories.user
    );
    repositories.calling = new CallingRepository(
      resolve(graph.CallingService),
      repositories.client,
      repositories.conversation,
      repositories.event,
      repositories.media,
      serverTimeHandler,
      repositories.user
    );
    repositories.integration = new IntegrationRepository(
      this.service.integration,
      repositories.conversation,
      repositories.team
    );
    repositories.permission = resolve(graph.PermissionRepository);
    repositories.notification = new NotificationRepository(
      repositories.calling,
      repositories.conversation,
      resolve(graph.PermissionRepository),
      repositories.user
    );
    repositories.preferenceNotification = new PreferenceNotificationRepository(repositories.user.self);
    repositories.videoGrid = new VideoGridRepository(repositories.calling, repositories.media);

    return repositories;
  }

  /**
   * Create all app services.
   * @returns {Object} All services
   */
  _setupServices() {
    const storageService = resolve(graph.StorageService);
    const eventService = Environment.browser.edge
      ? new EventServiceNoCompound(storageService)
      : new EventService(storageService);

    return {
      asset: resolve(graph.AssetService),
      connect: new ConnectService(this.backendClient),
      conversation: new ConversationService(this.backendClient, eventService, storageService),
      event: eventService,
      integration: new IntegrationService(this.backendClient),
      notification: new NotificationService(this.backendClient, storageService),
      storage: storageService,
      webSocket: new WebSocketService(this.backendClient),
    };
  }

  /**
   * Subscribe to amplify events.
   * @returns {undefined} No return value
   */
  _subscribeToEvents() {
    amplify.subscribe(WebAppEvents.LIFECYCLE.REFRESH, this.refresh.bind(this));
    amplify.subscribe(WebAppEvents.LIFECYCLE.SIGN_OUT, this.logout.bind(this));
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
   * @param {boolean} [isReload=_isReload()] - App init after page reload
   * @returns {undefined} No return value
   */
  initApp(isReload = this._isReload()) {
    new ThemeViewModel(this.repository.properties);
    const loadingView = new LoadingViewModel();
    const telemetry = new AppInitTelemetry();
    exposeWrapperGlobals();

    checkIndexedDb()
      .then(() => this._registerSingleInstance())
      .then(() => this._loadAccessToken())
      .then(() => {
        loadingView.updateProgress(2.5);
        telemetry.time_step(AppInitTimingsStep.RECEIVED_ACCESS_TOKEN);
        return this._initiateSelfUser();
      })
      .then(() => {
        loadingView.updateProgress(5, t('initReceivedSelfUser', this.repository.user.self().first_name()));
        telemetry.time_step(AppInitTimingsStep.RECEIVED_SELF_USER);
        return this._initiateSelfUserClients();
      })
      .then(clientEntity => {
        loadingView.updateProgress(7.5, t('initValidatedClient'));
        telemetry.time_step(AppInitTimingsStep.VALIDATED_CLIENT);
        telemetry.add_statistic(AppInitStatisticsValue.CLIENT_TYPE, clientEntity.type);

        return this.repository.cryptography.loadCryptobox(this.service.storage.db);
      })
      .then(() => {
        loadingView.updateProgress(10);
        telemetry.time_step(AppInitTimingsStep.INITIALIZED_CRYPTOGRAPHY);

        this.repository.event.connectWebSocket();

        const promises = [this.repository.conversation.getConversations(), this.repository.connection.getConnections()];
        return Promise.all(promises);
      })
      .then(([conversationEntities, connectionEntities]) => {
        loadingView.updateProgress(25, t('initReceivedUserData'));

        telemetry.time_step(AppInitTimingsStep.RECEIVED_USER_DATA);
        telemetry.add_statistic(AppInitStatisticsValue.CONVERSATIONS, conversationEntities.length, 50);
        telemetry.add_statistic(AppInitStatisticsValue.CONNECTIONS, connectionEntities.length, 50);

        this.repository.conversation.map_connections(this.repository.connection.connectionEntities());
        this._subscribeToUnloadEvents();

        return this.repository.team.getTeam();
      })
      .then(() => this.repository.user.loadUsers())
      .then(() => this.repository.event.initializeFromStream())
      .then(notificationsCount => {
        telemetry.time_step(AppInitTimingsStep.UPDATED_FROM_NOTIFICATIONS);
        telemetry.add_statistic(AppInitStatisticsValue.NOTIFICATIONS, notificationsCount, 100);

        this.repository.eventTracker.init(this.repository.properties.properties.settings.privacy.improve_wire);
        return this.repository.conversation.initialize_conversations();
      })
      .then(() => {
        loadingView.updateProgress(97.5, t('initUpdatedFromNotifications', Config.BRAND_NAME));

        this._watchOnlineStatus();
        return this.repository.client.updateClientsForSelf();
      })
      .then(clientEntities => {
        loadingView.updateProgress(99);

        telemetry.add_statistic(AppInitStatisticsValue.CLIENTS, clientEntities.length);
        telemetry.time_step(AppInitTimingsStep.APP_PRE_LOADED);

        this.repository.user.self().devices(clientEntities);
        this.logger.info('App pre-loading completed');
        return this._handleUrlParams();
      })
      .then(() => {
        telemetry.time_step(AppInitTimingsStep.APP_LOADED);
        this._showInterface();
        loadingView.removeFromView();
        telemetry.report();
        amplify.publish(WebAppEvents.LIFECYCLE.LOADED);
        modals.ready();
        showInitialModal(this.repository.user.self().availability());
        return this.repository.conversation.updateConversationsOnAppInit();
      })
      .then(() => {
        telemetry.time_step(AppInitTimingsStep.UPDATED_CONVERSATIONS);
        if (this.repository.user.isActivatedAccount()) {
          // start regularly polling the server to check if there is a new version of Wire
          startNewVersionPolling(Environment.version(false, true), this.update.bind(this));
        }
        this.repository.audio.init(true);
        this.repository.conversation.cleanup_conversations();
        this.logger.info('App fully loaded');
      })
      .catch(error => this._appInitFailure(error, isReload));
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
    const isAuthError = error instanceof z.error.AuthError;
    if (isAuthError) {
      const isTypeMultipleTabs = type === z.error.AuthError.TYPE.MULTIPLE_TABS;
      const signOutReason = isTypeMultipleTabs ? SIGN_OUT_REASON.MULTIPLE_TABS : SIGN_OUT_REASON.INDEXED_DB;
      return this._redirectToLogin(signOutReason);
    }

    this.logger.debug(
      `App reload: '${isReload}', Document referrer: '${document.referrer}', Location: '${window.location.href}'`
    );
    if (isReload) {
      const isSessionExpired = [
        z.error.AccessTokenError.TYPE.REQUEST_FORBIDDEN,
        z.error.AccessTokenError.TYPE.NOT_FOUND_IN_CACHE,
      ];

      if (isSessionExpired.includes(type)) {
        this.logger.error(`Session expired on page reload: ${message}`, error);
        Raygun.send(new Error('Session expired on page reload', error));
        return this._redirectToLogin(SIGN_OUT_REASON.SESSION_EXPIRED);
      }

      const isAccessTokenError = error instanceof z.error.AccessTokenError;
      const isInvalidClient = type === z.error.ClientError.TYPE.NO_VALID_CLIENT;

      if (isAccessTokenError || isInvalidClient) {
        this.logger.warn('Connectivity issues. Trigger reload on regained connectivity.', error);
        const triggerSource = isAccessTokenError
          ? BackendClient.CONNECTIVITY_CHECK_TRIGGER.ACCESS_TOKEN_RETRIEVAL
          : BackendClient.CONNECTIVITY_CHECK_TRIGGER.APP_INIT_RELOAD;
        return this.backendClient.executeOnConnectivity(triggerSource).then(() => window.location.reload(false));
      }
    }

    if (navigator.onLine) {
      switch (type) {
        case z.error.AccessTokenError.TYPE.NOT_FOUND_IN_CACHE:
        case z.error.AccessTokenError.TYPE.RETRIES_EXCEEDED:
        case z.error.AccessTokenError.TYPE.REQUEST_FORBIDDEN: {
          this.logger.warn(`Redirecting to login: ${error.message}`, error);
          return this._redirectToLogin(SIGN_OUT_REASON.NOT_SIGNED_IN);
        }

        default: {
          this.logger.error(`Caused by: ${(error ? error.message : undefined) || error}`, error);

          const isAccessTokenError = error instanceof z.error.AccessTokenError;
          if (isAccessTokenError) {
            this.logger.error(`Could not get access token: ${error.message}. Logging out user.`, error);
          } else {
            Raygun.send(error);
          }

          return this.logout(SIGN_OUT_REASON.APP_INIT);
        }
      }
    }

    this.logger.warn('No connectivity. Trigger reload on regained connectivity.', error);
    this._watchOnlineStatus();
  }

  /**
   * Check whether we need to set different user information (picture, username).
   * @param {User} userEntity - Self user entity
   * @returns {User} Checked user entity
   */
  _checkUserInformation(userEntity) {
    if (userEntity.hasActivatedIdentity()) {
      if (!userEntity.mediumPictureResource()) {
        this.repository.user.set_default_picture();
      }
      if (!userEntity.username()) {
        this.repository.user.get_username_suggestion();
      }
    }

    return userEntity;
  }

  /**
   * Initiate the self user by getting it from the backend.
   * @returns {Promise<User>} Resolves with the self user entity
   */
  _initiateSelfUser() {
    return this.repository.user.getSelf().then(userEntity => {
      this.logger.info(`Loaded self user with ID '${userEntity.id}'`);

      if (!userEntity.hasActivatedIdentity()) {
        this.logger.info('User does not have an activated identity and seems to be a temporary guest');

        if (!userEntity.isTemporaryGuest()) {
          throw new Error('User does not have an activated identity');
        }
      }

      return this.service.storage
        .init(userEntity.id)
        .then(() => this.repository.client.init(userEntity))
        .then(() => this.repository.properties.init(userEntity))
        .then(() => this._checkUserInformation(userEntity));
    });
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
   * @returns {undefined} Not return value
   */
  _handleUrlParams() {
    // Currently no URL params to be handled
  }

  /**
   * Check whether the page has been reloaded.
   * @private
   * @returns {boolean}  True if it is a page refresh
   */
  _isReload() {
    const isReload = isSameLocation(document.referrer, window.location.href);
    const log = `App reload: '${isReload}', Referrer: '${document.referrer}', Location: '${window.location.href}'`;
    this.logger.debug(log);
    return isReload;
  }

  /**
   * Load the access token from cache or get one from the backend.
   * @returns {Promise} Resolves with the access token
   */
  _loadAccessToken() {
    const isLocalhost = Environment.frontend.isLocalhost();
    const referrer = document.referrer.toLowerCase();
    const isLoginRedirect = referrer.includes('/auth') || referrer.includes('/login');
    const getCachedToken = isLocalhost || isLoginRedirect;

    return getCachedToken ? this.repository.auth.getCachedAccessToken() : this.repository.auth.getAccessToken();
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
    throw new z.error.AuthError(z.error.AuthError.TYPE.MULTIPLE_TABS);
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

    this.repository.notification.setContentViewModelStates(mainView.content.state, mainView.content.multitasking);

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
      this.repository.calling.leaveCallOnUnload();

      if (this.repository.user.isActivatedAccount()) {
        this.repository.storage.terminate('window.onunload');
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
   * @param {SIGN_OUT_REASON} signOutReason - Cause for logout
   * @param {boolean} clearData - Keep data in database
   * @returns {undefined} No return value
   */
  logout(signOutReason, clearData = false) {
    const _redirectToLogin = () => {
      amplify.publish(WebAppEvents.LIFECYCLE.SIGNED_OUT, clearData);
      this._redirectToLogin(signOutReason);
    };

    const _logout = () => {
      // Disconnect from our backend, end tracking and clear cached data
      this.repository.event.disconnectWebSocket(WebSocketService.CHANGE_TRIGGER.LOGOUT);

      // Clear Local Storage (but don't delete the cookie label if you were logged in with a permanent client)
      const keysToKeep = [StorageKey.AUTH.SHOW_LOGIN];

      const keepPermanentDatabase = this.repository.client.isCurrentClientPermanent() && !clearData;
      if (keepPermanentDatabase) {
        keysToKeep.push(StorageKey.AUTH.PERSIST);
      }

      // @todo remove on next iteration
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
        resolve(graph.CacheRepository).clearCache(keepConversationInput, keysToKeep);
      }

      // Clear IndexedDB
      const clearDataPromise = clearData
        ? this.repository.storage
            .deleteDatabase()
            .catch(error => this.logger.error('Failed to delete database before logout', error))
        : Promise.resolve();

      return clearDataPromise.then(() => _redirectToLogin());
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
    this.logger.info(`Refresh to update started`);
    if (Environment.desktop) {
      // if we are in a desktop env, we just warn the wrapper that we need to reload. It then decide what should be done
      return amplify.publish(WebAppEvents.LIFECYCLE.RESTART);
    }

    window.location.reload(true);
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
   * @param {SIGN_OUT_REASON} signOutReason - Redirect triggered by session expiration
   * @returns {undefined} No return value
   */
  _redirectToLogin(signOutReason) {
    this.logger.info(`Redirecting to login after connectivity verification. Reason: ${signOutReason}`);
    this.backendClient.executeOnConnectivity(BackendClient.CONNECTIVITY_CHECK_TRIGGER.LOGIN_REDIRECT).then(() => {
      const isTemporaryGuestReason = App.CONFIG.SIGN_OUT_REASONS.TEMPORARY_GUEST.includes(signOutReason);
      const isLeavingGuestRoom = isTemporaryGuestReason && this.repository.user.isTemporaryGuest();
      if (isLeavingGuestRoom) {
        const path = t('urlWebsiteRoot');
        const url = getWebsiteUrl(path);
        return window.location.replace(url);
      }

      let url = `/auth/${location.search}`;
      const isImmediateSignOutReason = App.CONFIG.SIGN_OUT_REASONS.IMMEDIATE.includes(signOutReason);
      if (isImmediateSignOutReason) {
        url = appendParameter(url, `${URLParameter.REASON}=${signOutReason}`);
      }

      const redirectToLogin = signOutReason !== SIGN_OUT_REASON.NOT_SIGNED_IN;
      if (redirectToLogin) {
        url = `${url}#login`;
      }

      window.location.replace(url);
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
    z.config.LOGGER.OPTIONS.domains['app.wire.com'] = () => 0;
    this.repository.properties.savePreference(PROPERTIES_TYPE.ENABLE_DEBUGGING, false);
  }

  /**
   * Enable debugging on any environment.
   * @returns {undefined} No return value
   */
  enableDebugging() {
    z.config.LOGGER.OPTIONS.domains['app.wire.com'] = () => 300;
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

$(() => {
  enableLogging(Config.FEATURE.ENABLE_DEBUG);
  const appContainer = document.getElementById('wire-main');
  if (appContainer) {
    const backendClient = resolve(graph.BackendClient);
    backendClient.setSettings({
      restUrl: Config.BACKEND_REST,
      webSocketUrl: Config.BACKEND_WS,
    });
    wire.app = new App(backendClient, appContainer);
  }
});

export {App};
