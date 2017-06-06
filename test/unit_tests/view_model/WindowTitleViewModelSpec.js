/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

'use strict';

// grunt test_init && grunt test_run:view_model/WindowTitleViewModel

describe('z.ViewModel.WindowTitleViewModel', function() {
  const suffix = z.l10n.text(z.string.wire);
  const test_factory = new TestFactory();
  let title_view_model = undefined;

  beforeEach(done => {
    test_factory
      .exposeConversationActors()
      .then(function(conversation_repository) {
        const content_state = ko.observable(
          z.ViewModel.content.CONTENT_STATE.CONVERSATION
        );
        title_view_model = new z.ViewModel.WindowTitleViewModel(
          content_state,
          TestFactory.user_repository,
          conversation_repository
        );
        done();
      })
      .catch(done.fail);
  });

  describe('initiate_title_updates', function() {
    it('sets a default title when there is an unknown state', function() {
      title_view_model.content_state('invalid or unknown');
      title_view_model.initiate_title_updates();
      expect(window.document.title).toBe(suffix);
    });

    it('sets the name of the conversation (when the conversation is selected)', function() {
      const selected_conversation = new z.entity.Conversation(
        z.util.create_random_uuid()
      );
      selected_conversation.name('Selected Conversation');
      selected_conversation.type(z.conversation.ConversationType.REGULAR);
      title_view_model.conversation_repository.active_conversation(
        selected_conversation
      );

      const expected_title = `${selected_conversation.name()} · ${suffix}`;
      title_view_model.initiate_title_updates();
      expect(window.document.title).toBe(expected_title);
    });

    it('sets the name of the conversation and a badge count (when the conversation is selected and when there are unread messages)', function() {
      const message = new z.entity.Message();
      message.id = z.util.create_random_uuid();
      message.timestamp(Date.now());

      const conversation = new z.entity.Conversation(
        z.util.create_random_uuid()
      );
      conversation.add_message(message);
      conversation.name('Birthday Bash');
      conversation.type(z.conversation.ConversationType.REGULAR);

      title_view_model.conversation_repository.conversations_unarchived.push(
        conversation
      );
      title_view_model.conversation_repository.active_conversation(
        conversation
      );
      title_view_model.initiate_title_updates();

      const expected_title = `(1) · ${conversation.name()} · ${suffix}`;
      expect(window.document.title).toBe(expected_title);
    });

    it('does not change the title if muted conversations receive messages', function() {
      const selected_conversation = new z.entity.Conversation(
        z.util.create_random_uuid()
      );
      selected_conversation.name('Selected Conversation');
      selected_conversation.type(z.conversation.ConversationType.REGULAR);
      title_view_model.conversation_repository.active_conversation(
        selected_conversation
      );

      const muted_conversation = new z.entity.Conversation(
        z.util.create_random_uuid()
      );
      muted_conversation.muted_state(true);
      muted_conversation.name('Muted Conversation');
      muted_conversation.type(z.conversation.ConversationType.REGULAR);

      // Add conversations to conversation repository
      expect(
        title_view_model.conversation_repository.conversations_unarchived()
          .length
      ).toBe(0);
      title_view_model.conversation_repository.conversations_unarchived.push(
        selected_conversation
      );
      title_view_model.conversation_repository.conversations_unarchived.push(
        muted_conversation
      );
      expect(
        title_view_model.conversation_repository.conversations_unarchived()
          .length
      ).toBe(2);

      // Check title when there are no messages
      title_view_model.initiate_title_updates();
      let expected_title = `${selected_conversation.name()} · ${suffix}`;
      expect(window.document.title).toBe(expected_title);

      // Add messages to the muted conversation
      let message = new z.entity.Message();
      message.id = z.util.create_random_uuid();
      message.timestamp(Date.now());
      muted_conversation.add_message(message);

      message = new z.entity.Message();
      message.id = z.util.create_random_uuid();
      message.timestamp(Date.now());
      muted_conversation.add_message(message);

      expect(muted_conversation.messages().length).toBe(2);
      expect(muted_conversation.messages_unordered().length).toBe(2);
      expect(muted_conversation.unread_events().length).toBe(2);

      // Check title when there are messages in the muted conversation
      title_view_model.initiate_title_updates();
      expect(window.document.title).toBe(expected_title);

      // Add messages to the selected conversation
      message = new z.entity.Message();
      message.id = z.util.create_random_uuid();
      message.timestamp(Date.now());
      selected_conversation.add_message(message);

      // Check title when there are messages in the selected conversation
      title_view_model.initiate_title_updates();
      expected_title = `(1) · ${selected_conversation.name()} · ${suffix}`;
      expect(window.document.title).toBe(expected_title);
    });

    it('sets the name when opening the preferences about page', function() {
      title_view_model.content_state(
        z.ViewModel.content.CONTENT_STATE.PREFERENCES_ABOUT
      );

      const expected_title = `${z.string.preferences_about} · ${suffix}`;
      title_view_model.initiate_title_updates();
      expect(window.document.title).toBe(expected_title);
    });

    it('sets the name when opening the preferences account page', function() {
      title_view_model.content_state(
        z.ViewModel.content.CONTENT_STATE.PREFERENCES_ACCOUNT
      );

      const expected_title = `${z.string.preferences_account} · ${suffix}`;
      title_view_model.initiate_title_updates();
      expect(window.document.title).toBe(expected_title);
    });

    it('sets the name when opening the preferences av page', function() {
      title_view_model.content_state(
        z.ViewModel.content.CONTENT_STATE.PREFERENCES_AV
      );

      const expected_title = `${z.string.preferences_av} · ${suffix}`;
      title_view_model.initiate_title_updates();
      expect(window.document.title).toBe(expected_title);
    });

    it('sets the name when opening the preferences device details page', function() {
      title_view_model.content_state(
        z.ViewModel.content.CONTENT_STATE.PREFERENCES_DEVICE_DETAILS
      );

      const expected_title = `${z.string
        .preferences_device_details} · ${suffix}`;
      title_view_model.initiate_title_updates();
      expect(window.document.title).toBe(expected_title);
    });

    it('sets the name when opening the preferences devices page', function() {
      title_view_model.content_state(
        z.ViewModel.content.CONTENT_STATE.PREFERENCES_DEVICES
      );

      const expected_title = `${z.string.preferences_devices} · ${suffix}`;
      title_view_model.initiate_title_updates();
      expect(window.document.title).toBe(expected_title);
    });

    it('sets the name when opening the preferences options page', function() {
      title_view_model.content_state(
        z.ViewModel.content.CONTENT_STATE.PREFERENCES_OPTIONS
      );

      const expected_title = `${z.string.preferences_options} · ${suffix}`;
      title_view_model.initiate_title_updates();
      expect(window.document.title).toBe(expected_title);
    });

    it('shows the number of connection requests when viewing the inbox', function() {
      title_view_model.content_state(
        z.ViewModel.content.CONTENT_STATE.CONNECTION_REQUESTS
      );

      const pending_connection = new z.entity.Connection();
      pending_connection.status(z.user.ConnectionStatus.PENDING);

      const user_et = new z.entity.User(z.util.create_random_uuid());
      user_et.connection(pending_connection);

      // Test one connect request message
      title_view_model.user_repository.users.push(user_et);

      let message = z.l10n.text(z.string.conversations_connection_request_one);
      let waiting_people = title_view_model.user_repository.connect_requests()
        .length;

      let expected_title = `(${waiting_people}) · ${message} · ${suffix}`;
      title_view_model.initiate_title_updates();
      expect(window.document.title).toBe(expected_title);

      // Test multiple connect request messages
      const another_user_et = new z.entity.User(z.util.create_random_uuid());
      another_user_et.connection(pending_connection);

      title_view_model.user_repository.users.push(another_user_et);
      waiting_people = title_view_model.user_repository.connect_requests()
        .length;

      message = z.localization.Localizer.get_text({
        id: z.string.conversations_connection_request_many,
        replace: {
          content: waiting_people,
          placeholder: '%no',
        },
      });

      expected_title = `(${waiting_people}) · ${message} · ${suffix}`;
      title_view_model.initiate_title_updates();
      expect(window.document.title).toBe(expected_title);
    });

    it("publishes the badge count (for Wire's wrapper)", function(done) {
      const message = new z.entity.Message();
      message.id = z.util.create_random_uuid();
      message.timestamp(Date.now());

      const conversation = new z.entity.Conversation(
        z.util.create_random_uuid()
      );
      conversation.add_message(message);
      conversation.name('Birthday Bash');
      conversation.type(z.conversation.ConversationType.REGULAR);

      title_view_model.conversation_repository.conversations_unarchived.push(
        conversation
      );
      title_view_model.conversation_repository.active_conversation(
        conversation
      );

      amplify.subscribe(z.event.WebApp.CONVERSATION.UNREAD, function(
        badge_count
      ) {
        expect(badge_count).toBe(1);
        done();
      });

      title_view_model.initiate_title_updates();
    });
  });
});
