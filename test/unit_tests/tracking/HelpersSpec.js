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

import {CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation/';

import {Conversation} from 'Repositories/entity/Conversation';
import {ConversationType as ConversationTypeAttribute} from 'Repositories/tracking/attribute';
import * as trackingHelpers from 'Repositories/tracking/Helpers';
import {createUuid} from 'Util/uuid';

describe('trackingHelpers', () => {
  describe('getConversationType', () => {
    it('returns correct type for one on one conversation', () => {
      const conversation_et = new Conversation(createUuid());
      conversation_et.type(CONVERSATION_TYPE.ONE_TO_ONE);

      expect(trackingHelpers.getConversationType(conversation_et)).toBe(ConversationTypeAttribute.ONE_TO_ONE);
    });

    it('returns correct type for group conversation', () => {
      const conversation_et = new Conversation(createUuid());
      conversation_et.type(CONVERSATION_TYPE.REGULAR);

      expect(trackingHelpers.getConversationType(conversation_et)).toBe(ConversationTypeAttribute.GROUP);
    });

    it('returns undefined if type cannot be determined', () => {
      expect(trackingHelpers.getConversationType({})).not.toBeDefined();
      expect(trackingHelpers.getConversationType()).not.toBeDefined();
    });
  });
});
