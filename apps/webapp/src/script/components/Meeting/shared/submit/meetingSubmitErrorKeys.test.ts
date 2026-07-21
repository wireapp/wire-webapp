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

import {meetingSubmitErrors} from 'Components/Meeting/MeetingSubmitErrors';

import {getScheduleMeetingSubmitErrorTranslationKeys, MEET_NOW_ERROR_TRANSLATION_KEYS} from './meetingSubmitErrorKeys';

describe('meetingSubmitErrorKeys', () => {
  it('uses Meet Now specific copy for create failures', () => {
    expect(MEET_NOW_ERROR_TRANSLATION_KEYS.createFailed).toEqual({
      titleKey: 'meetings.meetNowModal.error.createFailedTitle',
      messageKey: 'meetings.meetNowModal.error.createFailed',
    });
  });

  it('uses conversation setup copy for Meet Now conversationSetupFailed', () => {
    expect(MEET_NOW_ERROR_TRANSLATION_KEYS.conversationSetupFailed).toEqual({
      titleKey: 'meetings.error.setupFailedTitle',
      messageKey: 'meetings.error.conversationSetupFailed',
    });
  });

  it('uses setup titles for schedule create partial failures', () => {
    const createKeys = getScheduleMeetingSubmitErrorTranslationKeys('create');

    expect(createKeys.conversationSetupFailed).toEqual({
      titleKey: 'meetings.error.setupFailedTitle',
      messageKey: 'meetings.error.conversationSetupFailed',
    });
    expect(createKeys.addParticipantsFailed.titleKey).toBe('meetings.error.setupFailedTitle');
    expect(createKeys.createFailed.titleKey).toBe('meetings.scheduleModal.error.createFailedTitle');
  });

  it('uses update titles for schedule edit failures', () => {
    const editKeys = getScheduleMeetingSubmitErrorTranslationKeys('edit');

    expect(editKeys.updateFailed.titleKey).toBe('meetings.scheduleModal.error.updateFailedTitle');
    expect(editKeys.conversationSetupFailed.messageKey).toBe('meetings.error.conversationSetupFailed');
    expect(editKeys.addParticipantsFailed.titleKey).toBe('meetings.scheduleModal.error.updateFailedTitle');
    expect(editKeys[meetingSubmitErrors.removeParticipantsFailed].messageKey).toBe(
      'meetings.scheduleModal.error.removeParticipantsFailed',
    );
  });
});
