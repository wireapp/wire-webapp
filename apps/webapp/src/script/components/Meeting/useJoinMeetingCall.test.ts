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

import {Result} from 'true-myth';

import {joinMeetingCallErrors} from 'Components/Meeting/joinMeetingCall';

import {handleJoinMeetingCallResult} from './useJoinMeetingCall';

describe('handleJoinMeetingCallResult', () => {
  it('shows the conversation-not-found modal when joinMeetingCall returns conversationNotFound', () => {
    const showConversationNotFoundModal = jest.fn();
    const showJoinFailedModal = jest.fn();

    handleJoinMeetingCallResult(Result.err(joinMeetingCallErrors.conversationNotFound), {
      showConversationNotFoundModal,
      showJoinFailedModal,
    });

    expect(showConversationNotFoundModal).toHaveBeenCalledTimes(1);
    expect(showJoinFailedModal).not.toHaveBeenCalled();
  });

  it('shows the call-not-established modal when joinMeetingCall returns joinFailed', () => {
    const showConversationNotFoundModal = jest.fn();
    const showJoinFailedModal = jest.fn();

    handleJoinMeetingCallResult(Result.err(joinMeetingCallErrors.joinFailed), {
      showConversationNotFoundModal,
      showJoinFailedModal,
    });

    expect(showJoinFailedModal).toHaveBeenCalledTimes(1);
    expect(showConversationNotFoundModal).not.toHaveBeenCalled();
  });

  it('does not show a modal when joinMeetingCall succeeds', () => {
    const showConversationNotFoundModal = jest.fn();
    const showJoinFailedModal = jest.fn();

    handleJoinMeetingCallResult(Result.ok(undefined), {
      showConversationNotFoundModal,
      showJoinFailedModal,
    });

    expect(showConversationNotFoundModal).not.toHaveBeenCalled();
    expect(showJoinFailedModal).not.toHaveBeenCalled();
  });
});
