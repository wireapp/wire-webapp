/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

    this.service = this._setup_services();
    this.repository = this._setup_repositories();
    this.view = this._setup_view_models();
    this.util = this._setup_utils();

    this._subscribe_to_events();

    this.init_debugging();
    this.init_app();
    this.init_service_worker();
  }


  //##############################################################################
  // Instantiation
  //##############################################################################

  /* eslint-disable no-multi-spaces */

  /**
   * Create all app repositories.
   * @returns {Object} All repositories
   */
  _setup_repositories() {
    const repositories = {};

    repositories.announce            = new z.announce.AnnounceRepository(this.service.announce);
    repositories.audio               = this.auth.audio;
    repositories.storage             = new z.storage.StorageRepository(this.service.storage);
    repositories.cache               = new z.cache.CacheRepository();
    repositories.cryptography        = new z.cryptography.CryptographyRepository(this.service.cryptography, repositories.storage);
    repositories.giphy               = new z.extension.GiphyRepository(this.service.giphy);
    repositories.media               = new z.media.MediaRepository();

    repositories.client              = new z.client.ClientRepository(this.service.client, repositories.cryptography);
    repositories.user                = new z.user.UserRepository(this.service.user, this.service.asset, this.service.search, repositories.client, repositories.cryptography);
    repositories.event               = new z.event.EventRepository(this.service.web_socket, this.service.notification, repositories.cryptography, repositories.user, this.service.conversation);
    repositories.search              = new z.search.SearchRepository(this.service.search, repositories.user);
    repositories.properties          = new z.properties.PropertiesRepository(this.service.properties);
    repositories.connect             = new z.connect.ConnectRepository(this.service.connect, this.service.connect_google, repositories.properties);
    repositories.links               = new z.links.LinkPreviewRepository(this.service.asset);

    repositories.conversation        = new z.conversation.ConversationRepository(
      this.service.conversation,
      this.service.asset,
      repositories.user,
      repositories.giphy,
      repositories.cryptography,
      repositories.links
    );

    repositories.bot                 = new z.bot.BotRepository(this.service.bot, repositories.conversation);
    repositories.calling             = new z.calling.CallingRepository(this.service.call, this.service.calling, repositories.client, repositories.conversation, repositories.media, repositories.user);
    repositories.event_tracker       = new z.tracking.EventTrackingRepository(repositories.conversation, repositories.user);
    repositories.system_notification = new z.system_notification.SystemNotificationRepository(repositories.calling, repositories.conversation);

    return repositories;
  }

  /**
   * Create all app services.
   * @returns {Object} All services
   */
  _setup_services() {
    const services = {};

    services.asset          = new z.assets.AssetService(this.auth.client);
    services.bot            = new z.bot.BotService();
    services.call           = new z.calling.v2.CallService(this.auth.client);
    services.calling        = new z.calling.CallingService(this.auth.client);
    services.connect        = new z.connect.ConnectService(this.auth.client);
    services.connect_google = new z.connect.ConnectGoogleService(this.auth.client);
    services.cryptography   = new z.cryptography.CryptographyService(this.auth.client);
    services.giphy          = new z.extension.GiphyService(this.auth.client);
    services.search         = new z.search.SearchService(this.auth.client);
    services.storage        = new z.storage.StorageService();
    services.user           = new z.user.UserService(this.auth.client);
    services.properties     = new z.properties.PropertiesService(this.auth.client);
    services.web_socket     = new z.event.WebSocketService(this.auth.client);

    services.client         = new z.client.ClientService(this.auth.client, services.storage);
    services.notification   = new z.event.NotificationService(this.auth.client, services.storage);
    services.announce       = new z.announce.AnnounceService();

    if (z.util.Environment.browser.edge) {
      services.conversation = new z.conversation.ConversationServiceNoCompound(this.auth.client, services.storage);
    } else {
      services.conversation = new z.conversation.ConversationService(this.auth.client, services.storage);
    }

    return services;
  }

  /**
   * Create all app utils.
   * @returns {Object} All utils
   */
  _setup_utils() {
    return {
      debug: z.util.Environment.frontend.is_production() ? undefined : new z.util.DebugUtil(this.repository.user, this.repository.conversation),
    };
  }

  /**
   * Create all app view models.
   * @returns {Object} All view models
   */
  _setup_view_models() {
    const view_models = {};

    view_models.main              = new z.ViewModel.MainViewModel('wire-main', this.repository.user);
    view_models.content           = new z.ViewModel.content.ContentViewModel('right', this.repository.calling, this.repository.client, this.repository.conversation, this.repository.media, this.repository.search, this.repository.properties);
    view_models.list              = new z.ViewModel.list.ListViewModel('left', view_models.content, this.repository.calling, this.repository.connect, this.repository.conversation, this.repository.search, this.repository.properties);
    view_models.title             = new z.ViewModel.WindowTitleViewModel(view_models.content.content_state, this.repository.user, this.repository.conversation);
    view_models.lightbox          = new z.ViewModel.ImageDetailViewViewModel('detail-view', this.repository.conversation);
    view_models.warnings          = new z.ViewModel.WarningsViewModel('warnings');
    view_models.modals            = new z.ViewModel.ModalsViewModel('modals');

    view_models.loading           = new z.ViewModel.LoadingViewModel('loading-screen', this.repository.user);

    // backwards compatibility
    view_models.conversation_list = view_models.list.conversations;

    return view_models;
  }

  /* eslint-enable no-multi-spaces */

  /**
   * Subscribe to amplify events.
   * @returns {undefined} No return value
   */
  _subscribe_to_events() {
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
   * @param {boolean} [is_reload=_is_reload()] - App init after page reload
   * @returns {undefined} No return value
   */
  init_app(is_reload = this._is_reload()) {
    this._load_access_token(is_reload)
    .then(() => {
      this.view.loading.update_progress(2.5, z.string.init_received_access_token);
      this.telemetry.time_step(z.telemetry.app_init.AppInitTimingsStep.RECEIVED_ACCESS_TOKEN);
      return Promise.all([
        this._get_user_self(),
        z.util.protobuf.load_protos(`ext/proto/generic-message-proto/messages.proto?${z.util.Environment.version(false)}`),
      ]);
    })
    .then(([self_user_et]) => {
      this.view.loading.update_progress(5, z.string.init_received_self_user);
      this.telemetry.time_step(z.telemetry.app_init.AppInitTimingsStep.RECEIVED_SELF_USER);
      this.repository.client.init(self_user_et);
      this.repository.properties.init(self_user_et);
      return this.repository.cryptography.init(this.service.storage.db);
    })
    .then(() => {
      this.view.loading.update_progress(7.5);
      this.telemetry.time_step(z.telemetry.app_init.AppInitTimingsStep.INITIALIZED_CRYPTOGRAPHY);
      return this.repository.client.get_valid_local_client();
    })
    .then((client_observable) => {
      this.view.loading.update_progress(10, z.string.init_validated_client);

      this.telemetry.time_step(z.telemetry.app_init.AppInitTimingsStep.VALIDATED_CLIENT);
      this.telemetry.add_statistic(z.telemetry.app_init.AppInitStatisticsValue.CLIENT_TYPE, client_observable().type);

      this.repository.cryptography.current_client = client_observable;
      this.repository.event.current_client = client_observable;
      this.repository.event.connect_web_socket();

      return Promise.all([
        this.repository.conversation.get_conversations(),
        this.repository.user.get_connections(),
      ]);
    })
    .then(([conversation_ets, connection_ets]) => {
      this.view.loading.update_progress(25, z.string.init_received_user_data);

      this.telemetry.time_step(z.telemetry.app_init.AppInitTimingsStep.RECEIVED_USER_DATA);
      this.telemetry.add_statistic(z.telemetry.app_init.AppInitStatisticsValue.CONVERSATIONS, conversation_ets.length, 50);
      this.telemetry.add_statistic(z.telemetry.app_init.AppInitStatisticsValue.CONNECTIONS, connection_ets.length, 50);

      this.repository.conversation.initialize_connections(this.repository.user.connections());
      this._subscribe_to_beforeunload();
      return this.repository.event.initialize_from_notification_stream();
    })
    .then((notifications_count) => {
      this.view.loading.update_progress(95, z.string.init_updated_from_notifications);

      this.telemetry.time_step(z.telemetry.app_init.AppInitTimingsStep.UPDATED_FROM_NOTIFICATIONS);
      this.telemetry.add_statistic(z.telemetry.app_init.AppInitStatisticsValue.NOTIFICATIONS, notifications_count, 100);

      this._watch_online_status();
      return this.repository.client.get_clients_for_self();
    })
    .then((client_ets) => {
      this.view.loading.update_progress(97.5);

      this.telemetry.add_statistic(z.telemetry.app_init.AppInitStatisticsValue.CLIENTS, client_ets.length);
      this.telemetry.time_step(z.telemetry.app_init.AppInitTimingsStep.APP_PRE_LOADED);

      this.repository.user.self().devices(client_ets);
      this.logger.info('App pre-loading completed');
      return this._handle_url_params();
    })
    .then(() => {
      this._show_ui();
      this.telemetry.report();
      amplify.publish(z.event.WebApp.LIFECYCLE.LOADED);
      amplify.publish(z.event.WebApp.LOADED); // todo: deprecated - remove when user base of wrappers version >= 2.12 is large enough
      this.telemetry.time_step(z.telemetry.app_init.AppInitTimingsStep.APP_LOADED);
      return this.repository.conversation.update_conversations(this.repository.conversation.conversations_unarchived());
    })
    .then(() => {
      this.telemetry.time_step(z.telemetry.app_init.AppInitTimingsStep.UPDATED_CONVERSATIONS);
      this.repository.announce.init();
      this.repository.audio.init(true);
      this.repository.client.cleanup_clients_and_sessions(true);
      this.logger.info('App fully loaded');
    })
    .catch((error) => {
      let error_message = `Error during initialization of app version '${z.util.Environment.version(false)}'`;
      if (z.util.Environment.electron) {
        error_message = `${error_message} - Electron '${platform.os.family}' '${z.util.Environment.version()}'`;
      }

      this.logger.info(error_message, {error});
      this.logger.debug(`App reload: '${is_reload}', Document referrer: '${document.referrer}', Location: '${window.location.href}'`);

      if (is_reload && ![z.client.ClientError.TYPE.MISSING_ON_BACKEND, z.client.ClientError.TYPE.NO_LOCAL_CLIENT].includes(error.type)) {
        return this.auth.client.execute_on_connectivity(z.service.BackendClient.CONNECTIVITY_CHECK_TRIGGER.APP_INIT_RELOAD).then(() => window.location.reload(false));
      }

      if (navigator.onLine) {
        this.logger.error(`Caused by: ${(error != null ? error.message : undefined) || error}`, error);
        if (error instanceof z.storage.StorageError) {
          Raygun.send(error);
        }
        return this.logout('init_app');
      }

      this.logger.warn('No connectivity. Trigger reload on regained connectivity.', error);
      this._watch_online_status();
    });
  }

  /**
   * Initialize ServiceWorker if supported.
   * @returns {undefined} No return value
   */
  init_service_worker() {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        this.logger.info(`ServiceWorker registration successful with scope: ${registration.scope}`);
      });
    }
  }

  /**
   * Behavior when internet connection is re-established.
   * @returns {undefined} No return value
   */
  on_internet_connection_gained() {
    this.logger.info('Internet connection regained. Re-establishing WebSocket connection...');
    this.auth.client.execute_on_connectivity(z.service.BackendClient.CONNECTIVITY_CHECK_TRIGGER.CONNECTION_REGAINED)
      .then(() => {
        amplify.publish(z.event.WebApp.WARNING.DISMISS, z.ViewModel.WarningType.NO_INTERNET);
        amplify.publish(z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.CONNECTIVITY_RECONNECT);
        this.repository.event.reconnect_web_socket(z.event.WebSocketService.CHANGE_TRIGGER.ONLINE);
      });
  }

  /**
   * Reflect internet connection loss in the UI.
   * @returns {undefined} No return value
   */
  on_internet_connection_lost() {
    this.logger.warn('Internet connection lost');
    this.repository.event.disconnect_web_socket(z.event.WebSocketService.CHANGE_TRIGGER.OFFLINE);
    amplify.publish(z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.NO_INTERNET);
  }

  /**
   * Get the self user from the backend.
   * @returns {Promise<z.entity.User>} Resolves with the self user entity
   */
  _get_user_self() {
    return this.repository.user.get_me()
    .then((user_et) => {
      this.logger.info(`Loaded self user with ID '${user_et.id}'`);
      if (!user_et.email() && !user_et.phone()) {
        throw new Error('User does not have a verified identity');
      }
      return this.service.storage.init(user_et.id)
      .then(() => {
        this._check_user_information(user_et);
        return user_et;
      });
    });
  }

  /**
   * Check whether we need to set different user information (picture, username).
   * @param {z.entity.User} user_et - Self user entity
   * @returns {undefined} No return value
   */
  _check_user_information(user_et) {
    if (!user_et.medium_picture_resource()) {
      this.view.list.first_run(true);
      this.repository.user.set_default_picture();
    }
    if (!user_et.username()) {
      this.repository.user.get_username_suggestion();
    }
  }

  /**
   * Handle URL params.
   * @returns {undefined} Not return value
   */
  _handle_url_params() {
    // TODO: remove in the next release
    this.repository.conversation.use_v3_api = true;

    const bot_name = z.util.get_url_parameter(z.auth.URLParameter.BOT);
    if (bot_name) {
      this.logger.info(`Found bot token '${bot_name}'`);
      this.repository.bot.add_bot(bot_name);
    }

    const calling_v3 = z.util.get_url_parameter(z.auth.URLParameter.CALLING_V3);
    if (_.isBoolean(calling_v3)) {
      return this.repository.calling.use_v3_api = calling_v3;
    }
  }

  /**
   * Check whether the page has been reloaded.
   * @private
   * @returns {boolean}  True if it is a page refresh
   */
  _is_reload() {
    const is_reload = z.util.is_same_location(document.referrer, window.location.href);
    this.logger.debug(`App reload: '${is_reload}', Document referrer: '${document.referrer}', Location: '${window.location.href}'`);
    return is_reload;
  }

  /**
   * Load the access token from cache or get one from the backend.
   * @param {boolean} is_reload - Is initialization a page reload
   * @returns {Promise} Resolves with the access token
   */
  _load_access_token(is_reload) {
    return new Promise((resolve) => {
      let token_promise;
      if (z.util.Environment.frontend.is_localhost() || document.referrer.toLowerCase().includes('/auth')) {
        token_promise = this.auth.repository.get_cached_access_token().then(resolve);
      } else {
        token_promise = this.auth.repository.get_access_token().then(resolve);
      }

      return token_promise.catch((error) => {
        if (is_reload) {
          if ([z.auth.AccessTokenError.TYPE.REQUEST_FORBIDDEN, z.auth.AccessTokenError.TYPE.NOT_FOUND_IN_CACHE].includes(error.type)) {
            this.logger.error(`Session expired on page reload: ${error.message}`, error);
            Raygun.send(new Error(('Session expired on page reload'), error));
            return this._redirect_to_login(true);
          }
          this.logger.warn('Connectivity issues. Trigger reload on regained connectivity.', error);
          return this.auth.client.execute_on_connectivity(z.service.BackendClient.CONNECTIVITY_CHECK_TRIGGER.ACCESS_TOKEN_RETRIEVAL)
          .then(function() {
            window.location.reload(false);
          });
        }

        if (navigator.onLine) {
          switch (error.type) {
            case z.auth.AccessTokenError.TYPE.NOT_FOUND_IN_CACHE:
            case z.auth.AccessTokenError.TYPE.RETRIES_EXCEEDED:
            case z.auth.AccessTokenError.TYPE.REQUEST_FORBIDDEN:
              this.logger.warn(`Redirecting to login: ${error.message}`, error);
              return this._redirect_to_login(false);
            default:
              this.logger.error(`Could not get access token: ${error.message}. Logging out user.`, error);
              return this.logout('init_app');
          }
        }

        this.logger.warn('No connectivity. Trigger reload on regained connectivity.', error);
        this._watch_online_status();
      });
    });
  }


  /**
   * Hide the loading spinner and show the application UI.
   * @returns {undefined} No return value
   */
  _show_ui() {
    const conversation_et = this.repository.conversation.get_most_recent_conversation();
    this.logger.info('Showing application UI');
    if (this.repository.user.should_change_username()) {
      amplify.publish(z.event.WebApp.TAKEOVER.SHOW);
    } else if (conversation_et) {
      amplify.publish(z.event.WebApp.CONVERSATION.SHOW, conversation_et);
    } else if (this.repository.user.connect_requests().length) {
      amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.ViewModel.content.CONTENT_STATE.CONNECTION_REQUESTS);
    }

    window.setTimeout(() => {
      return this.repository.system_notification.check_permission();
    }
    , 10000);

    $('#loading-screen').remove();
    $('#wire-main').attr('data-uie-value', 'is-loaded');
  }

  /**
   * Subscribe to 'beforeunload' to stop calls and disconnect the WebSocket.
   * @returns {undefined} No return value
   */
  _subscribe_to_beforeunload() {
    $(window).on('beforeunload', () => {
      this.logger.info("'window.onbeforeunload' was triggered, so we will disconnect from the backend.");
      this.repository.event.disconnect_web_socket(z.event.WebSocketService.CHANGE_TRIGGER.PAGE_NAVIGATION);
      this.repository.calling.leave_call_on_beforeunload();
      this.repository.storage.terminate('window.onbeforeunload');
    });
  }

  /**
   * Subscribe to 'navigator.onLine' related events.
   * @returns {undefined} No return value
   */
  _watch_online_status() {
    this.logger.info('Watching internet connectivity status');
    $(window).on('offline', this.on_internet_connection_lost.bind(this));
    $(window).on('online', this.on_internet_connection_gained.bind(this));
  }


  //##############################################################################
  // Lifecycle
  //##############################################################################

  /**
   * Logs the user out on the backend and deletes cached data.
   *
   * @param {string} cause - Cause for logout
   * @param {boolean} clear_data - Keep data in database
   * @param {boolean} session_expired - Redirect the user to the login page
   * @returns {undefined} No return value
   */
  logout(cause, clear_data = false, session_expired = false) {
    const _logout = () => {
      // Disconnect from our backend, end tracking and clear cached data
      this.repository.event.disconnect_web_socket(z.event.WebSocketService.CHANGE_TRIGGER.LOGOUT);
      amplify.publish(z.event.WebApp.ANALYTICS.CLOSE_SESSION);

      // Clear Local Storage (but don't delete the cookie label if you were logged in with a permanent client)
      const do_not_delete = [z.storage.StorageKey.AUTH.SHOW_LOGIN];

      if (this.repository.client.is_current_client_permanent() && !clear_data) {
        do_not_delete.push(z.storage.StorageKey.AUTH.PERSIST);
      }

      // @todo remove on next iteration
      const self_user = this.repository.user.self();
      if (self_user) {
        const cookie_label_key = this.repository.client.construct_cookie_label_key(self_user.email() || self_user.phone());

        Object.keys(amplify.store()).forEach(function(amplify_key) {
          if (!(amplify_key === cookie_label_key && clear_data) && z.util.StringUtil.includes(amplify_key, z.storage.StorageKey.AUTH.COOKIE_LABEL)) {
            do_not_delete.push(amplify_key);
          }
        });

        this.repository.cache.clear_cache(session_expired, do_not_delete);
      }

      // Clear IndexedDB
      if (clear_data) {
        this.repository.storage.delete_everything()
        .catch((error) => {
          return this.logger.error('Failed to delete database before logout', error);
        })
        .then(() => {
          this._redirect_to_login(session_expired);
        });
      } else {
        this._redirect_to_login(session_expired);
      }
    };

    const _logout_on_backend = () => {
      this.logger.info(`Logout triggered by '${cause}': Disconnecting user from the backend.`);
      this.auth.repository.logout()
      .then(() => _logout())
      .catch(() => this._redirect_to_login(false));
    };

    if (session_expired) {
      return _logout();
    }

    if (navigator.onLine) {
      return _logout_on_backend();
    }

    this.logger.warn('No internet access. Continuing when internet connectivity regained.');
    $(window).on('online', () => _logout_on_backend());
  }

  /**
   * Refresh the web app or desktop wrapper
   * @returns {undefined} No return value
   */
  refresh() {
    if (z.util.Environment.electron) {
      amplify.publish(z.event.WebApp.LIFECYCLE.RESTART, this.update_source);
    }
    if (this.update_source === z.announce.UPDATE_SOURCE.WEBAPP) {
      window.location.reload(true);
      window.focus();
    }
  }

  /**
   * Notify about found update
   * @param {z.announce.UPDATE_SOURCE} update_source - Update source
   * @returns {undefined} No return value
   */
  update(update_source) {
    this.update_source = update_source;
    amplify.publish(z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.LIFECYCLE_UPDATE);
  }

  /**
   * Redirect to the login page after internet connectivity has been verified.
   * @param {boolean} session_expired - Redirect triggered by session expiration
   * @returns {undefined} No return value
   */
  _redirect_to_login(session_expired) {
    this.logger.info(`Redirecting to login after connectivity verification. Session expired: ${session_expired}`);
    this.auth.client.execute_on_connectivity(z.service.BackendClient.CONNECTIVITY_CHECK_TRIGGER.LOGIN_REDIRECT)
    .then(function() {
      let url = `/auth/${location.search}`;
      if (session_expired) {
        url = z.util.append_url_parameter(url, z.auth.URLParameter.EXPIRED);
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
  disable_debugging() {
    z.config.LOGGER.OPTIONS.domains['app.wire.com'] = () => 0;
    this.repository.properties.save_preference(z.properties.PROPERTIES_TYPE.ENABLE_DEBUGGING, false);
  }

  /**
   * Enable debugging on any environment.
   * @returns {undefined} No return value
   */
  enable_debugging() {
    z.config.LOGGER.OPTIONS.domains['app.wire.com'] = () => 300;
    this.repository.properties.save_preference(z.properties.PROPERTIES_TYPE.ENABLE_DEBUGGING, true);
  }

  /**
   * Initialize debugging features.
   * @returns {undefined} No return value
   */
  init_debugging() {
    if (z.util.Environment.frontend.is_localhost()) {
      this._attach_live_reload();
    }
  }

  /**
   * Report call telemetry to Raygun for analysis.
   * @returns {undefined} No return value
   */
  report_call() {
    this.repository.calling.report_call();
  }


  /**
   * Attach live reload on localhost.
   * @returns {undefined} No return value
   */
  _attach_live_reload() {
    const live_reload = document.createElement('script');
    live_reload.id = 'live_reload';
    live_reload.src = 'http://localhost:32123/livereload.js';
    document.body.appendChild(live_reload);
    $('html').addClass('development');
  }
};


//##############################################################################
// Setting up the App
//##############################################################################
$(function() {
  if ($('#wire-main-app').length !== 0) {
    wire.app = new z.main.App(wire.auth);
  }
});
