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

// grunt test_run:message/MentionEntity

describe('MentionEntity', () => {
  const userId = '7bec1483-5b11-429d-9759-ec71369654b5';

  beforeAll(() => z.util.protobuf.loadProtos('ext/proto/@wireapp/protocol-messaging/messages.proto'));

  describe('validate', () => {
    const textMessage = 'Hello, World! @test_user Please read!';

    it('should throw with missing properties or wrong types', () => {
      const mentionEntity = new z.message.MentionEntity();
      const functionCall = () => mentionEntity.validate(textMessage);

      expect(functionCall).toThrowError(z.message.MentionEntity.ERROR.MISSING_START_INDEX);
      mentionEntity.startIndex = 'fourteen';

      expect(functionCall).toThrowError(z.message.MentionEntity.ERROR.MISSING_START_INDEX);
      mentionEntity.startIndex = 14;

      expect(functionCall).toThrowError(z.message.MentionEntity.ERROR.MISSING_LENGTH);
      mentionEntity.length = 'ten';

      expect(functionCall).toThrowError(z.message.MentionEntity.ERROR.MISSING_LENGTH);
      mentionEntity.length = 10;

      expect(functionCall).toThrowError(z.message.MentionEntity.ERROR.MISSING_USER_ID);
      mentionEntity.userId = 1337;

      expect(functionCall).toThrowError(z.message.MentionEntity.ERROR.MISSING_USER_ID);
    });

    it('should throw with inconsistent properties', () => {
      const mentionEntity = new z.message.MentionEntity(-1, 10, userId);
      const functionCall = () => mentionEntity.validate(textMessage);

      expect(functionCall).toThrowError(z.message.MentionEntity.ERROR.INVALID_START_INDEX);
      mentionEntity.startIndex = 14;
      mentionEntity.length = -1;

      expect(functionCall).toThrowError(z.message.MentionEntity.ERROR.INVALID_LENGTH);
      mentionEntity.length = 40;

      expect(() => mentionEntity.validate('')).toThrowError(z.message.MentionEntity.ERROR.OUT_OF_BOUNDS);
      expect(functionCall).toThrowError(z.message.MentionEntity.ERROR.OUT_OF_BOUNDS);
      mentionEntity.length = 10;
      mentionEntity.userId = '1337';

      expect(functionCall).toThrowError(z.message.MentionEntity.ERROR.INVALID_USER_ID);
      mentionEntity.userId = userId;
      const functionToThrow = () => mentionEntity.validate('Hello, World! Please read!');

      expect(functionToThrow).toThrowError(z.message.MentionEntity.ERROR.INVALID_START_CHAR);
    });

    it('should return true on validation', () => {
      const mentionEntity = new z.message.MentionEntity(14, 10, userId);

      expect(mentionEntity.validate(textMessage)).toBe(true);
      const beginningTextMessage = '@Gregor Can you please take a look?';
      const beginningMentionEntity = new z.message.MentionEntity(0, 7, userId);

      expect(beginningMentionEntity.validate(beginningTextMessage)).toBe(true);
      const endTextMessage = 'Can you please take a look? @Gregor';
      const endMentionEntity = new z.message.MentionEntity(28, 7, userId);

      expect(endMentionEntity.validate(endTextMessage)).toBe(true);
    });

    it('supports line breaks in texts with mentions', () => {
      const encodedMention = 'CAEQCBokNDRiZDc3NmUtODcxOS00MzIwLWIxYTAtMzU0Y2NkOGU5ODNh';
      const protoMention = z.proto.Mention.decode64(encodedMention);
      const mentionEntity = new z.message.MentionEntity(protoMention.start, protoMention.length, protoMention.user_id);
      const messageText = '\n@Firefox';

      expect(mentionEntity.validate(messageText)).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('should return a well-formed JSON object', () => {
      const mentionEntity = new z.message.MentionEntity(14, 10, userId);
      const expectedResult = {length: 10, startIndex: 14, userId};

      expect(mentionEntity.toJSON()).toEqual(expectedResult);
    });
  });
});
