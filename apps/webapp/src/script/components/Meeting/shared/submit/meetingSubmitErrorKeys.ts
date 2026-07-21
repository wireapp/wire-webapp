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
import type {ScheduleMeetingMode} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingTypes';
import type {TranslationKey} from 'Util/localizerUtil';

export type MeetingSubmitErrorTranslationKeys = {
  titleKey: TranslationKey;
  messageKey: TranslationKey;
};

export type MeetingSubmitErrorTranslationMap = Record<MeetingSubmitErrors, MeetingSubmitErrorTranslationKeys>;

const meetNowCreateFailureKeys: MeetingSubmitErrorTranslationKeys = {
  titleKey: 'meetings.meetNowModal.error.createFailedTitle',
  messageKey: 'meetings.meetNowModal.error.createFailed',
};

const persistedSetupFailureKeys = {
  conversationSetupFailed: {
    titleKey: 'meetings.error.setupFailedTitle',
    messageKey: 'meetings.error.conversationSetupFailed',
  },
  addParticipantsFailed: {
    titleKey: 'meetings.error.setupFailedTitle',
    messageKey: 'meetings.error.addParticipantsFailed',
  },
} satisfies Pick<MeetingSubmitErrorTranslationMap, 'conversationSetupFailed' | 'addParticipantsFailed'>;

export const MEET_NOW_ERROR_TRANSLATION_KEYS = {
  missingTimes: meetNowCreateFailureKeys,
  startInPast: meetNowCreateFailureKeys,
  endInPast: meetNowCreateFailureKeys,
  createFailed: meetNowCreateFailureKeys,
  conversationSetupFailed: persistedSetupFailureKeys.conversationSetupFailed,
  updateFailed: meetNowCreateFailureKeys,
  editMeetingIdMissing: meetNowCreateFailureKeys,
  addParticipantsFailed: persistedSetupFailureKeys.addParticipantsFailed,
  removeParticipantsFailed: meetNowCreateFailureKeys,
  deleteFailed: meetNowCreateFailureKeys,
  leaveConversationFailed: meetNowCreateFailureKeys,
  refreshFailed: meetNowCreateFailureKeys,
} satisfies MeetingSubmitErrorTranslationMap;

export const getScheduleMeetingSubmitErrorTranslationKeys = (
  mode: ScheduleMeetingMode,
): MeetingSubmitErrorTranslationMap => {
  const createFailureTitleKey = 'meetings.scheduleModal.error.createFailedTitle';
  const updateFailureTitleKey = 'meetings.scheduleModal.error.updateFailedTitle';
  const setupFailureTitleKey = mode === 'create' ? 'meetings.error.setupFailedTitle' : updateFailureTitleKey;

  return {
    missingTimes: {
      titleKey: createFailureTitleKey,
      messageKey: 'meetings.scheduleModal.error.missingTimes',
    },
    startInPast: {
      titleKey: createFailureTitleKey,
      messageKey: 'meetings.schedule.errors.startInPast',
    },
    endInPast: {
      titleKey: createFailureTitleKey,
      messageKey: 'meetings.schedule.errors.endInPast',
    },
    createFailed: {
      titleKey: createFailureTitleKey,
      messageKey: 'meetings.scheduleModal.error.createFailed',
    },
    conversationSetupFailed: {
      titleKey: setupFailureTitleKey,
      messageKey: 'meetings.error.conversationSetupFailed',
    },
    updateFailed: {
      titleKey: updateFailureTitleKey,
      messageKey: 'meetings.scheduleModal.error.updateFailed',
    },
    editMeetingIdMissing: {
      titleKey: updateFailureTitleKey,
      messageKey: 'meetings.scheduleModal.error.editMeetingIdMissing',
    },
    addParticipantsFailed: {
      titleKey: setupFailureTitleKey,
      messageKey: 'meetings.scheduleModal.error.addParticipantsFailed',
    },
    removeParticipantsFailed: {
      titleKey: updateFailureTitleKey,
      messageKey: 'meetings.scheduleModal.error.removeParticipantsFailed',
    },
    deleteFailed: {
      titleKey: 'meetings.deleteModal.error.deleteFailedTitle',
      messageKey: 'meetings.deleteModal.error.deleteFailed',
    },
    leaveConversationFailed: {
      titleKey: 'meetings.deleteModal.error.deleteFailedTitle',
      messageKey: 'meetings.deleteModal.error.leaveConversationFailed',
    },
    refreshFailed: {
      titleKey: updateFailureTitleKey,
      messageKey: 'meetings.scheduleModal.error.updateFailed',
    },
  };
};
