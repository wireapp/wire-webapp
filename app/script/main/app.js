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

'use strict';

window.z = window.z || {};
window.z.main = z.main || {};

z.main.App = class App {
  static get CONFIG() {
    return {
      COOKIES_CHECK: {
        COOKIE_NAME: 'cookies_enabled',
      },
      NOTIFICATION_CHECK: 10 * 1000,
      SIGN_OUT_REASONS: {
        IMMEDIATE: [
          z.auth.SIGN_OUT_REASON.ACCOUNT_DELETED,
          z.auth.SIGN_OUT_REASON.CLIENT_REMOVED,
          z.auth.SIGN_OUT_REASON.SESSION_EXPIRED,
        ],
        TEMPORARY_GUEST: [
          z.auth.SIGN_OUT_REASON.MULTIPLE_TABS,
          z.auth.SIGN_OUT_REASON.SESSION_EXPIRED,
          z.auth.SIGN_OUT_REASON.USER_REQUESTED,
        ],
      },
      TABS_CHECK: {
        COOKIE_NAME: 'app_opened',
        INTERVAL: 1000,
      },
    };
  }

  /**
   * Construct a new app.
   * @param {z.main.Auth} auth - Authentication component
   */
  constructor(auth) {
    this.auth = auth;
    this.logger = new z.util.Logger('z.main.App', z.config.LOGGER.OPTIONS);

    this.telemetry = new z.telemetry.app_init.AppInitTelemetry();
    this.update_source = undefined;
    this.window_handler = new z.ui.WindowHandler().init();

    this.service = this._setupServices();
    this.repository = this._setupRepositories();
    this.view = this._setupViewModels();
    this.util = this._setup_utils();

    this.instanceId = z.util.createRandomUuid();

    this._subscribeToEvents();

    this.initDebugging();
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

    repositories.audio = this.auth.audio;
    repositories.cache = new z.cache.CacheRepository();
    repositories.giphy = new z.extension.GiphyRepository(this.service.giphy);
    repositories.media = new z.media.MediaRepository();
    repositories.storage = new z.storage.StorageRepository(this.service.storage);

    repositories.cryptography = new z.cryptography.CryptographyRepository(
      this.service.cryptography,
      repositories.storage
    );
    repositories.client = new z.client.ClientRepository(this.service.client, repositories.cryptography);
    repositories.user = new z.user.UserRepository(
      this.service.user,
      this.service.asset,
      this.service.search,
      repositories.client
    );
    repositories.event = new z.event.EventRepository(
      this.service.notification,
      this.service.web_socket,
      this.service.conversation,
      repositories.cryptography,
      repositories.user
    );
    repositories.properties = new z.properties.PropertiesRepository(this.service.properties);
    repositories.lifecycle = new z.lifecycle.LifecycleRepository(this.service.lifecycle, repositories.user);
    repositories.connect = new z.connect.ConnectRepository(
      this.service.connect,
      this.service.connect_google,
      repositories.properties
    );
    repositories.links = new z.links.LinkPreviewRepository(this.service.asset, repositories.properties);
    repositories.search = new z.search.SearchRepository(this.service.search, repositories.user);
    repositories.team = new z.team.TeamRepository(this.service.team, repositories.user);

    repositories.conversation = new z.conversation.ConversationRepository(
      this.service.conversation,
      this.service.asset,
      repositories.client,
      repositories.cryptography,
      repositories.giphy,
      repositories.links,
      repositories.team,
      repositories.user
    );

    repositories.backup = new z.backup.BackupRepository(
      this.service.backup,
      repositories.client,
      repositories.conversation,
      repositories.user
    );
    repositories.broadcast = new z.broadcast.BroadcastRepository(
      this.service.broadcast,
      repositories.client,
      repositories.conversation,
      repositories.cryptography,
      repositories.user
    );
    repositories.calling = new z.calling.CallingRepository(
      this.service.calling,
      repositories.client,
      repositories.conversation,
      repositories.media,
      repositories.user
    );
    repositories.event_tracker = new z.tracking.EventTrackingRepository(
      repositories.conversation,
      repositories.team,
      repositories.user
    );
    repositories.integration = new z.integration.IntegrationRepository(
      this.service.integration,
      repositories.conversation,
      repositories.team
    );
    repositories.notification = new z.notification.NotificationRepository(
      repositories.calling,
      repositories.conversation
    );

    return repositories;
  }

  /**
   * Create all app services.
   * @returns {Object} All services
   */
  _setupServices() {
    const storageService = new z.storage.StorageService();

    return {
      asset: new z.assets.AssetService(this.auth.client),
      backup: new z.backup.BackupService(storageService),
      broadcast: new z.broadcast.BroadcastService(this.auth.client),
      calling: new z.calling.CallingService(this.auth.client),
      client: new z.client.ClientService(this.auth.client, storageService),
      connect: new z.connect.ConnectService(this.auth.client),
      connect_google: new z.connect.ConnectGoogleService(this.auth.client),
      conversation: z.util.Environment.browser.edge
        ? new z.conversation.ConversationServiceNoCompound(this.auth.client, storageService)
        : new z.conversation.ConversationService(this.auth.client, storageService),
      cryptography: new z.cryptography.CryptographyService(this.auth.client),
      giphy: new z.extension.GiphyService(this.auth.client),
      integration: new z.integration.IntegrationService(this.auth.client),
      lifecycle: new z.lifecycle.LifecycleService(),
      notification: new z.event.NotificationService(this.auth.client, storageService),
      properties: new z.properties.PropertiesService(this.auth.client),
      search: new z.search.SearchService(this.auth.client),
      storage: storageService,
      team: new z.team.TeamService(this.auth.client),
      user: new z.user.UserService(this.auth.client, storageService),
      web_socket: new z.event.WebSocketService(this.auth.client),
    };
  }

  /**
   * Create all app utils.
   * @returns {Object} All utils
   */
  _setup_utils() {
    return z.util.Environment.frontend.isProduction()
      ? {}
      : {debug: new z.util.DebugUtil(this.repository.calling, this.repository.conversation, this.repository.user)};
  }

  /**
   * Create all app view models.
   * @returns {Object} All view models
   */
  _setupViewModels() {
    return new z.viewModel.MainViewModel(this.repository);
  }

  /**
   * Subscribe to amplify events.
   * @returns {undefined} No return value
   */
  _subscribeToEvents() {
    amplify.subscribe(z.event.WebApp.LIFECYCLE.REFRESH, this.refresh.bind(this));
    amplify.subscribe(z.event.WebApp.LIFECYCLE.SIGN_OUT, this.logout.bind(this));
    amplify.subscribe(z.event.WebApp.LIFECYCLE.UPDATE, this.update.bind(this));
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
    z.util
      .checkIndexedDb()
      .then(() => this._checkSingleInstanceOnInit())
      .then(() => this._loadAccessToken())
      .then(() => {
        this.view.loading.updateProgress(2.5);
        this.telemetry.time_step(z.telemetry.app_init.AppInitTimingsStep.RECEIVED_ACCESS_TOKEN);

        const protoFile = `ext/proto/generic-message-proto/messages.proto?${z.util.Environment.version(false)}`;
        return Promise.all([this._getUserSelf(), z.util.protobuf.loadProtos(protoFile)]);
      })
      .then(([self_user_et]) => {
        this.view.loading.updateProgress(5, z.string.initReceivedSelfUser);
        this.telemetry.time_step(z.telemetry.app_init.AppInitTimingsStep.RECEIVED_SELF_USER);
        this.repository.client.init(self_user_et);
        this.repository.properties.init(self_user_et);
        return this.repository.client.getValidLocalClient();
      })
      .then(client_observable => {
        this.view.loading.updateProgress(7.5, z.string.initValidatedClient);

        this.telemetry.time_step(z.telemetry.app_init.AppInitTimingsStep.VALIDATED_CLIENT);
        this.telemetry.add_statistic(z.telemetry.app_init.AppInitStatisticsValue.CLIENT_TYPE, client_observable().type);

        this.repository.cryptography.currentClient = client_observable;
        this.repository.event.currentClient = client_observable;
        return this.repository.cryptography.loadCryptobox(this.service.storage.db);
      })
      .then(() => {
        this.view.loading.updateProgress(10);
        this.telemetry.time_step(z.telemetry.app_init.AppInitTimingsStep.INITIALIZED_CRYPTOGRAPHY);
        this.repository.event.connectWebSocket();

        return Promise.all([this.repository.conversation.get_conversations(), this.repository.user.get_connections()]);
      })
      .then(([conversation_ets, connection_ets]) => {
        this.view.loading.updateProgress(25, z.string.initReceivedUserData);

        this.telemetry.time_step(z.telemetry.app_init.AppInitTimingsStep.RECEIVED_USER_DATA);
        this.telemetry.add_statistic(
          z.telemetry.app_init.AppInitStatisticsValue.CONVERSATIONS,
          conversation_ets.length,
          50
        );
        this.telemetry.add_statistic(
          z.telemetry.app_init.AppInitStatisticsValue.CONNECTIONS,
          connection_ets.length,
          50
        );

        this.repository.conversation.map_connections(this.repository.user.connections());
        this._subscribeToUnloadEvents();

        return this.repository.team.getTeam();
      })
      .then(() => this.repository.user.loadUsers())
      .then(() => this.repository.event.initializeFromStream())
      .then(notifications_count => {
        this.telemetry.time_step(z.telemetry.app_init.AppInitTimingsStep.UPDATED_FROM_NOTIFICATIONS);
        this.telemetry.add_statistic(
          z.telemetry.app_init.AppInitStatisticsValue.NOTIFICATIONS,
          notifications_count,
          100
        );

        this.repository.event_tracker.init(this.repository.properties.properties.settings.privacy.improve_wire);
        return this.repository.conversation.initialize_conversations();
      })
      .then(() => {
        this.view.loading.updateProgress(97.5, z.string.initUpdatedFromNotifications);

        this._watchOnlineStatus();
        return this.repository.client.getClientsForSelf();
      })
      .then(client_ets => {
        this.view.loading.updateProgress(99);

        this.telemetry.add_statistic(z.telemetry.app_init.AppInitStatisticsValue.CLIENTS, client_ets.length);
        this.telemetry.time_step(z.telemetry.app_init.AppInitTimingsStep.APP_PRE_LOADED);

        this.repository.user.self().devices(client_ets);
        this.logger.info('App pre-loading completed');
        return this._handleUrlParams();
      })
      .then(() => {
        this._showInterface();
        this.telemetry.report();
        amplify.publish(z.event.WebApp.LIFECYCLE.LOADED);
        amplify.publish(z.event.WebApp.LOADED); // todo: deprecated - remove when user base of wrappers version >= 2.12 is large enough
        this.telemetry.time_step(z.telemetry.app_init.AppInitTimingsStep.APP_LOADED);
        return this.repository.conversation.update_conversations_unarchived();
      })
      .then(() => {
        this.telemetry.time_step(z.telemetry.app_init.AppInitTimingsStep.UPDATED_CONVERSATIONS);
        this.repository.lifecycle.init();
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
        .register(`/sw.js?${z.util.Environment.version(false)}`)
        .then(({scope}) => this.logger.info(`ServiceWorker registration successful with scope: ${scope}`));
    }
  }

  /**
   * Behavior when internet connection is re-established.
   * @returns {undefined} No return value
   */
  onInternetConnectionGained() {
    this.logger.info('Internet connection regained. Re-establishing WebSocket connection...');
    this.auth.client
      .execute_on_connectivity(z.service.BackendClient.CONNECTIVITY_CHECK_TRIGGER.CONNECTION_REGAINED)
      .then(() => {
        amplify.publish(z.event.WebApp.WARNING.DISMISS, z.viewModel.WarningsViewModel.TYPE.NO_INTERNET);
        amplify.publish(z.event.WebApp.WARNING.SHOW, z.viewModel.WarningsViewModel.TYPE.CONNECTIVITY_RECONNECT);
        this.repository.event.reconnectWebSocket(z.event.WebSocketService.CHANGE_TRIGGER.ONLINE);
      });
  }

  /**
   * Reflect internet connection loss in the UI.
   * @returns {undefined} No return value
   */
  onInternetConnectionLost() {
    this.logger.warn('Internet connection lost');
    this.repository.event.disconnectWebSocket(z.event.WebSocketService.CHANGE_TRIGGER.OFFLINE);
    amplify.publish(z.event.WebApp.WARNING.SHOW, z.viewModel.WarningsViewModel.TYPE.NO_INTERNET);
  }

  _appInitFailure(error, isReload) {
    let logMessage = `Could not initialize app version '${z.util.Environment.version(false)}'`;
    if (z.util.Environment.desktop) {
      logMessage = `${logMessage} - Electron '${platform.os.family}' '${z.util.Environment.version()}'`;
    }
    this.logger.info(logMessage, {error});

    const {message, type} = error;
    const isAuthError = error instanceof z.auth.AuthError;
    if (isAuthError) {
      const isTypeMultipleTabs = type === z.auth.AuthError.TYPE.MULTIPLE_TABS;
      const signOutReason = isTypeMultipleTabs
        ? z.auth.SIGN_OUT_REASON.MULTIPLE_TABS
        : z.auth.SIGN_OUT_REASON.INDEXED_DB;
      return this._redirectToLogin(signOutReason);
    }

    this.logger.debug(
      `App reload: '${isReload}', Document referrer: '${document.referrer}', Location: '${window.location.href}'`
    );
    if (isReload) {
      const isSessionExpired = [
        z.auth.AccessTokenError.TYPE.REQUEST_FORBIDDEN,
        z.auth.AccessTokenError.TYPE.NOT_FOUND_IN_CACHE,
      ];

      if (isSessionExpired.includes(type)) {
        this.logger.error(`Session expired on page reload: ${message}`, error);
        Raygun.send(new Error('Session expired on page reload', error));
        return this._redirectToLogin(z.auth.SIGN_OUT_REASON.SESSION_EXPIRED);
      }

      const isAccessTokenError = error instanceof z.auth.AccessTokenError;
      const isInvalidClient = type === z.client.ClientError.TYPE.NO_VALID_CLIENT;

      if (isAccessTokenError || isInvalidClient) {
        this.logger.warn('Connectivity issues. Trigger reload on regained connectivity.', error);
        const trigger_source = isAccessTokenError
          ? z.service.BackendClient.CONNECTIVITY_CHECK_TRIGGER.ACCESS_TOKEN_RETRIEVAL
          : z.service.BackendClient.CONNECTIVITY_CHECK_TRIGGER.APP_INIT_RELOAD;
        return this.auth.client.execute_on_connectivity(trigger_source).then(() => window.location.reload(false));
      }
    }

    if (navigator.onLine) {
      switch (type) {
        case z.auth.AccessTokenError.TYPE.NOT_FOUND_IN_CACHE:
        case z.auth.AccessTokenError.TYPE.RETRIES_EXCEEDED:
        case z.auth.AccessTokenError.TYPE.REQUEST_FORBIDDEN: {
          this.logger.warn(`Redirecting to login: ${error.message}`, error);
          return this._redirectToLogin(z.auth.SIGN_OUT_REASON.NOT_SIGNED_IN);
        }

        default: {
          this.logger.error(`Caused by: ${(error ? error.message : undefined) || error}`, error);
          const is_storage_error = error instanceof z.storage.StorageError;
          if (is_storage_error) {
            Raygun.send(error);
          }

          const isAccessTokenError = error instanceof z.auth.AccessTokenError;
          if (isAccessTokenError) {
            this.logger.error(`Could not get access token: ${error.message}. Logging out user.`, error);
          }
          return this.logout(z.auth.SIGN_OUT_REASON.APP_INIT);
        }
      }
    }

    this.logger.warn('No connectivity. Trigger reload on regained connectivity.', error);
    this._watchOnlineStatus();
  }

  /**
   * Check whether we need to set different user information (picture, username).
   * @param {z.entity.User} userEntity - Self user entity
   * @returns {z.entity.User} Checked user entity
   */
  _checkUserInformation(userEntity) {
    const hasEmailAddress = userEntity.email();
    const hasPhoneNumber = userEntity.phone();
    const isActivatedUser = hasEmailAddress || hasPhoneNumber;

    if (isActivatedUser) {
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
   * Get the self user from the backend.
   * @returns {Promise<z.entity.User>} Resolves with the self user entity
   */
  _getUserSelf() {
    return this.repository.user.getSelf().then(userEntity => {
      this.logger.info(`Loaded self user with ID '${userEntity.id}'`);

      const hasEmailAddress = userEntity.email();
      const hasPhoneNumber = userEntity.phone();
      const isActivatedUser = hasEmailAddress || hasPhoneNumber;

      if (!isActivatedUser) {
        this.logger.info('User does not have an activated identity and seems to be wireless');

        if (!userEntity.isTemporaryGuest()) {
          throw new Error('User does not have an activated identity');
        }
      }

      return this.service.storage.init(userEntity.id).then(() => this._checkUserInformation(userEntity));
    });
  }

  /**
   * Handle URL params.
   * @private
   * @returns {undefined} Not return value
   */
  _handleUrlParams() {
    const providerId = z.util.URLUtil.getParameter(z.auth.URLParameter.BOT_PROVIDER);
    const serviceId = z.util.URLUtil.getParameter(z.auth.URLParameter.BOT_SERVICE);
    if (providerId && serviceId) {
      this.logger.info(`Found bot conversation initialization params '${serviceId}'`);
      this.repository.integration.addServiceFromParam(providerId, serviceId);
    }

    const supportIntegrations = z.util.URLUtil.getParameter(z.auth.URLParameter.INTEGRATIONS);
    if (_.isBoolean(supportIntegrations)) {
      this.logger.info(`Feature flag for integrations set to '${serviceId}'`);
      this.repository.integration.supportIntegrations(supportIntegrations);
    }
  }

  /**
   * Check whether the page has been reloaded.
   * @private
   * @returns {boolean}  True if it is a page refresh
   */
  _isReload() {
    const isReload = z.util.isSameLocation(document.referrer, window.location.href);
    this.logger.debug(
      `App reload: '${isReload}', Document referrer: '${document.referrer}', Location: '${window.location.href}'`
    );
    return isReload;
  }

  /**
   * Load the access token from cache or get one from the backend.
   * @returns {Promise} Resolves with the access token
   */
  _loadAccessToken() {
    const isLocalhost = z.util.Environment.frontend.isLocalhost();
    const referrer = document.referrer.toLowerCase();
    const isLoginRedirect = referrer.includes('/auth') || referrer.includes('/login');
    const getCachedToken = isLocalhost || isLoginRedirect;

    return getCachedToken ? this.auth.repository.getCachedAccessToken() : this.auth.repository.getAccessToken();
  }

  //##############################################################################
  // Multiple tabs check
  //##############################################################################

  /**
   * Check that this is the single instance tab of the app.
   * @returns {Promise} Resolves when page is the first tab
   */
  _checkSingleInstanceOnInit() {
    if (!z.util.Environment.electron) {
      return this._setSingleInstanceCookie();
    }

    return Promise.resolve();
  }

  _checkSingleInstanceOnInterval() {
    const singleInstanceCookie = Cookies.getJSON(App.CONFIG.TABS_CHECK.COOKIE_NAME);

    const shouldBlockTab = !singleInstanceCookie || singleInstanceCookie.appInstanceId !== this.instanceId;
    if (shouldBlockTab) {
      return this._redirectToLogin(z.auth.SIGN_OUT_REASON.MULTIPLE_TABS);
    }
  }

  /**
   * Set the cookie to verify we are running a single instace tab.
   * @returns {undefined} No return value
   */
  _setSingleInstanceCookie() {
    const shouldBlockTab = !!Cookies.get(App.CONFIG.TABS_CHECK.COOKIE_NAME);
    if (shouldBlockTab) {
      return Promise.reject(new z.auth.AuthError(z.auth.AuthError.TYPE.MULTIPLE_TABS));
    }

    const cookieData = {appInstanceId: this.instanceId};
    Cookies.set(App.CONFIG.TABS_CHECK.COOKIE_NAME, cookieData);

    window.setInterval(() => this._checkSingleInstanceOnInterval(), App.CONFIG.TABS_CHECK.INTERVAL);
    this._registerSingleInstanceCookieDeletion();
  }

  _registerSingleInstanceCookieDeletion() {
    $(window).on('beforeunload', () => {
      const singleInstanceCookie = Cookies.getJSON(App.CONFIG.TABS_CHECK.COOKIE_NAME);

      const isOwnInstanceId = singleInstanceCookie && singleInstanceCookie.appInstanceId === this.instanceId;
      if (isOwnInstanceId) {
        Cookies.remove(App.CONFIG.TABS_CHECK.COOKIE_NAME);
      }
    });
  }

  /**
   * Hide the loading spinner and show the application UI.
   * @returns {undefined} No return value
   */
  _showInterface() {
    const conversationEntity = this.repository.conversation.getMostRecentConversation();
    this.logger.info('Showing application UI');
    if (this.repository.user.isTemporaryGuest()) {
      this.view.list.showTemporaryGuest();
    } else if (this.repository.user.shouldChangeUsername()) {
      this.view.list.showTakeover();
    } else if (conversationEntity) {
      amplify.publish(z.event.WebApp.CONVERSATION.SHOW, conversationEntity);
    } else if (this.repository.user.connect_requests().length) {
      amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.viewModel.ContentViewModel.STATE.CONNECTION_REQUESTS);
    }

    this.view.loading.removeFromView();
    $('#wire-main').attr('data-uie-value', 'is-loaded');

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
      this.repository.event.disconnectWebSocket(z.event.WebSocketService.CHANGE_TRIGGER.PAGE_NAVIGATION);
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
   * @param {z.auth.SIGN_OUT_REASON} signOutReason - Cause for logout
   * @param {boolean} clearData - Keep data in database
   * @returns {undefined} No return value
   */
  logout(signOutReason, clearData = false) {
    const _redirectToLogin = () => {
      amplify.publish(z.event.WebApp.LIFECYCLE.SIGNED_OUT, clearData);
      this._redirectToLogin(signOutReason);
    };

    const _logout = () => {
      // Disconnect from our backend, end tracking and clear cached data
      this.repository.event.disconnectWebSocket(z.event.WebSocketService.CHANGE_TRIGGER.LOGOUT);

      // Clear Local Storage (but don't delete the cookie label if you were logged in with a permanent client)
      const keysToKeep = [z.storage.StorageKey.AUTH.SHOW_LOGIN];

      const keepPermanentDatabase = this.repository.client.isCurrentClientPermanent() && !clearData;
      if (keepPermanentDatabase) {
        keysToKeep.push(z.storage.StorageKey.AUTH.PERSIST);
      }

      // @todo remove on next iteration
      const selfUser = this.repository.user.self();
      if (selfUser) {
        const cookieLabelKey = this.repository.client.constructCookieLabelKey(selfUser.email() || selfUser.phone());

        Object.keys(amplify.store()).forEach(keyInAmplifyStore => {
          const isCookieLabelKey = keyInAmplifyStore === cookieLabelKey;
          const deleteLabelKey = isCookieLabelKey && clearData;
          const isCookieLabel = z.util.StringUtil.includes(keyInAmplifyStore, z.storage.StorageKey.AUTH.COOKIE_LABEL);

          if (!deleteLabelKey && isCookieLabel) {
            keysToKeep.push(keyInAmplifyStore);
          }
        });

        const keepConversationInput = signOutReason === z.auth.SIGN_OUT_REASON.SESSION_EXPIRED;
        this.repository.cache.clearCache(keepConversationInput, keysToKeep);
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
      return this.auth.repository
        .logout()
        .then(() => _logout())
        .catch(() => _redirectToLogin());
    };

    if (App.CONFIG.SIGN_OUT_REASONS.IMMEDIATE.includes(signOutReason)) {
      return _logout();
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
    this.logger.info(`Refresh to update from source '${this.update_source}' started`);
    if (z.util.Environment.desktop) {
      amplify.publish(z.event.WebApp.LIFECYCLE.RESTART, this.update_source);
    }

    const isWebappSource = this.update_source === z.lifecycle.UPDATE_SOURCE.WEBAPP;
    if (isWebappSource) {
      window.location.reload(true);
      window.focus();
    }
  }

  /**
   * Notify about found update
   * @param {z.lifecycle.UPDATE_SOURCE} update_source - Update source
   * @returns {undefined} No return value
   */
  update(update_source) {
    this.update_source = update_source;
    amplify.publish(z.event.WebApp.WARNING.SHOW, z.viewModel.WarningsViewModel.TYPE.LIFECYCLE_UPDATE);
  }

  /**
   * Redirect to the login page after internet connectivity has been verified.
   * @param {z.auth.SIGN_OUT_REASON} signOutReason - Redirect triggered by session expiration
   * @returns {undefined} No return value
   */
  _redirectToLogin(signOutReason) {
    this.logger.info(`Redirecting to login after connectivity verification. Reason: ${signOutReason}`);
    this.auth.client
      .execute_on_connectivity(z.service.BackendClient.CONNECTIVITY_CHECK_TRIGGER.LOGIN_REDIRECT)
      .then(() => {
        const isTemporaryGuestReason = App.CONFIG.SIGN_OUT_REASONS.TEMPORARY_GUEST.includes(signOutReason);
        const isLeavingGuestRoom = isTemporaryGuestReason && this.repository.user.isTemporaryGuest();
        if (isLeavingGuestRoom) {
          const path = z.l10n.text(z.string.urlWebsiteRoot);
          const url = z.util.URLUtil.buildUrl(z.util.URLUtil.TYPE.WEBSITE, path);
          return window.location.replace(url);
        }

        const baseUrl = z.util.Environment.frontend.isLocalhost() ? '/page/auth.html' : '/auth/';
        let url = `${baseUrl}${location.search}`;
        const isImmediateSignOutReason = App.CONFIG.SIGN_OUT_REASONS.IMMEDIATE.includes(signOutReason);
        if (isImmediateSignOutReason) {
          url = z.util.URLUtil.appendParameter(url, `${z.auth.URLParameter.REASON}=${signOutReason}`);
        }

        const redirectToLogin = signOutReason !== z.auth.SIGN_OUT_REASON.NOT_SIGNED_IN;
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
    this.repository.properties.savePreference(z.properties.PROPERTIES_TYPE.ENABLE_DEBUGGING, false);
  }

  /**
   * Enable debugging on any environment.
   * @returns {undefined} No return value
   */
  enableDebugging() {
    z.config.LOGGER.OPTIONS.domains['app.wire.com'] = () => 300;
    this.repository.properties.savePreference(z.properties.PROPERTIES_TYPE.enableDebugging, true);
  }

  /**
   * Initialize debugging features.
   * @returns {undefined} No return value
   */
  initDebugging() {
    if (z.util.Environment.frontend.isLocalhost()) {
      this._attachLiveReload();
    }
  }

  /**
   * Report call telemetry to Raygun for analysis.
   * @returns {undefined} No return value
   */
  reportCall() {
    this.repository.calling.reportCall();
  }

  /**
   * Attach live reload on localhost.
   * @returns {undefined} No return value
   */
  _attachLiveReload() {
    const liveReload = document.createElement('script');
    liveReload.id = 'liveReload';
    liveReload.src = 'http://localhost:32123/livereload.js';
    document.body.appendChild(liveReload);
    $('html').addClass('development');
  }
};

//##############################################################################
// Setting up the App
//##############################################################################

$(() => {
  if ($('#wire-main-app').length !== 0) {
    wire.app = new z.main.App(wire.auth);
  }
});
