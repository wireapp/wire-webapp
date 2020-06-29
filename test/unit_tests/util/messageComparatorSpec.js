/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {areMentionsDifferent, isTextDifferent} from 'Util/messageComparator';
import {createRandomUuid} from 'Util/util';

import {Text} from 'src/script/entity/message/Text';

describe('MessageComparator', () => {
  it('areMentionsDifferent', () => {
    const mentionUser1 = {userId: createRandomUuid()};
    const mentionUser2 = {userId: createRandomUuid()};

    const tests = [
      {expected: false, newMentions: [], originalMentions: []},
      {expected: false, newMentions: [mentionUser1], originalMentions: [mentionUser1]},
      {expected: false, newMentions: [mentionUser1, mentionUser2], originalMentions: [mentionUser1, mentionUser2]},
      {expected: false, newMentions: [mentionUser1, mentionUser2], originalMentions: [mentionUser2, mentionUser1]},
      {expected: true, newMentions: [mentionUser1], originalMentions: []},
      {expected: true, newMentions: [], originalMentions: [mentionUser1]},
      {expected: true, newMentions: [mentionUser1], originalMentions: [mentionUser2]},
    ];

    tests.forEach(({expected, newMentions, originalMentions}) => {
      const messageEntity = {
        get_first_asset: () => ({
          mentions: () => originalMentions,
        }),
      };

      expect(areMentionsDifferent(messageEntity, newMentions)).toBe(expected);
    });
  });

  it('isTextDifferent', () => {
    const tests = [
      {expected: false, newText: '', originalText: ''},
      {expected: false, newText: 'test', originalText: 'test'},
      {expected: true, newText: 'rezauiop', originalText: 'ruepoiza'},
    ];

    tests.forEach(({expected, newText, originalText}) => {
      const assetEntity = new Text('', originalText);
      const messageEntity = {get_first_asset: () => assetEntity};

      expect(isTextDifferent(messageEntity, newText)).toBe(expected);
    });
  });
});
