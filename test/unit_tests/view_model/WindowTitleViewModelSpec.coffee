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
  title_view_model = undefined
  test_factory = new TestFactory()

  beforeAll (done) ->
    test_factory.exposeConversationActors()
    .then (conversation_repository) ->
      state = ko.observable z.ViewModel.CONTENT_STATE.CONVERSATION
      title_view_model = new z.ViewModel.WindowTitleViewModel state, window.user_repository, conversation_repository
      done()
    .catch done.fail

  describe 'initiate_title_updates', ->
    it 'sets a default title', ->
      selected_conversation = new z.entity.Conversation z.util.create_random_uuid()
      selected_conversation.name 'Selected Conversation'
      selected_conversation.type z.conversation.ConversationType.REGULAR
      title_view_model.conversation_repository.active_conversation selected_conversation

      suffix = z.localization.Localizer.get_text z.string.wire
      expected_title = "#{selected_conversation.name()} - #{suffix}"

      title_view_model.initiate_title_updates()

      expect(window.document.title).toBe expected_title

    it 'does not update the badge count for muted conversations', ->
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
      suffix = z.localization.Localizer.get_text z.string.wire
      expected_title = "#{selected_conversation.name()} - #{suffix}"
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
