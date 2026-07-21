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

import type {MeetingSubmitErrors} from 'Components/Meeting/meetingSubmitErrors';
import type {TranslationKey} from 'Util/localizerUtil';

import type {MeetingSubmitErrorTranslationMap} from './meetingSubmitErrorKeys';

export const DELETE_MEETING_ERROR_TRANSLATION_KEYS = {
  missingTimes: {
    titleKey: 'meetings.deleteModal.error.deleteFailedTitle' as TranslationKey,
    messageKey: 'meetings.deleteModal.error.deleteFailed' as TranslationKey,
  },
  startInPast: {
    titleKey: 'meetings.deleteModal.error.deleteFailedTitle' as TranslationKey,
    messageKey: 'meetings.deleteModal.error.deleteFailed' as TranslationKey,
  },
  endInPast: {
    titleKey: 'meetings.deleteModal.error.deleteFailedTitle' as TranslationKey,
    messageKey: 'meetings.deleteModal.error.deleteFailed' as TranslationKey,
  },
  createFailed: {
    titleKey: 'meetings.deleteModal.error.deleteFailedTitle' as TranslationKey,
    messageKey: 'meetings.deleteModal.error.deleteFailed' as TranslationKey,
  },
  conversationSetupFailed: {
    titleKey: 'meetings.deleteModal.error.deleteFailedTitle' as TranslationKey,
    messageKey: 'meetings.deleteModal.error.deleteFailed' as TranslationKey,
  },
  updateFailed: {
    titleKey: 'meetings.deleteModal.error.deleteFailedTitle' as TranslationKey,
    messageKey: 'meetings.deleteModal.error.deleteFailed' as TranslationKey,
  },
  editMeetingIdMissing: {
    titleKey: 'meetings.deleteModal.error.deleteFailedTitle' as TranslationKey,
    messageKey: 'meetings.deleteModal.error.deleteFailed' as TranslationKey,
  },
  addParticipantsFailed: {
    titleKey: 'meetings.deleteModal.error.deleteFailedTitle' as TranslationKey,
    messageKey: 'meetings.deleteModal.error.deleteFailed' as TranslationKey,
  },
  removeParticipantsFailed: {
    titleKey: 'meetings.deleteModal.error.deleteFailedTitle' as TranslationKey,
    messageKey: 'meetings.deleteModal.error.removeParticipantsFailed' as TranslationKey,
  },
  deleteFailed: {
    titleKey: 'meetings.deleteModal.error.deleteFailedTitle' as TranslationKey,
    messageKey: 'meetings.deleteModal.error.deleteFailed' as TranslationKey,
  },
  leaveConversationFailed: {
    titleKey: 'meetings.deleteModal.error.deleteFailedTitle' as TranslationKey,
    messageKey: 'meetings.deleteModal.error.leaveConversationFailed' as TranslationKey,
  },
  refreshFailed: {
    titleKey: 'meetings.deleteModal.error.deleteFailedTitle' as TranslationKey,
    messageKey: 'meetings.deleteModal.error.deleteFailed' as TranslationKey,
  },
} satisfies MeetingSubmitErrorTranslationMap satisfies Record<MeetingSubmitErrors, unknown>;
