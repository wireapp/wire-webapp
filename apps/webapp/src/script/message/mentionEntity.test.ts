/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {EVERYONE_MENTION_VALUE, MentionEntity} from './mentionEntity';

import {createUuid} from '../util/uuid';

describe('MentionEntity', () => {
  describe('everyone', () => {
    const text = `Hey @${EVERYONE_MENTION_VALUE}, lunch?`;
    const startIndex = text.indexOf('@');

    it('creates a mention of everyone with no user target', () => {
      const mention = MentionEntity.everyone(startIndex, 4);

      expect(mention.isEveryone).toBe(true);
      expect(mention.userId).toBe('');
      expect(mention.domain).toBeUndefined();
    });

    it('never targets a single user', () => {
      const mention = MentionEntity.everyone(startIndex, 4);

      expect(mention.targetsUser({domain: '', id: ''})).toBe(false);
      expect(mention.targetsUser({domain: 'wire.com', id: createUuid()})).toBe(false);
    });

    it('is valid without a user id', () => {
      const mention = MentionEntity.everyone(startIndex, 4);

      expect(mention.validate(text)).toBe(true);
    });

    it('is still checked for its range and its @', () => {
      expect(() => {
        return MentionEntity.everyone(text.length, 4).validate(text);
      }).toThrow(MentionEntity.ERROR.OUT_OF_BOUNDS);
      expect(() => {
        return MentionEntity.everyone(startIndex, 0).validate(text);
      }).toThrow(MentionEntity.ERROR.INVALID_LENGTH);
      expect(() => {
        return MentionEntity.everyone(0, 3).validate(text);
      }).toThrow(MentionEntity.ERROR.INVALID_START_CHAR);
    });

    it('encodes to the protocol with everyone set and no user ids', () => {
      const mention = MentionEntity.everyone(3, 4);

      const decoded = Mention.decode(Mention.encode(mention.toProto()).finish());

      expect(decoded.start).toBe(3);
      expect(decoded.length).toBe(4);
      expect(decoded.everyone).toBe(true);
      expect(decoded.userId ?? '').toBe('');
      expect(decoded.qualifiedUserId).toBeNull();
    });

    it('marks itself in its JSON', () => {
      expect(MentionEntity.everyone(3, 4).toJSON()).toEqual({
        everyone: true,
        length: 4,
        startIndex: 3,
        userId: '',
        userQualifiedId: undefined,
      });
    });
  });

  describe('user mentions', () => {
    it('keep their content and JSON shape', () => {
      const userId = createUuid();
      const mention = new MentionEntity(0, 6, userId, 'wire.com');

      expect(mention.isEveryone).toBe(false);
      expect(mention.toContent()).toEqual({
        length: 6,
        qualifiedUserId: {domain: 'wire.com', id: userId},
        start: 0,
        userId,
      });
      expect(mention.toJSON()).toEqual({
        length: 6,
        startIndex: 0,
        userId,
        userQualifiedId: {domain: 'wire.com', id: userId},
      });
    });
  });
});
