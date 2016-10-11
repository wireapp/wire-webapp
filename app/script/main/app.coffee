#
# Wire
# Copyright (C) 2016 Wire Swiss GmbH
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see http://www.gnu.org/licenses/.
#

window.z ?= {}
z.main ?= {}

# @formatter:off
class z.main.App
  ###
  Construct a new app.
  @param auth [z.main.Auth] Authentication settings
  ###
  constructor: (@auth) ->
    @logger = new z.util.Logger 'z.main.App', z.config.LOGGER.OPTIONS

    @telemetry = new z.telemetry.app_init.AppInitTelemetry()
    @window_handler = new z.ui.WindowHandler().init()

    @service = @_setup_services()
    @repository = @_setup_repositories()
    @view = @_setup_view_models()
    @util = @_setup_utils()

    @_subscribe_to_events()

    @init_debugging()
    @init_app()


  ###############################################################################
  # Instantiation
  ###############################################################################

  # Create all app services.
  _setup_services: ->
    service = {}

    service.asset                   = new z.assets.AssetService @auth.client
    service.call                    = new z.calling.CallService @auth.client
    service.connect                 = new z.connect.ConnectService @auth.client
    service.connect_google          = new z.connect.ConnectGoogleService @auth.client
    service.cryptography            = new z.cryptography.CryptographyService @auth.client
    service.giphy                   = new z.extension.GiphyService @auth.client
    service.search                  = new z.search.SearchService @auth.client
    service.storage                 = new z.storage.StorageService()
    service.user                    = new z.user.UserService @auth.client
    service.web_socket              = new z.event.WebSocketService @auth.client

    service.client                  = new z.client.ClientService @auth.client, service.storage
    service.conversation            = new z.conversation.ConversationService @auth.client, service.storage
    service.notification            = new z.event.NotificationService @auth.client, service.storage
    service.announce                = new z.announce.AnnounceService()

    return service

  # Create all app repositories.
  _setup_repositories: ->
    repository = {}

    repository.audio               = @auth.audio
    repository.storage             = new z.storage.StorageRepository @service.storage
    repository.cache               = new z.cache.CacheRepository()
    repository.cryptography        = new z.cryptography.CryptographyRepository @service.cryptography, repository.storage
    repository.giphy               = new z.extension.GiphyRepository @service.giphy

    repository.client              = new z.client.ClientRepository @service.client, repository.cryptography
    repository.user                = new z.user.UserRepository @service.user, @service.asset, @service.search, repository.client, repository.cryptography
    repository.connect             = new z.connect.ConnectRepository @service.connect, @service.connect_google, repository.user
    repository.event               = new z.event.EventRepository @service.web_socket, @service.notification, repository.cryptography, repository.user
    repository.search              = new z.search.SearchRepository @service.search, repository.user
    repository.announce            = new z.announce.AnnounceRepository @service.announce
    repository.links               = new z.links.LinkPreviewRepository @service.asset

    repository.conversation        = new z.conversation.ConversationRepository(
      @service.conversation,
      @service.asset,
      repository.user,
      repository.giphy,
      repository.cryptography,
      repository.links
    )

    repository.call_center         = new z.calling.CallCenter @service.call, repository.conversation, repository.user, repository.audio
    repository.event_tracker       = new z.tracking.EventTrackingRepository repository.user, repository.conversation
    repository.system_notification = new z.SystemNotification.SystemNotificationRepository repository.conversation

    return repository

  # Create all app view models.
  _setup_view_models: ->
    view = {}

    view.main                      = new z.ViewModel.MainViewModel 'wire-main', @repository.user
    view.content                   = new z.ViewModel.content.ContentViewModel 'right', @repository.call_center, @repository.client, @repository.conversation, @repository.cryptography, @repository.giphy, @repository.search, @repository.user
    view.list                      = new z.ViewModel.list.ListViewModel 'left', view.content, @repository.call_center, @repository.connect, @repository.conversation, @repository.search, @repository.user
    view.title                     = new z.ViewModel.WindowTitleViewModel view.content.content_state, @repository.user, @repository.conversation
    view.warnings                  = new z.ViewModel.WarningsViewModel 'warnings'
    view.modals                    = new z.ViewModel.ModalsViewModel 'modals'

    view.loading                   = new z.ViewModel.LoadingViewModel 'loading-screen', @repository.user

    return view

  _setup_utils: ->
    utils =
      debug: new z.util.DebugUtil @repository.user, @repository.conversation
    return utils

  # Subscribe to amplify events.
  _subscribe_to_events: ->
    amplify.subscribe z.event.WebApp.SIGN_OUT, @logout


  ###############################################################################
  # Initialization
  ###############################################################################

  ###
  Initialize the app.
  @note any failure will result in a logout
  @todo Check if we really need to logout the user in all these error cases or how to recover from them
  ###
  init_app: (is_reload = @_is_reload()) =>
    @_load_access_token is_reload
    .then =>
      @view.loading.switch_message z.string.init_received_access_token, true
      @telemetry.time_step z.telemetry.app_init.AppInitTimingsStep.RECEIVED_ACCESS_TOKEN
      return z.util.protobuf.load_protos "ext/proto/generic-message-proto/messages.proto?#{z.util.Environment.version false}"
    .then =>
      @telemetry.time_step z.telemetry.app_init.AppInitTimingsStep.INITIALIZED_PROTO_MESSAGES
      return @_get_user_self()
    .then (self_user_et) =>
      @view.loading.switch_message z.string.init_received_self_user, true
      @telemetry.time_step z.telemetry.app_init.AppInitTimingsStep.RECEIVED_SELF_USER
      @repository.client.init self_user_et
      return @repository.storage.init false
    .then =>
      @view.loading.switch_message z.string.init_initialized_storage, true
      @telemetry.time_step z.telemetry.app_init.AppInitTimingsStep.INITIALIZED_STORAGE
      number_of_sessions = Object.keys(@repository.storage.sessions).length
      @telemetry.add_statistic z.telemetry.app_init.AppInitStatisticsValue.SESSIONS, number_of_sessions, 50
      return @repository.cryptography.init()
    .then =>
      @view.loading.switch_message z.string.init_initialized_cryptography, true
      @telemetry.time_step z.telemetry.app_init.AppInitTimingsStep.INITIALIZED_CRYPTOGRAPHY
      return @repository.client.get_valid_local_client()
    .then (client_observable) =>
      @view.loading.switch_message z.string.init_validated_client, true
      @telemetry.time_step z.telemetry.app_init.AppInitTimingsStep.VALIDATED_CLIENT
      @telemetry.add_statistic z.telemetry.app_init.AppInitStatisticsValue.CLIENT_TYPE, client_observable().type
      @repository.cryptography.current_client = client_observable
      @repository.event.current_client = client_observable
      @repository.event.connect_web_socket()
      promises = [
        @repository.client.get_clients_for_self()
        @repository.user.init_properties()
        @repository.conversation.get_conversations()
        @repository.user.get_connections()
      ]
      return Promise.all promises
    .then (response_array) =>
      [client_ets, user_properties, conversation_ets, connection_ets] = response_array
      @view.loading.switch_message z.string.init_received_user_data, true
      @telemetry.time_step z.telemetry.app_init.AppInitTimingsStep.RECEIVED_USER_DATA
      @telemetry.add_statistic z.telemetry.app_init.AppInitStatisticsValue.CLIENTS, client_ets.length
      @telemetry.add_statistic z.telemetry.app_init.AppInitStatisticsValue.CONVERSATIONS, conversation_ets.length, 50
      @telemetry.add_statistic z.telemetry.app_init.AppInitStatisticsValue.CONNECTIONS, connection_ets.length, 50
      @repository.user.self().devices client_ets

      @logger.log @logger.levels.INFO, 'Mapping user connections to conversations'
      amplify.publish z.event.WebApp.CONVERSATION.MAP_CONNECTION, @repository.user.connections()
      @_subscribe_to_beforeunload()
      return @repository.event.update_from_notification_stream()
    .then (notifications_count) =>
      @view.loading.switch_message z.string.init_updated_from_notifications, true
      @telemetry.time_step z.telemetry.app_init.AppInitTimingsStep.UPDATED_FROM_NOTIFICATIONS
      @telemetry.add_statistic z.telemetry.app_init.AppInitStatisticsValue.NOTIFICATIONS, notifications_count, 100
      return @_watch_online_status()
    .then =>
      @view.loading.switch_message z.string.init_app_pre_loaded, true
      @telemetry.time_step z.telemetry.app_init.AppInitTimingsStep.APP_PRE_LOADED
      @logger.log @logger.levels.INFO, 'App pre-loading completed'
      @_show_ui()
      @telemetry.time_step z.telemetry.app_init.AppInitTimingsStep.SHOWING_UI
      @telemetry.report()
      amplify.publish z.event.WebApp.LOADED
      @telemetry.time_step z.telemetry.app_init.AppInitTimingsStep.APP_LOADED
      return @repository.conversation.update_conversations @repository.conversation.conversations_unarchived()
    .then =>
      @telemetry.time_step z.telemetry.app_init.AppInitTimingsStep.UPDATED_CONVERSATIONS
      @repository.announce.init()
      @repository.audio.init true
      @logger.log @logger.levels.INFO, 'App fully loaded'
    .catch (error) =>
      error_message = "Error during initialization of app version '#{z.util.Environment.version false}'"
      if z.util.Environment.electron
        error_message = "#{error_message} - Electron '#{platform.os.family}' '#{z.util.Environment.version()}'"

      @logger.log @logger.levels.INFO, error_message, {error: error}
      @logger.log @logger.levels.DEBUG,
        "App reload: '#{is_reload}', Document referrer: '#{document.referrer}', Location: '#{window.location.href}'"

      if is_reload and error.type not in [z.client.ClientError::TYPE.MISSING_ON_BACKEND, z.client.ClientError::TYPE.NO_LOCAL_CLIENT]
        @auth.client.execute_on_connectivity().then -> window.location.reload false
      else if navigator.onLine
        @logger.log @logger.levels.ERROR, "Caused by: #{error?.message or error}"
        Raygun.send error if error instanceof z.storage.StorageError
        @logout 'init_app'
      else
        @logger.log @logger.levels.WARN, 'No connectivity. Trigger reload on regained connectivity.', error
        @_watch_online_status()

  ###
  Get the self user from the backend.
  @return [Promise<z.entity.User>] Promise that resolves with the self user entity
  ###
  _get_user_self: ->
    return new Promise (resolve, reject) =>
      @repository.user.get_me()
      .then (user_et) =>
        @logger.log @logger.levels.INFO, "Loaded self user with ID '#{user_et.id}'"

        if not user_et.email() and not user_et.phone()
          reject new Error 'User does not have a verified identity'
        else
          @service.storage.init user_et.id
          .then =>
            if not user_et.picture_medium().length
              @view.list.first_run true
              z.util.load_url_blob z.config.UNSPLASH_URL, (blob) =>
                @repository.user.change_picture blob, ->
                  amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ONBOARDING.ADDED_PHOTO,
                    source: 'unsplash'
                    outcome: 'success'
            resolve user_et
      .catch (error) =>
        if not error instanceof z.storage.StorageError
          error = new Error "Loading self user failed: #{error}"
          @logger.log @logger.levels.ERROR, error.message
        reject error

  ###
  Check whether the page has been reloaded.
  @private
  @return [Boolean] True if it is a page refresh
  ###
  _is_reload: ->
    is_reload = z.util.is_same_location document.referrer, window.location.href
    @logger.log @logger.levels.DEBUG,
      "App reload: '#{is_reload}', Document referrer: '#{document.referrer}', Location: '#{window.location.href}'"
    return is_reload

  ###
  Load the access token from cache or get one from the backend.
  @return [Promise<AccessToken>] Promise that resolves with the Access Token
  ###
  _load_access_token: (is_reload) ->
    return new Promise (resolve) =>
      if z.util.Environment.frontend.is_localhost() or document.referrer.toLowerCase().includes '/auth'
        token_promise = @auth.repository.get_cached_access_token().then(resolve)
      else
        token_promise = @auth.repository.get_access_token().then(resolve)

      token_promise.catch (error) =>
        if is_reload
          if error.type is z.auth.AccessTokenError::TYPE.REQUEST_FORBIDDEN
            @logger.log @logger.levels.ERROR, "Session expired on page reload: #{error.message}", error
            Raygun.send new Error ('Session expired on page reload'), error
            @_redirect_to_login true
          else if error.type isnt z.auth.AccessTokenError::TYPE.NOT_FOUND_IN_CACHE
            @logger.log @logger.levels.WARN, 'Connectivity issues. Trigger reload on regained connectivity.', error
            @auth.client.execute_on_connectivity().then -> window.location.reload false
        else if navigator.onLine
          if error.type is z.auth.AccessTokenError::TYPE.NOT_FOUND_IN_CACHE
            @logger.log @logger.levels.WARN, 'No access token found in cache. Redirecting to login.', error
            @_redirect_to_login false
          else if error.type is z.auth.AccessTokenError::TYPE.REQUEST_FORBIDDEN
            @logger.log @logger.levels.WARN, 'Access token request forbidden. Redirecting to login.', error
            @_redirect_to_login false
          else
            @logger.log @logger.levels.ERROR, "Could not get access token: #{error.message}. Logging out user.", error
            @logout 'init_app'
        else
          @logger.log @logger.levels.WARN, 'No connectivity. Trigger reload on regained connectivity.', error
          @_watch_online_status()

  # Subscribe to 'beforeunload' to stop calls and disconnect the WebSocket.
  _subscribe_to_beforeunload: ->
    $(window).on 'beforeunload', =>
      @logger.log '\'window.onbeforeunload\' was triggered, so we will disconnect from the backend.'
      @repository.event.disconnect_web_socket z.event.WebSocketService::CHANGE_TRIGGER.PAGE_NAVIGATION
      @repository.call_center.state_handler.leave_call_on_beforeunload()
      @repository.storage.terminate 'window.onbeforeunload'
      return undefined

  # Hide the loading spinner and show the application UI.
  _show_ui: ->
    @logger.log @logger.levels.INFO, 'Showing application UI'
    if @view.list.first_run() or not @repository.user.users().length
      @view.content.switch_content z.ViewModel.content.CONTENT_STATE.WATERMARK
    else if conversation_et = @repository.conversation.get_most_recent_conversation()
      # @view.content.switch_content z.ViewModel.content.CONTENT_STATE.PREFERENCES_DEVICES
      amplify.publish z.event.WebApp.CONVERSATION.SHOW, conversation_et
    else if @repository.user.connect_requests().length
      @view.content.switch_content z.ViewModel.content.CONTENT_STATE.CONNECTION_REQUESTS

    window.setTimeout =>
      @repository.system_notification.request_permission()
    , 10000

    $('#loading-screen').remove()
    $('#wire-main')
      .removeClass 'off'
      .attr 'data-uie-value', 'is-loaded'

  # Subscribe to 'navigator.onLine' related events.
  _watch_online_status: ->
    @logger.log @logger.levels.INFO, 'Watching internet connectivity status'
    $(window).on 'offline', @on_internet_connection_lost
    $(window).on 'online', @on_internet_connection_gained

  # Behavior when internet connection is re-established.
  on_internet_connection_gained: =>
    @logger.log @logger.levels.INFO, 'Internet connection regained. Re-establishing WebSocket connection...'
    @auth.client.execute_on_connectivity()
    .then =>
      amplify.publish z.event.WebApp.WARNING.DISMISS, z.ViewModel.WarningType.NO_INTERNET
      amplify.publish z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.CONNECTIVITY_RECONNECT
      @repository.event.reconnect_web_socket z.event.WebSocketService::CHANGE_TRIGGER.ONLINE

  # Reflect internet connection loss in the UI.
  on_internet_connection_lost: =>
    @logger.log @logger.levels.WARN, 'Internet connection lost'
    @repository.event.disconnect_web_socket z.event.WebSocketService::CHANGE_TRIGGER.OFFLINE
    amplify.publish z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.NO_INTERNET


  ###############################################################################
  # Logout
  ###############################################################################

  ###
  Logs the user out on the backend and deletes cached data.
  @param cause [String] Cause for logout
  @param clear_data [Boolean] Whether to keep data in database
  @param session_expired [Boolean] Whether to redirect the user to the login page
  ###
  logout: (cause, clear_data = false, session_expired = false) =>
    _logout = =>
      # Disconnect from our backend, end tracking and clear cached data
      @repository.event.disconnect_web_socket z.event.WebSocketService::CHANGE_TRIGGER.LOGOUT
      amplify.publish z.event.WebApp.ANALYTICS.SESSION.CLOSE

      # Clear Local Storage (but don't delete the cookie label if you were logged in with a permanent client)
      do_not_delete = [z.storage.StorageKey.AUTH.SHOW_LOGIN]

      if @repository.client.is_current_client_permanent() and not clear_data
        do_not_delete.push z.storage.StorageKey.AUTH.PERSIST

      # XXX remove on next iteration
      self_user = @repository.user.self()
      if self_user
        cookie_label_key = @repository.client.construct_cookie_label_key self_user.email() or self_user.phone()

        amplify_objects = amplify.store()
        for amplify_key, amplify_value of amplify_objects
          continue if amplify_key is cookie_label_key and clear_data
          do_not_delete.push amplify_key if z.util.contains amplify_key, z.storage.StorageKey.AUTH.COOKIE_LABEL

        @repository.cache.clear_cache session_expired, do_not_delete

      # Clear IndexedDB
      if clear_data
        @repository.storage.delete_everything()
        .catch (error) =>
          @logger.log @logger.levels.ERROR, 'Failed to delete database before logout', error
        .then =>
          @_redirect_to_login session_expired
      else
        @_redirect_to_login session_expired

    _logout_on_backend = =>
      @logger.log @logger.levels.INFO, "Logout triggered by '#{cause}': Disconnecting user from the backend."
      @auth.repository.logout()
      .then -> _logout()
      .catch => @_redirect_to_login false

    if session_expired
      _logout()
    else if navigator.onLine
      _logout_on_backend()
    else
      @logger.log @logger.levels.WARN, 'No internet access. Continuing when internet connectivity regained.'
      $(window).on 'online', -> _logout_on_backend()

  # Redirect to the login page after internet connectivity has been verified.
  _redirect_to_login: (session_expired) ->
    @logger.log @logger.levels.INFO,
      "Redirecting to login after connectivity verification. Session expired: #{session_expired}"
    @auth.client.execute_on_connectivity()
    .then ->
      url = "/auth/#{location.search}"
      url = z.util.append_url_parameter url, z.auth.URLParameter.EXPIRED if session_expired
      window.location.replace url


  ###############################################################################
  # Debugging
  ###############################################################################

  # Disable debugging on any environment.
  disable_debugging: ->
    z.config.LOGGER.OPTIONS.domains['app.wire.com'] = -> 0
    amplify.publish z.event.WebApp.PROPERTIES.CHANGE.DEBUG, false

  # Enable debugging on any environment.
  enable_debugging: ->
    z.config.LOGGER.OPTIONS.domains['app.wire.com'] = -> 300
    amplify.publish z.event.WebApp.PROPERTIES.CHANGE.DEBUG, true

  # Report call telemetry to Raygun for analysis.
  report_call: =>
    @repository.call_center.report_call()

  # Reset all known sessions at once.
  reset_all_sessions: =>
    @repository.conversation.reset_all_sessions()

  # Initialize debugging features.
  init_debugging: =>
    @_attach_live_reload() if z.util.Environment.frontend.is_localhost()

  # Attach live reload on localhost.
  _attach_live_reload: ->
    live_reload = document.createElement 'script'
    live_reload.id = 'live_reload'
    live_reload.src = 'http://localhost:32123/livereload.js'
    document.body.appendChild live_reload
    $('html').addClass 'development'

###############################################################################
# Setting up the App
###############################################################################
$ ->
  if $('#wire-main-app').length isnt 0
    wire.app = new z.main.App wire.auth
