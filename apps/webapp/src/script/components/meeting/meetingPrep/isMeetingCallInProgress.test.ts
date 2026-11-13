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

import {STATE as CALL_STATE} from '@wireapp/avs';

import {isMeetingCallInProgress} from './isMeetingCallInProgress';

const meetingConversation = {id: 'meeting-conversation', domain: 'wire.test'};
const otherConversation = {id: 'other-conversation', domain: 'wire.test'};

describe('isMeetingCallInProgress', () => {
  it.each([CALL_STATE.INCOMING, CALL_STATE.ANSWERED, CALL_STATE.MEDIA_ESTAB, CALL_STATE.OUTGOING])(
    'counts a call in state %s in the meeting conversation',
    state => {
      expect(
        isMeetingCallInProgress([{qualifiedConversationId: meetingConversation, state}], meetingConversation),
      ).toBe(true);
    },
  );

  it.each([CALL_STATE.NONE, CALL_STATE.TERM_LOCAL, CALL_STATE.TERM_REMOTE, CALL_STATE.UNKNOWN])(
    'ignores a call in state %s',
    state => {
      expect(
        isMeetingCallInProgress([{qualifiedConversationId: meetingConversation, state}], meetingConversation),
      ).toBe(false);
    },
  );

  it('ignores calls in other conversations and an empty list', () => {
    expect(
      isMeetingCallInProgress(
        [{qualifiedConversationId: otherConversation, state: CALL_STATE.MEDIA_ESTAB}],
        meetingConversation,
      ),
    ).toBe(false);
    expect(isMeetingCallInProgress([], meetingConversation)).toBe(false);
  });
});
