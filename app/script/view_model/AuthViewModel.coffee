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
z.ViewModel ?= {}

TIMEOUT =
  SHORT: 500
  LONG: 2000

FORWARDED_URL_PARAMETERS = [
  z.auth.URLParameter.ASSETS_V3
  z.auth.URLParameter.BOT
  z.auth.URLParameter.CALLING_V3
  z.auth.URLParameter.ENVIRONMENT
  z.auth.URLParameter.LOCALYTICS
]

###
View model for the auth page.

@param element_id [] CSS class of the element where this view should be applied to (like "auth-page")
@param auth [z.main.Auth] Class that holds objects needed for app authentication
###
# @formatter:off
class z.ViewModel.AuthViewModel
  constructor: (element_id, @auth) ->
    @logger = new z.util.Logger 'z.ViewModel.AuthViewModel', z.config.LOGGER.OPTIONS

    @event_tracker = new z.tracking.EventTrackingRepository()
    @user_service = new z.user.UserService @auth.client

    @audio_repository = @auth.audio

    # Cryptography
    @asset_service = new z.assets.AssetService @auth.client
    # TODO: Don't operate with the service directly. Get a repository!
    @storage_service = new z.storage.StorageService()
    @storage_repository = new z.storage.StorageRepository @storage_service

    @cryptography_service = new z.cryptography.CryptographyRepository @auth.client
    @cryptography_repository = new z.cryptography.CryptographyRepository @cryptography_service, @storage_repository
    @client_service = new z.client.ClientService @auth.client, @storage_service
    @client_repository = new z.client.ClientRepository @client_service, @cryptography_repository

    @user_mapper = new z.user.UserMapper @asset_service
    user_service = new z.user.UserService @auth.client
    @user_repository = new z.user.UserRepository user_service, @asset_service, undefined, @client_repository

    @notification_service = new z.event.NotificationService @auth.client, @storage_service
    @web_socket_service = new z.event.WebSocketService @auth.client
    @event_repository = new z.event.EventRepository @web_socket_service, @notification_service, @cryptography_repository, @user_repository

    @pending_server_request = ko.observable false
    @disabled_by_animation = ko.observable false

    @get_wire = ko.observable false
    @session_expired = ko.observable false
    @device_reused = ko.observable false

    @country_code = ko.observable ''
    @country = ko.observable ''
    @name = ko.observable ''
    @password = ko.observable ''
    @persist = ko.observable true
    @phone_number = ko.observable ''
    @username = ko.observable ''

    @is_public_computer = ko.observable false
    @is_public_computer.subscribe (is_public_computer) => @persist not is_public_computer

    @client_type = ko.pureComputed =>
      if @persist() then z.client.ClientType.PERMANENT else z.client.ClientType.TEMPORARY

    @self_user = ko.observable()

    # Manage devices
    @remove_form_error = ko.observable false
    @device_modal = undefined
    @permanent_devices = ko.pureComputed =>
      (client_et for client_et in @client_repository.clients() when client_et.type is z.client.ClientType.PERMANENT)

    @registration_context = z.auth.AuthView.REGISTRATION_CONTEXT.EMAIL
    @prefilled_email = ''

    @code_digits = ko.observableArray [
      ko.observable ''
      ko.observable ''
      ko.observable ''
      ko.observable ''
      ko.observable ''
      ko.observable ''
    ]
    @code = ko.pureComputed => return (digit() for digit in @code_digits()).join('').substr 0, 6
    @code.subscribe (code) =>
      @_clear_errors() if not code.length
      @verify_code() if code.length is 6
    @phone_number_e164 = => return "#{@country_code()}#{@phone_number()}"

    @code_interval_id = undefined

    @code_expiration_timestamp = ko.observable 0
    @code_expiration_in = ko.observable ''
    @code_expiration_timestamp.subscribe (timestamp) =>
      @code_expiration_in moment.unix(timestamp).fromNow()
      @code_interval_id = window.setInterval =>
        if timestamp <= z.util.get_unix_timestamp()
          window.clearInterval @code_interval_id
          return @code_expiration_timestamp 0
        @code_expiration_in moment.unix(timestamp).fromNow()
      , 20000

    @validation_errors = ko.observableArray []
    @failed_validation_email = ko.observable false
    @failed_validation_password = ko.observable false
    @failed_validation_name = ko.observable false
    @failed_validation_code = ko.observable false
    @failed_validation_phone = ko.observable false
    @failed_validation_terms = ko.observable false
    @accepted_terms_of_use = ko.observable false
    @accepted_terms_of_use.subscribe => @clear_error z.auth.AuthView.TYPE.TERMS

    @can_login_password = ko.pureComputed =>
      return not @disabled_by_animation()

    @can_login_phone = ko.pureComputed =>
      return not @disabled_by_animation() and @country_code().length > 1 and @phone_number().length

    @can_register = ko.pureComputed =>
      return not @disabled_by_animation() and @username().length and @name().length and @password().length and @accepted_terms_of_use()

    @can_resend_code = ko.pureComputed =>
      return not @disabled_by_animation() and @code_expiration_timestamp() < z.util.get_unix_timestamp()

    @can_resend_registration = ko.pureComputed =>
      return not @disabled_by_animation() and @username().length

    @can_resend_verification = ko.pureComputed =>
      return not @disabled_by_animation() and @username().length

    @can_verify_password = ko.pureComputed =>
      return not @disabled_by_animation() and @password().length

    @account_retry_text = ko.pureComputed =>
      return z.localization.Localizer.get_text
        id: z.string.auth_posted_retry
        replace: {placeholder: '%email', content: @username()}
    @account_resend_text = ko.pureComputed =>
      return z.localization.Localizer.get_text
        id: z.string.auth_posted_resend
        replace: {placeholder: '%email', content: @username()}
    @verify_code_text = ko.pureComputed =>
      phone_number = PhoneFormat.formatNumberForMobileDialing('', @phone_number_e164()) or @phone_number_e164()
      return z.localization.Localizer.get_text
        id: z.string.auth_verify_code_description
        replace: {placeholder: '%@number', content: phone_number}
    @verify_code_timer_text = ko.pureComputed =>
      return z.localization.Localizer.get_text
        id: z.string.auth_verify_code_resend_timer
        replace: {placeholder: '%expiration', content: @code_expiration_in()}

    @visible_section = ko.observable undefined
    @visible_mode = ko.observable undefined
    @visible_method = ko.observable undefined

    @account_mode = ko.observable undefined
    @account_mode_login = ko.pureComputed =>
      login_modes = [
        z.auth.AuthView.MODE.ACCOUNT_LOGIN
        z.auth.AuthView.MODE.ACCOUNT_PASSWORD
        z.auth.AuthView.MODE.ACCOUNT_PHONE
      ]
      return @account_mode() in login_modes

    @posted_mode = ko.observable undefined
    @posted_mode_offline = ko.pureComputed =>
      return @posted_mode() is z.auth.AuthView.MODE.POSTED_OFFLINE
    @posted_mode_pending = ko.pureComputed =>
      return @posted_mode() is z.auth.AuthView.MODE.POSTED_PENDING
    @posted_mode_resend = ko.pureComputed =>
      return @posted_mode() is z.auth.AuthView.MODE.POSTED_RESEND
    @posted_mode_retry = ko.pureComputed =>
      return @posted_mode() is z.auth.AuthView.MODE.POSTED_RETRY
    @posted_mode_verify = ko.pureComputed =>
      return @posted_mode() is z.auth.AuthView.MODE.POSTED_VERIFY

    # Debugging
    if window.location.hostname is 'localhost'
      live_reload = document.createElement 'script'
      live_reload.id = 'live_reload'
      live_reload.src = 'http://localhost:32123/livereload.js'
      document.body.appendChild live_reload
      $('html').addClass 'development'

    ko.applyBindings @, document.getElementById element_id

    @show_initial_animation = false

    @_init_base()
    @_track_app_launch()
    $(".#{element_id}").show()

  _init_base: ->
    @_init_url_parameter()
    @_init_url_hash()

    $(window)
      .on 'dragover drop', -> false
      .on 'hashchange', @_on_hash_change
      .on 'keydown', @keydown_auth

    # Select country based on location of user IP
    @country_code (z.util.CountryCodes.get_country_code($('[name=geoip]').attr 'country') or 1).toString()
    @changed_country_code()

    @audio_repository.init()

  _init_url_hash: ->
    modes_to_block = [
      z.auth.AuthView.MODE.HISTORY
      z.auth.AuthView.MODE.LIMIT
      z.auth.AuthView.MODE.POSTED
      z.auth.AuthView.MODE.POSTED_PENDING
      z.auth.AuthView.MODE.POSTED_RETRY
      z.auth.AuthView.MODE.POSTED_VERIFY
      z.auth.AuthView.MODE.VERIFY_ACCOUNT
      z.auth.AuthView.MODE.VERIFY_CODE
      z.auth.AuthView.MODE.VERIFY_PASSWORD
    ]

    if @_has_no_hash() and z.util.StorageUtil.get_value z.storage.StorageKey.AUTH.SHOW_LOGIN
      @_set_hash z.auth.AuthView.MODE.ACCOUNT_LOGIN
    else if @_get_hash() in modes_to_block
      @_set_hash z.auth.AuthView.MODE.ACCOUNT_LOGIN
    else
      @_on_hash_change()

  _init_url_parameter: ->
    if z.util.get_url_parameter z.auth.URLParameter.CONNECT
      @get_wire true
      @registration_context = z.auth.AuthView.REGISTRATION_CONTEXT.GENERIC_INVITE
    else if invite = z.util.get_url_parameter z.auth.URLParameter.INVITE
      @get_wire true
      @register_from_invite invite
    else if z.util.get_url_parameter z.auth.URLParameter.EXPIRED
      @session_expired true


  ###############################################################################
  # Invitation Stuff
  ###############################################################################

  register_from_invite: (invite) =>
    @auth.repository.retrieve_invite invite
    .then (invite_info) =>
      @registration_context = z.auth.AuthView.REGISTRATION_CONTEXT.PERSONAL_INVITE
      @name invite_info.name
      if invite_info.email
        @username invite_info.email
        @prefilled_email = invite_info.email
    .catch (error) ->
      if error.label isnt z.service.BackendClientError::LABEL.INVALID_INVITATION_CODE
        Raygun.send new Error('Invitation not found'), {invite_code: invite, error: error}
    .then =>
      @_set_hash z.auth.AuthView.MODE.ACCOUNT_REGISTER


  ###############################################################################
  # Form actions
  ###############################################################################

  # Sign in using a password login.
  login_password: =>
    return if @pending_server_request() or not @can_login_password() or not @_validate_input z.auth.AuthView.MODE.ACCOUNT_PASSWORD

    @pending_server_request true
    payload = @_create_payload z.auth.AuthView.MODE.ACCOUNT_PASSWORD
    @auth.repository.login payload, @persist()
    .then =>
      login_context = if payload.email then z.auth.AuthView.TYPE.EMAIL else z.auth.AuthView.TYPE.PHONE
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ACCOUNT.LOGGED_IN, {context: login_context, remember_me: @persist()}
      @_authentication_successful()
    .catch (error) =>
      @pending_server_request false
      $('#wire-login-password').focus()
      if navigator.onLine
        if error.label is z.service.BackendClientError::LABEL.PENDING_ACTIVATION
          return @_set_hash z.auth.AuthView.MODE.POSTED_PENDING
        else if error.label
          @_add_error z.string.auth_error_sign_in, [z.auth.AuthView.TYPE.EMAIL, z.auth.AuthView.TYPE.PASSWORD]
        else
          @_add_error z.string.auth_error_misc
      else
        @_add_error z.string.auth_error_offline
      @_has_errors()

  # Sign in using a phone number.
  login_phone: =>
    return if @pending_server_request() or not @can_login_phone() or not @_validate_input z.auth.AuthView.MODE.ACCOUNT_PHONE

    _on_code_request_success = (response) =>
      window.clearInterval @code_interval_id
      if response.expires_in
        @code_expiration_timestamp z.util.get_unix_timestamp() + response.expires_in
      else if not response.label
        @code_expiration_timestamp z.util.get_unix_timestamp() + z.config.LOGIN_CODE_EXPIRATION
      @_set_hash z.auth.AuthView.MODE.VERIFY_CODE
      @pending_server_request false

    @pending_server_request true
    payload = @_create_payload z.auth.AuthView.MODE.ACCOUNT_PHONE
    @auth.repository.request_login_code payload
    .then (response) ->
      _on_code_request_success response
    .catch (error) =>
      @pending_server_request false
      if navigator.onLine
        switch error.label
          when z.service.BackendClientError::LABEL.BAD_REQUEST
            @_add_error z.string.auth_error_phone_number_invalid, z.auth.AuthView.TYPE.PHONE
          when z.service.BackendClientError::LABEL.INVALID_PHONE
            @_add_error z.string.auth_error_phone_number_unknown, z.auth.AuthView.TYPE.PHONE
          when z.service.BackendClientError::LABEL.PASSWORD_EXISTS
            return @_set_hash z.auth.AuthView.MODE.VERIFY_PASSWORD
          when z.service.BackendClientError::LABEL.PENDING_LOGIN
            _on_code_request_success error
            return
          when z.service.BackendClientError::LABEL.UNAUTHORIZED
            @_add_error z.string.auth_error_phone_number_forbidden, z.auth.AuthView.TYPE.PHONE
          else
            @_add_error z.string.auth_error_misc
      else
        @_add_error z.string.auth_error_offline
      @_has_errors()


  # Register a new user account.
  register: =>
    return if @pending_server_request() or not @can_register() or not @_validate_input z.auth.AuthView.MODE.ACCOUNT_REGISTER

    @pending_server_request true
    @persist true
    payload = @_create_payload z.auth.AuthView.MODE.ACCOUNT_REGISTER
    @auth.repository.register payload
    .then =>
      @get_wire false
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.REGISTRATION.ENTERED_CREDENTIALS, outcome: 'success'
      # Track if the user changed the pre-filled email
      if @prefilled_email is @username()
        @auth.repository.get_access_token().then @_account_verified
      else
        @_set_hash z.auth.AuthView.MODE.POSTED
        @auth.repository.get_access_token().then @_wait_for_activate
      @pending_server_request false
    .catch (error) => @_on_register_error error

  # Add an email on phone number login.
  verify_account: =>
    return if @pending_server_request() or not @can_login_password() or not @_validate_input z.auth.AuthView.MODE.VERIFY_ACCOUNT

    @pending_server_request true
    @user_service.change_own_password @password()
    .catch (error) =>
      @logger.warn 'Could not change user password', error
      if error.code isnt z.service.BackendClientError::STATUS_CODE.FORBIDDEN
        throw error
    .then =>
      @user_service.change_own_email @username()
    .then =>
      @pending_server_request false
      @_wait_for_update()
      @_set_hash z.auth.AuthView.MODE.POSTED_VERIFY
    .catch (error) =>
      @pending_server_request false
      if error
        switch error.label
          when z.service.BackendClientError::LABEL.BLACKLISTED_EMAIL
            @_add_error z.string.auth_error_email_forbidden, z.auth.AuthView.TYPE.EMAIL
          when z.service.BackendClientError::LABEL.KEY_EXISTS
            @_add_error z.string.auth_error_email_exists, z.auth.AuthView.TYPE.EMAIL
          when z.service.BackendClientError::LABEL.INVALID_EMAIL
            @_add_error z.string.auth_error_email_malformed, z.auth.AuthView.TYPE.EMAIL
          else
            @_add_error z.string.auth_error_email_malformed, z.auth.AuthView.TYPE.EMAIL
        @_has_errors()

  # Verify the security code on phone number login.
  verify_code: =>
    return if @pending_server_request() or not @_validate_code()

    @pending_server_request true
    payload = @_create_payload z.auth.AuthView.MODE.VERIFY_CODE
    @auth.repository.login payload, @persist()
    .then =>
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ACCOUNT.LOGGED_IN, {context: z.auth.AuthView.TYPE.PHONE, remember_me: @persist()}
      @_authentication_successful()
    .catch =>
      if not @validation_errors().length
        @_add_error z.string.auth_error_code, z.auth.AuthView.TYPE.CODE
        @_has_errors()
      @pending_server_request false

  # Log in with phone number and password.
  verify_password: =>
    return if @pending_server_request() or not @_validate_input z.auth.AuthView.MODE.VERIFY_PASSWORD

    @pending_server_request true
    payload = @_create_payload z.auth.AuthView.MODE.VERIFY_PASSWORD
    @auth.repository.login payload, @persist()
    .then =>
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ACCOUNT.LOGGED_IN, {context: z.auth.AuthView.TYPE.PHONE, remember_me: @persist()}
      @_authentication_successful()
    .catch (error) =>
      @pending_server_request false
      $('#wire-verify-password').focus()
      if navigator.onLine
        if error.label
          if error.label is z.service.BackendClientError::LABEL.PENDING_ACTIVATION
            return @_set_hash z.auth.AuthView.MODE.POSTED_PENDING
          @_add_error z.string.auth_error_sign_in, z.auth.AuthView.TYPE.PASSWORD
        else
          @_add_error z.string.auth_error_misc
      else
        @_add_error z.string.auth_error_offline
      @_has_errors()

  ###
  Create the backend call payload.

  @param mode [z.auth.AuthView.MODE] View state of the authentication page
  @private
  ###
  _create_payload: (mode) =>
    username = @username().trim().toLowerCase()

    switch mode
      when z.auth.AuthView.MODE.ACCOUNT_PASSWORD
        payload =
          label: @client_repository.construct_cookie_label username, @client_type()
          label_key: @client_repository.construct_cookie_label_key username, @client_type()
          password: @password()

        phone = z.util.phone_number_to_e164 username, @country() or navigator.language
        if z.util.is_valid_email username
          payload.email = username
        else if z.util.is_valid_username username
          payload.handle = username.replace '@', ''
        else if z.util.is_valid_phone_number phone
          payload.phone = phone

        return payload
      when z.auth.AuthView.MODE.ACCOUNT_PHONE
        return {} =
          force: false
          phone: @phone_number_e164()
      when z.auth.AuthView.MODE.ACCOUNT_REGISTER
        return {} =
          email: username
          invitation_code: z.util.get_url_parameter z.auth.URLParameter.INVITE
          label: @client_repository.construct_cookie_label username, @client_type()
          label_key: @client_repository.construct_cookie_label_key username, @client_type()
          locale: moment.locale()
          name: @name().trim()
          password: @password()
      when z.auth.AuthView.MODE.POSTED_RESEND
        return {} =
          email: username
      when z.auth.AuthView.MODE.VERIFY_CODE
        return {} =
          code: @code()
          label: @client_repository.construct_cookie_label @phone_number_e164(), @client_type()
          label_key: @client_repository.construct_cookie_label_key @phone_number_e164(), @client_type()
          phone: @phone_number_e164()
      when z.auth.AuthView.MODE.VERIFY_PASSWORD
        return {} =
          label: @client_repository.construct_cookie_label @phone_number_e164(), @client_type()
          label_key: @client_repository.construct_cookie_label_key @phone_number_e164(), @client_type()
          password: @password()
          phone: @phone_number_e164()


  ###############################################################################
  # Events
  ###############################################################################

  changed_country: (view_model, event) =>
    @clear_error z.auth.AuthView.TYPE.PHONE
    @country_code "+#{z.util.CountryCodes.get_country_code event?.currentTarget.value or @country()}"
    $('#wire-login-phone').focus()

  changed_country_code: (view_model, event) =>
    country_code = (event?.currentTarget.value or @country_code()).match(/\d+/g)?.join('').substr 0, 4

    if country_code
      @country_code "+#{country_code}"
      country_iso = z.util.CountryCodes.get_country_by_code(country_code) or 'X1'
    else
      @country_code ''
      country_iso = 'X0'

    @country country_iso
    $('#wire-login-phone').focus()

  changed_phone_number: =>
    input_value = @phone_number()
    @phone_number (@phone_number().match(/\d+/g))?.join('') or ''
    if input_value.length and not @phone_number().length
      @_add_error z.string.auth_error_phone_number_invalid, z.auth.AuthView.TYPE.PHONE

  clear_error: (mode, event) => @_remove_error event?.currentTarget.classList[1] or mode

  clear_error_password: (view_model, event) ->
    return if event.keyCode is z.util.KEYCODE.ENTER
    @failed_validation_password false
    if not event.currentTarget.value.length or event.currentTarget.value.length >= 8
      @_remove_error event.currentTarget.classList[1]

  clicked_on_change_email: => @_set_hash z.auth.AuthView.MODE.ACCOUNT_REGISTER

  clicked_on_change_phone: => @_set_hash z.auth.AuthView.MODE.ACCOUNT_PHONE

  clicked_on_login: =>
    @_set_hash z.auth.AuthView.MODE.ACCOUNT_LOGIN
    $('#wire-login-phone').focus_field() if @visible_method() is z.auth.AuthView.MODE.ACCOUNT_PHONE

  clicked_on_login_password: => @_set_hash z.auth.AuthView.MODE.ACCOUNT_PASSWORD

  clicked_on_login_phone: => @_set_hash z.auth.AuthView.MODE.ACCOUNT_PHONE

  clicked_on_password: ->
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.PASSWORD_RESET, value: 'fromSignIn'
    z.util.safe_window_open "#{z.util.Environment.backend.website_url()}#{z.localization.Localizer.get_text z.string.url_password_reset}"

  clicked_on_register: => @_set_hash z.auth.AuthView.MODE.ACCOUNT_REGISTER

  clicked_on_resend_code: =>
    return if not @can_resend_code()
    @login_phone()

  clicked_on_resend_registration: =>
    return if not @can_resend_registration()
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.REGISTRATION.RESENT_EMAIL_VERIFICATION
    @_fade_in_icon_spinner()

    if not @pending_server_request()
      @pending_server_request true
      payload = @_create_payload z.auth.AuthView.MODE.POSTED_RESEND
      @auth.repository.resend_activation payload
      .then (response) => @_on_resend_success response
      .catch (error) => @_on_resend_error error

  clicked_on_resend_verification: =>
    return if not @can_resend_verification
    @_fade_in_icon_spinner()

    if not @pending_server_request()
      @pending_server_request true
      @user_service.change_own_email @username()
      .then (response) => @_on_resend_success response
      .catch =>
        @pending_server_request false
        $('.icon-spinner').fadeOut()
        window.setTimeout =>
          $('.icon-error').fadeIn()
          @disabled_by_animation false
        , TIMEOUT.SHORT

  clicked_on_retry_registration: =>
    return if not @can_register()
    @_fade_in_icon_spinner()

    if not @pending_server_request()
      @pending_server_request true
      payload = @_create_payload z.auth.AuthView.MODE.ACCOUNT_REGISTER
      @auth.repository.register payload
      .then (response) => @_on_resend_success response
      .catch (error) => @_on_resend_error error

  clicked_on_terms: ->
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.NAVIGATION.OPENED_TERMS
    z.util.safe_window_open z.localization.Localizer.get_text z.string.url_terms_of_use

  clicked_on_verify_later: => @_authentication_successful()

  clicked_on_wire_link: ->
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.NAVIGATION.OPENED_WIRE_WEBSITE
    z.util.safe_window_open z.localization.Localizer.get_text z.string.url_wire

  keydown_auth: (event) =>
    if event.keyCode is z.util.KEYCODE.ENTER
      switch @visible_mode()
        when z.auth.AuthView.MODE.ACCOUNT_LOGIN
          if @visible_method() is z.auth.AuthView.MODE.ACCOUNT_PHONE then @login_phone() else @login_password()
        when z.auth.AuthView.MODE.ACCOUNT_PASSWORD then @login_password()
        when z.auth.AuthView.MODE.ACCOUNT_PHONE then @login_phone()
        when z.auth.AuthView.MODE.ACCOUNT_REGISTER then @register()
        when z.auth.AuthView.MODE.VERIFY_ACCOUNT then @verify_account()
        when z.auth.AuthView.MODE.VERIFY_PASSWORD then @verify_password()
        when z.auth.AuthView.MODE.LIMIT
          if not @device_modal or @device_modal.is_hidden() then @clicked_on_manage_devices()
        when z.auth.AuthView.MODE.HISTORY then @click_on_history_confirm()

  keydown_phone_code: (view_model, event) =>
    combo_key = if z.util.Environment.os.win then event.ctrlKey else event.metaKey
    return true if combo_key and event.keyCode is z.util.KEYCODE.V
    return false if event.altKey or event.ctrlKey or event.metaKey or event.shiftKey

    target_id = event.currentTarget.id
    target_digit = window.parseInt(target_id.substr target_id.length - 1)

    switch event.keyCode
      when z.util.KEYCODE.ARROW_LEFT, z.util.KEYCODE.ARROW_UP
        focus_digit = target_digit - 1
        $("#wire-verify-code-digit-#{Math.max 1, focus_digit}").focus()
      when z.util.KEYCODE.ARROW_DOWN, z.util.KEYCODE.ARROW_RIGHT
        focus_digit = target_digit + 1
        $("#wire-verify-code-digit-#{Math.min 6, focus_digit}").focus()
      when z.util.KEYCODE.BACKSPACE, z.util.KEYCODE.DELETE
        if event.currentTarget.value is ''
          focus_digit = target_digit - 1
          $("#wire-verify-code-digit-#{Math.max 1, focus_digit}").focus()
        return true
      else
        char = String.fromCharCode(event.keyCode).match(/\d+/g) or String.fromCharCode(event.keyCode - 48).match /\d+/g
        if char
          @code_digits()[target_digit - 1] char
          focus_digit = target_digit + 1
          $("#wire-verify-code-digit-#{Math.min 6, focus_digit}").focus()

  input_phone_code: (view_model, event) =>
    target_id = event.currentTarget.id
    target_digit = window.parseInt(target_id.substr target_id.length - 1)
    array_digit = target_digit - 1
    target_value = event.currentTarget.value
    input_value = target_value.match(/\d+/g)?.join ''

    if input_value
      focus_digit = target_digit + input_value.length
      $("#wire-phone-code-digit-#{Math.min 6, focus_digit}").focus()
      digits = input_value.substr(0, 6 - array_digit).split ''
      target_value = digits[0]
      @code_digits()[array_digit + i] digit for digit, i in digits
    else
      @code_digits()[array_digit] null

  clicked_on_manage_devices: =>
    @device_modal ?= new zeta.webapp.module.Modal '#modal-limit'
    if @device_modal.is_hidden()
      @client_repository.get_clients_for_self()
    @device_modal.toggle()

  close_model_manage_devices: => @device_modal.toggle()

  click_on_remove_device_submit: (password, device) =>
    @client_repository.delete_client device.id, password
    .then =>
      return @_register_client()
    .then =>
      @device_modal.toggle()
    .catch (error) =>
      @remove_form_error true
      @logger.error "Unable to replace device: #{error?.message}", error

  click_on_history_confirm: => @_redirect_to_app()


  ###############################################################################
  # Callbacks
  ###############################################################################

  _on_register_error: (error) =>
    @pending_server_request false
    switch error.label
      when z.service.BackendClientError::LABEL.BLACKLISTED_EMAIL, z.service.BackendClientError::LABEL.UNAUTHORIZED
        @_add_error z.string.auth_error_email_forbidden, z.auth.AuthView.TYPE.EMAIL
      when z.service.BackendClientError::LABEL.KEY_EXISTS
        payload = @_create_payload z.auth.AuthView.MODE.ACCOUNT_PASSWORD
        @auth.repository.login payload, @persist()
        .then =>
          amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ACCOUNT.LOGGED_IN, {context: z.auth.AuthView.MODE.ACCOUNT_REGISTER, remember_me: @persist()}
          @_authentication_successful()
        .catch =>
          @_add_error z.string.auth_error_email_exists, z.auth.AuthView.TYPE.EMAIL
          @_has_errors()
        return
      when z.service.BackendClientError::LABEL.MISSING_IDENTITY
        @_add_error z.string.auth_error_email_missing, z.auth.AuthView.TYPE.EMAIL

    if @_has_errors()
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.REGISTRATION.ENTERED_CREDENTIALS, {outcome: 'fail', reason: error.label}
      return

    @get_wire false
    if navigator.onLine
      @_set_hash z.auth.AuthView.MODE.POSTED_RETRY
    else
      @_set_hash z.auth.AuthView.MODE.POSTED_OFFLINE

  _on_resend_error: (error) =>
    @pending_server_request false
    $('.icon-spinner').fadeOut()
    window.setTimeout =>
      $('.icon-error').fadeIn()
      @_on_register_error error
      @disabled_by_animation false
    , TIMEOUT.SHORT

  _on_resend_success: =>
    @pending_server_request false
    $('.icon-spinner').fadeOut()
    window.setTimeout =>
      $('.icon-check').fadeIn()
      @posted_mode z.auth.AuthView.MODE.POSTED_RESEND if @posted_mode() is z.auth.AuthView.MODE.POSTED_RETRY
    , TIMEOUT.SHORT
    window.setTimeout =>
      $('.icon-check').fadeOut()
      $('.icon-envelope').fadeIn()
      @disabled_by_animation false
    , TIMEOUT.LONG

  _wait_for_activate: =>
    @logger.info 'Opened WebSocket connection to wait for account activation'
    @web_socket_service.connect (notification) =>
      event = notification.payload[0]
      @logger.info "»» Event: '#{event.type}'", {event_object: event, event_json: JSON.stringify event}
      if event.type is z.event.Backend.USER.ACTIVATE
        @_account_verified()

  _wait_for_update: =>
    @logger.info 'Opened WebSocket connection to wait for user update'
    @web_socket_service.connect (notification) =>
      event = notification.payload[0]
      @logger.info "»» Event: '#{event.type}'", {event_object: event, event_json: JSON.stringify event}
      if event.type is z.event.Backend.USER.UPDATE and event.user.email
        @_account_verified false


  ###############################################################################
  # Views and Navigation
  ###############################################################################

  _show_account_login: ->
    switch_params =
      section: z.auth.AuthView.SECTION.ACCOUNT
      mode: z.auth.AuthView.MODE.ACCOUNT_LOGIN
      focus: 'wire-login-username'
    @switch_ui switch_params
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ACCOUNT.OPENED_LOGIN, context: @visible_method()

  _show_account_password: ->
    switch_params =
      section: z.auth.AuthView.SECTION.ACCOUNT
      mode: z.auth.AuthView.MODE.ACCOUNT_LOGIN
      method: z.auth.AuthView.MODE.ACCOUNT_PASSWORD
      focus: 'wire-login-username'
    @switch_ui switch_params
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ACCOUNT.OPENED_LOGIN, context: z.auth.AuthView.TYPE.EMAIL

  _show_account_phone: ->
    switch_params =
      section: z.auth.AuthView.SECTION.ACCOUNT
      mode: z.auth.AuthView.MODE.ACCOUNT_LOGIN
      method: z.auth.AuthView.MODE.ACCOUNT_PHONE
      focus: 'wire-login-phone'
    @switch_ui switch_params
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ACCOUNT.OPENED_LOGIN, context: z.auth.AuthView.TYPE.PHONE

  _show_account_register: (focus = 'wire-register-name') ->
    switch_params =
      section: z.auth.AuthView.SECTION.ACCOUNT
      mode: z.auth.AuthView.MODE.ACCOUNT_REGISTER
      focus: focus
    @switch_ui switch_params
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.REGISTRATION.OPENED_EMAIL_SIGN_UP, context: @registration_context

  _show_history: ->
    switch_params =
      section: z.auth.AuthView.SECTION.HISTORY
      mode: z.auth.AuthView.MODE.HISTORY
    @switch_ui switch_params

  _show_limit: ->
    switch_params =
      section: z.auth.AuthView.SECTION.LIMIT
      mode: z.auth.AuthView.MODE.LIMIT
    @switch_ui switch_params

  _show_posted_offline: ->
    @_show_icon_error()
    switch_params =
      section: z.auth.AuthView.SECTION.POSTED
      mode: z.auth.AuthView.MODE.POSTED_OFFLINE
    @switch_ui switch_params

  _show_posted_pending: ->
    @_show_icon_envelope()
    switch_params =
      section: z.auth.AuthView.SECTION.POSTED
      mode: z.auth.AuthView.MODE.POSTED_PENDING
    @switch_ui switch_params

  _show_posted_resend: ->
    @_show_icon_envelope()
    switch_params =
      section: z.auth.AuthView.SECTION.POSTED
      mode: z.auth.AuthView.MODE.POSTED_RESEND
    @switch_ui switch_params

  _show_posted_retry: ->
    @_show_icon_error()
    switch_params =
      section: z.auth.AuthView.SECTION.POSTED
      mode: z.auth.AuthView.MODE.POSTED_RETRY
    @switch_ui switch_params

  _show_posted_verify: ->
    @_show_icon_envelope()
    switch_params =
      section: z.auth.AuthView.SECTION.POSTED
      mode: z.auth.AuthView.MODE.POSTED_VERIFY
    @switch_ui switch_params

  _show_verify_account: ->
    switch_params =
      section: z.auth.AuthView.SECTION.VERIFY
      mode: z.auth.AuthView.MODE.VERIFY_ACCOUNT
      focus: 'wire-verify-account-email'
    @switch_ui switch_params

  _show_verify_code: ->
    switch_params =
      section: z.auth.AuthView.SECTION.VERIFY
      mode: z.auth.AuthView.MODE.VERIFY_CODE
      focus: 'wire-verify-code-digit-1'
    @switch_ui switch_params
    $('#wire-phone-code-digit-1').focus()

  _show_verify_password: ->
    switch_params =
      section: z.auth.AuthView.SECTION.VERIFY
      mode: z.auth.AuthView.MODE.VERIFY_PASSWORD
      focus: 'wire-verify-password-input'
    @switch_ui switch_params


  ###############################################################################
  # Animations
  ###############################################################################

  switch_ui: (switch_params) =>
    if @show_initial_animation
      direction = z.auth.AuthView.ANIMATION_DIRECTION.VERTICAL_TOP
    else if @visible_section() is z.auth.AuthView.SECTION.ACCOUNT
      if switch_params.section isnt z.auth.AuthView.SECTION.ACCOUNT
        direction = z.auth.AuthView.ANIMATION_DIRECTION.HORIZONTAL_LEFT
    else if @visible_section() is z.auth.AuthView.SECTION.POSTED
      if switch_params.section is z.auth.AuthView.SECTION.ACCOUNT
        direction = z.auth.AuthView.ANIMATION_DIRECTION.HORIZONTAL_RIGHT
    else if @visible_section() is z.auth.AuthView.SECTION.VERIFY
      if switch_params.section is z.auth.AuthView.SECTION.ACCOUNT
        direction = z.auth.AuthView.ANIMATION_DIRECTION.HORIZONTAL_RIGHT
      else if switch_params.section is z.auth.AuthView.SECTION.POSTED
        direction = z.auth.AuthView.ANIMATION_DIRECTION.HORIZONTAL_LEFT
      else if @visible_mode() is z.auth.AuthView.MODE.VERIFY_CODE
        if switch_params.mode is z.auth.AuthView.TYPE.EMAIL
          direction = z.auth.AuthView.ANIMATION_DIRECTION.HORIZONTAL_LEFT

    if switch_params.section is z.auth.AuthView.SECTION.ACCOUNT
      @account_mode switch_params.mode
    else if switch_params.section is z.auth.AuthView.SECTION.POSTED
      @posted_mode switch_params.mode

    @_clear_animations z.auth.AuthView.TYPE.SECTION
    if switch_params.section isnt @visible_section()
      animation_params =
        type: z.auth.AuthView.TYPE.SECTION
        section: switch_params.section
        direction: direction
      @_shift_ui animation_params

    @_clear_animations z.auth.AuthView.TYPE.FORM
    if switch_params.mode isnt @visible_mode()
      animation_params =
        type: z.auth.AuthView.TYPE.FORM
        section: switch_params.section
        selector: switch_params.mode
        direction: direction
      @_shift_ui animation_params

    if not switch_params.method and not @visible_method()
      @_show_method z.auth.AuthView.MODE.ACCOUNT_PASSWORD
      @visible_method z.auth.AuthView.MODE.ACCOUNT_PASSWORD
    else if switch_params.method and @visible_method() isnt switch_params.method
      @_show_method switch_params.method
      @visible_method switch_params.method

    $("##{switch_params.focus}").focus_field() if switch_params.focus

  _show_method: (method) ->
    @_clear_errors()
    $('.selector-method').find('.button').removeClass 'is-active'
    $(".btn-login-#{method}").addClass 'is-active'
    $('.method:visible').hide()
      .css opacity: 0
    $("#login-method-#{method}").show()
      .css opacity: 1

  _shift_ui: (animation_params) =>
    direction = animation_params.direction
    old_component = $(".#{animation_params.type}:visible")
    new_component = $("##{animation_params.type}-#{animation_params.section}")
    if animation_params.selector
      new_component = $("##{animation_params.type}-#{animation_params.section}-#{animation_params.selector}")
    new_component.show()

    _change_visible = =>
      switch animation_params.type
        when z.auth.AuthView.TYPE.FORM then @visible_mode animation_params.selector
        when z.auth.AuthView.TYPE.SECTION then @visible_section animation_params.section

    if not animation_params.direction
      old_component.css
        display: ''
        opacity: ''
      new_component.css opacity: 1
      _change_visible()
    else
      @disabled_by_animation true

      window.requestAnimationFrame =>
        animation_promises = []

        if old_component.length
          animation_promises.push new Promise (resolve) ->
            $(old_component[0])
              .addClass "outgoing-#{animation_params.direction}"
              .one z.util.alias.animationend, ->
                resolve()
                $(@).css
                  display: ''
                  opacity: ''

        if new_component.length
          animation_promises.push new Promise (resolve) ->
            new_component
              .addClass "incoming-#{animation_params.direction}"
              .one z.util.alias.animationend, ->
                resolve()
                $(@).css opacity: 1

        Promise.all animation_promises
        .then =>
          _change_visible()
          @disabled_by_animation false

  _clear_animations: (type = z.auth.AuthView.TYPE.FORM) ->
    $(".#{type}")
      .off z.util.alias.animationend
      .removeClass (index, css) -> (css.match(/\boutgoing-\S+/g) or []).join ' '
      .removeClass (index, css) -> (css.match(/\bincoming-\S+/g) or []).join ' '

  _fade_in_icon_spinner: =>
    @disabled_by_animation true
    $('.icon-envelope').fadeOut()
    $('.icon-error').fadeOut()
    $('.icon-spinner').fadeIn()

  _show_icon_envelope: ->
    $('.icon-error').hide()
    $('.icon-envelope').show()

  _show_icon_error: ->
    $('.icon-envelope').hide()
    $('.icon-error').show()


  ###############################################################################
  # URL changes
  ###############################################################################

  ###
  Set location hash
  @private
  @param hash [String] Hash value
  ###
  _set_hash: (hash = '') ->
    window.location.hash = hash

  ###
  Get location hash
  @private
  @return [String] Hash value
  ###
  _get_hash: -> return window.location.hash.substr 1

  ###
  No hash value
  @private
  @return [Boolean] No location hash value
  ###
  _has_no_hash: -> return window.location.hash.length is 0

  ###
  Navigation on hash change
  @private
  ###
  _on_hash_change: =>
    @_clear_errors()
    switch @_get_hash()
      when z.auth.AuthView.MODE.ACCOUNT_LOGIN then @_show_account_login()
      when z.auth.AuthView.MODE.ACCOUNT_PASSWORD then @_show_account_password()
      when z.auth.AuthView.MODE.ACCOUNT_PHONE then @_show_account_phone()
      when z.auth.AuthView.MODE.HISTORY then @_show_history()
      when z.auth.AuthView.MODE.LIMIT then @_show_limit()
      when z.auth.AuthView.MODE.POSTED then @_show_posted_resend()
      when z.auth.AuthView.MODE.POSTED_OFFLINE then @_show_posted_offline()
      when z.auth.AuthView.MODE.POSTED_PENDING then @_show_posted_pending()
      when z.auth.AuthView.MODE.POSTED_RETRY then @_show_posted_retry()
      when z.auth.AuthView.MODE.POSTED_VERIFY then @_show_posted_verify()
      when z.auth.AuthView.MODE.VERIFY_ACCOUNT then @_show_verify_account()
      when z.auth.AuthView.MODE.VERIFY_CODE then @_show_verify_code()
      when z.auth.AuthView.MODE.VERIFY_PASSWORD then @_show_verify_password()
      else @_show_account_register()


  ###############################################################################
  # Validation errors
  ###############################################################################

  ###
  Add a validation error.

  @private
  @param string_identifier [String] Identifier of error message
  @param types [Array<String> | String] Input type(s) of validation error
  ###
  _add_error: (string_identifier, types) ->
    error =  new z.auth.ValidationError types or [], string_identifier
    @validation_errors.push error
    for type in error.types
      switch type
        when z.auth.AuthView.TYPE.CODE then @failed_validation_code true
        when z.auth.AuthView.TYPE.EMAIL then @failed_validation_email true
        when z.auth.AuthView.TYPE.NAME then @failed_validation_name true
        when z.auth.AuthView.TYPE.PASSWORD then @failed_validation_password true
        when z.auth.AuthView.TYPE.PHONE then @failed_validation_phone true
        when z.auth.AuthView.TYPE.TERMS then @failed_validation_terms true

  ###
  Removes all validation errors.
  @private
  ###
  _clear_errors: ->
    @failed_validation_code false
    @failed_validation_email false
    @failed_validation_name false
    @failed_validation_password false
    @failed_validation_phone false
    @failed_validation_terms false
    @validation_errors []

  ###
  Get the validation error by inout type.
  @param type [z.auth.AuthView.TYPE] Input type to get error for
  @return [z.auth.ValidationError] Validation Error
  ###
  _get_error_by_type: (type) =>
    return ko.utils.arrayFirst @validation_errors(), (error) ->
      type in error.types

  ###
  Check whether a form has errors and play the alert sound.
  @private
  @return [Boolean] Does the form have an error
  ###
  _has_errors: ->
    has_error = false
    if @validation_errors().length > 0
      amplify.publish z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.ALERT
      has_error = true
    return has_error

  ###
  Remove a validation error.
  @private
  @param type [String] Input type of validation error
  ###
  _remove_error: (type) ->
    @validation_errors.remove @_get_error_by_type type
    switch type
      when z.auth.AuthView.TYPE.CODE then @failed_validation_code false
      when z.auth.AuthView.TYPE.EMAIL then @failed_validation_email false
      when z.auth.AuthView.TYPE.NAME then @failed_validation_name false
      when z.auth.AuthView.TYPE.PASSWORD then @failed_validation_password false
      when z.auth.AuthView.TYPE.PHONE then @failed_validation_phone false
      when z.auth.AuthView.TYPE.TERMS then @failed_validation_terms false

  ###
  Validate code input.
  @private
  @return [Boolean] Phone code is long enough
  ###
  _validate_code: ->
    return @code().length >= 6

  ###
  Validate email input.
  @private
  ###
  _validate_email: ->
    username = @username().trim().toLowerCase()

    if not username.length
      @_add_error z.string.auth_error_email_missing, z.auth.AuthView.TYPE.EMAIL
    else if not z.util.is_valid_email username
      @_add_error z.string.auth_error_email_malformed, z.auth.AuthView.TYPE.EMAIL

  ###
  Validate the user input.

  @private
  @param mode [z.auth.AuthView.MODE] View state of the authentication page
  @return [Boolean] Does the user input have validation errors
  ###
  _validate_input: (mode) ->
    @_clear_errors()

    @_validate_name() if mode is z.auth.AuthView.MODE.ACCOUNT_REGISTER

    email_modes = [
      z.auth.AuthView.MODE.ACCOUNT_REGISTER
      z.auth.AuthView.MODE.VERIFY_ACCOUNT
    ]
    @_validate_email() if mode in email_modes

    password_modes = [
      z.auth.AuthView.MODE.ACCOUNT_PASSWORD
      z.auth.AuthView.MODE.ACCOUNT_REGISTER
      z.auth.AuthView.MODE.VERIFY_ACCOUNT
      z.auth.AuthView.MODE.VERIFY_PASSWORD
    ]
    @_validate_password mode if mode in password_modes

    @_validate_username() if mode is z.auth.AuthView.MODE.ACCOUNT_PASSWORD

    phone_modes = [
      z.auth.AuthView.MODE.ACCOUNT_PHONE
      z.auth.AuthView.MODE.VERIFY_PASSWORD
    ]
    @_validate_phone() if mode in phone_modes

    return not @_has_errors()

  ###
  Validate name input.
  @private
  ###
  _validate_name: ->
    if @name().length < z.config.MINIMUM_USERNAME_LENGTH
      @_add_error z.string.auth_error_name_short, z.auth.AuthView.TYPE.NAME

  ###
  Validate password input.
  @private
  @param mode [z.auth.AuthView.MODE] View state of the authentication page
  ###
  _validate_password: (mode) ->
    if @password().length < z.config.MINIMUM_PASSWORD_LENGTH
      if mode is z.auth.AuthView.MODE.ACCOUNT_PASSWORD
        return @_add_error z.string.auth_error_password_wrong, z.auth.AuthView.TYPE.PASSWORD
      @_add_error z.string.auth_error_password_short, z.auth.AuthView.TYPE.PASSWORD

  ###
  Validate phone input.
  @private
  ###
  _validate_phone: ->
    unless z.util.is_valid_phone_number @phone_number_e164()
      @_add_error z.string.auth_error_phone_number_invalid, z.auth.AuthView.TYPE.PHONE

  ###
  Validate username input.
  @private
  ###
  _validate_username: ->
    username = @username().trim().toLowerCase()
    unless username.length
      return @_add_error z.string.auth_error_email_missing, z.auth.AuthView.TYPE.EMAIL

    phone = z.util.phone_number_to_e164 username, @country() or navigator.language
    if not z.util.is_valid_email(username) and not z.util.is_valid_username(username) and not z.util.is_valid_phone_number phone
      return @_add_error z.string.auth_error_email_malformed, z.auth.AuthView.TYPE.EMAIL


  ###############################################################################
  # Misc
  ###############################################################################

  ###
  Logout the user again.
  @todo: What do we actually need to delete here
  ###
  logout: =>
    @auth.repository.logout()
    .then =>
      @auth.repository.delete_access_token()
      window.location.replace '/auth'

  ###
  User account has been verified.
  @private
  @param registration [Boolean] Verification from registration
  ###
  _account_verified: (registration = true) =>
    @logger.info 'User account verified. User can now login.'
    if registration
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.REGISTRATION.SUCCEEDED, content: @registration_context
    @_authentication_successful()

  ###
  Append parameter to URL if exists.
  @param url [String] Previous URL string
  @return [String] Updated URL
  ###
  _append_existing_parameters: (url) ->
    for parameter_name in FORWARDED_URL_PARAMETERS
      url = z.util.forward_url_parameter url, parameter_name
    return url

  ###
  User successfully authenticated on the backend side
  @note Gets the client and forwards the user to the login.
  @private
  ###
  _authentication_successful: =>
    @logger.info 'Logging in'
    @_get_self_user()
    .then =>
      return @client_repository.get_valid_local_client()
    .catch (error) =>
      @logger.info "No valid local client found: #{error.message}", error
      if error.type is z.client.ClientError.TYPE.MISSING_ON_BACKEND
        @logger.info 'Local client rejected as invalid by backend. Reinitializing storage.'
        @storage_service.init @self_user().id
    .then =>
      return @cryptography_repository.init @storage_service.db
    .then =>
      if @client_repository.current_client()
        @logger.info 'Active client found. Redirecting to app...'
        @_redirect_to_app()
      else
        @logger.info 'No active client found. We need to register one...'
        @_register_client()
    .catch (error) =>
      @logger.error "Login failed: #{error?.message}", error
      @_add_error z.string.auth_error_misc
      @_has_errors()
      @_set_hash z.auth.AuthView.MODE.ACCOUNT_LOGIN

  ###
  Get and store the self user.
  @private
  @return [Promise] Self user
  ###
  _get_self_user: ->
    return new Promise (resolve, reject) =>
      @user_repository.get_me()
      .then (user_et) =>
        @self_user user_et
        @logger.info "Got self user: #{@self_user().id}"
        @pending_server_request false

        if @self_user().email()?
          @storage_service.init @self_user().id
          .then =>
            @client_repository.init @self_user()
            resolve @self_user()
          .catch (error) -> reject error
        else
          @_set_hash z.auth.AuthView.MODE.VERIFY_ACCOUNT

  ###
  Check whether the device has a local history.
  @return [Boolean] Returns true if there is at least one conversation event stored
  ###
  _has_local_history: =>
    @storage_service.get_all z.storage.StorageService.OBJECT_STORE.EVENTS
    .then (events) ->
      return events.length > 0

  ###
  Redirects to the app after successful login
  @private
  ###
  _redirect_to_app: =>
    url = '/'
    url = @_append_existing_parameters url
    window.location.replace url

  _register_client: =>
    @client_repository.register_client @password()
    .then (client_observable) =>
      @event_repository.current_client = client_observable
      @event_repository.initialize_last_notification_id client_observable().id
    .catch (error) =>
      if error.code is z.service.BackendClientError::STATUS_CODE.NOT_FOUND
        @logger.warn "Cannot set starting point on notification stream: #{error.message}", error
      else
        throw error
    .then =>
      return @client_repository.get_clients_for_self()
    .then (client_ets) =>
      @logger.info "User has '#{client_ets?.length}' registered clients", client_ets

      # Show history screen if there are already registered clients
      if client_ets?.length > 0
        @_has_local_history()
        .then (has_history) =>
          @device_reused has_history
          @_set_hash z.auth.AuthView.MODE.HISTORY
      # Make sure client entities always see the history screen
      else if @client_repository.current_client().is_temporary()
        @_set_hash z.auth.AuthView.MODE.HISTORY
      # Don't show history screen if the webapp is the first client that has been registered
      else
        @_redirect_to_app()
    .catch (error) =>
      if error.type is z.client.ClientError.TYPE.TOO_MANY_CLIENTS
        @logger.warn 'User has already registered the maximum number of clients', error
        window.location.hash = z.auth.AuthView.MODE.LIMIT
      else
        @logger.error "Failed to register a new client: #{error.message}", error

  ###
  Track app launch for Localytics
  @private
  ###
  _track_app_launch: ->
    mechanism = 'direct'
    if document.referrer.startsWith 'https://wire.com/verify/'
      mechanism = 'email_verify'
    else if document.referrer.startsWith 'https://wire.com/forgot/'
      mechanism = 'password_reset'
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.APP_LAUNCH, mechanism: mechanism

$ ->
  if $('.auth-page').length isnt 0
    wire.auth.view = new z.ViewModel.AuthViewModel 'auth-page', wire.auth

# jQuery helpers
$.fn.extend
  focus_field: ->
    @each ->
      # Timeout needed (for Chrome): http://stackoverflow.com/a/17384592/451634
      window.setTimeout =>
        $(@).focus()
      , 0
