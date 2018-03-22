/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

describe('z.viewModel.WindowTitleViewModel', () => {
  const suffix = z.l10n.text(z.string.wire);
  const test_factory = new TestFactory();
  let title_view_model = undefined;

  beforeEach(done => {
    test_factory
      .exposeConversationActors()
      .then(conversation_repository => {
        title_view_model = new z.viewModel.WindowTitleViewModel(
          {
            content: {
              state: ko.observable(z.viewModel.ContentViewModel.STATE.CONVERSATION),
            },
          },
          {
            conversation: conversation_repository,
            user: TestFactory.user_repository,
          }
        );
        done();
      })
      .catch(done.fail);
  });

  describe('initiateTitleUpdates', () => {
    it('sets a default title when there is an unknown state', () => {
      title_view_model.contentState('invalid or unknown');
      title_view_model.initiateTitleUpdates();
      expect(window.document.title).toBe(suffix);
    });

    it('sets the name of the conversation (when the conversation is selected)', () => {
      const selected_conversation = new z.entity.Conversation(z.util.createRandomUuid());
      selected_conversation.name('Selected Conversation');
      selected_conversation.type(z.conversation.ConversationType.REGULAR);
      title_view_model.conversationRepository.active_conversation(selected_conversation);

      const expected_title = `${selected_conversation.name()} · ${suffix}`;
      title_view_model.initiateTitleUpdates();
      expect(window.document.title).toBe(expected_title);
    });

    it('sets the name of the conversation and a badge count (when the conversation is selected and when there are unread messages)', () => {
      const message = new z.entity.ContentMessage();
      message.id = z.util.createRandomUuid();
      message.timestamp(Date.now());

      const conversation = new z.entity.Conversation(z.util.createRandomUuid());
      conversation.add_message(message);
      conversation.name('Birthday Bash');
      conversation.type(z.conversation.ConversationType.REGULAR);

      title_view_model.conversationRepository.conversations_unarchived.push(conversation);
      title_view_model.conversationRepository.active_conversation(conversation);
      title_view_model.initiateTitleUpdates();

      const expected_title = `(1) · ${conversation.name()} · ${suffix}`;
      expect(window.document.title).toBe(expected_title);
    });

    it('does not change the title if muted conversations receive messages', () => {
      const selected_conversation = new z.entity.Conversation(z.util.createRandomUuid());
      selected_conversation.name('Selected Conversation');
      selected_conversation.type(z.conversation.ConversationType.REGULAR);
      title_view_model.conversationRepository.active_conversation(selected_conversation);

      const muted_conversation = new z.entity.Conversation(z.util.createRandomUuid());
      muted_conversation.muted_state(true);
      muted_conversation.name('Muted Conversation');
      muted_conversation.type(z.conversation.ConversationType.REGULAR);

      // Add conversations to conversation repository
      expect(title_view_model.conversationRepository.conversations_unarchived().length).toBe(0);

      title_view_model.conversationRepository.conversations_unarchived.push(selected_conversation);
      title_view_model.conversationRepository.conversations_unarchived.push(muted_conversation);
      expect(title_view_model.conversationRepository.conversations_unarchived().length).toBe(2);

      // Check title when there are no messages
      title_view_model.initiateTitleUpdates();
      let expected_title = `${selected_conversation.name()} · ${suffix}`;
      expect(window.document.title).toBe(expected_title);

      // Add messages to the muted conversation
      const message_in_muted = new z.entity.ContentMessage();
      message_in_muted.id = z.util.createRandomUuid();
      message_in_muted.timestamp(Date.now());
      muted_conversation.add_message(message_in_muted);

      expect(muted_conversation.messages().length).toBe(1);
      expect(muted_conversation.messages_unordered().length).toBe(1);
      expect(muted_conversation.unread_events().length).toBe(1);

      // Check title when there are messages in the muted conversation
      title_view_model.initiateTitleUpdates();
      expect(window.document.title).toBe(expected_title);

      // Add messages to the selected conversation
      const message_in_selected = new z.entity.ContentMessage();
      message_in_selected.id = z.util.createRandomUuid();
      message_in_selected.timestamp(Date.now());
      selected_conversation.add_message(message_in_selected);

      // Check title when there are messages in the selected conversation
      title_view_model.initiateTitleUpdates();
      expected_title = `(1) · ${selected_conversation.name()} · ${suffix}`;
      expect(window.document.title).toBe(expected_title);
    });

    it('sets the name when opening the preferences about page', () => {
      title_view_model.contentState(z.viewModel.ContentViewModel.STATE.PREFERENCES_ABOUT);

      const expected_title = `${z.string.preferencesAbout} · ${suffix}`;
      title_view_model.initiateTitleUpdates();
      expect(window.document.title).toBe(expected_title);
    });

    it('sets the name when opening the preferences account page', () => {
      title_view_model.contentState(z.viewModel.ContentViewModel.STATE.PREFERENCES_ACCOUNT);

      const expected_title = `${z.string.preferencesAccount} · ${suffix}`;
      title_view_model.initiateTitleUpdates();
      expect(window.document.title).toBe(expected_title);
    });

    it('sets the name when opening the preferences av page', () => {
      title_view_model.contentState(z.viewModel.ContentViewModel.STATE.PREFERENCES_AV);

      const expected_title = `${z.string.preferencesAV} · ${suffix}`;
      title_view_model.initiateTitleUpdates();
      expect(window.document.title).toBe(expected_title);
    });

    it('sets the name when opening the preferences device details page', () => {
      title_view_model.contentState(z.viewModel.ContentViewModel.STATE.PREFERENCES_DEVICE_DETAILS);

      const expected_title = `${z.string.preferencesDeviceDetails} · ${suffix}`;
      title_view_model.initiateTitleUpdates();
      expect(window.document.title).toBe(expected_title);
    });

    it('sets the name when opening the preferences devices page', () => {
      title_view_model.contentState(z.viewModel.ContentViewModel.STATE.PREFERENCES_DEVICES);

      const expected_title = `${z.string.preferencesDevices} · ${suffix}`;
      title_view_model.initiateTitleUpdates();
      expect(window.document.title).toBe(expected_title);
    });

    it('sets the name when opening the preferences options page', () => {
      title_view_model.contentState(z.viewModel.ContentViewModel.STATE.PREFERENCES_OPTIONS);

      const expected_title = `${z.string.preferencesOptions} · ${suffix}`;
      title_view_model.initiateTitleUpdates();
      expect(window.document.title).toBe(expected_title);
    });

    it('shows the number of connection requests when viewing the inbox', () => {
      title_view_model.contentState(z.viewModel.ContentViewModel.STATE.CONNECTION_REQUESTS);

      const pending_connection = new z.entity.Connection();
      pending_connection.status(z.user.ConnectionStatus.PENDING);

      const user_et = new z.entity.User(z.util.createRandomUuid());
      user_et.connection(pending_connection);

      // Test one connect request message
      title_view_model.userRepository.users.push(user_et);

      let message = z.l10n.text(z.string.conversationsConnectionRequestOne);
      let waiting_people = title_view_model.userRepository.connect_requests().length;

      let expected_title = `(${waiting_people}) · ${message} · ${suffix}`;
      title_view_model.initiateTitleUpdates();
      expect(window.document.title).toBe(expected_title);

      // Test multiple connect request messages
      const another_user_et = new z.entity.User(z.util.createRandomUuid());
      another_user_et.connection(pending_connection);

      title_view_model.userRepository.users.push(another_user_et);
      waiting_people = title_view_model.userRepository.connect_requests().length;

      message = z.l10n.text(z.string.conversationsConnectionRequestMany, waiting_people);

      expected_title = `(${waiting_people}) · ${message} · ${suffix}`;
      title_view_model.initiateTitleUpdates();
      expect(window.document.title).toBe(expected_title);
    });

    it("publishes the badge count (for Wire's wrapper)", done => {
      const message = new z.entity.ContentMessage();
      message.id = z.util.createRandomUuid();
      message.timestamp(Date.now());

      const conversation = new z.entity.Conversation(z.util.createRandomUuid());
      conversation.add_message(message);
      conversation.name('Birthday Bash');
      conversation.type(z.conversation.ConversationType.REGULAR);

      title_view_model.conversationRepository.conversations_unarchived.push(conversation);
      title_view_model.conversationRepository.active_conversation(conversation);

      amplify.subscribe(z.event.WebApp.LIFECYCLE.UNREAD_COUNT, badge_count => {
        expect(badge_count).toBe(1);
        done();
      });

      title_view_model.initiateTitleUpdates();
    });
  });
});
