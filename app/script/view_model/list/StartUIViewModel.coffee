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
z.ViewModel.list ?= {}


class z.ViewModel.list.StartUIViewModel
  ###
  @param element_id [String] HTML selector
  @param list_view_model [z.ViewModel.list.ListViewModel] List view model
  @param connect_repository [z.connect.ConnectRepository] Connect repository
  @param conversation_repository [z.conversation.ConversationRepository] Conversation repository
  @param search_repository [z.search.SearchRepository] Search repository
  @param user_repository [z.user.UserRepository] User repository
  ###
  constructor: (element_id, @list_view_model, @connect_repository, @conversation_repository, @search_repository, @user_repository, @properties_repository) ->
    @logger = new z.util.Logger 'z.ViewModel.list.StartUIViewModel', z.config.LOGGER.OPTIONS

    @search = _.debounce (query) =>
      normalized_query = z.search.SearchRepository.normalize_query query
      return unless normalized_query
      @clear_search_results()

      # Contacts, groups and others
      is_username = query.trim().startsWith '@'

      @search_repository.search_by_name normalized_query
      .then (user_ets) =>
        return unless normalized_query is z.search.SearchRepository.normalize_query @search_input()
        if is_username
          user_ets = user_ets.filter (user_et) -> return z.util.StringUtil.starts_with user_et.username(), normalized_query
        @search_results.others user_ets
      .catch (error) =>
        @logger.error "Error searching for contacts: #{error.message}", error
      @search_results.contacts @user_repository.search_for_connected_users normalized_query, is_username
      @search_results.groups @conversation_repository.get_groups_by_name normalized_query, is_username

      @searched_for_user query
    , 300

    @searched_for_user = _.once (query) ->
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.SessionEventName.BOOLEAN.SEARCHED_FOR_PEOPLE, true
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONTACTS.ENTERED_SEARCH,
        by_username_only: query.startsWith '@'
        context: 'startui'

    @user = @user_repository.self

    @search_input = ko.observable ''
    @search_input.subscribe @search
    @selected_people = ko.observableArray []

    @has_created_conversation = ko.observable false
    @show_hint = ko.pureComputed => @selected_people().length is 1 and not @has_created_conversation()

    @group_hint_text = z.localization.Localizer.get_text z.string.search_group_hint

    # results
    @top_users = ko.observableArray []
    @suggestions = ko.observableArray []
    @connections = ko.pureComputed =>
      @conversation_repository.sorted_conversations()
      .filter (conversation_et) -> conversation_et.type() is z.conversation.ConversationType.ONE2ONE
      .map (conversation_et) -> conversation_et.participating_user_ets()[0]
      .filter (user_et) -> user_et?
    @connections.extend rateLimit: 500

    @search_results =
      groups: ko.observableArray []
      contacts: ko.observableArray []
      others: ko.observableArray []

    # view states
    @show_no_contacts_on_wire = ko.observable false
    @is_searching = ko.observable false
    @show_spinner = ko.observable false

    @should_update_scrollbar = (ko.computed =>
      return @list_view_model.last_update()
    ).extend notify: 'always', rateLimit: 500

    @has_uploaded_contacts = ko.observable false

    @has_results = ko.pureComputed =>
      return @search_results.groups().length > 0 or
             @search_results.contacts().length > 0 or
             @search_results.others().length > 0

    @show_connections = ko.pureComputed => return @top_users().length > 9 and not @show_suggestions()

    @show_invite = ko.pureComputed =>
      no_top_people_and_suggestions = not @show_search_results() and not @show_top_people() and not @show_suggestions()
      no_search_results = @show_search_results() and not @has_results() and not @is_searching()
      return no_top_people_and_suggestions or no_search_results

    @show_suggestions = ko.pureComputed => return !!@suggestions().length

    @show_search_results = ko.pureComputed =>
      if @selected_people().length is 0 and @search_input().length is 0
        @clear_search_results()
        return false
      return @has_results() or @search_input().length > 0

    @show_top_people = ko.pureComputed => return !!@top_users().length

    # invite bubble states
    @show_invite_form = ko.observable true
    @show_invite_form_only = ko.pureComputed =>
      return true if @has_uploaded_contacts()
      return true if not @has_uploaded_contacts() and not @show_top_people() and not @show_suggestions()
      return false

    # selected user
    @user_profile = ko.observable null
    @user_bubble = null

    # invite bubble
    @invite_bubble = null
    @invite_message = ko.observable ''
    @invite_message_selected = ko.observable true
    @invite_hints = ko.pureComputed =>
      meta_key_mac = z.localization.Localizer.get_text z.string.invite_meta_key_mac
      meta_key_pc = z.localization.Localizer.get_text z.string.invite_meta_key_pc
      meta_key = if z.util.Environment.os.mac then meta_key_mac else meta_key_pc

      if @invite_message_selected()
        return z.localization.Localizer.get_text
          id: z.string.invite_hint_selected
          replace: [
            placeholder: '%meta_key', content: meta_key
          ]
      else
        return z.localization.Localizer.get_text
          id: z.string.invite_hint_unselected
          replace: [
            placeholder: '%meta_key', content: meta_key
          ]

    @invite_button_text = ko.pureComputed =>
      button_text = if @show_invite_form_only() then z.string.people_invite else z.string.people_bring_your_friends
      z.localization.Localizer.get_text button_text

    # last open bubble
    @user_bubble = undefined
    @user_bubble_last_id = undefined

    @_init_subscriptions()

  _init_subscriptions: =>
    amplify.subscribe z.event.WebApp.CONNECT.IMPORT_CONTACTS,                    @import_contacts
    amplify.subscribe z.event.WebApp.PROPERTIES.UPDATED,                         @update_properties
    amplify.subscribe z.event.WebApp.PROPERTIES.UPDATE.CONTACTS_GOOGLE,          @update_properties
    amplify.subscribe z.event.WebApp.PROPERTIES.UPDATE.CONTACTS_MACOS,           @update_properties
    amplify.subscribe z.event.WebApp.PROPERTIES.UPDATE.HAS_CREATED_CONVERSATION, @update_properties
    amplify.subscribe z.event.WebApp.PROPERTIES.UPDATED, @update_properties

  clear_search_results: ->
    @search_results.groups.removeAll()
    @search_results.contacts.removeAll()
    @search_results.others.removeAll()
    @is_searching false
    @show_no_contacts_on_wire false

  click_on_close: =>
    @_close_list()

  _track_import: (source, error) ->
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.PREFERENCES.IMPORTED_CONTACTS,
      source: source
      outcome: if error then 'fail' else 'success'

  ###
  Connect with contacts.
  @param source [z.connect.ConnectSource] Source for the contacts import
  ###
  import_contacts: (source) =>
    @show_spinner true
    if source is z.connect.ConnectSource.GMAIL
      import_promise = @connect_repository.get_google_contacts()
    else if source is z.connect.ConnectSource.ICLOUD
      import_promise = @connect_repository.get_macos_contacts()

    import_promise.then (response) =>
      @_show_onboarding_results response
    .catch (error) =>
      if error.type isnt z.connect.ConnectError::TYPE.NO_CONTACTS
        @logger.error "Importing contacts from '#{source}' failed: #{error.message}", error
        amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.CONTACTS, action: =>
          @import_contacts source
    .then (error) =>
      @show_spinner false
      @_track_import source, error

  _show_onboarding_results: (response) =>
    @search_repository.show_onboarding response
    .then (matched_user_ets) =>
      @suggestions matched_user_ets
      return @search_repository.get_top_people()
    .then (user_ets) =>
      @top_users user_ets
      @selected_people.removeAll()
      if @suggestions().length is 0
        if @top_users().length > 0
          @suggestions @top_users()
        else
          @show_no_contacts_on_wire true
    .catch (error) =>
      @logger.error "Could not show the on-boarding results: #{error.message}", error

  update_list: =>
    @search_repository.get_top_people()
    .then (user_ets) =>
      @top_users user_ets if user_ets.length > 0
    .catch (error) =>
      @logger.error "Could not update the top people: #{error.message}", error

    @show_spinner false

    # clean up
    @suggestions.removeAll()
    @selected_people.removeAll()
    @clear_search_results()
    @user_profile null
    $('user-input input').focus()

    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.SessionEventName.INTEGER.SEARCH_OPENED

  _close_list: ->
    @user_bubble?.hide()
    @invite_bubble?.hide()
    @show_spinner false

    @selected_people.removeAll()
    @search_input ''
    $('user-input input').blur()

    amplify.publish z.event.WebApp.SEARCH.HIDE
    @list_view_model.switch_list z.ViewModel.list.LIST_STATE.CONVERSATIONS

  click_on_group: (conversation_et) =>
    Promise.resolve().then =>
      if conversation_et instanceof z.entity.User
        return @conversation_repository.get_one_to_one_conversation conversation_et
      return conversation_et
    .then (conversation_et) =>
      if conversation_et.is_archived()
        @conversation_repository.unarchive_conversation conversation_et
      @_close_list()
      amplify.publish z.event.WebApp.CONVERSATION.SHOW, conversation_et
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONNECT.OPENED_CONVERSATION,
        conversation_type: if conversation_et.is_group() then 'group' else 'one_to_one'

  click_on_other: (user_et, e) =>

    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONNECT.SELECTED_USER_FROM_SEARCH,
      connection_type: switch user_et.connection().status()
        when z.user.ConnectionStatus.ACCEPTED then 'connected'
        when z.user.ConnectionStatus.UNKNOWN then 'unconnected'
        when z.user.ConnectionStatus.PENDING then 'pending_incoming'
        when z.user.ConnectionStatus.SENT then 'pending_outgoing'
      context: 'startui'

    create_bubble = (element_id) =>
      @user_profile user_et
      @user_bubble_last_id = element_id
      @user_bubble = new zeta.webapp.module.Bubble
        host_selector: "##{element.attr('id')}"
        scroll_selector: '.start-ui-list'
        on_hide: =>
          @user_bubble = undefined
          @user_bubble_last_id = undefined
        on_show: ->
          $('.start-ui-user-bubble .user-profile-connect-message').focus()

      @user_bubble.toggle()

    # we clicked on the same bubble
    if @user_bubble and @user_bubble_last_id is e.currentTarget.id
      @user_bubble.toggle()
      return

    element = $(e.currentTarget).attr
      'id': Date.now()
      'data-bubble': '#start-ui-user-bubble'
      'data-placement': 'right-flex'

    # dismiss old bubble and wait with creating the new one when another bubble is open
    if @user_bubble
      @user_bubble?.hide()
      window.setTimeout ->
        create_bubble(element[0].id)
      , 550
    else
      create_bubble(element[0].id)

  _collapse_item: (search_list_item, callback) ->
    search_list_item.find('.search-list-item-connect').remove()
    window.requestAnimationFrame ->
      search_list_item
        .addClass 'search-list-item-collapse'
        .on z.util.alias.animationend, (event) ->
          if event.originalEvent.propertyName is 'height'
            search_list_item
              .remove()
              .off z.util.alias.animationend
            callback?()


  click_on_dismiss: (user_et, event) =>
    search_list_item = $(event.currentTarget.parentElement.parentElement)
    @_collapse_item search_list_item, =>
      @search_repository.ignore_suggestion user_et.id
      .then =>
        @suggestions.remove user_et
      .catch (error) =>
        @logger.error "Failed to ignore suggestions: '#{error.message}'", error

  click_on_connect: (user_et, event) =>
    search_list_item = $(event.currentTarget.parentElement.parentElement)
    search_list_item
      .addClass 'search-list-item-connect-anim'
      .one z.util.alias.animationend, =>
        window.setTimeout =>
          @_collapse_item search_list_item, =>
            @user_repository.create_connection user_et
            .then =>
              @suggestions.remove user_et
        , 550


  ###############################################################################
  # User bubble
  ###############################################################################

  on_user_accept: (user_et) =>
    @_close_list()
    @user_repository.accept_connection_request user_et, true

  on_user_connect: (user_et) =>
    @_close_list()

    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONNECT.SENT_CONNECT_REQUEST,
      context: 'startui'
      common_users_count: user_et.mutual_friends_total()

  on_user_ignore: (user_et) =>
    @user_repository.ignore_connection_request user_et
    .then =>
      @user_bubble?.hide()

  on_user_open: =>
    @_close_list()

  on_user_unblock: (user_et) =>
    @_close_list()
    @user_repository.unblock_user user_et, true

  on_cancel_request: =>
    @user_bubble?.hide()


  ###############################################################################
  # Invite bubble
  ###############################################################################

  click_on_contacts_import: =>
    @invite_bubble?.hide()
    @import_contacts z.connect.ConnectSource.ICLOUD

  click_on_gmail_import: =>
    @invite_bubble?.hide()
    @import_contacts z.connect.ConnectSource.GMAIL

  click_on_import_form: =>
    @show_invite_form false

  click_on_invite_form: =>
    @show_invite_form true
    @_focus_invite_form()

  show_invite_bubble: =>
    return if @invite_bubble?

    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONNECT.OPENED_GENERIC_INVITE_MENU,
      context: 'banner'

    self = @user_repository.self()

    if self.email()
      @invite_message z.localization.Localizer.get_text
        id: z.string.invite_message
        replace: [
          {placeholder: '%username', content: "@#{self.username()}"}
        ]
    else
      @invite_message z.localization.Localizer.get_text z.string.invite_message_no_email

    @invite_bubble = new zeta.webapp.module.Bubble
      host_selector: '#invite-button'
      scroll_selector: '.start-ui-list'
      on_hide: =>
        $('.invite-link-box .bg').removeClass 'bg-animation'
        $('.invite-link-box .message').off 'copy blur focus'
        @invite_bubble = null
        @show_invite_form true
      on_show: => @_focus_invite_form() if @show_invite_form()

    @invite_bubble.show()

  _focus_invite_form: =>
    $('.invite-link-box .message')
      .on 'copy', (e) =>
        $(e.currentTarget).parent().find('.bg')
          .addClass 'bg-animation'
          .on z.util.alias.animationend, (e) =>
            return if e.originalEvent.animationName isnt 'message-bg-fadeout'
            $(@).off z.util.alias.animationend
            @invite_bubble.hide()
      .on 'blur', =>
        @invite_message_selected false
      .on 'click', (e) =>
        @invite_message_selected true
        $(e.target).select()
      .trigger 'click'


  ###############################################################################
  # User Properties
  ###############################################################################

  update_properties: =>
    @has_created_conversation @properties_repository.properties.has_created_conversation
    @has_uploaded_contacts @properties_repository.properties.contact_import.google? or @properties_repository.properties.contact_import.macos?
    return true


  ###############################################################################
  # Header
  ###############################################################################

  on_submit_search: (callback) =>
    return if @selected_people().length is 0

    if @selected_people().length is 1
      return @conversation_repository.get_one_to_one_conversation @selected_people()[0]
      .then (conversation_et) =>
        amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONNECT.OPENED_ONE_TO_ONE_CONVERSATION,
          source: 'top_user'
        @click_on_group conversation_et
        callback conversation_et if _.isFunction callback

    user_ids = (user_et.id for user_et in @selected_people())

    @conversation_repository.create_new_conversation user_ids, null
    .then (conversation_et) =>
      @properties_repository.save_preference_has_created_conversation()
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONVERSATION.CREATE_GROUP_CONVERSATION,
        {creationContext: 'search', numberOfParticipants: user_ids.length}
      @click_on_group conversation_et
      callback conversation_et if _.isFunction callback
    .catch (error) =>
      @_close_list()
      throw new Error "Unable to create conversation: #{error.message}"

  on_audio_call: =>
    @on_submit_search (conversation_et) ->
      window.setTimeout ->
        amplify.publish z.event.WebApp.CALL.STATE.JOIN, conversation_et.id, false
      , 1000

  on_video_call: =>
    @on_submit_search (conversation_et) ->
      window.setTimeout ->
        amplify.publish z.event.WebApp.CALL.STATE.JOIN, conversation_et.id, true
      , 1000

  on_photo: (images) =>
    @on_submit_search ->
      window.setTimeout ->
        amplify.publish z.event.WebApp.CONVERSATION.IMAGE.SEND, images
      , 1000
