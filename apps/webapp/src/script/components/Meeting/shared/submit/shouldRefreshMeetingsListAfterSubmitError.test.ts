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

import {meetingSubmitErrors} from 'Components/Meeting/meetingSubmitErrors';

import {shouldRefreshMeetingsListAfterSubmitError} from './shouldRefreshMeetingsListAfterSubmitError';

describe('shouldRefreshMeetingsListAfterSubmitError', () => {
  it('returns true for participant sync partial failures', () => {
    expect(shouldRefreshMeetingsListAfterSubmitError(meetingSubmitErrors.addParticipantsFailed)).toBe(true);
    expect(shouldRefreshMeetingsListAfterSubmitError(meetingSubmitErrors.removeParticipantsFailed)).toBe(true);
    expect(shouldRefreshMeetingsListAfterSubmitError(meetingSubmitErrors.conversationSetupFailed)).toBe(true);
  });

  it('returns false for failures before server state changed', () => {
    expect(shouldRefreshMeetingsListAfterSubmitError(meetingSubmitErrors.createFailed)).toBe(false);
    expect(shouldRefreshMeetingsListAfterSubmitError(meetingSubmitErrors.updateFailed)).toBe(false);
    expect(shouldRefreshMeetingsListAfterSubmitError('missingTimes')).toBe(false);
  });
});
