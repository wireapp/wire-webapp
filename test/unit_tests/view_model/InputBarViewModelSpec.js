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

import {createRandomUuid} from 'Util/util';

import {User} from 'src/script/entity/User';
import {TestFactory} from '../../helper/TestFactory';
import {InputBarViewModel} from 'src/script/view_model/content/InputBarViewModel';
import {Config} from 'src/script/Config';

describe('InputBarViewModel', () => {
  const testFactory = new TestFactory();
  let viewModel;

  beforeAll(() => {
    testFactory.exposeSearchActors().then(() => testFactory.exposeConversationActors());
    spyOn(Config, 'getConfig').and.returnValue({
      ALLOWED_IMAGE_TYPES: [],
      FEATURE: {ALLOWED_FILE_UPLOAD_EXTENSIONS: ['*']},
    });
  });

  beforeEach(() => {
    viewModel = new InputBarViewModel(
      undefined,
      testFactory.assetRepository,
      testFactory.event_repository,
      testFactory.conversation_repository,
      testFactory.search_repository,
      testFactory.storage_repository,
      testFactory.user_repository,
    );
  });

  describe('_createMentionEntity', () => {
    it('matches multibyte characters in mentioned user names', () => {
      const selectionStart = 5;
      const selectionEnd = 5;
      const inputValue = 'Hi @n';
      const userName = 'nqa1👨‍👩‍👧‍👦👨‍👩‍👦‍👦👨‍👩‍👧‍👧';

      const mentionCandidate = viewModel.getMentionCandidate(selectionStart, selectionEnd, inputValue);
      viewModel.editedMention(mentionCandidate);

      const userEntity = new User(createRandomUuid());
      userEntity.name(userName);

      const mentionEntity = viewModel._createMentionEntity(userEntity);

      expect(mentionEntity.startIndex).toBe(3);
      expect(mentionEntity.length).toBe(38);
    });
  });
});
