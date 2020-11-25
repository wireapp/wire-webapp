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

import ko from 'knockout';
import {WebAppEvents} from '@wireapp/webapp-events';
import {CONVERSATION_TYPE} from '@wireapp/api-client/src/conversation';

import {t, setStrings} from 'Util/LocalizerUtil';
import {createRandomUuid} from 'Util/util';

import 'src/script/localization/Localizer';

import {Conversation} from 'src/script/entity/Conversation';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {User} from 'src/script/entity/User';

import {NOTIFICATION_STATE} from 'src/script/conversation/NotificationSetting';
import {WindowTitleViewModel} from 'src/script/view_model/WindowTitleViewModel';
import {ContentViewModel} from 'src/script/view_model/ContentViewModel';
import {TestFactory} from '../../helper/TestFactory';

describe('WindowTitleViewModel', () => {
  const suffix = 'Wire';
  let testFactory = undefined;
  let title_view_model = undefined;

  beforeEach(() => {
    setStrings({en: z.string});
    testFactory = new TestFactory();

    return testFactory.exposeConversationActors().then(conversationRepository => {
      title_view_model = new WindowTitleViewModel(
        {
          content: {
            state: ko.observable(ContentViewModel.STATE.CONVERSATION),
          },
        },
        testFactory.user_repository.userState,
        conversationRepository.conversationState,
      );
    });
  });

  describe('initiateTitleUpdates', () => {
    beforeEach(() => jasmine.clock().install());

    afterEach(() => jasmine.clock().uninstall());

    it('sets a default title when there is an unknown state', () => {
      title_view_model.contentState('invalid or unknown');
      title_view_model.initiateTitleUpdates();

      expect(window.document.title).toBe(suffix);
    });

    it('sets the name of the conversation (when the conversation is selected)', () => {
      const selected_conversation = new Conversation(createRandomUuid());
      selected_conversation.name('Selected Conversation');
      selected_conversation.type(CONVERSATION_TYPE.REGULAR);
      title_view_model.conversationState.activeConversation(selected_conversation);

      const expected_title = `${selected_conversation.name()} · ${suffix}`;
      title_view_model.initiateTitleUpdates();

      expect(window.document.title).toBe(expected_title);
    });

    it('sets the name of the conversation and a badge count (when the conversation is selected and when there are unread messages)', () => {
      const message = new ContentMessage();
      message.id = createRandomUuid();
      message.timestamp(Date.now());

      const conversationEntity = new Conversation(createRandomUuid());
      conversationEntity.add_message(message);
      conversationEntity.name('Birthday Bash');
      conversationEntity.type(CONVERSATION_TYPE.REGULAR);
      conversationEntity.selfUser(new User(createRandomUuid()));

      title_view_model.conversationState.conversations_unarchived.push(conversationEntity);
      title_view_model.conversationState.activeConversation(conversationEntity);
      title_view_model.initiateTitleUpdates();

      const expected_title = `(1) ${conversationEntity.name()} · ${suffix}`;

      expect(window.document.title).toBe(expected_title);
    });

    it('does not change the title if muted conversations receive messages', () => {
      const selfUserEntity = new User(createRandomUuid());
      selfUserEntity.inTeam(true);

      const selected_conversation = new Conversation(createRandomUuid());
      selected_conversation.name('Selected Conversation');
      selected_conversation.type(CONVERSATION_TYPE.REGULAR);
      selected_conversation.selfUser(selfUserEntity);
      title_view_model.conversationState.activeConversation(selected_conversation);

      const muted_conversation = new Conversation(createRandomUuid());
      muted_conversation.mutedState(NOTIFICATION_STATE.NOTHING);
      muted_conversation.name('Muted Conversation');
      muted_conversation.type(CONVERSATION_TYPE.REGULAR);
      muted_conversation.selfUser(selfUserEntity);

      // Add conversations to conversation repository
      expect(title_view_model.conversationState.conversations_unarchived().length).toBe(0);

      title_view_model.conversationState.conversations_unarchived.push(selected_conversation);
      title_view_model.conversationState.conversations_unarchived.push(muted_conversation);

      expect(title_view_model.conversationState.conversations_unarchived().length).toBe(2);

      // Check title when there are no messages
      title_view_model.initiateTitleUpdates();
      let expected_title = `${selected_conversation.name()} · ${suffix}`;

      expect(window.document.title).toBe(expected_title);

      // Add messages to the muted conversation
      const message_in_muted = new ContentMessage();
      message_in_muted.id = createRandomUuid();
      message_in_muted.timestamp(Date.now());
      muted_conversation.add_message(message_in_muted);

      expect(muted_conversation.messages().length).toBe(1);
      expect(muted_conversation.messages_unordered().length).toBe(1);
      expect(muted_conversation.unreadState().allEvents.length).toBe(1);

      // Check title when there are messages in the muted conversation
      title_view_model.initiateTitleUpdates();

      expect(window.document.title).toBe(expected_title);

      // Add messages to the selected conversation
      const message_in_selected = new ContentMessage();
      message_in_selected.id = createRandomUuid();
      message_in_selected.timestamp(Date.now());
      selected_conversation.add_message(message_in_selected);

      // Check title when there are messages in the selected conversation
      title_view_model.initiateTitleUpdates();
      expected_title = `(1) ${selected_conversation.name()} · ${suffix}`;

      expect(window.document.title).toBe(expected_title);
    });

    it('sets the name when opening the preferences about page', () => {
      title_view_model.contentState(ContentViewModel.STATE.PREFERENCES_ABOUT);

      const expected_title = `${z.string.preferencesAbout} · ${suffix}`;
      title_view_model.initiateTitleUpdates();

      expect(window.document.title).toBe(expected_title);
    });

    it('sets the name when opening the preferences account page', () => {
      title_view_model.contentState(ContentViewModel.STATE.PREFERENCES_ACCOUNT);

      const expected_title = `${z.string.preferencesAccount} · ${suffix}`;
      title_view_model.initiateTitleUpdates();

      expect(window.document.title).toBe(expected_title);
    });

    it('sets the name when opening the preferences av page', () => {
      title_view_model.contentState(ContentViewModel.STATE.PREFERENCES_AV);

      const expected_title = `${z.string.preferencesAV} · ${suffix}`;
      title_view_model.initiateTitleUpdates();

      expect(window.document.title).toBe(expected_title);
    });

    it('sets the name when opening the preferences device details page', () => {
      title_view_model.contentState(ContentViewModel.STATE.PREFERENCES_DEVICE_DETAILS);

      const expected_title = `${z.string.preferencesDeviceDetails} · ${suffix}`;
      title_view_model.initiateTitleUpdates();

      expect(window.document.title).toBe(expected_title);
    });

    it('sets the name when opening the preferences devices page', () => {
      title_view_model.contentState(ContentViewModel.STATE.PREFERENCES_DEVICES);

      const expected_title = `${z.string.preferencesDevices} · ${suffix}`;
      title_view_model.initiateTitleUpdates();

      expect(window.document.title).toBe(expected_title);
    });

    it('sets the name when opening the preferences options page', () => {
      title_view_model.contentState(ContentViewModel.STATE.PREFERENCES_OPTIONS);

      const expected_title = `${z.string.preferencesOptions} · ${suffix}`;
      title_view_model.initiateTitleUpdates();

      expect(window.document.title).toBe(expected_title);
    });

    it('shows the number of connection requests when viewing the inbox', () => {
      title_view_model.contentState(ContentViewModel.STATE.CONNECTION_REQUESTS);
      title_view_model.userState.connectRequests = ko.observableArray([]);

      const firstConnectedUser = new User(createRandomUuid());
      const secondConnectedUser = new User(createRandomUuid());
      const thirdConnectedUser = new User(createRandomUuid());

      const tests = [
        {
          connections: [firstConnectedUser],
          expected: `(1) ${t('conversationsConnectionRequestOne')} · ${suffix}`,
        },
        {
          connections: [firstConnectedUser, secondConnectedUser],
          expected: `(2) ${t('conversationsConnectionRequestMany', 2)} · ${suffix}`,
        },
        {
          connections: [firstConnectedUser, secondConnectedUser, thirdConnectedUser],
          expected: `(3) ${t('conversationsConnectionRequestMany', 3)} · ${suffix}`,
        },
      ];

      title_view_model.initiateTitleUpdates();

      tests.forEach(({connections, expected}) => {
        title_view_model.userState.connectRequests(connections);
        jasmine.clock().tick(WindowTitleViewModel.TITLE_DEBOUNCE);

        expect(window.document.title).toBe(expected);
      });
    });

    it("publishes the badge count (for Wire's wrapper)", done => {
      const contentMessage = new ContentMessage();
      contentMessage.id = createRandomUuid();
      contentMessage.timestamp(Date.now());

      const conversationEntity = new Conversation(createRandomUuid());
      conversationEntity.add_message(contentMessage);
      conversationEntity.name('Birthday Bash');
      conversationEntity.type(CONVERSATION_TYPE.REGULAR);
      conversationEntity.selfUser(new User(createRandomUuid()));

      amplify.subscribe(WebAppEvents.LIFECYCLE.UNREAD_COUNT, badgeCount => {
        expect(badgeCount).toBe(1);
        done();
      });

      title_view_model.conversationState.conversations_unarchived.push(conversationEntity);
      title_view_model.conversationState.activeConversation(conversationEntity);

      title_view_model.initiateTitleUpdates();
    });
  });
});
