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

// grunt test_init && grunt test_run:view_model/InputBarViewModel

describe('z.viewModel.content.InputBarViewModel', () => {
  const testFactory = new TestFactory();
  let viewModel;

  beforeAll(done => {
    testFactory.exposeConversationActors().then(conversationRepository => {
      viewModel = new z.viewModel.content.InputBarViewModel(
        null,
        {},
        {conversation: conversationRepository, user: TestFactory.user_repository}
      );
      done();
    });
  });

  describe('parseForMentions', () => {
    const userEntities = [
      {
        id: 'user1ID',
        username: () => 'user1',
      },
      {
        id: 'user2ID',
        username: () => 'user2',
      },
    ];

    it('finds an existing user mentioned in a message', () => {
      const mentions = viewModel.parseForMentions('Hello @user1', userEntities);
      expect(mentions.length).toBe(1);

      const [mention] = mentions;
      expect(mention.toJSON()).toEqual({end: 12, start: 6, userId: userEntities[0].id});
    });

    it('ignores mentions for unknown users a message', () => {
      const mentions = viewModel.parseForMentions('Hello @user1 and @user3', userEntities);
      expect(mentions.length).toBe(1);

      const [mention] = mentions;
      expect(mention.toJSON()).toEqual({end: 12, start: 6, userId: userEntities[0].id});
    });

    it('ignores a mention that has no space before it', () => {
      const mentions = viewModel.parseForMentions('Hello@user1 and @user2', userEntities);
      expect(mentions.length).toBe(1);

      const [mention] = mentions;
      expect(mention.toJSON()).toEqual({end: 22, start: 16, userId: userEntities[1].id});
    });
  });
});
