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

import {isEmptyString} from '@sindresorhus/is';

/** Matches ConversationRepository.CONFIG.GROUP.MAX_NAME_LENGTH — meeting titles become conversation names. */
export const MEETING_TITLE_MAX_LENGTH = 64;

export const meetingTitleErrorKeys = {
  required: 'meetings.scheduleModal.error.titleRequired',
  tooLong: 'meetings.scheduleModal.error.titleTooLong',
} as const;

export type MeetingTitleErrorKey = (typeof meetingTitleErrorKeys)[keyof typeof meetingTitleErrorKeys];

export const getMeetingTitleError = (title: string): MeetingTitleErrorKey | undefined => {
  const trimmedTitle = title.trim();

  if (isEmptyString(trimmedTitle)) {
    return meetingTitleErrorKeys.required;
  }

  if (trimmedTitle.length > MEETING_TITLE_MAX_LENGTH) {
    return meetingTitleErrorKeys.tooLong;
  }

  return undefined;
};

export const getMeetingTitleInputError = (title: string): MeetingTitleErrorKey | undefined => {
  const error = getMeetingTitleError(title);
  return error === meetingTitleErrorKeys.tooLong ? error : undefined;
};
