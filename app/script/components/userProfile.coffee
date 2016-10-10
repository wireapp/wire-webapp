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
z.components ?= {}


z.components.UserProfileMode =
  DEFAULT: 'default'
  PEOPLE: 'people'
  SEARCH: 'search'

class z.components.UserProfileViewModel
  constructor: (params, component_info) ->
    @logger = new z.util.Logger 'z.components.UserProfileViewModel', z.config.LOGGER.OPTIONS

    @user = params.user
    @conversation = params.conversation
    @mode = params.mode or z.components.UserProfileMode.DEFAULT

    # repository references
    @client_repository = wire.app.repository.client
    @conversation_repository = wire.app.repository.conversation
    @cryptography_repository = wire.app.repository.cryptography
    @user_repository = wire.app.repository.user

    # component dom element
    @element = $(component_info.element)

    # actions
    @on_accept = -> params.accept? @user()
    @on_add_people = => params.add_people? @user()
    @on_block = -> params.block? @user()
    @on_close = -> params.close?()
    @on_ignore = -> params.ignore? @user()
    @on_leave = => params.leave? @user()
    @on_profile = => params.profile? @user()
    @on_remove = => params.remove? @user()
    @on_unblock = -> params.unblock? @user()

    # cancel request confirm dialog
    @confirm_dialog = undefined

    # tabs
    @click_on_tab = (index) => @tab_index index
    @tab_index = ko.observable 0
    @tab_index.subscribe @on_tab_index_changed

    # devices
    @devices = ko.observableArray()
    @devices_found = ko.observable()
    @selected_device = ko.observable()
    @fingerprint_remote = ko.observable ''
    @fingerprint_local = ko.observable ''
    @is_resetting_session = ko.observable false

    # destroy confirm dialog when user changes
    @cleanup_computed = ko.computed =>
      @confirm_dialog?.destroy() if @user()?
      @tab_index 0
      @devices_found null
      @selected_device null
      @fingerprint_remote ''
      @is_resetting_session false

    @selected_device_subscription = @selected_device.subscribe =>
      if @selected_device()?
        @cryptography_repository.get_session @user().id, @selected_device().id
        .then (cryptobox_session) =>
          @fingerprint_remote cryptobox_session.fingerprint_remote()
          @fingerprint_local cryptobox_session.fingerprint_local()

    @add_people_tooltip = z.localization.Localizer.get_text {
      id: z.string.tooltip_people_add
      replace: {placeholder: '%shortcut', content: z.ui.Shortcut.get_shortcut_tooltip z.ui.ShortcutType.ADD_PEOPLE}
    }

    @device_headline = ko.pureComputed =>
      z.localization.Localizer.get_text {
        id: z.string.people_tabs_devices_headline
        replace: {placeholder: '%@.name', content: @user().first_name()}
      }

    @no_device_headline = ko.pureComputed =>
      z.localization.Localizer.get_text {
        id: z.string.people_tabs_no_devices_headline
        replace: {placeholder: '%@.name', content: @user().first_name()}
      }

    @detail_message = ko.pureComputed =>
      z.localization.Localizer.get_text {
        id: z.string.people_tabs_device_detail_headline
        replace: [
          {placeholder: '%bold', content: "<span class='user-profile-device-detail-highlight'>"}
          {placeholder: '%@.name', content: z.util.escape_html @user().first_name()}
          {placeholder: '%end', content: '</span>'}
        ]
      }

    @on_cancel_request = =>
      amplify.publish z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.ALERT
      @confirm_dialog = @element.confirm
        template: '#template-confirm-cancel_request'
        data:
          user: @user()
        confirm: =>
          should_block = @element.find('.checkbox input').is ':checked'
          if should_block
            @user_repository.block_user @user()
          else
            @user_repository.cancel_connection_request @user()

          conversation_et = @conversation_repository.get_one_to_one_conversation @user().id
          if @conversation_repository.is_active_conversation conversation_et
            amplify.publish z.event.WebApp.CONVERSATION.PEOPLE.HIDE
            next_conversation_et = @conversation_repository.get_next_conversation conversation_et
            setTimeout ->
              amplify.publish z.event.WebApp.CONVERSATION.SHOW, next_conversation_et
            , 550

          params.cancel_request? @user()

    @on_open = =>
      amplify.publish z.event.WebApp.CONVERSATION.PEOPLE.HIDE
      conversation_et = @conversation_repository.get_one_to_one_conversation @user().id
      @conversation_repository.unarchive_conversation conversation_et if conversation_et.is_archived()
      setTimeout =>
        amplify.publish z.event.WebApp.CONVERSATION.SHOW, conversation_et
        params.open? @user()
      , 550

    @on_connect = =>
      @user_repository.create_connection @user(), true
      .then ->
        amplify.publish z.event.WebApp.CONVERSATION.PEOPLE.HIDE

      params.connect? @user()

    @on_pending = =>
      if @user().connection().status() in [z.user.ConnectionStatus.PENDING, z.user.ConnectionStatus.IGNORED]
        params.pending? @user()
      else
        @on_open()

    @accent_color = ko.pureComputed =>
      return "accent-color-#{@user()?.accent_id()}"
    , @, deferEvaluation: true

    @show_gray_image = ko.pureComputed =>
      return false if not @user()?
      return true if @user().connection().status() isnt z.user.ConnectionStatus.ACCEPTED and not @user().is_me
      return false
    , @, deferEvaluation: true

    @connection_is_not_established = ko.pureComputed =>
      @user()?.connection().status() in [z.user.ConnectionStatus.PENDING, z.user.ConnectionStatus.SENT, z.user.ConnectionStatus.IGNORED]
    , @, deferEvaluation: true

    @user_is_removed_from_conversation = ko.pureComputed =>
      return true if not @user()? or not @conversation()?
      return not (@user() in @conversation().participating_user_ets())
    , @, deferEvaluation: true

    @render_common_contacts = ko.pureComputed =>
      return @user()?.id and not @user().connected() and not @user().is_me

    # footer
    @get_footer_template = ko.pureComputed =>
      return 'user-profile-footer-empty' if not @user()?

      ConversationType = z.conversation.ConversationType
      status = @user().connection().status()
      is_me = @user().is_me

      # When used in conversation!
      if @conversation?
        type = @conversation().type()

        if type in [ConversationType.ONE2ONE, ConversationType.CONNECT]
          return 'user-profile-footer-profile' if is_me
          return 'user-profile-footer-add-block' if status is z.user.ConnectionStatus.ACCEPTED
          return 'user-profile-footer-pending' if status is z.user.ConnectionStatus.SENT

        else if type is ConversationType.REGULAR
          return 'user-profile-footer-profile-leave' if is_me
          return 'user-profile-footer-connect-remove' if status in [z.user.ConnectionStatus.UNKNOWN, z.user.ConnectionStatus.CANCELLED]
          return 'user-profile-footer-pending-remove' if status in [z.user.ConnectionStatus.PENDING, z.user.ConnectionStatus.SENT, z.user.ConnectionStatus.IGNORED]
          return 'user-profile-footer-message-remove' if status is z.user.ConnectionStatus.ACCEPTED
          return 'user-profile-footer-unblock-remove' if status is z.user.ConnectionStatus.BLOCKED

      # When used in Search!
      else
        return 'user-profile-footer-unblock' if status is z.user.ConnectionStatus.BLOCKED
        return 'user-profile-footer-pending' if status is z.user.ConnectionStatus.SENT
        return 'user-profile-footer-ignore-accept' if status in [z.user.ConnectionStatus.PENDING, z.user.ConnectionStatus.IGNORED]
        return 'user-profile-footer-add' if status in [z.user.ConnectionStatus.UNKNOWN, z.user.ConnectionStatus.CANCELLED]

      return 'user-profile-footer-empty'

  click_on_device: (client_et) =>
    @selected_device client_et

  click_on_device_detail_back_button: =>
    @selected_device null

  click_on_my_fingerprint_button: =>
    @confirm_dialog = $('#participants').confirm
      template: '#template-confirm-my-fingerprint'
      data:
        device: @client_repository.current_client
        fingerprint_local: @fingerprint_local
        click_on_show_my_devices: ->
          amplify.publish z.event.WebApp.PREFERENCES.MANAGE_DEVICES

  click_on_reset_session: =>
    reset_progress = =>
      window.setTimeout =>
        @is_resetting_session false
      , 550

    @is_resetting_session true
    @conversation_repository.reset_session @user().id, @selected_device().id, @conversation().id
    .then -> reset_progress()
    .catch -> reset_progress()

  click_on_verify_client: =>
    toggle_verified = !!!@selected_device().meta.is_verified()

    @client_repository.update_client_in_db @user().id, @selected_device().id, {
      meta:
        is_verified: toggle_verified
    }
    .then => @selected_device().meta.is_verified toggle_verified
    .catch (error) => @logger.log @logger.levels.WARN, "Client cannot be updated: #{error.message}"

  on_tab_index_changed: (index) =>
    if index is 1

      user_id = @user().id
      @client_repository.get_clients_by_user_id user_id
      .then (client_ets) =>
        if client_ets?.length > 0
          @user().devices client_ets
          @devices_found true
        else
          @devices_found false
      .catch (error) =>
        @logger.log @logger.levels.ERROR, "Unable to retrieve clients data for user '#{user_id}': #{error}"

  dispose: =>
    @cleanup_computed.dispose()
    @selected_device_subscription.dispose()

ko.components.register 'user-profile',
  viewModel: createViewModel: (params, component_info) ->
    return new z.components.UserProfileViewModel params, component_info
  template:
    element: 'user-profile-template'
