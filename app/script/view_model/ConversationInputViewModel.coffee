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

# Parent: z.ViewModel.RightViewModel
class z.ViewModel.ConversationInputViewModel
  constructor: (element_id, @conversation_repository, @user_repository) ->
    @logger = new z.util.Logger 'z.ViewModel.ConversationInputViewModel', z.config.LOGGER.OPTIONS

    @conversation_et = @conversation_repository.active_conversation
    @conversation_et.subscribe => @conversation_has_focus true

    @self = @user_repository.self
    @list_not_bottom = ko.observable true

    @conversation_has_focus = ko.observable(true).extend notify: 'always'
    @browser_has_focus = ko.observable true

    @blinking_cursor = ko.computed =>
      return @browser_has_focus() and @conversation_has_focus()

    @has_text_input = ko.computed =>
      return @conversation_et()?.input().length > 0

    @show_giphy_button = ko.computed =>
      return @has_text_input() and @conversation_et()?.input().length <= 15

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
    amplify.subscribe z.event.WebApp.SEARCH.HIDE, => window.requestAnimFrame => @conversation_has_focus true
    amplify.subscribe z.event.WebApp.EXTENSIONS.GIPHY.SEND, => @conversation_et()?.input ''
    amplify.subscribe z.event.WebApp.CONVERSATION.IMAGE.SEND, @upload_images

  added_to_view: =>
    setTimeout =>
      amplify.subscribe z.event.WebApp.SHORTCUT.PING, => @ping()
    , 50

  removed_from_view: ->
    amplify.unsubscribe z.event.WebApp.SHORTCUT.PING

  ping: =>
    return if @ping_disabled()

    @ping_disabled true
    @conversation_repository.send_encrypted_knock @conversation_et()
    .then =>
      window.setTimeout =>
        @ping_disabled false
      , 2000

  toggle_extensions_menu: ->
    amplify.publish z.event.WebApp.EXTENSIONS.GIPHY.SHOW

  send_message: (data, event) =>
    message = z.util.trim_line_breaks @conversation_et().input()
    if message.length is 0
      return

    if message.length > z.config.MAXIMUM_MESSAGE_LENGTH
      amplify.publish z.event.WebApp.WARNINGS.MODAL, z.ViewModel.ModalType.TOO_LONG_MESSAGE,
        data: z.config.MAXIMUM_MESSAGE_LENGTH
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONVERSATION.CHARACTER_LIMIT_REACHED,
        characters: message.length
      return

    link_data = z.links.LinkPreviewHelpers.get_first_link_with_offset message
    if link_data?
      [url, offset] = link_data
      @conversation_repository.send_encrypted_message_with_link_preview message, url, offset, @conversation_et()
    else
      @conversation_repository.send_encrypted_message message, @conversation_et()

    @conversation_et().input ''
    $(event.target).focus()

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
      amplify.publish z.event.WebApp.WARNINGS.MODAL, z.ViewModel.ModalType.UPLOAD_PARALLEL,
        data: z.config.MAXIMUM_ASSET_UPLOADS
      return

    for file in files
      if file.size > z.config.MAXIMUM_ASSET_FILE_SIZE
        amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.FILE.UPLOAD_TOO_BIG,
          {size: file.size, type: file.type}
        amplify.publish z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.ALERT
        setTimeout ->
          amplify.publish z.event.WebApp.WARNINGS.MODAL, z.ViewModel.ModalType.UPLOAD_TOO_LARGE,
            data: z.util.format_bytes(z.config.MAXIMUM_ASSET_FILE_SIZE)
        , 200
        return

    @conversation_repository.upload_files @conversation_et(), files

  scroll_message_list: (list_height_new, list_height_old) ->
    diff = list_height_new - list_height_old
    input_height = $('.conversation-input').height()
    is_scrolled_bottom = $('.messages-wrap').is_scrolled_bottom()

    $('.message-list')
    .css 'bottom', input_height
    .data('antiscroll')?.rebuild()

    if is_scrolled_bottom
      $('.messages-wrap').scroll_to_bottom()
    else
      $('.messages-wrap').scroll_by diff

  show_separator: (is_scrolled_bottom) =>
    @list_not_bottom not is_scrolled_bottom

  on_input_click: =>
    if not @has_text_input()
      $('.messages-wrap').scroll_to_bottom()
