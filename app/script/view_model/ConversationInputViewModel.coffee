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

# Parent: z.ViewModel.ContentViewModel
class z.ViewModel.ConversationInputViewModel
  constructor: (element_id, @conversation_repository, @user_repository) ->
    @logger = new z.util.Logger 'z.ViewModel.ConversationInputViewModel', z.config.LOGGER.OPTIONS

    @conversation_et = @conversation_repository.active_conversation
    @conversation_et.subscribe =>
      @conversation_has_focus true
      @pasted_file null
      @cancel_edit()

    @self = @user_repository.self
    @list_not_bottom = ko.observable true

    @pasted_file = ko.observable()
    @pasted_file_preview_url = ko.observable()
    @pasted_file_name = ko.observable()
    @pasted_file.subscribe (blob) =>
      if blob?
        if blob.type in z.config.SUPPORTED_CONVERSATION_IMAGE_TYPES
          @pasted_file_preview_url URL.createObjectURL blob
        @pasted_file_name z.localization.Localizer.get_text
          id: z.string.conversation_send_pasted_file
          replace:
            placeholder: '%date'
            content: moment(blob.lastModifiedDate).format 'MMMM Do YYYY, h:mm:ss a'
      else
        @pasted_file_preview_url null
        @pasted_file_name null

    @edit_message_et = ko.observable()
    @edit_input = ko.observable ''
    @is_editing = ko.pureComputed => @edit_message_et()?

    @is_editing.subscribe (is_editing) =>
      if is_editing
        window.addEventListener 'click', @on_window_click
      else
        window.removeEventListener 'click', @on_window_click

    @has_ephemeral_timer = ko.pureComputed => @conversation_et()?.ephemeral_timer()

    @conversation_has_focus = ko.observable(true).extend notify: 'always'
    @browser_has_focus = ko.observable true

    @blinking_cursor = ko.pureComputed => @is_editing() or @conversation_has_focus()
    @blinking_cursor.extend notify: 'always'

    @has_text_input = ko.pureComputed =>
      return @conversation_et()?.input().length > 0

    @show_giphy_button = ko.pureComputed =>
      return @has_text_input() and @conversation_et()?.input().length <= 256

    @input = ko.pureComputed
      read: =>
        if @is_editing() then @edit_input() else @conversation_et()?.input?() or ''
      write: (value) =>
        if @is_editing() then @edit_input value else @conversation_et()?.input value

    @ping_tooltip = z.localization.Localizer.get_text
      id: z.string.tooltip_conversation_ping
      replace:
        placeholder: '%shortcut'
        content: z.ui.Shortcut.get_shortcut_tooltip z.ui.ShortcutType.PING
    @picture_tooltip = z.localization.Localizer.get_text z.string.tooltip_conversation_picture
    @file_tooltip = z.localization.Localizer.get_text z.string.tooltip_conversation_file
    @input_tooltip = ko.pureComputed =>
      if @conversation_et().ephemeral_timer()
        return z.localization.Localizer.get_text z.string.tooltip_conversation_ephemeral
      return z.localization.Localizer.get_text z.string.tooltip_conversation_input_placeholder
    @ping_disabled = ko.observable false

    $(window)
      .blur => @browser_has_focus false
      .focus => @browser_has_focus true

    @conversation_input_emoji = new z.ViewModel.ConversationInputEmojiViewModel()

    @_init_subscriptions()

  _init_subscriptions: ->
    amplify.subscribe z.event.WebApp.SEARCH.SHOW, => @conversation_has_focus false
    amplify.subscribe z.event.WebApp.SEARCH.HIDE, => window.requestAnimationFrame => @conversation_has_focus true
    amplify.subscribe z.event.WebApp.EXTENSIONS.GIPHY.SEND, => @conversation_et()?.input ''
    amplify.subscribe z.event.WebApp.CONVERSATION.IMAGE.SEND, @upload_images
    amplify.subscribe z.event.WebApp.CONVERSATION.MESSAGE.EDIT, @edit_message
    amplify.subscribe z.event.WebApp.CONTEXT_MENU, @on_context_menu_action

  added_to_view: =>
    window.setTimeout =>
      amplify.subscribe z.event.WebApp.SHORTCUT.PING, => @ping()
    , 50

  removed_from_view: ->
    amplify.unsubscribe z.event.WebApp.SHORTCUT.PING

  toggle_extensions_menu: ->
    amplify.publish z.event.WebApp.EXTENSIONS.GIPHY.SHOW

  ping: =>
    return if @ping_disabled()

    @ping_disabled true
    @conversation_repository.send_knock @conversation_et()
    .then =>
      window.setTimeout =>
        @ping_disabled false
      , 2000

  send_message: (message) =>
    return if message.length is 0
    @conversation_repository.send_text_with_link_preview message, @conversation_et()

  send_message_edit: (message, message_et) =>
    @cancel_edit()

    if message.length is 0
      return @conversation_repository.delete_message_everyone @conversation_et(), message_et
    if message isnt message_et.get_first_asset().text
      @conversation_repository.send_message_edit message, message_et, @conversation_et()

  set_ephemeral_timer: (millis) =>
    if not millis
      @conversation_et().ephemeral_timer false
      @logger.info "Ephemeral timer for conversation '#{@conversation_et().display_name()}' turned off."
    else
      @conversation_et().ephemeral_timer millis
      @logger.info "Ephemeral timer for conversation '#{@conversation_et().display_name()}' is now at '#{@conversation_et().ephemeral_timer().toString()}'."

  upload_images: (images) =>
    if @_is_hitting_upload_limit images
      return

    for image in images
      return @_show_upload_warning image if image.size > z.config.MAXIMUM_IMAGE_FILE_SIZE

    @conversation_repository.upload_images @conversation_et(), images

  upload_files: (files) =>
    if @_is_hitting_upload_limit files
      return

    for file in files
      if file.size > z.config.MAXIMUM_ASSET_FILE_SIZE
        amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.FILE.UPLOAD_TOO_BIG,
          {size: file.size, type: file.type}
        amplify.publish z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.ALERT
        window.setTimeout ->
          amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.UPLOAD_TOO_LARGE,
            data: z.util.format_bytes(z.config.MAXIMUM_ASSET_FILE_SIZE)
        , 200
        return

    @conversation_repository.upload_files @conversation_et(), files

  on_paste_files: (pasted_files) =>
    @pasted_file pasted_files[0]

  on_send_pasted_files: =>
    pasted_file = @pasted_file()
    @on_drop_files [pasted_file]
    @pasted_file null

  on_cancel_pasted_files: =>
    @pasted_file null

  on_drop_files: (dropped_files) =>
    images = []
    files = []

    if @_is_hitting_upload_limit dropped_files
      return

    for file in dropped_files
      switch
        when file.type in z.config.SUPPORTED_CONVERSATION_IMAGE_TYPES
          images.push file
        else
          files.push file

    @upload_images images
    @upload_files files

  _show_upload_warning: (image) ->
    warning = z.localization.Localizer.get_text
      id: if image.type is 'image/gif' then z.string.alert_gif_too_large else z.string.alert_upload_too_large
      replace:
        placeholder: '%no'
        content: z.config.MAXIMUM_IMAGE_FILE_SIZE / 1024 / 1024

    attributes =
      reason: 'too large'
      type: image.type
      size: image.size
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.IMAGE_SENT_ERROR, attributes
    amplify.publish z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.ALERT
    setTimeout ->
      window.alert warning
    , 200

  _is_hitting_upload_limit: (files) =>
    pending_uploads = @conversation_repository.get_number_of_pending_uploads()
    is_hitting_upload_limit = pending_uploads + files.length > z.config.MAXIMUM_ASSET_UPLOADS

    if is_hitting_upload_limit
      amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.UPLOAD_PARALLEL,
        data: z.config.MAXIMUM_ASSET_UPLOADS

    return is_hitting_upload_limit

  scroll_message_list: (list_height_new, list_height_old) ->
    $('.message-list').data('antiscroll')?.rebuild()

    if $('.messages-wrap').is_scrolled_bottom()
      $('.messages-wrap').scroll_to_bottom()
    else
      $('.messages-wrap').scroll_by list_height_new - list_height_old

  show_separator: (is_scrolled_bottom) =>
    @list_not_bottom not is_scrolled_bottom

  on_window_click: (event) =>
    return if $(event.target).closest('.conversation-input').length
    @cancel_edit()

  on_input_click: =>
    if not @has_text_input()
      amplify.publish z.event.WebApp.CONVERSATION.INPUT.CLICK

  on_input_enter: (data, event) =>
    if @pasted_file()?
      return @on_send_pasted_files()

    message = z.util.StringUtil.trim_line_breaks @input()

    if message.length > z.config.MAXIMUM_MESSAGE_LENGTH
      amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.TOO_LONG_MESSAGE,
        data: z.config.MAXIMUM_MESSAGE_LENGTH
        close: ->
          amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONVERSATION.CHARACTER_LIMIT_REACHED,
            characters: message.length
      return

    if @is_editing()
      @send_message_edit message, @edit_message_et()
    else
      @send_message message

    @input ''
    $(event.target).focus()

  on_input_key_up: (data, event) =>
    @conversation_input_emoji.on_input_key_up data, event

  on_input_key_down: (data, event) =>
    return if @conversation_input_emoji.on_input_key_down data, event
    switch event.keyCode
      when z.util.KEYCODE.ARROW_UP
        @edit_message @conversation_et().get_last_editable_message(), event.target if @input().length is 0
      when z.util.KEYCODE.ESC
        if @pasted_file()? then @pasted_file null else @cancel_edit()
      when z.util.KEYCODE.ENTER
        if event.altKey
          z.util.KeyUtil.insert_at_caret event.target, '\n'
          $(event.target).change()
          event.preventDefault()
    return true

  edit_message: (message_et, input_element) =>
    return if not message_et?.is_editable?() or message_et is @edit_message_et()
    @cancel_edit()
    @edit_message_et message_et
    @edit_message_et()?.is_editing true
    @input @edit_message_et().get_first_asset().text
    @_move_cursor_to_end input_element if input_element?

  cancel_edit: =>
    @conversation_input_emoji.remove_emoji_list()
    @edit_message_et()?.is_editing false
    @edit_message_et undefined
    @edit_input ''

  _move_cursor_to_end: (input_element) ->
    setTimeout ->
      input_element.selectionStart = input_element.selectionEnd = input_element.value.length * 2
    , 0

  ###
  Create context menu entries for ephemeral timer
  @param message_et [z.entity.Message]
  ###
  get_context_menu_entries: ->
    entries = [label: z.localization.Localizer.get_text(z.string.ephememal_units_none), action: 0]
    return entries.concat z.ephemeral.timings.get_values().map (milliseconds) =>
      [number, unit] = z.util.format_milliseconds_short(milliseconds)
      unit_locale = @_get_localized_unit_string number, unit
      return label: "#{number} #{unit_locale}", action: milliseconds

  ###
  Returns the full localized unit string
  @param number [Number]
  @param unit [String] 's', 'm', 'd', 'h'
  ###
  _get_localized_unit_string: (number, unit) ->
    return switch
      when unit is 's'
        if number is 1
          return z.localization.Localizer.get_text z.string.ephememal_units_second
        return z.localization.Localizer.get_text z.string.ephememal_units_seconds
      when unit is 'm'
        if number is 1
          return z.localization.Localizer.get_text z.string.ephememal_units_minute
        return z.localization.Localizer.get_text z.string.ephememal_units_minutes
      when unit is 'd'
        if number is 1
          return z.localization.Localizer.get_text z.string.ephememal_units_day
        return z.localization.Localizer.get_text z.string.ephememal_units_days

  ###
  Click on context menu entry
  @param tag [String] associated tag
  @param action [String] action that was triggered
  ###
  on_context_menu_action: (tag, action) =>
    return if tag isnt 'ephemeral'
    @set_ephemeral_timer window.parseInt(action, 10)

  # TODO: dev
  click_on_ephemeral_button: (data, event) =>
    z.ui.Context.from event, [
      title: z.localization.Localizer.get_text(z.string.ephememal_units_none)
      callback: => @set_ephemeral_timer 0
    ].concat z.ephemeral.timings.get_values().map (milliseconds) =>
      [number, unit] = z.util.format_milliseconds_short(milliseconds)
      unit_locale = @_get_localized_unit_string number, unit
      return title: "#{number} #{unit_locale}", callback: => @set_ephemeral_timer milliseconds
