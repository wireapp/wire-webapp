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

###
Message list rendering view model.

@todo Get rid of the $('.conversation') opacity
@todo Get rid of the participants dependencies whenever bubble implementation has changed
@todo Remove all jquery selectors
###
class z.ViewModel.MessageListViewModel
  constructor: (element_id, @conversation_repository, @user_repository) ->
    @logger = new z.util.Logger 'z.ViewModel.MessageListViewModel', z.config.LOGGER.OPTIONS

    @conversation = ko.observable new z.entity.Conversation()
    @center_messages = ko.computed =>
      return not @conversation().has_further_messages() and @conversation().messages_visible().length is 1 and @conversation().messages_visible()[0].is_connection()

    @conversation_is_changing = false

    # is there a rendered message with an unread dot
    @first_unread_timestamp = ko.observable()

    # store conversation to mark as read when browser gets focus
    @mark_as_read_on_focus = undefined

    # can we used to prevent scroll handler from being executed (e.g. when using scrollTop())
    @capture_scrolling_event = false

    # store message subscription id
    @messages_subscription = undefined

    # Last open bubble
    @participant_bubble = undefined
    @participant_bubble_last_id = undefined

    @viewport_changed = ko.observable false
    @viewport_changed.extend rateLimit: 100

    @recalculate_timeout = undefined
    @on_initial_rendering = undefined

    @should_scroll_to_bottom = true

    # Check if the message container is to small and then pull new events
    @on_mouse_wheel = _.throttle (e) =>
      is_not_scrollable = not $(e.currentTarget).is_scrollable()
      is_scrolling_up = e.deltaY > 0
      if is_not_scrollable and is_scrolling_up
        @_pull_events()
    , 200

    @on_scroll = _.throttle (data, e) =>
      return if not @capture_scrolling_event

      @viewport_changed not @viewport_changed()

      element = $ e.currentTarget

      # On some HDPI screen scrollTop returns a floating point number instead of an integer
      # https://github.com/jquery/api.jquery.com/issues/608
      scroll_position = Math.ceil element.scrollTop()
      scroll_end = element.scroll_end()
      scrolled_bottom = false

      if scroll_position is 0
        @_pull_events()

      if scroll_position >= scroll_end
        scrolled_bottom = true

        if document.hasFocus()
          @conversation_repository.mark_as_read @conversation()
        else
          @mark_as_read_on_focus = @conversation()

      @should_scroll_to_bottom = scroll_position > scroll_end - z.config.SCROLL_TO_LAST_MESSAGE_THRESHOLD

      amplify.publish z.event.WebApp.LIST.SCROLL, scrolled_bottom
    , 100

    $(window)
    .on 'resize', =>
      @viewport_changed not @viewport_changed()
    .on 'focus', =>
      if @mark_as_read_on_focus?
        window.setTimeout =>
          @conversation_repository.mark_as_read @mark_as_read_on_focus
          @mark_as_read_on_focus = undefined
        , 1000

    amplify.subscribe z.event.WebApp.CONVERSATION.PEOPLE.HIDE, @hide_bubble
    amplify.subscribe z.event.WebApp.CONTEXT_MENU, @on_context_menu_action

  ###
  Remove all subscriptions and reset states.
  @param conversation_et [z.entity.Conversation] Conversation entity to change to
  ###
  release_conversation: (conversation_et) =>
    conversation_et?.release()
    @messages_subscription?.dispose()
    @capture_scrolling_event = false
    @first_unread_timestamp undefined

  ###
  Change conversation.
  @param conversation_et [z.entity.Conversation] Conversation entity to change to
  @param callback [Function] Executed when all events are loaded an conversation is ready to be displayed
  ###
  change_conversation: (conversation_et, callback) =>
    @conversation_is_changing = true

    # clean up old conversation
    @release_conversation @conversation() if @conversation()

    # update new conversation
    @conversation conversation_et

    if not conversation_et.is_loaded()
      @conversation_repository.update_participating_user_ets conversation_et, (conversation_et) =>
        @conversation_repository.get_events conversation_et
        .then =>
          @_set_conversation conversation_et, callback
          conversation_et.is_loaded true
    else
      @_set_conversation conversation_et, callback

  ###
  Sets the conversation and waits for further processing until knockout has rendered the messages.
  @param conversation_et [z.entity.Conversation] Conversation entity to set
  @param callback [Function] Executed when message list is ready to fade in
  ###
  _set_conversation: (conversation_et, callback) =>
    # hide conversation until everything is processed
    $('.conversation').css opacity: 0

    @conversation_is_changing = false

    if @conversation().messages_visible().length is 0
      # return immediately if nothing to render
      @_initial_rendering conversation_et, callback
    else
      # will be executed after all messages are rendered
      @on_initial_rendering = _.once => @_initial_rendering conversation_et, callback

  ###
  Registers for mouse wheel events and incoming messages.

  @note Call this once after changing conversation.
  @param conversation_et [z.entity.Conversation] Conversation entity to render
  @param callback [Function] Executed when message list is ready to fade in
  ###
  _initial_rendering: (conversation_et, callback) =>
    messages_container = $('.messages-wrap')
    messages_container.on 'mousewheel', @on_mouse_wheel

    window.requestAnimFrame =>
      is_current_conversation = conversation_et is @conversation()
      if not is_current_conversation
        @logger.log @logger.levels.INFO, 'Skipped loading conversation', conversation_et.display_name()
        return

      # reset scroll position
      messages_container.scrollTop 0

      @capture_scrolling_event = true

      if not messages_container.is_scrollable()
        @conversation_repository.mark_as_read conversation_et
      else
        unread_message = $ '.message-timestamp-unread'
        if unread_message.length > 0
          messages_container.scroll_by unread_message.parent().parent().position().top
        else
          messages_container.scroll_to_bottom()
      $('.conversation').css opacity: 1

      # subscribe for incoming messages
      @messages_subscription = conversation_et.messages_visible.subscribe @_on_message_add, null, 'arrayChange'
      @_subscribe_to_iframe_clicks()
      callback?()

  ###
  Checks how to scroll message list and if conversation should be marked as unread.

  @param message [Array] Array of message entities
  ###
  _on_message_add: (messages) =>
    messages_container = $('.messages-wrap')
    last_item = messages[messages.length - 1]
    last_message = last_item.value

    # we are only interested in items that were added
    if last_item.status isnt 'added'
      return

    # message was prepended
    if last_message?.timestamp isnt @conversation().last_event_timestamp()
      return

    # scroll to bottom if self user send the message
    if last_message?.from is @user_repository.self().id
      window.requestAnimFrame -> messages_container.scroll_to_bottom()
      return

    # scroll to the end of the list if we are under a certain threshold
    if @should_scroll_to_bottom
      @conversation_repository.mark_as_read @conversation() if document.hasFocus()
      window.requestAnimFrame -> messages_container.scroll_to_bottom()

    # mark as read when conversation is not scrollable
    is_scrollable = messages_container.is_scrollable()
    is_browser_has_focus = document.hasFocus()
    if not is_scrollable
      if is_browser_has_focus
        @conversation_repository.mark_as_read @conversation()
      else
        @mark_as_read_on_focus = @conversation()

  # Get previous messages from the backend.
  _pull_events: =>
    if not @conversation().is_pending() and @conversation().has_further_messages()
      inner_container = $('.messages-wrap').children()[0]
      old_list_height = inner_container.scrollHeight

      @capture_scrolling_event = false
      @conversation_repository.get_events @conversation()
      .then =>
        new_list_height = inner_container.scrollHeight
        $('.messages-wrap').scrollTop new_list_height - old_list_height
        @capture_scrolling_event = true

  scroll_height: (change_in_height) ->
    $('.messages-wrap').scroll_by change_in_height

  ###
  Triggered when user clicks on an avatar in the message list.
  @param user_et [z.entity.User] User entity of the selected user
  @param message [DOMElement] Selected DOMElement
  ###
  on_message_user_click: (user_et, element) =>
    BUBBLE_HEIGHT = 440
    MESSAGE_LIST_MIN_HEIGHT = 400
    list_height = $('.message-list').height()
    element_rect = element.getBoundingClientRect()
    element_distance_top = element_rect.top
    element_distance_bottom = list_height - element_rect.top - element_rect.height
    largest_distance = Math.max element_distance_top, element_distance_bottom
    difference = BUBBLE_HEIGHT - largest_distance

    create_bubble = (element_id) =>
      wire.app.view.content.participants.reset_view()
      @participant_bubble_last_id = element_id
      @participant_bubble = new zeta.webapp.module.Bubble
        host_selector: "##{element_id}"
        scroll_selector: '.messages-wrap'
        modal: true
        on_show: ->
          amplify.publish z.event.WebApp.PEOPLE.SHOW, user_et
        on_hide: =>
          @participant_bubble = undefined
          @participant_bubble_last_id = undefined
      @participant_bubble.toggle()

    show_bubble = =>
      wire.app.view.content.participants.confirm_dialog?.destroy()
      # we clicked on the same bubble
      if @participant_bubble and @participant_bubble_last_id is element.id
        @participant_bubble.toggle()
        return

      # dismiss old bubble and wait with creating the new one when another bubble is open
      if @participant_bubble or wire.app.view.content.participants.participants_bubble?.is_visible()
        @participant_bubble?.hide()
        window.setTimeout ->
          create_bubble(element.id)
        , 550
      else
        create_bubble(element.id)

    if difference > 0 and list_height > MESSAGE_LIST_MIN_HEIGHT
      if largest_distance is element_distance_top
        @scroll_by -difference, show_bubble
      else
        @scroll_by difference, show_bubble
    else
      show_bubble()

  ###
  Triggered when user clicks on the session reset link in a decrypt error message.
  @param message_et [z.entity.DecryptErrorMessage] Decrypt error message
  ###
  on_session_reset_click: (message_et) =>
    reset_progress = ->
      window.setTimeout ->
        message_et.is_resetting_session false
        amplify.publish z.event.WebApp.WARNINGS.MODAL, z.ViewModel.ModalType.SESSION_RESET
      , 550

    message_et.is_resetting_session true
    @conversation_repository.reset_session message_et.from, message_et.client_id, @conversation().id
    .then -> reset_progress()
    .catch -> reset_progress()

  ###
  Is called by knockout whenever a new message is rendered.
  @param elements [Array] List of elements that were added to the DOM (Note: This also contains html comments)
  @param message [z.entity.Message] rendered message
  ###
  after_message_render: (elements, message) =>
    window.requestAnimFrame =>
      return if not @conversation_repository.active_conversation()
      message_index = @conversation_repository.active_conversation().messages_visible().indexOf message
      if message_index > 0
        last_message = @conversation_repository.active_conversation().messages_visible()[message_index - 1]

      last = moment.unix last_message?.timestamp / 1000
      current = moment.unix message.timestamp / 1000

      if not last_message? or moment(current).diff(last, 'minutes') > 60 and message.is_content()
        $(elements)
        .find '.message-timestamp'
        .removeClass 'message-timestamp-hidden'

      if last_message?
        ###
        @note For content messages (except pings):
          Don't show user avatar next to message if the last message in the conversation was already sent by the same user
        ###
        if last_message.is_content() and last_message.user().id is message.user().id and message.is_content()
          $(elements)
          .find '.message-header-user-is-hideable'
          .addClass 'hide-user'

        if last_message.timestamp is @conversation().last_read_timestamp() and not @first_unread_timestamp()
          @first_unread_timestamp message.timestamp
          $(elements)
          .find '.message-timestamp'
          .addClass 'message-timestamp-unread'
          .removeClass 'message-timestamp-hidden'
          .end()
          .find '.message-header-user-is-hideable'
          .removeClass 'hide-user'

        if not last.isSame current, 'day'
          $(elements)
          .find '.message-timestamp'
          .addClass 'message-timestamp-day'
          .removeClass 'message-timestamp-hidden'
          .end()
          .find '.message-header-user-is-hideable'
          .removeClass 'hide-user'

      if message?.is_ping()
        now = Date.now()
        message.animated now - current < 2000

      if z.util.array_is_last @conversation().messages_visible(), message
        # Defer initial rendering
        window.requestAnimFrame => @on_initial_rendering?()

  before_message_remove: (dom_node) ->
    if $(dom_node).hasClass 'message' and not @conversation_is_changing

      has_timestamp = $(dom_node).find('.message-timestamp-hidden').length is 0
      has_day_timestamp = $(dom_node).find('.message-timestamp-day').length > 0
      has_avatar = $(dom_node).find('.hide-user').length is 0
      next_message = $(dom_node).next()

      if has_timestamp
        next_message
        .find '.message-timestamp'
        .removeClass 'message-timestamp-hidden'
        .end()
        .find '.message-header-user-is-hideable'
        .removeClass 'hide-user'
      else if has_day_timestamp
        next_message
        .find '.message-timestamp'
        .addClass 'message-timestamp-day'
        .removeClass 'message-timestamp-hidden'
        .end()
        .find '.message-header-user-is-hideable'
        .removeClass 'hide-user'
      else if has_avatar
        next_message
        .find '.message-header-user-is-hideable'
        .removeClass 'hide-user'

      $(dom_node)
      .addClass 'message-fade-out'
      .on 'transitionend', ->
        $(@).remove()
    else
      # clean up whatever this is
      $(dom_node).remove()

  # Subscribes to iFrame click events.
  _subscribe_to_iframe_clicks: ->
    $('iframe.soundcloud').iframeTracker blurCallback: ->
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.SessionEventName.INTEGER.SOUNDCLOUD_CONTENT_CLICKED

    $('iframe.youtube').iframeTracker blurCallback: ->
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.SessionEventName.INTEGER.YOUTUBE_CONTENT_CLICKED

  # Hides participant bubble.
  hide_bubble: =>
    @participant_bubble?.hide()

  ###
  Scrolls whole message list by given distance.

  @note Scrolling is animated with jQuery
  @param distance [Number] Distance by which the container is shifted
  @param callback [Function] Executed when scroll animation is finished
  ###
  scroll_by: (distance, callback) ->
    current_scroll = $('.messages-wrap').scrollTop()
    new_scroll = current_scroll + distance
    $('.messages-wrap').animate {scrollTop: new_scroll}, 300, callback

  ###
  Gets CSS class that will be applied to the message div in order to style.
  @param message [z.entity.Message] Message entity for generating css class
  @return [String] CSS class that is applied to the element
  ###
  get_css_class: (message) ->
    switch message.super_type
      when z.message.SuperType.CALL
        return 'message-system message-call'
      when z.message.SuperType.CONTENT
        return 'message-normal'
      when z.message.SuperType.MEMBER
        return 'message message-system message-member'
      when z.message.SuperType.PING
        return 'message-ping'
      when z.message.SuperType.SYSTEM
        if message.system_message_type is z.message.SystemMessageType.CONVERSATION_RENAME
          return 'message-system message-rename'
      when z.message.SuperType.UNABLE_TO_DECRYPT
        return 'message-system'

  get_context_menu_entries: (message) ->
    entries = new z.components.ContextMenuEntries()
    entries.push 'edit', 'edit'
    entries.push 'copy', 'copy'
    entries.push 'delete', 'delete'
    return entries

  ###
  Shows detail image view.
  @param asset_et [z.assets.Asset] Asset to be displayed
  @param event [UIEvent] Actual scroll event
  ###
  show_detail: (asset_et, event) ->
    target_element = $(event.currentTarget)
    return if target_element.hasClass 'image-loading'
    amplify.publish z.event.WebApp.CONVERSATION.DETAIL_VIEW.SHOW, target_element.find('img')[0].src

  click_on_cancel_request: (message_et) =>
    next_conversation_et = @conversation_repository.get_next_conversation @conversation_repository.active_conversation()
    @user_repository.cancel_connection_request message_et.other_user(), next_conversation_et

  on_context_menu_action: () =>
    LOG arguments
