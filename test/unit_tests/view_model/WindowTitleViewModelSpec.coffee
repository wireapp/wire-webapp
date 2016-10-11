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

# grunt test_init && grunt test_run:view_model/WindowTitleViewModel

describe 'z.ViewModel.WindowTitleViewModel', ->
  suffix = z.localization.Localizer.get_text z.string.wire
  test_factory = new TestFactory()
  title_view_model = undefined

  beforeEach (done) ->
    test_factory.exposeConversationActors()
    .then (conversation_repository) ->
      content_state = ko.observable z.ViewModel.content.CONTENT_STATE.CONVERSATION
      title_view_model = new z.ViewModel.WindowTitleViewModel content_state, window.user_repository, conversation_repository
      title_view_model.logger.level = z.util.Logger::levels.ERROR
      done()
    .catch done.fail

  describe 'initiate_title_updates', ->
    it 'sets a default title when there is an unknown state', ->
      title_view_model.content_state 'invalid or unknown'
      title_view_model.initiate_title_updates()
      expect(window.document.title).toBe suffix

    it 'sets the name of the conversation (when the conversation is selected)', ->
      selected_conversation = new z.entity.Conversation z.util.create_random_uuid()
      selected_conversation.name 'Selected Conversation'
      selected_conversation.type z.conversation.ConversationType.REGULAR
      title_view_model.conversation_repository.active_conversation selected_conversation

      expected_title = "#{selected_conversation.name()} · #{suffix}"
      title_view_model.initiate_title_updates()
      expect(window.document.title).toBe expected_title

    it 'sets the name of the conversation and a badge count (when the conversation is selected and when there are unread messages)', ->
      message = new z.entity.Message()
      message.id = z.util.create_random_uuid()
      message.timestamp = Date.now()

      conversation = new z.entity.Conversation z.util.create_random_uuid()
      conversation.add_message message
      conversation.name 'Birthday Bash'
      conversation.type z.conversation.ConversationType.REGULAR

      title_view_model.conversation_repository.conversations_unarchived.push conversation
      title_view_model.conversation_repository.active_conversation conversation
      title_view_model.initiate_title_updates()

      expected_title = "1 · #{conversation.name()} · #{suffix}"
      expect(window.document.title).toBe expected_title

    it 'does not change the title if muted conversations receive messages', ->
      selected_conversation = new z.entity.Conversation z.util.create_random_uuid()
      selected_conversation.name 'Selected Conversation'
      selected_conversation.type z.conversation.ConversationType.REGULAR
      title_view_model.conversation_repository.active_conversation selected_conversation

      muted_conversation = new z.entity.Conversation z.util.create_random_uuid()
      muted_conversation.muted_state true
      muted_conversation.name 'Muted Conversation'
      muted_conversation.type z.conversation.ConversationType.REGULAR

      # Add conversations to conversation repository
      expect(title_view_model.conversation_repository.conversations_unarchived().length).toBe 0
      title_view_model.conversation_repository.conversations_unarchived.push selected_conversation
      title_view_model.conversation_repository.conversations_unarchived.push muted_conversation
      expect(title_view_model.conversation_repository.conversations_unarchived().length).toBe 2

      # Check title when there are no messages
      title_view_model.initiate_title_updates()
      expected_title = "#{selected_conversation.name()} · #{suffix}"
      expect(window.document.title).toBe expected_title

      # Add messages to the muted conversation
      message = new z.entity.Message()
      message.id = z.util.create_random_uuid()
      message.timestamp = Date.now()
      muted_conversation.add_message message

      message = new z.entity.Message()
      message.id = z.util.create_random_uuid()
      message.timestamp = Date.now()
      muted_conversation.add_message message

      expect(muted_conversation.messages().length).toBe 2
      expect(muted_conversation.messages_unordered().length).toBe 2
      expect(muted_conversation.unread_events().length).toBe 2
      expect(muted_conversation.number_of_unread_messages()).toBe 2

      # Check title when there are messages in the muted conversation
      title_view_model.initiate_title_updates()
      expect(window.document.title).toBe expected_title

      # Add messages to the selected conversation
      message = new z.entity.Message()
      message.id = z.util.create_random_uuid()
      message.timestamp = Date.now()
      selected_conversation.add_message message

      # Check title when there are messages in the selected conversation
      title_view_model.initiate_title_updates()
      expected_title = "1 · #{selected_conversation.name()} · #{suffix}"
      expect(window.document.title).toBe expected_title

    it 'sets the name of the self user when opening the preferences about page', ->
      title_view_model.content_state z.ViewModel.content.CONTENT_STATE.PREFERENCES_ABOUT

      expected_title = "#{z.string.preferences_about} · #{suffix}"
      title_view_model.initiate_title_updates()
      expect(window.document.title).toBe expected_title

    it 'sets the name of the self user when opening the preferences account page', ->
      title_view_model.content_state z.ViewModel.content.CONTENT_STATE.PREFERENCES_ACCOUNT

      expected_title = "#{z.string.preferences_account} · #{suffix}"
      title_view_model.initiate_title_updates()
      expect(window.document.title).toBe expected_title


    it 'sets the name of the self user when opening the preferences device details page', ->
      title_view_model.content_state z.ViewModel.content.CONTENT_STATE.PREFERENCES_DEVICE_DETAILS

      expected_title = "#{z.string.preferences_device_details} · #{suffix}"
      title_view_model.initiate_title_updates()
      expect(window.document.title).toBe expected_title

    it 'sets the name of the self user when opening the preferences devices page', ->
      title_view_model.content_state z.ViewModel.content.CONTENT_STATE.PREFERENCES_DEVICES

      expected_title = "#{z.string.preferences_devices} · #{suffix}"
      title_view_model.initiate_title_updates()
      expect(window.document.title).toBe expected_title

    it 'sets the name of the self user when opening the preferences options page', ->
      title_view_model.content_state z.ViewModel.content.CONTENT_STATE.PREFERENCES_OPTIONS

      expected_title = "#{z.string.preferences_options} · #{suffix}"
      title_view_model.initiate_title_updates()
      expect(window.document.title).toBe expected_title

    it 'shows the number of connection requests when viewing the inbox', ->
      title_view_model.content_state z.ViewModel.content.CONTENT_STATE.CONNECTION_REQUESTS

      pending_connection = new z.entity.Connection()
      pending_connection.status z.user.ConnectionStatus.PENDING

      user_et = new z.entity.User z.util.create_random_uuid()
      user_et.connection pending_connection

      # Test one connect request message
      title_view_model.user_repository.users.push user_et

      message = z.localization.Localizer.get_text z.string.conversations_connection_request_one
      waiting_people = title_view_model.user_repository.connect_requests().length

      expected_title = "#{waiting_people} · #{message} · #{suffix}"
      title_view_model.initiate_title_updates()
      expect(window.document.title).toBe expected_title

      # Test multiple connect request messages
      another_user_et = new z.entity.User z.util.create_random_uuid()
      another_user_et.connection pending_connection

      title_view_model.user_repository.users.push another_user_et
      waiting_people = title_view_model.user_repository.connect_requests().length

      message = z.localization.Localizer.get_text {
        id: z.string.conversations_connection_request_many
        replace: {
          placeholder: '%no', content: waiting_people
        }
      }

      expected_title = "#{waiting_people} · #{message} · #{suffix}"
      title_view_model.initiate_title_updates()
      expect(window.document.title).toBe expected_title

    it 'publishes the badge count (for Wire\'s wrapper)', (done) ->
      message = new z.entity.Message()
      message.id = z.util.create_random_uuid()
      message.timestamp = Date.now()

      conversation = new z.entity.Conversation z.util.create_random_uuid()
      conversation.add_message message
      conversation.name 'Birthday Bash'
      conversation.type z.conversation.ConversationType.REGULAR

      title_view_model.conversation_repository.conversations_unarchived.push conversation
      title_view_model.conversation_repository.active_conversation conversation

      amplify.subscribe z.event.WebApp.CONVERSATION.UNREAD, (badge_count) ->
        expect(badge_count).toBe 1
        done()

      title_view_model.initiate_title_updates()
