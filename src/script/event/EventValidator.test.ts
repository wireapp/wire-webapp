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

import {CONVERSATION_EVENT, ConversationOtrMessageAddNotification} from '@wireapp/api-client/dist/commonjs/event';
import {EventSource} from './EventSource';
import {EventValidation} from './EventValidation';
import {handleEventValidation} from './EventValidator';

describe('EventValidator', () => {
  describe('handleEventValidation', () => {
    it('ignores "conversation.typing" events', () => {
      const event = {
        conversation: '3da298fd-0ed4-4e51-863c-bfd2f5b9089b',
        data: {status: 'started'},
        from: 'ce1a2792-fb51-4977-a8e5-7a1dd8f2bb0b',
        time: '2019-09-10T16:16:25.635Z',
        type: CONVERSATION_EVENT.TYPING,
      };

      const source = EventSource.WEB_SOCKET;

      const result = handleEventValidation(event, source, undefined);

      expect(result).toBe(EventValidation.IGNORED_TYPE);
    });

    it('skips outdated events arriving via notification stream', () => {
      const event: ConversationOtrMessageAddNotification = {
        conversation: '3da298fd-0ed4-4e51-863c-bfd2f5b9089b',
        data: {
          recipient: 'a211140d4f00bf24',
          sender: '86dca64a2a6a0ace',
          text: 'ENCRYPTED',
        },
        from: 'ce1a2792-fb51-4977-a8e5-7a1dd8f2bb0b',
        time: '2018-09-10T16:05:01.794Z',
        type: CONVERSATION_EVENT.OTR_MESSAGE_ADD,
      };

      const source = EventSource.STREAM;

      const lastEventDate = '2019-09-10T16:05:01.794Z';

      const result = handleEventValidation(event, source, lastEventDate);

      expect(result).toBe(EventValidation.OUTDATED_TIMESTAMP);
    });
  });
});
