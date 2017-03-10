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
z.SystemNotification ?= {}

NOTIFICATION_ICON_URL = '/image/logo/notification.png'

###
System notification repository to trigger browser and audio notifications.

@see https://developer.mozilla.org/en/docs/Web/API/notification
@see http://www.w3.org/TR/notifications
###
class z.SystemNotification.SystemNotificationRepository
  @::EVENTS_TO_NOTIFY = [
    z.message.SuperType.CALL
    z.message.SuperType.CONTENT
    z.message.SuperType.MEMBER
    z.message.SuperType.PING
    z.message.SuperType.REACTION
    z.message.SuperType.SYSTEM
  ]

  ###
  Construct a new System Notification Repository.
  @param calling_repository [z.calling.CallingRepository] Repository for all call interactions
  @param conversation_repository [z.conversation.ConversationService] Repository for all conversation interactions
  ###
  constructor: (@calling_repository, @conversation_repository) ->
    @logger = new z.util.Logger 'z.SystemNotification.SystemNotificationRepository', z.config.LOGGER.OPTIONS

    @ask_for_permission = true
    @notifications = []

    @muted = true
    @subscribe_to_events()
    @notifications_preference = ko.observable z.system_notification.SystemNotificationPreference.ON
    @notifications_preference.subscribe (notifications_preference) =>
      @check_permission() unless notifications_preference is z.system_notification.SystemNotificationPreference.NONE

    @permission_state = z.system_notification.PermissionStatusState.PROMPT
    @permission_status = undefined

  subscribe_to_events: =>
    amplify.subscribe z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE, @set_muted_state
    amplify.subscribe z.event.WebApp.SYSTEM_NOTIFICATION.NOTIFY, @, @notify
    amplify.subscribe z.event.WebApp.SYSTEM_NOTIFICATION.PERMISSION_STATE, @, @set_permission_state
    amplify.subscribe z.event.WebApp.SYSTEM_NOTIFICATION.REMOVE_READ, @, @remove_read_notifications
    amplify.subscribe z.event.WebApp.PROPERTIES.UPDATED, @, @updated_properties
    amplify.subscribe z.event.WebApp.PROPERTIES.UPDATE.NOTIFICATIONS, @, @updated_notifications_property

  ###
  Check for browser permission if we have not yet asked.
  @return [Promise] Promise that resolves with the permission state
  ###
  check_permission: =>
    if @permission_state in [
      z.system_notification.PermissionStatusState.GRANTED
      z.system_notification.PermissionStatusState.IGNORED
      z.system_notification.PermissionStatusState.UNSUPPORTED
    ]
      return Promise.resolve @permission_state

    if not z.util.Environment.browser.supports.notifications
      @set_permission_state z.system_notification.PermissionStatusState.UNSUPPORTED
      return Promise.resolve @permission_state

    if navigator.permissions?
      return navigator.permissions.query {name: 'notifications'}
      .then (permission_status) =>
        @permission_status = permission_status
        @permission_status.onchange = =>
          @set_permission_state @permission_status.state

        switch permission_status.state
          when z.system_notification.PermissionStatusState.PROMPT
            return @_request_permission()
          else
            return @set_permission_state permission_status.state
    else
      switch window.Notification.permission
        when z.system_notification.PermissionStatusState.DEFAULT
          return @_request_permission()
        else
          @set_permission_state window.Notification.permission
          return Promise.resolve @permission_state

  ###
  Display browser notification and play sound notification.
  @param conversation_et [z.entity.Conversation] Conversation entity
  @param message_et [z.entity.Message] Message entity
  ###
  notify: (conversation_et, message_et) =>
    Promise.resolve()
    .then =>
      return if @muted or message_et.super_type not in @EVENTS_TO_NOTIFY
      return if conversation_et.is_muted?()
      return if message_et.was_edited?()

      @_notify_sound conversation_et, message_et
      @_notify_banner conversation_et, message_et

  # Remove notifications from the queue that are no longer unread
  remove_read_notifications: =>
    for notification in @notifications
      return if not notification.data?
      conversation_id = notification.data.conversation_id
      message_id = notification.data.message_id
      @conversation_repository.is_message_read conversation_id, message_id
      .then (is_read) =>
        if is_read
          notification.close()
          @logger.info "Removed read notification for '#{message_id}' in '#{conversation_id}'."

  ###
  Set the muted state.
  @note Temporarily mute notifications on recovery from Notification Stream
  @param handling_notifications [z.event.NotificationHandlingState] Updated notification handling state
  ###
  set_muted_state: (handling_notifications) =>
    @muted = handling_notifications isnt z.event.NotificationHandlingState.WEB_SOCKET
    @logger.info "Set muted state to: #{@muted}"

  ###
  Set the permission state.
  @param permission_state [z.system_notification.PermissionStatusState] State of browser permission
  ###
  set_permission_state: (permission_state) =>
    @permission_state = permission_state

  updated_properties: (properties) =>
    @notifications_preference properties.settings.notifications

  updated_notifications_property: (notification_preference) =>
    @notifications_preference notification_preference

  ###
  Creates the notification body for calls.
  @private
  @return [String] Notification message body
  ###
  _create_body_call: (message_et) ->
    if message_et.is_activation()
      return z.localization.Localizer.get_text z.string.system_notification_voice_channel_activate
    else if message_et.is_deactivation()
      return if message_et.finished_reason isnt z.calling.enum.CALL_FINISHED_REASON.MISSED
      return z.localization.Localizer.get_text z.string.system_notification_voice_channel_deactivate

  ###
  Creates the notification body for text messages and pictures.

  @private
  @param message_et [z.entity.NormalMessage] Normal message entity
  @return [String] Notification message body
  ####
  _create_body_content: (message_et) ->
    if message_et.has_asset_text()
      for asset_et in message_et.assets() when asset_et.is_text()
        return z.util.StringUtil.truncate asset_et.text, z.config.BROWSER_NOTIFICATION.BODY_LENGTH if not asset_et.previews().length
    else if message_et.has_asset_image()
      return  z.localization.Localizer.get_text z.string.system_notification_asset_add
    else if message_et.has_asset_location()
      return z.localization.Localizer.get_text z.string.system_notification_shared_location
    else if message_et.has_asset()
      asset_et = message_et.assets()[0]
      return z.localization.Localizer.get_text z.string.system_notification_shared_audio if asset_et.is_audio()
      return z.localization.Localizer.get_text z.string.system_notification_shared_video if asset_et.is_video()
      return z.localization.Localizer.get_text z.string.system_notification_shared_file if asset_et.is_file()

  ###
  Creates the notification body for a renamed conversation.

  @private
  @param message_et [z.entity.RenameMessage] Rename message entity
  @return [String] Notification message body
  ###
  _create_body_conversation_rename: (message_et) ->
    return z.localization.Localizer.get_text
      id: z.string.system_notification_conversation_rename
      replace: [
        placeholder: '%s.first_name'
        content: message_et.user().first_name()
      ,
        placeholder: '%name'
        content: message_et.name
      ]

  ###
  Creates the notification body for people being added to a group conversation.

  @private
  @param message_et [z.entity.Message] Member message entity
  @return [String] Notification message body
  ###
  _create_body_member_join: (message_et) ->
    if message_et.user_ets().length is 1
      return z.localization.Localizer.get_text
        id: z.string.system_notification_member_join_one
        replace: [
          placeholder: '%s.first_name'
          content: message_et.user().first_name()
        ,
          placeholder: '%@.first_name'
          content: z.util.get_first_name message_et.user_ets()[0], z.string.Declension.ACCUSATIVE
        ]

    return z.localization.Localizer.get_text
      id: z.string.system_notification_member_join_many
      replace: [
        placeholder: '%s.first_name'
        content: message_et.user().first_name()
      ,
        placeholder: '%no'
        content: message_et.user_ids().length
      ]

  ###
  Creates the notification body for people being removed from or leaving a group conversation.

  @private
  @param message_et [z.entity.MemberMessage] Member message entity
  @return [String] Notification message body
  ###
  _create_body_member_leave: (message_et) ->
    if message_et.user_ets().length is 1
      if message_et.user_ets()[0] is message_et.user()
        return z.localization.Localizer.get_text
          id: z.string.system_notification_member_leave_left
          replace:
            placeholder: '%s.first_name'
            content: message_et.user().first_name()

      return z.localization.Localizer.get_text
        id: z.string.system_notification_member_leave_removed_one
        replace: [
          placeholder: '%s.first_name'
          content: message_et.user().first_name()
        ,
          placeholder: '%@.first_name'
          content: z.util.get_first_name message_et.user_ets()[0], z.string.Declension.ACCUSATIVE
        ]

    return z.localization.Localizer.get_text
      id: z.string.system_notification_member_leave_removed_many
      replace: [
        placeholder: '%s.first_name'
        content: message_et.user().first_name()
      ,
        placeholder: '%no'
        content: message_et.user_ets().length
      ]

  ###
  Selects the type of system message that the notification body needs to be created for.

  @private
  @param message_et [z.entity.MemberMessage] Member message entity
  @param is_group_conversation [Boolean] Is a group conversation
  @return [String] Notification message body
  ###
  _create_body_member_update: (message_et, is_group_conversation) ->
    switch message_et.member_message_type
      when z.message.SystemMessageType.NORMAL
        return if not is_group_conversation
        if message_et.type is z.event.Backend.CONVERSATION.MEMBER_JOIN
          return @_create_body_member_join message_et
        else if message_et.type is z.event.Backend.CONVERSATION.MEMBER_LEAVE
          return @_create_body_member_leave message_et
      when z.message.SystemMessageType.CONNECTION_ACCEPTED
        return z.localization.Localizer.get_text z.string.system_notification_connection_accepted
      when z.message.SystemMessageType.CONNECTION_CONNECTED
        return z.localization.Localizer.get_text z.string.system_notification_connection_connected
      when z.message.SystemMessageType.CONNECTION_REQUEST
        return z.localization.Localizer.get_text z.string.system_notification_connection_request
      when z.message.SystemMessageType.CONVERSATION_CREATE
        return z.localization.Localizer.get_text
          id: z.string.system_notification_conversation_create
          replace:
            placeholder: '%s.first_name'
            content: message_et.user().first_name()

  ###
  Creates the notification body for obfuscated messages.
  @private
  @return [String] Notification message body
  ###
  _create_body_obfuscated: ->
    return z.localization.Localizer.get_text z.string.system_notification_obfuscated

  ###
  Creates the notification body for ping.
  @private
  @return [String] Notification message body
  ###
  _create_body_ping: ->
    return z.localization.Localizer.get_text z.string.system_notification_ping

  ###
  Creates the notification body for reaction.
  @private
  @param message_et [z.entity.Message] Fake reaction message entity
  @return [String] Notification message body
  ###
  _create_body_reaction: (message_et) ->
    return z.localization.Localizer.get_text
      id: z.string.system_notification_reaction
      replace:
        placeholder: '%reaction'
        content: message_et.reaction

  ###
  Selects the type of system message that the notification body needs to be created for.

  @private
  @param message_et [z.entity.MemberMessage] Member message entity
  @param conversation_type [z.conversation.ConversationType] Type of the conversation
  @return [String] Notification message body
  ###
  _create_body_system: (message_et) ->
    if message_et.system_message_type is z.message.SystemMessageType.CONVERSATION_RENAME
      return @_create_body_conversation_rename

  ###
  Create notification content.
  @private
  @param conversation_et [z.entity.Conversation] Conversation entity
  @param message_et [z.entity.MemberMessage] Member message entity
  ###
  _create_notification_content: (conversation_et, message_et) ->
    options_body = undefined

    @_create_options_body conversation_et, message_et
    .then (body) =>
      options_body = body
      throw new z.system_notification.SystemNotificationError z.system_notification.SystemNotificationError::TYPE.HIDE_NOTIFICATION if not options_body?
      @_should_obfuscate_notification_sender message_et
    .then (should_obfuscate_sender) =>
      return {
        title: if should_obfuscate_sender then @_create_title_obfuscated() else @_create_title conversation_et, message_et
        options:
          body: if @_should_obfuscate_notification_message message_et then @_create_body_obfuscated() else options_body
          data: @_create_options_data conversation_et, message_et
          icon: @_create_options_icon should_obfuscate_sender, message_et.user()
          tag: @_create_options_tag conversation_et
          silent: true #@note When Firefox supports this we can remove the fix for WEBAPP-731
        timeout: z.config.BROWSER_NOTIFICATION.TIMEOUT
        trigger: @_create_trigger conversation_et, message_et
      }

  ###
  Selects the type of message that the notification body needs to be created for.

  @private
  @param conversation_et [z.entity.Conversation] Conversation entity
  @param message_et [z.entity.Message] Message entity
  @return [String] Notification message body
  ###
  _create_options_body: (conversation_et, message_et) ->
    Promise.resolve()
    .then =>
      switch message_et.super_type
        when z.message.SuperType.CALL
          return @_create_body_call message_et
        when z.message.SuperType.CONTENT
          return @_create_body_content message_et
        when z.message.SuperType.MEMBER
          return @_create_body_member_update message_et, conversation_et.is_group?()
        when z.message.SuperType.PING
          return @_create_body_ping()
        when z.message.SuperType.REACTION
          return @_create_body_reaction message_et
        when z.message.SuperType.SYSTEM
          return @_create_body_conversation_rename message_et

  ###
  Creates the notification data to help check its content.

  @private
  @param input [z.entity.Conversation, z.entity.Connection] Information to grab the conversation ID from
  @param message_et [z.entity.Message] Message entity
  @return [String] Notification message data
  ###
  _create_options_data: (input, message_et) ->
    return {
      conversation_id: input.id or input.conversation_id
      message_id: message_et.id
    }

  ###
  Creates the notification icon.

  @private
  @param should_obfuscate_sender [Boolean] Sender visible in notification
  @param user_et [z.entity.User] Sender of message
  @return [String] Icon URL
  ###
  _create_options_icon: (should_obfuscate_sender, user_et) ->
    return user_et.preview_picture_resource().generate_url() if user_et.preview_picture_resource() and not should_obfuscate_sender
    return '' if z.util.Environment.electron and z.util.Environment.os.mac
    return NOTIFICATION_ICON_URL

  ###
  Creates the notification tag.

  @private
  @param input [z.entity.Conversation, z.entity.Connection] Information to create the tag from
  @return [String] Notification message tag
  ###
  _create_options_tag: (input) ->
    return input.id or input.conversation_id

  ###
  Creates the notification title.

  @private
  @param conversation_et [z.entity.Conversation] Conversation entity
  @param message_et [z.entity.Message] Message entity
  @return [String] Notification message title
  ###
  _create_title: (conversation_et, message_et) ->
    if conversation_et.display_name?()
      if conversation_et.is_group()
        return z.util.StringUtil.truncate "#{message_et.user().first_name()} in #{conversation_et.display_name()}", z.config.BROWSER_NOTIFICATION.TITLE_LENGTH, false
      return z.util.StringUtil.truncate conversation_et.display_name(), z.config.BROWSER_NOTIFICATION.TITLE_LENGTH, false
    return Raygun.send new Error 'Message does not contain user info' if not message_et.user()
    return z.util.StringUtil.truncate message_et.user().name(), z.config.BROWSER_NOTIFICATION.TITLE_LENGTH, false

  ###
  Create obfuscated title.
  @private
  @return [String] Obfuscated notification message title
  ###
  _create_title_obfuscated: ->
    return z.util.StringUtil.truncate z.localization.Localizer.get_text(z.string.system_notification_obfuscated_title), z.config.BROWSER_NOTIFICATION.TITLE_LENGTH, false

  ###
  Creates the notification trigger.

  @private
  @param conversation_et [z.entity.Conversation] Conversation entity
  @param message_et [z.entity.Message] Message entity
  @return [Function] Function to be called when notification is clicked
  ###
  _create_trigger: (conversation_et, message_et) ->
    if message_et.is_member()
      switch message_et.member_message_type
        when z.message.SystemMessageType.CONNECTION_ACCEPTED
          return -> amplify.publish z.event.WebApp.CONVERSATION.SHOW, conversation_et.conversation_id
        when z.message.SystemMessageType.CONNECTION_REQUEST
          return -> amplify.publish z.event.WebApp.CONTENT.SWITCH, z.ViewModel.content.CONTENT_STATE.CONNECTION_REQUESTS
    return -> amplify.publish z.event.WebApp.CONVERSATION.SHOW, conversation_et

  ###
  Creates the browser notification and sends it.

  @private
  @see https://developer.mozilla.org/en/docs/Web/API/notification#Parameters
  @param conversation_et [z.entity.Conversation] Conversation entity
  @param message_et [z.entity.Message] Message entity
  ###
  _notify_banner: (conversation_et, message_et) ->
    @_should_hide_notification conversation_et, message_et
    .then =>
      @_create_notification_content conversation_et, message_et
    .then (notification_content) =>
      @check_permission()
      .then (permission_state) =>
        @_show_notification notification_content if permission_state is z.system_notification.PermissionStatusState.GRANTED
    .catch (error) ->
      throw error unless error.type is z.system_notification.SystemNotificationError::TYPE.HIDE_NOTIFICATION


  ###
  Plays the sound from the audio repository.

  @private
  @param conversation_et [z.entity.Conversation] Conversation entity
  @param message_et [z.entity.Message] Message entity
  ###
  _notify_sound: (conversation_et, message_et) ->
    return if not document.hasFocus() and z.util.Environment.browser.firefox and z.util.Environment.os.mac
    switch message_et.super_type
      when z.message.SuperType.CONTENT
        return if message_et.user().is_me
        amplify.publish z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.NEW_MESSAGE
      when z.message.SuperType.PING
        if message_et.user().is_me
          amplify.publish z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.OUTGOING_PING
        else
          amplify.publish z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.INCOMING_PING

  # Request browser permission for notifications.
  _request_permission: ->
    return new Promise (resolve) =>
      amplify.publish z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.REQUEST_NOTIFICATION
      # Note: The callback will be only triggered in Chrome.
      # If you ignore a permission request on Firefox, then the callback will not be triggered.
      window.Notification.requestPermission? (permission_state) =>
        amplify.publish z.event.WebApp.WARNING.DISMISS, z.ViewModel.WarningType.REQUEST_NOTIFICATION
        @set_permission_state permission_state
        resolve @permission_state

  ###
  Should message in a notification be obfuscated.
  @private
  @param message_et [z.entity.Message]
  ###
  _should_obfuscate_notification_message: (message_et) ->
    return message_et.is_ephemeral() or @notifications_preference() in [
      z.system_notification.SystemNotificationPreference.OBFUSCATE
      z.system_notification.SystemNotificationPreference.OBFUSCATE_MESSAGE
    ]

  ###
  Should sender in a notification be obfuscated.
  @private
  @param message_et [z.entity.Message]
  ###
  _should_obfuscate_notification_sender: (message_et) ->
    return message_et.is_ephemeral() or @notifications_preference() is z.system_notification.SystemNotificationPreference.OBFUSCATE

  ###
  Should hide notification.
  @private
  @param conversation_et [z.entity.Conversation] Conversation entity
  @param message_et [z.entity.Message]
  ###
  _should_hide_notification: (conversation_et, message_et) ->
    Promise.resolve()
    .then =>
      hide_notification = false

      hide_notification = true if @notifications_preference() is z.system_notification.SystemNotificationPreference.NONE
      hide_notification = true if not z.util.Environment.browser.supports.notifications
      hide_notification = true if @permission_state is z.system_notification.PermissionStatusState.DENIED
      hide_notification = true if message_et.user()?.is_me

      in_conversation_view = document.hasFocus() and wire.app.view.content.content_state() is z.ViewModel.content.CONTENT_STATE.CONVERSATION
      in_active_conversation = conversation_et.id is @conversation_repository.active_conversation()?.id
      in_maximized_call = @calling_repository.joined_call() and not wire.app.view.content.multitasking.is_minimized()
      hide_notification = true if in_conversation_view and in_active_conversation and not in_maximized_call

      if hide_notification
        throw new z.system_notification.SystemNotificationError z.system_notification.SystemNotificationError::TYPE.HIDE_NOTIFICATION

  ###
  Sending the notification.

  @param notification_content [Object]
  @option notification_content [String] title
  @option notification_content [Object] options
  @option notification_content [Function] trigger
  @option notification_content [Integer] timeout
  ###
  _show_notification: (notification_content) ->
    amplify.publish z.event.WebApp.SYSTEM_NOTIFICATION.SHOW, notification_content
    @_show_notification_in_browser notification_content

  ###
  Sending the browser notification.

  @private
  @param notification_content [Object]
  @option notification_content [String] title
  @option notification_content [Object] options
  @option notification_content [Function] trigger
  @option notification_content [Integer] timeout
  ###
  _show_notification_in_browser: (notification_content) ->
    ###
    @note Notification.data is only supported on Chrome
    @see https://developer.mozilla.org/en-US/docs/Web/API/Notification/data
    ###
    @remove_read_notifications()
    notification = new window.Notification notification_content.title, notification_content.options
    conversation_id = notification_content.options.data.conversation_id
    message_id = notification_content.options.data.message_id
    timeout_trigger_id = undefined
    notification.onclick = =>
      amplify.publish z.event.WebApp.SYSTEM_NOTIFICATION.CLICK
      window.focus()
      wire.app.view.content.multitasking.is_minimized true
      notification_content.trigger()
      @logger.info "Notification for '#{message_id} in '#{conversation_id}' closed by click."
      notification.close()
    notification.onclose = =>
      window.clearTimeout timeout_trigger_id
      @notifications.splice @notifications.indexOf(notification), 1
      @logger.info "Removed notification for '#{message_id}' in '#{conversation_id}' locally."
    notification.onerror = =>
      @logger.error "Notification for '#{message_id}' in '#{conversation_id}' closed by error."
      notification.close()
    notification.onshow = =>
      timeout_trigger_id = window.setTimeout =>
        @logger.info "Notification for '#{message_id}' in '#{conversation_id}' closed by timeout."
        notification.close()
      , notification_content.timeout

    @notifications.push notification
    @logger.info "Added notification for '#{message_id}' in '#{conversation_id}' to queue."
    window.onunload = =>
      for notification in @notifications
        notification.close()

        return if not notification.data?
        conversation_id = notification.data.conversation_id
        message_id = notification.data.message_id
        @logger.info "Notification for '#{message_id}' in '#{conversation_id}' closed by redirect."
