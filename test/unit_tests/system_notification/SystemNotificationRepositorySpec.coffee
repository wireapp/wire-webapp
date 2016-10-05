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

# grunt test_init && grunt test_run:system_notification/SystemNotificationRepository

describe 'z.SystemNotification.SystemNotificationRepository', ->
  test_factory = new TestFactory()
  conversation_et = null
  message_et = null
  user_et = null

  first_name = "#{entities.user.john_doe.name.split(' ')[0]}"
  notification_content = null

  beforeEach (done) ->
    test_factory.exposeSystemNotificationActors()
    .then ->
      amplify.publish z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE, z.event.NotificationHandlingState.WEB_SOCKET

      # Create entities
      user_et = user_repository.user_mapper.map_user_from_object payload.users.get.one[0]
      conversation_et = conversation_repository.conversation_mapper.map_conversation entities.conversation

      # Notification
      notification_content =
        title: z.util.trunc_text conversation_et.display_name(), z.config.BROWSER_NOTIFICATION.TITLE_LENGTH, false
        options:
          body: ''
          data:
            conversation_id: conversation_et.id
            message_id: '0'
          icon: '/image/logo/notification.png'
          tag: conversation_et.id
          silent: true
        timeout: z.config.BROWSER_NOTIFICATION.TIMEOUT

      # Mocks
      z.util.Environment.browser.supports.notifications = true

      window.Notification =
        permission:
          z.util.BrowserPermissionType.GRANTED

      document.hasFocus = ->
        false

      spyOn system_notification_repository, '_show_notification'
      spyOn system_notification_repository, '_notify_sound'
      done()
    .catch done.fail

  describe 'does not show a notification', ->
    beforeEach ->
      message_et = new z.entity.PingMessage()
      message_et.user user_et
      notification_content.trigger = system_notification_repository._create_trigger conversation_et, message_et

    it 'if the browser does not support them', ->
      z.util.Environment.browser.supports.notifications = false
      system_notification_repository.notify conversation_et, message_et

      expect(system_notification_repository._show_notification).not.toHaveBeenCalled()

    it 'if the user permission was denied', ->
      window.Notification.permission = z.util.BrowserPermissionType.DENIED
      system_notification_repository.notify conversation_et, message_et

      expect(system_notification_repository._show_notification).not.toHaveBeenCalled()

    it 'if the browser tab has focus', ->
      document.hasFocus = ->
        true
      system_notification_repository.notify conversation_et, message_et

      expect(system_notification_repository._show_notification).not.toHaveBeenCalled()

    it 'if the event was triggered by the user', ->
      message_et.user().is_me = true
      system_notification_repository.notify conversation_et, message_et

      expect(system_notification_repository._show_notification).not.toHaveBeenCalled()

    it 'if the conversation is muted', ->
      conversation_et.muted_state true
      system_notification_repository.notify conversation_et, message_et

      expect(system_notification_repository._show_notification).not.toHaveBeenCalled()

    it 'for a successfully completed call', ->
      message_et = new z.entity.CallMessage()
      message_et.call_message_type = z.message.CallMessageType.DEACTIVATED
      message_et.finished_reason = z.calling.enum.CallFinishedReason.COMPLETED
      system_notification_repository.notify conversation_et, message_et

      expect(system_notification_repository._show_notification).not.toHaveBeenCalled()

  describe 'shows a well-formed call notification', ->
    describe 'for an incoming call', ->
      beforeEach ->
        message_et = new z.entity.CallMessage()
        message_et.call_message_type = z.message.CallMessageType.ACTIVATED
        message_et.user user_et
        notification_content.options.body = z.string.system_notification_voice_channel_activate
        notification_content.trigger = system_notification_repository._create_trigger conversation_et, message_et

      it 'in a 1:1 conversation', ->
        conversation_et.type z.conversation.ConversationType.ONE2ONE
        notification_content.title = z.string.truncation
        system_notification_repository.notify conversation_et, message_et

        result = JSON.stringify system_notification_repository._show_notification.calls.first().args[0]
        expect(result).toEqual JSON.stringify notification_content
        expect(system_notification_repository._show_notification).toHaveBeenCalledTimes 1

      it 'in a group conversation', ->
        system_notification_repository.notify conversation_et, message_et

        title = "#{message_et.user().first_name()} in #{conversation_et.display_name()}"
        notification_content.title = z.util.trunc_text title, z.config.BROWSER_NOTIFICATION.TITLE_LENGTH, false
        result = JSON.stringify system_notification_repository._show_notification.calls.first().args[0]
        expect(result).toEqual JSON.stringify notification_content
        expect(system_notification_repository._show_notification).toHaveBeenCalledTimes 1

    describe 'for a missed call', ->
      beforeEach ->
        message_et = new z.entity.CallMessage()
        message_et.call_message_type = z.message.CallMessageType.DEACTIVATED
        message_et.finished_reason = z.calling.enum.CallFinishedReason.MISSED
        message_et.user user_et
        notification_content.options.body = z.string.system_notification_voice_channel_deactivate
        notification_content.trigger = system_notification_repository._create_trigger conversation_et, message_et

      it 'in a 1:1 conversation', ->
        conversation_et.type z.conversation.ConversationType.ONE2ONE
        notification_content.title = z.string.truncation
        system_notification_repository.notify conversation_et, message_et

        result = JSON.stringify system_notification_repository._show_notification.calls.first().args[0]
        expect(result).toEqual JSON.stringify notification_content
        expect(system_notification_repository._show_notification).toHaveBeenCalledTimes 1

      it 'in a group conversation', ->
        system_notification_repository.notify conversation_et, message_et

        title = "#{message_et.user().first_name()} in #{conversation_et.display_name()}"
        notification_content.title = z.util.trunc_text title, z.config.BROWSER_NOTIFICATION.TITLE_LENGTH, false
        result = JSON.stringify system_notification_repository._show_notification.calls.first().args[0]
        expect(result).toEqual JSON.stringify notification_content
        expect(system_notification_repository._show_notification).toHaveBeenCalledTimes 1

  describe 'shows a well-formed content notification', ->
    beforeEach ->
      message_et = new z.entity.ContentMessage()
      message_et.user user_et
      notification_content.trigger = system_notification_repository._create_trigger conversation_et, message_et

    describe 'for a text message', ->
      beforeEach ->
        asset_et = new z.entity.Text()
        asset_et.text = 'Lorem ipsum'
        message_et.assets.push asset_et
        notification_content.options.body = asset_et.text

      it 'in a 1:1 conversation', ->
        conversation_et.type z.conversation.ConversationType.ONE2ONE
        notification_content.title = z.string.truncation
        system_notification_repository.notify conversation_et, message_et

        result = JSON.stringify system_notification_repository._show_notification.calls.first().args[0]
        expect(result).toEqual JSON.stringify notification_content
        expect(system_notification_repository._show_notification).toHaveBeenCalledTimes 1

      it 'in a group conversation', ->
        system_notification_repository.notify conversation_et, message_et

        title = "#{message_et.user().first_name()} in #{conversation_et.display_name()}"
        notification_content.title = z.util.trunc_text title, z.config.BROWSER_NOTIFICATION.TITLE_LENGTH, false
        result = JSON.stringify system_notification_repository._show_notification.calls.first().args[0]
        expect(result).toEqual JSON.stringify notification_content
        expect(system_notification_repository._show_notification).toHaveBeenCalledTimes 1

    describe 'for a picture', ->
      beforeEach ->
        message_et.assets.push new z.entity.MediumImage()
        notification_content.options.body = z.string.system_notification_asset_add

      it 'in a 1:1 conversation', ->
        conversation_et.type z.conversation.ConversationType.ONE2ONE
        notification_content.title = z.string.truncation
        system_notification_repository.notify conversation_et, message_et

        result = JSON.stringify system_notification_repository._show_notification.calls.first().args[0]
        expect(result).toEqual JSON.stringify notification_content
        expect(system_notification_repository._show_notification).toHaveBeenCalledTimes 1

      it 'in a group conversation', ->
        system_notification_repository.notify conversation_et, message_et

        title = "#{message_et.user().first_name()} in #{conversation_et.display_name()}"
        notification_content.title = z.util.trunc_text title, z.config.BROWSER_NOTIFICATION.TITLE_LENGTH, false
        result = JSON.stringify system_notification_repository._show_notification.calls.first().args[0]
        expect(result).toEqual JSON.stringify notification_content
        expect(system_notification_repository._show_notification).toHaveBeenCalledTimes 1

    describe 'for a location', ->
      beforeEach ->
        message_et.assets.push new z.entity.Location()
        notification_content.options.body = z.string.system_notification_shared_location

      it 'in a 1:1 conversation', ->
        conversation_et.type z.conversation.ConversationType.ONE2ONE
        notification_content.title = z.string.truncation
        system_notification_repository.notify conversation_et, message_et

        expectation = JSON.stringify system_notification_repository._show_notification.calls.first().args[0]
        expect(expectation).toEqual JSON.stringify notification_content
        expect(system_notification_repository._show_notification).toHaveBeenCalledTimes 1

      it 'in a group conversation', ->
        system_notification_repository.notify conversation_et, message_et

        title = "#{message_et.user().first_name()} in #{conversation_et.display_name()}"
        notification_content.title = z.util.trunc_text title, z.config.BROWSER_NOTIFICATION.TITLE_LENGTH, false
        result = JSON.stringify system_notification_repository._show_notification.calls.first().args[0]
        expect(result).toEqual JSON.stringify notification_content
        expect(system_notification_repository._show_notification).toHaveBeenCalledTimes 1

  describe 'shows a well-formed group notification', ->
    beforeEach ->
      title = "#{message_et.user().first_name()} in #{conversation_et.display_name()}"
      notification_content.title = z.util.trunc_text title, z.config.BROWSER_NOTIFICATION.TITLE_LENGTH, false
      notification_content.trigger = system_notification_repository._create_trigger conversation_et, message_et

    it 'if a group is created', ->
      conversation_et.from = payload.users.get.one[0].id
      message_et = new z.entity.MemberMessage()
      message_et.user user_et
      message_et.member_message_type = z.message.SystemMessageType.CONVERSATION_CREATE
      system_notification_repository.notify conversation_et, message_et

      notification_content.options.body = "#{first_name} started a conversation"
      result = JSON.stringify system_notification_repository._show_notification.calls.first().args[0]
      expect(result).toEqual JSON.stringify notification_content
      expect(system_notification_repository._show_notification).toHaveBeenCalledTimes 1

    it 'if a group is renamed', ->
      message_et = new z.entity.RenameMessage()
      message_et.user user_et
      message_et.name = 'Lorem Ipsum Conversation'
      system_notification_repository.notify conversation_et, message_et

      notification_content.options.body = "#{first_name} renamed the conversation to #{message_et.name}"
      result = JSON.stringify system_notification_repository._show_notification.calls.first().args[0]
      expect(result).toEqual JSON.stringify notification_content
      expect(system_notification_repository._show_notification).toHaveBeenCalledTimes 1

  describe 'shows a well-formed member notification', ->
    other_user_et = undefined

    beforeEach ->
      message_et = new z.entity.MemberMessage()
      message_et.user user_et
      message_et.member_message_type = z.message.SystemMessageType.NORMAL
      other_user_et = user_repository.user_mapper.map_user_from_object payload.users.get.many[1]

    describe 'if people are added', ->

      beforeEach ->
        message_et.type = z.event.Backend.CONVERSATION.MEMBER_JOIN
        title = "#{message_et.user().first_name()} in #{conversation_et.display_name()}"
        notification_content.title = z.util.trunc_text title, z.config.BROWSER_NOTIFICATION.TITLE_LENGTH, false
        notification_content.trigger = system_notification_repository._create_trigger conversation_et, message_et

      it 'with one user being added to the conversation', ->
        message_et.user_ets [other_user_et]
        system_notification_repository.notify conversation_et, message_et

        first_name_added = "#{entities.user.jane_roe.name.split(' ')[0]}"
        notification_content.options.body = "#{first_name} added #{first_name_added} to the conversation"
        result = JSON.stringify system_notification_repository._show_notification.calls.first().args[0]
        expect(result).toEqual JSON.stringify notification_content
        expect(system_notification_repository._show_notification).toHaveBeenCalledTimes 1

      it 'with you being added to the conversation', ->
        other_user_et.is_me = true
        message_et.user_ets [other_user_et]
        system_notification_repository.notify conversation_et, message_et

        notification_content.options.body = "#{first_name} added you to the conversation"
        result = JSON.stringify system_notification_repository._show_notification.calls.first().args[0]
        expect(result).toEqual JSON.stringify notification_content
        expect(system_notification_repository._show_notification).toHaveBeenCalledTimes 1

      it 'with multiple users being added to the conversation', ->
        user_ids = [entities.user.john_doe.id, entities.user.jane_roe.id]
        message_et.user_ids user_ids
        system_notification_repository.notify conversation_et, message_et

        notification_content.options.body = "#{first_name} added 2 people to the conversation"
        result = JSON.stringify system_notification_repository._show_notification.calls.first().args[0]
        expect(result).toEqual JSON.stringify notification_content
        expect(system_notification_repository._show_notification).toHaveBeenCalledTimes 1

    describe 'if people are removed', ->
      beforeEach ->
        message_et.type = z.event.Backend.CONVERSATION.MEMBER_LEAVE
        title = "#{message_et.user().first_name()} in #{conversation_et.display_name()}"
        notification_content.title = z.util.trunc_text title, z.config.BROWSER_NOTIFICATION.TITLE_LENGTH, false
        notification_content.trigger = system_notification_repository._create_trigger conversation_et, message_et

      it 'with one user being removed from the conversation', ->
        message_et.user_ets [other_user_et]
        system_notification_repository.notify conversation_et, message_et

        first_name_removed = "#{entities.user.jane_roe.name.split(' ')[0]}"
        notification_content.options.body = "#{first_name} removed #{first_name_removed} from the conversation"
        result = JSON.stringify system_notification_repository._show_notification.calls.first().args[0]
        expect(result).toEqual JSON.stringify notification_content
        expect(system_notification_repository._show_notification).toHaveBeenCalledTimes 1

      it 'with you being removed from the conversation', ->
        other_user_et.is_me = true
        message_et.user_ets [other_user_et]
        system_notification_repository.notify conversation_et, message_et

        notification_content.options.body = "#{first_name} removed you from the conversation"
        result = JSON.stringify system_notification_repository._show_notification.calls.first().args[0]
        expect(result).toEqual JSON.stringify notification_content
        expect(system_notification_repository._show_notification).toHaveBeenCalledTimes 1

      it 'with multiple users being removed from the conversation', ->
        user_ets = user_repository.user_mapper.map_users_from_object payload.users.get.many
        message_et.user_ets user_ets
        system_notification_repository.notify conversation_et, message_et

        notification_content.options.body = "#{first_name} removed 2 people from the conversation"
        result = JSON.stringify system_notification_repository._show_notification.calls.first().args[0]
        expect(result).toEqual JSON.stringify notification_content
        expect(system_notification_repository._show_notification).toHaveBeenCalledTimes 1

      it 'with someone leaving the conversation by himself', ->
        message_et.user_ets [message_et.user()]
        system_notification_repository.notify conversation_et, message_et

        notification_content.options.body = "#{first_name} left the conversation"
        result = JSON.stringify system_notification_repository._show_notification.calls.first().args[0]
        expect(result).toEqual JSON.stringify notification_content
        expect(system_notification_repository._show_notification).toHaveBeenCalledTimes 1

  describe 'shows a well-formed request notification', ->
    connection_et = null

    beforeEach ->
      user_connection_mapper = new z.user.UserConnectionMapper()
      connection_et = user_connection_mapper.map_user_connection_from_json entities.connection
      message_et = new z.entity.MemberMessage()
      message_et.user user_et

      title = message_et.user().name()
      notification_content.title = z.util.trunc_text title, z.config.BROWSER_NOTIFICATION.TITLE_LENGTH, false
      notification_content.options.data.conversation_id = connection_et.conversation_id
      notification_content.options.tag = connection_et.conversation_id
      notification_content.trigger = system_notification_repository._create_trigger conversation_et, message_et

    it 'if a connection request is incoming', ->
      connection_et.status = 'pending'
      message_et.member_message_type = z.message.SystemMessageType.CONNECTION_REQUEST
      system_notification_repository.notify connection_et, message_et

      notification_content.options.body = z.string.system_notification_connection_request
      result = JSON.stringify system_notification_repository._show_notification.calls.first().args[0]
      expect(result).toEqual JSON.stringify notification_content
      expect(system_notification_repository._show_notification).toHaveBeenCalledTimes 1

    it 'if your connection request was accepted', ->
      message_et.member_message_type = z.message.SystemMessageType.CONNECTION_ACCEPTED
      system_notification_repository.notify connection_et, message_et

      notification_content.options.body = z.string.system_notification_connection_accepted
      result = JSON.stringify system_notification_repository._show_notification.calls.first().args[0]
      expect(result).toEqual JSON.stringify notification_content
      expect(system_notification_repository._show_notification).toHaveBeenCalledTimes 1


  describe 'shows a well-formed ping notification', ->
    beforeAll ->
      user_et = user_repository.user_mapper.map_user_from_object payload.users.get.one[0]

    beforeEach ->
      message_et = new z.entity.PingMessage()
      message_et.user user_et
      notification_content.trigger = system_notification_repository._create_trigger conversation_et, message_et
      notification_content.options.body = z.string.system_notification_ping

    it 'in a 1:1 conversation', ->
      conversation_et.type z.conversation.ConversationType.ONE2ONE
      notification_content.title = z.string.truncation
      system_notification_repository.notify conversation_et, message_et

      expectation = JSON.stringify system_notification_repository._show_notification.calls.first().args[0]
      expect(expectation).toEqual JSON.stringify notification_content
      expect(system_notification_repository._show_notification).toHaveBeenCalledTimes 1

    it 'in a group conversation', ->
      system_notification_repository.notify conversation_et, message_et

      title = "#{message_et.user().first_name()} in #{conversation_et.display_name()}"
      notification_content.title = z.util.trunc_text title, z.config.BROWSER_NOTIFICATION.TITLE_LENGTH, false
      result = JSON.stringify system_notification_repository._show_notification.calls.first().args[0]
      expect(result).toEqual JSON.stringify notification_content
      expect(system_notification_repository._show_notification).toHaveBeenCalledTimes 1
