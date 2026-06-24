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

import type {StringMeetingSubmitError} from 'Components/Meeting/MeetingSubmitErrors';
import type {TranslationKey} from 'Util/localizerUtil';

export const SCHEDULE_MEETING_ERROR_TRANSLATION_KEYS = {
  missingTimes: {
    titleKey: 'meetings.scheduleModal.error.createFailedTitle',
    messageKey: 'meetings.scheduleModal.error.missingTimes',
  },
  startInPast: {
    titleKey: 'meetings.scheduleModal.error.createFailedTitle',
    messageKey: 'meetings.schedule.errors.startInPast',
  },
  endInPast: {
    titleKey: 'meetings.scheduleModal.error.createFailedTitle',
    messageKey: 'meetings.schedule.errors.endInPast',
  },
  createFailed: {
    titleKey: 'meetings.scheduleModal.error.createFailedTitle',
    messageKey: 'meetings.scheduleModal.error.createFailed',
  },
  updateFailed: {
    titleKey: 'meetings.scheduleModal.error.updateFailedTitle',
    messageKey: 'meetings.scheduleModal.error.updateFailed',
  },
  editMeetingIdMissing: {
    titleKey: 'meetings.scheduleModal.error.updateFailedTitle',
    messageKey: 'meetings.scheduleModal.error.editMeetingIdMissing',
  },
  addInvitationFailed: {
    titleKey: 'meetings.scheduleModal.error.updateFailedTitle',
    messageKey: 'meetings.scheduleModal.error.addInvitationFailed',
  },
  removeInvitationFailed: {
    titleKey: 'meetings.scheduleModal.error.updateFailedTitle',
    messageKey: 'meetings.scheduleModal.error.removeInvitationFailed',
  },
} as const satisfies Record<StringMeetingSubmitError, {titleKey: TranslationKey; messageKey: TranslationKey}>;
