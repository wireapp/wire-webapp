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

    @user_mapper = new z.user.UserMapper @asset_service
    user_service = new z.user.UserService @auth.client
    @user_repository = new z.user.UserRepository user_service, @asset_service

    @cryptography_service = new z.cryptography.CryptographyRepository @auth.client
    @cryptography_repository = new z.cryptography.CryptographyRepository @cryptography_service, @storage_repository
    @client_service = new z.client.ClientService @auth.client, @storage_service
    @client_repository = new z.client.ClientRepository @client_service, @cryptography_repository

    @notification_service = new z.event.NotificationService @auth.client, @storage_service
    @web_socket_service = new z.event.WebSocketService @auth.client
    @event_repository = new z.event.EventRepository @web_socket_service, @notification_service, @cryptography_repository, @user_repository

    @pending_server_request = ko.observable false
    @disabled_by_animation = ko.observable false

    @get_wire = ko.observable false
    @session_expired = ko.observable false

    @client_type = ko.observable z.client.ClientType.TEMPORARY
    @country_code = ko.observable ''
    @country = ko.observable ''
    @phone_number = ko.observable ''
    @email = ko.observable ''
    @name = ko.observable ''
    @password = ko.observable ''
    @persist = ko.observable if z.util.Environment.electron then true else false
    @persist.subscribe (is_persistent) =>
      if is_persistent then @client_type z.client.ClientType.PERMANENT else z.client.ClientType.TEMPORARY

    @self_user = ko.observable()

    # Manage devices
    @remove_form_error = ko.observable false
    @device_modal = undefined
    @permanent_devices = ko.computed =>
      client for client in @client_repository.clients() when client.type is z.client.ClientType.PERMANENT

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
    @code = ko.computed => return (digit() for digit in @code_digits()).join('').substr 0, 6
    @code.subscribe (code) =>
      @_clear_errors() if code.length is 0
      @verify_code() if code.length is 6
    @phone_number_e164 = => return "#{@country_code()}#{@phone_number()}"

    @code_interval_id = undefined

    @code_expiration_timestamp = ko.observable 0
    @code_expiration_in = ko.observable ''
    @code_expiration_timestamp.subscribe (timestamp) =>
      @code_expiration_in moment.unix(timestamp).fromNow()
      @code_interval_id = setInterval =>
        if timestamp <= z.util.get_unix_timestamp()
          clearInterval @code_interval_id
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

    @can_login_email = ko.computed =>
      return not @disabled_by_animation() and @email().length isnt 0 and @password().length isnt 0

    @can_login_phone = ko.computed =>
      return not @disabled_by_animation() and @country_code().length > 1 and @phone_number().length isnt 0

    @can_register = ko.computed =>
      return not @disabled_by_animation() and @email().length isnt 0 and @name().length isnt 0 and @password().length isnt 0

    @can_resend_code = ko.computed =>
      return not @disabled_by_animation() and @code_expiration_timestamp() < z.util.get_unix_timestamp()

    @can_resend_registration = ko.computed =>
      return not @disabled_by_animation() and @email().length isnt 0

    @can_resend_verification = ko.computed =>
      return not @disabled_by_animation() and @email().length isnt 0

    @account_retry_text = ko.computed =>
      return z.localization.Localizer.get_text
        id: z.string.auth_posted_retry
        replace: {placeholder: '%email', content: @email()}
    @account_resend_text = ko.computed =>
      return z.localization.Localizer.get_text
        id: z.string.auth_posted_resend
        replace: {placeholder: '%email', content: @email()}
    @verify_code_text = ko.computed =>
      phone_number = PhoneFormat.formatNumberForMobileDialing('', @phone_number_e164()) or @phone_number_e164()
      return z.localization.Localizer.get_text
        id: z.string.auth_verify_code_description
        replace: {placeholder: '%@number', content: phone_number}
    @verify_code_timer_text = ko.computed =>
      return z.localization.Localizer.get_text
        id: z.string.auth_verify_code_resend_timer
        replace: {placeholder: '%expiration', content: @code_expiration_in()}
    @verify_email_headline = ko.computed =>
      return z.localization.Localizer.get_text
        id: z.string.auth_verify_email_headline
        replace: {placeholder: '%name', content: @self_user()?.first_name()}

    @visible_section = ko.observable undefined
    @visible_mode = ko.observable undefined
    @visible_method = ko.observable undefined

    @account_mode = ko.observable undefined
    @account_mode_login = ko.computed =>
      login_modes = [
        z.auth.AuthView.MODE.ACCOUNT_LOGIN
        z.auth.AuthView.MODE.ACCOUNT_EMAIL
        z.auth.AuthView.MODE.ACCOUNT_PHONE
      ]
      return @account_mode() in login_modes

    @posted_mode = ko.observable undefined
    @posted_mode_offline = ko.computed =>
      return @posted_mode() is z.auth.AuthView.MODE.POSTED_OFFLINE
    @posted_mode_pending = ko.computed =>
      return @posted_mode() is z.auth.AuthView.MODE.POSTED_PENDING
    @posted_mode_resend = ko.computed =>
      return @posted_mode() is z.auth.AuthView.MODE.POSTED_RESEND
    @posted_mode_retry = ko.computed =>
      return @posted_mode() is z.auth.AuthView.MODE.POSTED_RETRY
    @posted_mode_verify = ko.computed =>
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
    if z.util.get_url_parameter z.auth.URLParameter.CONNECT
      @get_wire true
      @registration_context = z.auth.AuthView.REGISTRATION_CONTEXT.GENERIC_INVITE
    else if z.util.get_url_parameter z.auth.URLParameter.EXPIRED
      @session_expired true

    modes_to_block = [
      z.auth.AuthView.MODE.HISTORY
      z.auth.AuthView.MODE.LIMIT
      z.auth.AuthView.MODE.POSTED
      z.auth.AuthView.MODE.POSTED_PENDING
      z.auth.AuthView.MODE.POSTED_RETRY
      z.auth.AuthView.MODE.POSTED_VERIFY
      z.auth.AuthView.MODE.VERIFY_CODE
      z.auth.AuthView.MODE.VERIFY_ADD_EMAIL
    ]

    if invite = z.util.get_url_parameter z.auth.URLParameter.INVITE
      @register_from_invite invite
    else if @_has_no_hash() and z.storage.get_value z.storage.StorageKey.AUTH.SHOW_LOGIN
      @_set_hash z.auth.AuthView.MODE.ACCOUNT_LOGIN
    else if @_get_hash() in modes_to_block
      @_set_hash()
    else
      @_on_hash_change()

    $(window)
      .on 'hashchange', @_on_hash_change
      .on 'dragover drop', -> false

    $("[id^='wire-login'], [id^='wire-mail'], [id^='wire-register'], [id^='wire-phone-code']").prevent_prefill()

    # Select country based on location of user IP
    @country_code (z.util.CountryCodes.get_country_code($('[name=geoip]').attr 'country') or 1).toString()
    @changed_country_code()

    @audio_repository.init()


  ###############################################################################
  # Invitation Stuff
  ###############################################################################

  register_from_invite: (invite) =>
    @auth.repository.retrieve_invite invite
    .then (invite_info) =>
      @registration_context = z.auth.AuthView.REGISTRATION_CONTEXT.PERSONAL_INVITE
      @name invite_info.name
      if invite_info.email
        @email invite_info.email
        @prefilled_email = invite_info.email
      else
        @logger.log @logger.levels.WARN, 'Invite information does not contain an email address'
      @_set_hash z.auth.AuthView.MODE.ACCOUNT_REGISTER
      @_on_hash_change()
    .catch (error) =>
      if error.label is z.service.BackendClientError::LABEL.INVALID_INVITATION_CODE
        @logger.log @logger.levels.WARN, 'Invalid Invitation Code'
      else
        Raygun.send new Error('Invitation not found'), {invite_code: invite, error: error}
      @_on_hash_change()


  ###############################################################################
  # Form actions
  ###############################################################################

  # Register a new user account.
  register: =>
    return if @pending_server_request() or not @_validate_input z.auth.AuthView.MODE.ACCOUNT_REGISTER

    @pending_server_request true
    @persist true
    payload = @_create_payload z.auth.AuthView.MODE.ACCOUNT_REGISTER
    @auth.repository.register payload
    .then =>
      @get_wire false
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.REGISTRATION.ENTERED_CREDENTIALS,
        {outcome: 'success'}

      # Track if the user changed the pre-filled email
      if @prefilled_email is @email()
        @auth.repository.get_access_token().then @_account_verified
      else
        @_set_hash z.auth.AuthView.MODE.POSTED
        @auth.repository.get_access_token().then @_wait_for_activate
      @pending_server_request false
    .catch (error) => @_on_register_error error

  # Sign in using an email login.
  sign_in_email: =>
    return if @pending_server_request() or not @_validate_input z.auth.AuthView.MODE.ACCOUNT_EMAIL

    @pending_server_request true
    payload = @_create_payload z.auth.AuthView.MODE.ACCOUNT_EMAIL
    @auth.repository.login payload, @persist()
    .then =>
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ACCOUNT.LOGGED_IN,
        {
          context: z.auth.AuthView.MODE.ACCOUNT_EMAIL
          remember_me: @persist()
        }
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
  sign_in_phone: =>
    return if @pending_server_request() or not @_validate_input z.auth.AuthView.MODE.ACCOUNT_PHONE

    @pending_server_request true
    payload = @_create_payload z.auth.AuthView.MODE.ACCOUNT_PHONE
    @auth.repository.request_login_code payload
    .then (response) =>
      clearInterval @code_interval_id
      if response.expires_in
        @code_expiration_timestamp z.util.get_unix_timestamp() + response.expires_in
      else if not response.label
        @code_expiration_timestamp z.util.get_unix_timestamp() + z.config.LOGIN_CODE_EXPIRATION
      @_set_hash z.auth.AuthView.MODE.VERIFY_CODE
      @pending_server_request false
      event = new z.tracking.event.PhoneVerification 'signIn', 'succeeded', undefined
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, event.name, event.attributes
    .catch (error) =>
      @pending_server_request false
      if navigator.onLine
        switch error.label
          when z.service.BackendClientError::LABEL.PENDING_LOGIN
            return _on_code_request_success error
          when z.service.BackendClientError::LABEL.PASSWORD_EXISTS
            @_add_error z.string.auth_error_misc
          when z.service.BackendClientError::LABEL.INVALID_PHONE
            @_add_error z.string.auth_error_phone_number_unknown, z.auth.AuthView.TYPE.PHONE
          else
            @_add_error z.string.auth_error_misc
      else
        @_add_error z.string.auth_error_offline
      @_has_errors()
      event = new z.tracking.event.PhoneVerification 'signIn', 'error', error?.label
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, event.name, event.attributes

  # Verify the security code on phone number login.
  verify_code: =>
    return if @pending_server_request() or not @_validate_code()

    @pending_server_request true
    payload = @_create_payload z.auth.AuthView.MODE.VERIFY_CODE
    @auth.repository.login payload, @persist()
    .then =>
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ACCOUNT.LOGGED_IN,
        {
          context: z.auth.AuthView.MODE.ACCOUNT_EMAIL
          remember_me: @persist()
        }
      event = new z.tracking.event.PhoneVerification 'postLogin', 'succeeded', undefined
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, event.name, event.attributes
      @_authentication_successful()
    .catch (error) =>
      if @validation_errors().length is 0
        @_add_error z.string.auth_error_code, z.auth.AuthView.TYPE.CODE
        @_has_errors()
      @pending_server_request false
      event = new z.tracking.event.PhoneVerification 'postLogin', 'error', error.label
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, event.name, event.attributes

  # Add an email on phone number login.
  verify_add_email: =>
    return if @pending_server_request() or not @_validate_input z.auth.AuthView.MODE.VERIFY_ADD_EMAIL

    @pending_server_request true
    @user_service.change_own_password @password()
    .catch (error) =>
      @logger.log @logger.levels.WARN, 'Could not change user password', error
      return error
    .then (error) =>
      if not error? or error.code is z.service.BackendClientError::STATUS_CODE.FORBIDDEN
        @user_service.change_own_email @email()
      else
        @pending_server_request false
        return @_has_errors()
    .then =>
      @pending_server_request false
      @_wait_for_update()
      @_set_hash z.auth.AuthView.MODE.POSTED_VERIFY
    .catch (error) =>
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

  ###
  Create the backend call payload.

  @param mode [z.auth.AuthView.MODE] View state of the authentication page
  @private
  ###
  _create_payload: (mode) =>
    email = @email().trim().toLowerCase()

    switch mode
      when z.auth.AuthView.MODE.ACCOUNT_REGISTER
        payload =
          email: email
          invitation_code: z.util.get_url_parameter z.auth.URLParameter.INVITE
          label: @client_repository.construct_cookie_label email, @client_type()
          label_key: @client_repository.construct_cookie_label_key email, @client_type()
          locale: moment.locale()
          name: @name().trim()
          password: @password()
        return payload
      when z.auth.AuthView.MODE.ACCOUNT_EMAIL
        payload =
          email: email
          label: @client_repository.construct_cookie_label email, @client_type()
          label_key: @client_repository.construct_cookie_label_key email, @client_type()
          password: @password()
        return payload
      when z.auth.AuthView.MODE.ACCOUNT_PHONE then return {} =
        force: false
        phone: @phone_number_e164()
      when z.auth.AuthView.MODE.POSTED_RESEND then return {} =
        email: email
      when z.auth.AuthView.MODE.VERIFY_CODE
        payload =
          code: @code()
          label: @client_repository.construct_cookie_label @phone_number_e164(), @client_type()
          label_key: @client_repository.construct_cookie_label_key @phone_number_e164(), @client_type()
          phone: @phone_number_e164()
        return payload

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
    if @phone_number().length is 0 and input_value.length > 0
      @_add_error z.string.auth_error_phone_number_invalid, z.auth.AuthView.TYPE.PHONE

  clear_error: (mode, event) => @_remove_error event?.currentTarget.classList[1] or mode

  clear_error_password: (view_model, event) ->
    return if event.keyCode is z.util.KEYCODE.ENTER
    @failed_validation_password false
    if event.currentTarget.value.length is 0 or event.currentTarget.value.length >= 8
      @_remove_error event.currentTarget.classList[1]

  clicked_on_change_email: => @_set_hash z.auth.AuthView.MODE.ACCOUNT_REGISTER

  clicked_on_change_phone: => @_set_hash z.auth.AuthView.MODE.ACCOUNT_PHONE

  clicked_on_login: =>
    @_set_hash z.auth.AuthView.MODE.ACCOUNT_LOGIN
    $('#wire-login-phone').focus_field() if @visible_method() is z.auth.AuthView.MODE.ACCOUNT_PHONE

  clicked_on_login_email: => @_set_hash z.auth.AuthView.MODE.ACCOUNT_EMAIL

  clicked_on_login_phone: => @_set_hash z.auth.AuthView.MODE.ACCOUNT_PHONE

  clicked_on_password: ->
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.PASSWORD_RESET, value: 'fromSignIn'
    (z.util.safely_open_url_in_tab z.localization.Localizer.get_text z.string.url_password_reset)?.focus()

  clicked_on_register: => @_set_hash z.auth.AuthView.MODE.ACCOUNT_REGISTER

  clicked_on_resend_code: =>
    return if not @can_resend_code()
    @sign_in_phone()

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
      @user_service.change_own_email @email()
      .then (response) => @_on_resend_success response
      .catch =>
        @pending_server_request false
        $('.icon-spinner').fadeOut()
        setTimeout =>
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
    (z.util.safely_open_url_in_tab z.localization.Localizer.get_text z.string.url_terms_of_use)?.focus()

  clicked_on_verify_later: => @_authentication_successful()

  clicked_on_wire_link: ->
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.NAVIGATION.OPENED_WIRE_WEBSITE
    (z.util.safely_open_url_in_tab z.localization.Localizer.get_text z.string.url_wire)?.focus()

  keydown_phone_code: (view_model, event) =>
    combo_key = if z.util.Environment.os.win then event.ctrlKey else event.metaKey
    return true if combo_key and event.keyCode is z.util.KEYCODE.V
    return false if event.altKey or event.ctrlKey or event.metaKey or event.shiftKey

    target_id = event.currentTarget.id
    target_digit = window.parseInt(target_id.substr target_id.length - 1)

    switch event.keyCode
      when z.util.KEYCODE.ARROW_LEFT, z.util.KEYCODE.ARROW_UP
        focus_digit = target_digit - 1
        $("#wire-phone-code-digit-#{Math.max 1, focus_digit}").focus()
      when z.util.KEYCODE.ARROW_DOWN, z.util.KEYCODE.ARROW_RIGHT
        focus_digit = target_digit + 1
        $("#wire-phone-code-digit-#{Math.min 6, focus_digit}").focus()
      when z.util.KEYCODE.BACKSPACE, z.util.KEYCODE.DELETE
        if event.currentTarget.value is ''
          focus_digit = target_digit - 1
          $("#wire-phone-code-digit-#{Math.max 1, focus_digit}").focus()
        return true
      else
        char = String.fromCharCode(event.keyCode).match(/\d+/g) or String.fromCharCode(event.keyCode - 48).match /\d+/g
        if char
          @code_digits()[target_digit - 1] char
          focus_digit = target_digit + 1
          $("#wire-phone-code-digit-#{Math.min 6, focus_digit}").focus()

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
      @client_repository.get_clients_for_self false
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
      @logger.log @logger.levels.ERROR, "Unable to replace device: #{error?.message}", error

  click_on_history_confirm: => @_redirect_to_app()


  ###############################################################################
  # Callbacks
  ###############################################################################

  _on_register_error: (error) =>
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.REGISTRATION.ENTERED_CREDENTIALS,
      {outcome: 'fail'}

    @pending_server_request false
    switch error.label
      when z.service.BackendClientError::LABEL.BLACKLISTED_EMAIL, z.service.BackendClientError::LABEL.UNAUTHORIZED
        @_add_error z.string.auth_error_email_forbidden, z.auth.AuthView.TYPE.EMAIL
      when z.service.BackendClientError::LABEL.KEY_EXISTS
        payload = @_create_payload z.auth.AuthView.MODE.ACCOUNT_EMAIL
        @auth.repository.login payload, @persist()
        .then =>
          amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ACCOUNT.LOGGED_IN,
            {
              context: z.auth.AuthView.MODE.ACCOUNT_REGISTER
              remember_me: @persist()
            }
          @_authentication_successful()
        .catch =>
          @_add_error z.string.auth_error_email_exists, z.auth.AuthView.TYPE.EMAIL
          @_has_errors()
        return
      when z.service.BackendClientError::LABEL.MISSING_IDENTITY
        @_add_error z.string.auth_error_email_missing, z.auth.AuthView.TYPE.EMAIL

    if @_has_errors()
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.REGISTRATION.ENTERED_CREDENTIALS,
        {outcome: 'fail', reason: error.label}
      return

    @get_wire false
    if navigator.onLine
      @_set_hash z.auth.AuthView.MODE.POSTED_RETRY
    else
      @_set_hash z.auth.AuthView.MODE.POSTED_OFFLINE

  _on_resend_error: (error) =>
    @pending_server_request false
    $('.icon-spinner').fadeOut()
    setTimeout =>
      $('.icon-error').fadeIn()
      @_on_register_error error
      @disabled_by_animation false
    , TIMEOUT.SHORT

  _on_resend_success: =>
    @pending_server_request false
    $('.icon-spinner').fadeOut()
    setTimeout =>
      $('.icon-check').fadeIn()
      @posted_mode z.auth.AuthView.MODE.POSTED_RESEND if @posted_mode() is z.auth.AuthView.MODE.POSTED_RETRY
    , TIMEOUT.SHORT
    setTimeout =>
      $('.icon-check').fadeOut()
      $('.icon-envelope').fadeIn()
      @disabled_by_animation false
    , TIMEOUT.LONG

  _wait_for_activate: =>
    @logger.log 'Opened WebSocket connection to wait for account activation'
    @web_socket_service.connect (notification) =>
      event = notification.payload[0]
      @logger.log "»» Event: '#{event.type}'", {event_object: event, event_json: JSON.stringify event}
      if event.type is z.event.Backend.USER.ACTIVATE
        @_account_verified()

  _wait_for_update: =>
    @logger.log 'Opened WebSocket connection to wait for user update'
    @web_socket_service.connect (notification) =>
      event = notification.payload[0]
      @logger.log "»» Event: '#{event.type}'", {event_object: event, event_json: JSON.stringify event}
      if event.type is z.event.Backend.USER.UPDATE and event.user.email
        @_account_verified false


  ###############################################################################
  # Views and Navigation
  ###############################################################################

  show_account_register: (focus = 'wire-register-name') ->
    switch_params =
      section: z.auth.AuthView.SECTION.ACCOUNT
      mode: z.auth.AuthView.MODE.ACCOUNT_REGISTER
      focus: focus
    @switch_ui switch_params
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.REGISTRATION.OPENED_EMAIL_SIGN_UP,
      {context: @registration_context}

  show_account_email: ->
    switch_params =
      section: z.auth.AuthView.SECTION.ACCOUNT
      mode: z.auth.AuthView.MODE.ACCOUNT_LOGIN
      method: z.auth.AuthView.MODE.ACCOUNT_EMAIL
      focus: 'wire-login-email'
    @switch_ui switch_params
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ACCOUNT.OPENED_LOGIN,
      {context: z.auth.AuthView.MODE.ACCOUNT_EMAIL}

  show_account_login: =>
    switch_params =
      section: z.auth.AuthView.SECTION.ACCOUNT
      mode: z.auth.AuthView.MODE.ACCOUNT_LOGIN
      focus: 'wire-login-email'
    @switch_ui switch_params
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ACCOUNT.OPENED_LOGIN,
      {context: @visible_method()}

  show_account_phone: ->
    switch_params =
      section: z.auth.AuthView.SECTION.ACCOUNT
      mode: z.auth.AuthView.MODE.ACCOUNT_LOGIN
      method: z.auth.AuthView.MODE.ACCOUNT_PHONE
      focus: 'wire-login-phone'
    @switch_ui switch_params
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ACCOUNT.OPENED_LOGIN,
      {context: z.auth.AuthView.MODE.ACCOUNT_PHONE}

  show_verify_code: =>
    if not z.util.is_valid_phone_number @phone_number_e164()
      return @_set_hash z.auth.AuthView.MODE.ACCOUNT_PHONE
    switch_params =
      section: z.auth.AuthView.SECTION.VERIFY
      mode: z.auth.AuthView.MODE.VERIFY_CODE
      focus: 'wire-phone-code-digit-1'
    @switch_ui switch_params
    $('#wire-phone-code-digit-1').focus()

  show_verify_mail: ->
    switch_params =
      section: z.auth.AuthView.SECTION.VERIFY
      mode: z.auth.AuthView.TYPE.EMAIL
      focus: 'wire-mail-email'
    @switch_ui switch_params

  show_posted_offline: ->
    @_show_icon_error()
    switch_params =
      section: z.auth.AuthView.SECTION.POSTED
      mode: z.auth.AuthView.MODE.POSTED_OFFLINE
    @switch_ui switch_params

  show_posted_pending: ->
    @_show_icon_envelope()
    switch_params =
      section: z.auth.AuthView.SECTION.POSTED
      mode: z.auth.AuthView.MODE.POSTED_PENDING
    @switch_ui switch_params

  show_posted_resend: ->
    @_show_icon_envelope()
    switch_params =
      section: z.auth.AuthView.SECTION.POSTED
      mode: z.auth.AuthView.MODE.POSTED_RESEND
    @switch_ui switch_params

  show_posted_retry: ->
    @_show_icon_error()
    switch_params =
      section: z.auth.AuthView.SECTION.POSTED
      mode: z.auth.AuthView.MODE.POSTED_RETRY
    @switch_ui switch_params

  show_posted_verify: ->
    @_show_icon_envelope()
    switch_params =
      section: z.auth.AuthView.SECTION.POSTED
      mode: z.auth.AuthView.MODE.POSTED_VERIFY
    @switch_ui switch_params

  show_limit: ->
    switch_params =
      section: z.auth.AuthView.SECTION.LIMIT
      mode: z.auth.AuthView.MODE.LIMIT
    @switch_ui switch_params

  show_history: ->
    switch_params =
      section: z.auth.AuthView.SECTION.HISTORY
      mode: z.auth.AuthView.MODE.HISTORY
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
      @_show_method z.auth.AuthView.MODE.ACCOUNT_EMAIL
      @visible_method z.auth.AuthView.MODE.ACCOUNT_EMAIL
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
    else if old_component.length is 0
      @disabled_by_animation true

      requestAnimFrame =>
        new_anim = $.Deferred()

        new_component
          .addClass "incoming-#{animation_params.direction}"
          .one z.util.alias.animationend, ->
            new_anim.resolve()
            $(@).css opacity: 1

        $.when(new_anim).then =>
          _change_visible()
          @disabled_by_animation false
          @show_initial_animation = false
    else
      @disabled_by_animation true

      requestAnimFrame =>
        old_anim = $.Deferred()
        new_anim = $.Deferred()

        $(old_component[0])
          .addClass "outgoing-#{animation_params.direction}"
          .one z.util.alias.animationend, ->
            old_anim.resolve()
            $(@).css
              display: ''
              opacity: ''
        new_component
          .addClass "incoming-#{animation_params.direction}"
          .one z.util.alias.animationend, ->
            new_anim.resolve()
            $(@).css opacity: 1

        $.when(old_anim, new_anim).then =>
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
  _set_hash: (hash = '') -> window.location.hash = hash

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
      when z.auth.AuthView.MODE.ACCOUNT_EMAIL then @show_account_email()
      when z.auth.AuthView.MODE.ACCOUNT_LOGIN then @show_account_login()
      when z.auth.AuthView.MODE.VERIFY_CODE then @show_verify_code()
      when z.auth.AuthView.MODE.VERIFY_ADD_EMAIL then @show_verify_mail()
      when z.auth.AuthView.MODE.POSTED then @show_posted_resend()
      when z.auth.AuthView.MODE.POSTED_OFFLINE then @show_posted_offline()
      when z.auth.AuthView.MODE.POSTED_PENDING then @show_posted_pending()
      when z.auth.AuthView.MODE.POSTED_RETRY then @show_posted_retry()
      when z.auth.AuthView.MODE.POSTED_VERIFY then @show_posted_verify()
      when z.auth.AuthView.MODE.LIMIT then @show_limit()
      when z.auth.AuthView.MODE.HISTORY then @show_history()
      else @show_account_register()


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
    if @email().length is 0
      @_add_error z.string.auth_error_email_missing, z.auth.AuthView.TYPE.EMAIL
    else if not z.util.is_valid_email @email()
      @_add_error z.string.auth_error_email_malformed, z.auth.AuthView.TYPE.EMAIL

  ###
  Validate the user input.

  @private
  @param mode [z.auth.AuthView.MODE] View state of the authentication page
  @return [Boolean] Does the user input have validation errors
  ###
  _validate_input: (mode) ->
    @_clear_errors()

    if mode is z.auth.AuthView.MODE.ACCOUNT_REGISTER
      @_validate_name()

    email_and_password_modes = [
      z.auth.AuthView.MODE.ACCOUNT_EMAIL
      z.auth.AuthView.MODE.ACCOUNT_REGISTER
      z.auth.AuthView.MODE.VERIFY_ADD_EMAIL
    ]
    if mode in email_and_password_modes
      @_validate_email()
      @_validate_password mode

    if mode is z.auth.AuthView.MODE.ACCOUNT_PHONE
      @_validate_phone()

    if mode is z.auth.AuthView.MODE.ACCOUNT_REGISTER
      @_validate_terms_of_use()

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
      if mode is z.auth.AuthView.MODE.ACCOUNT_EMAIL
        return @_add_error z.string.auth_error_password_wrong, z.auth.AuthView.TYPE.PASSWORD
      @_add_error z.string.auth_error_password_short, z.auth.AuthView.TYPE.PASSWORD

  ###
  Validate phone input.
  @private
  ###
  _validate_phone: ->
    if not z.util.is_valid_phone_number(@phone_number_e164()) and z.util.Environment.backend.current is 'production'
      @_add_error z.string.auth_error_phone_number_invalid, z.auth.AuthView.TYPE.PHONE

  ###
  Validate terms of use.
  @private
  ###
  _validate_terms_of_use: ->
    if not @accepted_terms_of_use()
      @_add_error z.string.auth_error_terms_of_use, z.auth.AuthView.TYPE.TERMS


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
    @logger.log @logger.levels.INFO, 'User account verified. User can now login.'
    if registration
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.REGISTRATION.SUCCEEDED,
        {content: @registration_context}
    @_authentication_successful()

  ###
  User successfully authenticated on the backend side
  @note Gets the client and forwards the user to the login.
  @private
  ###
  _authentication_successful: =>
    @logger.log @logger.levels.INFO, 'Logging in'
    @_get_self_user()
    .then =>
      return @client_repository.get_valid_local_client()
    .catch (error) =>
      @logger.log @logger.levels.INFO, "No valid local client found: #{error.message}", error
      if error.type is z.client.ClientError::TYPE.MISSING_ON_BACKEND
        @logger.log @logger.levels.INFO, 'Local client rejected as invalid by backend. Reinitializing storage.'
        @storage_service.init @self_user().id
    .then =>
      return @storage_repository.init true
    .then =>
      return @cryptography_repository.init()
    .then =>
      if @client_repository.current_client()
        @logger.log @logger.levels.INFO, 'Active client found. Redirecting to app...'
        @_redirect_to_app()
      else
        @logger.log @logger.levels.INFO, 'No active client found. We need to register one...'
        @_register_client()
    .catch (error) =>
      @logger.log @logger.levels.ERROR, "Login failed: #{error?.message}", error
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
        @logger.log @logger.levels.INFO, "Got self user: #{@self_user().id}"
        @pending_server_request false

        if @self_user().email()?
          @storage_service.init @self_user().id
          .then =>
            @client_repository.init @self_user()
            resolve @self_user()
          .catch (error) -> reject error
        else
          @_set_hash z.auth.AuthView.MODE.VERIFY_ADD_EMAIL

  ###
  Redirects to the app after successful login
  @private
  ###
  _redirect_to_app: =>
    url = '/'
    url = "/#{@auth.settings.parameter}" if @auth.settings.parameter?
    connect_token = z.util.get_url_parameter z.auth.URLParameter.CONNECT
    url = z.util.append_url_parameter url, "#{z.auth.URLParameter.CONNECT}=#{connect_token}" if connect_token
    window.location.replace url

  _register_client: =>
    @client_repository.register_client @password()
    .then (client_observable) =>
      @event_repository.current_client = client_observable
      @event_repository.get_last_notification_id()
    .then (last_notification_id) =>
      @event_repository.last_notification_id last_notification_id
      @logger.log @logger.levels.INFO, "Set starting point on notification stream to '#{last_notification_id}'"
    .catch (error) =>
      if error.code is z.service.BackendClientError::STATUS_CODE.NOT_FOUND
        @logger.log @logger.levels.WARN,
          "Cannot set starting point on notification stream: #{error.message}", error
      else
        throw error
    .then =>
      return @client_repository.get_clients_for_self()
    .then (client_ets) =>
      @logger.log @logger.levels.INFO, "User has '#{client_ets?.length}' registered clients", client_ets

      # Show history screen if there are already registered clients
      if client_ets?.length > 0
        @_set_hash z.auth.AuthView.MODE.HISTORY
      # Make sure client entities always see the history screen
      else if @client_repository.current_client().is_temporary()
        @_set_hash z.auth.AuthView.MODE.HISTORY
      # Don't show history screen if the webapp is the first client that has been registered
      else
        @_redirect_to_app()
    .catch (error) =>
      if error.type is z.client.ClientError::TYPE.TOO_MANY_CLIENTS
        @logger.log @logger.levels.WARN, 'User has already registered the maximum number of clients', error
        window.location.hash = z.auth.AuthView.MODE.LIMIT
      else
        @logger.log @logger.levels.ERROR, "Failed to register a new client: #{error.message}", error

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
      setTimeout =>
        $(@).focus()
      , 0

  # FIX to prevent unwanted auto form fill on Chrome
  prevent_prefill: ->
    if z.util.Environment.browser.chrome or z.util.Environment.browser.opera
      @each ->
        $(@)
          .attr 'readonly', true
          .on 'focus', ->
            $(@).removeAttr 'readonly'
