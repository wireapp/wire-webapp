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

// grunt test_init && grunt test_run:components/UserProfile

describe('z.components.UserProfile', () => {
  const testFactory = new TestFactory();
  let viewModel;

  beforeEach(done => {
    testFactory
      .exposeConversationActors()
      .then(conversation_repository => {
        const conversation = new z.entity.Conversation(z.util.create_random_uuid());
        conversation.name('z.components.UserProfile');
        conversation.type(z.conversation.ConversationType.REGULAR);
        conversation_repository.active_conversation(conversation);

        window.wire.app = {
          repository: {
            client: 'mock',
            conversation: 'mock',
            cryptography: 'mock',
            user: 'mock',
          },
        };

        viewModel = new z.components.UserProfile(
          {
            conversation: TestFactory.conversation_repository.active_conversation,
            user: TestFactory.user_repository.self,
          },
          {}
        );
        done();
      })
      .catch(done.fail);
  });

  describe('detailMessage', () => {
    it('returns message parts that can safely be rendered by a template engine', () => {
      const fingerprintExplanation = viewModel.detailMessage();
      expect(fingerprintExplanation.length).toBe(3);
    });
  });
});
