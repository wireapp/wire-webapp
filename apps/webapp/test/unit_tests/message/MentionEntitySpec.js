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

import {Mention} from '@wireapp/protocol-messaging';

import {MentionEntity} from 'src/script/message/MentionEntity';
import {base64ToArray} from 'Util/util';

describe('MentionEntity', () => {
  const userId = '7bec1483-5b11-429d-9759-ec71369654b5';

  describe('validate', () => {
    const textMessage = 'Hello, World! @test_user Please read!';

    it('should throw with missing properties or wrong types', () => {
      const mentionEntity = new MentionEntity();
      const functionCall = () => mentionEntity.validate(textMessage);

      expect(functionCall).toThrow(MentionEntity.ERROR.MISSING_START_INDEX);
      mentionEntity.startIndex = 'fourteen';

      expect(functionCall).toThrow(MentionEntity.ERROR.MISSING_START_INDEX);
      mentionEntity.startIndex = 14;

      expect(functionCall).toThrow(MentionEntity.ERROR.MISSING_LENGTH);
      mentionEntity.length = 'ten';

      expect(functionCall).toThrow(MentionEntity.ERROR.MISSING_LENGTH);
      mentionEntity.length = 10;

      expect(functionCall).toThrow(MentionEntity.ERROR.MISSING_USER_ID);
      mentionEntity.userId = 1337;

      expect(functionCall).toThrow(MentionEntity.ERROR.MISSING_USER_ID);
    });

    it('should throw with inconsistent properties', () => {
      const mentionEntity = new MentionEntity(-1, 10, userId);
      const functionCall = () => mentionEntity.validate(textMessage);

      expect(functionCall).toThrow(MentionEntity.ERROR.INVALID_START_INDEX);
      mentionEntity.startIndex = 14;
      mentionEntity.length = -1;

      expect(functionCall).toThrow(MentionEntity.ERROR.INVALID_LENGTH);
      mentionEntity.length = 40;

      expect(() => mentionEntity.validate('')).toThrow(MentionEntity.ERROR.OUT_OF_BOUNDS);
      expect(functionCall).toThrow(MentionEntity.ERROR.OUT_OF_BOUNDS);
      mentionEntity.length = 10;
      mentionEntity.userId = '1337';

      expect(functionCall).toThrow(MentionEntity.ERROR.INVALID_USER_ID);
      mentionEntity.userId = userId;
      const functionToThrow = () => mentionEntity.validate('Hello, World! Please read!');

      expect(functionToThrow).toThrow(MentionEntity.ERROR.INVALID_START_CHAR);
    });

    it('should return true on validation', () => {
      const mentionEntity = new MentionEntity(14, 10, userId);

      expect(mentionEntity.validate(textMessage)).toBe(true);
      const beginningTextMessage = '@Gregor Can you please take a look?';
      const beginningMentionEntity = new MentionEntity(0, 7, userId);

      expect(beginningMentionEntity.validate(beginningTextMessage)).toBe(true);
      const endTextMessage = 'Can you please take a look? @Gregor';
      const endMentionEntity = new MentionEntity(28, 7, userId);

      expect(endMentionEntity.validate(endTextMessage)).toBe(true);
    });

    it('supports line breaks in texts with mentions', async () => {
      const encodedMention = 'CAEQCBokNDRiZDc3NmUtODcxOS00MzIwLWIxYTAtMzU0Y2NkOGU5ODNh';
      const mentionArray = base64ToArray(encodedMention);
      const protoMention = Mention.decode(mentionArray);
      const mentionEntity = new MentionEntity(protoMention.start, protoMention.length, protoMention.userId);
      const messageText = '\n@Firefox';

      expect(mentionEntity.validate(messageText)).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('should return a well-formed JSON object', () => {
      const mentionEntity = new MentionEntity(14, 10, userId);
      const expectedResult = {length: 10, startIndex: 14, userId};

      expect(mentionEntity.toJSON()).toEqual(expectedResult);
    });
  });
});
