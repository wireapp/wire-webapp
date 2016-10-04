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
      @cancel_edit()

    @self = @user_repository.self
    @list_not_bottom = ko.observable true

    @edit_message_et = ko.observable()
    @edit_input = ko.observable ''
    @is_editing = ko.pureComputed =>
      return @edit_message_et()?

    @is_editing.subscribe (is_editing) =>
      if is_editing
        window.addEventListener 'click', @on_window_click
      else
        window.removeEventListener 'click', @on_window_click

    @conversation_has_focus = ko.observable(true).extend notify: 'always'
    @browser_has_focus = ko.observable true

    @blinking_cursor = ko.pureComputed =>
      return @browser_has_focus() and @conversation_has_focus() and @is_editing()

    @has_text_input = ko.pureComputed =>
      return @conversation_et()?.input().length > 0

    @show_giphy_button = ko.pureComputed =>
      return @has_text_input() and @conversation_et()?.input().length <= 15

    @input = ko.pureComputed
      read: =>
        if @is_editing() then @edit_input() else @conversation_et()?.input?() or ''
      write: (value) =>
        if @is_editing() then @edit_input value else @conversation_et()?.input value

    @ping_tooltip = z.localization.Localizer.get_text {
      id: z.string.tooltip_conversation_ping
      replace: {placeholder: '%shortcut', content: z.ui.Shortcut.get_shortcut_tooltip z.ui.ShortcutType.PING}
    }
    @picture_tooltip = z.localization.Localizer.get_text z.string.tooltip_conversation_picture
    @file_tooltip = z.localization.Localizer.get_text z.string.tooltip_conversation_file

    @ping_disabled = ko.observable false

    $(window)
      .blur => @browser_has_focus false
      .focus => @browser_has_focus true

    @_init_subscriptions()

  _init_subscriptions: ->
    amplify.subscribe z.event.WebApp.SEARCH.SHOW, => @conversation_has_focus false
    amplify.subscribe z.event.WebApp.SEARCH.HIDE, => window.requestAnimationFrame => @conversation_has_focus true
    amplify.subscribe z.event.WebApp.EXTENSIONS.GIPHY.SEND, => @conversation_et()?.input ''
    amplify.subscribe z.event.WebApp.CONVERSATION.IMAGE.SEND, @upload_images
    amplify.subscribe z.event.WebApp.CONVERSATION.MESSAGE.EDIT, @edit_message

  added_to_view: =>
    setTimeout =>
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
    if message.length is 0
      return
    @conversation_repository.send_message_with_link_preview message, @conversation_et()

  send_message_edit: (message, message_et) =>
    @cancel_edit()

    if message.length is 0
      return @conversation_repository.delete_message_everyone @conversation_et(), message_et
    if message isnt message_et.get_first_asset().text
      @conversation_repository.send_message_edit message, message_et, @conversation_et()

  upload_images: (images) =>
    for image in images
      return @_show_upload_warning image if image.size > z.config.MAXIMUM_IMAGE_FILE_SIZE

    @conversation_repository.upload_images @conversation_et(), images

  _show_upload_warning: (image) ->
    warning = z.localization.Localizer.get_text {
      id: if image.type is 'image/gif' then z.string.alert_gif_too_large else z.string.alert_upload_too_large
      replace: {placeholder: '%no', content: z.config.MAXIMUM_IMAGE_FILE_SIZE / 1024 / 1024}
    }

    attributes =
      reason: 'too large'
      type: image.type
      size: image.size
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.IMAGE_SENT_ERROR, attributes
    amplify.publish z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.ALERT
    setTimeout ->
      window.alert warning
    , 200

  upload_files: (files) =>
    pending_uploads = @conversation_repository.get_number_of_pending_uploads()
    if pending_uploads + files.length > z.config.MAXIMUM_ASSET_UPLOADS
      amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.UPLOAD_PARALLEL,
        data: z.config.MAXIMUM_ASSET_UPLOADS
      return

    for file in files
      if file.size > z.config.MAXIMUM_ASSET_FILE_SIZE
        amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.FILE.UPLOAD_TOO_BIG,
          {size: file.size, type: file.type}
        amplify.publish z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.ALERT
        setTimeout ->
          amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.UPLOAD_TOO_LARGE,
            data: z.util.format_bytes(z.config.MAXIMUM_ASSET_FILE_SIZE)
        , 200
        return

    @conversation_repository.upload_files @conversation_et(), files

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
      $('.messages-wrap').scroll_to_bottom()

  on_input_enter: (data, event) =>
    message = z.util.trim_line_breaks @input()

    if message.length > z.config.MAXIMUM_MESSAGE_LENGTH
      amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.TOO_LONG_MESSAGE,
        data: z.config.MAXIMUM_MESSAGE_LENGTH
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONVERSATION.CHARACTER_LIMIT_REACHED,
        characters: message.length
      return

    if @is_editing()
      @send_message_edit message, @edit_message_et()
    else
      @send_message message

    @input ''
    $(event.target).focus()

  on_input_key_down: (data, event) =>
    switch event.keyCode
      when z.util.KEYCODE.ARROW_UP
        @edit_message @conversation_et().get_last_added_text_message(), event.target if @input().length is 0
      when z.util.KEYCODE.ESC
        @cancel_edit()
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
    @edit_message_et()?.is_editing false
    @edit_message_et undefined
    @edit_input ''

  _move_cursor_to_end: (input_element) ->
    setTimeout ->
      input_element.selectionStart = input_element.selectionEnd = input_element.value.length * 2
    , 0
