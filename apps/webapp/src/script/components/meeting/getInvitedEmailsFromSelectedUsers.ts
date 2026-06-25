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

import is from '@sindresorhus/is';
import {Maybe, maybe} from 'true-myth';

import type {ScheduleMeetingFormState} from 'Components/meeting/scheduleMeetingModal/scheduleMeetingTypes';

export const getInvitedEmailsFromSelectedUsers = (
  selectedUsers: ScheduleMeetingFormState['selectedUsers'],
): Maybe<string[]> => {
  const emails = selectedUsers.map(user => user.email()).filter((email): email is string => is.nonEmptyString(email));

  const hasMissingEmail = selectedUsers.some(user => !is.nonEmptyString(user.email()));

  if (hasMissingEmail) {
    return maybe.nothing();
  }

  return maybe.just(emails);
};
