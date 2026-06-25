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

import type {User} from 'Repositories/entity/user';
import type {Translate} from 'Util/localizerUtil';

const MAX_VISIBLE_NAMES = 2;

export function formatSelectedSummary(selectedUsers: User[], translate: Translate): string {
  if (selectedUsers.length === 0) {
    return '';
  }

  const names = selectedUsers.map(user => user.name());

  if (names.length === 1) {
    return names[0];
  }

  if (names.length === MAX_VISIBLE_NAMES) {
    return translate('meetings.scheduleModal.participantsSelectedSummaryTwo', {
      name1: names[0],
      name2: names[1],
    });
  }

  const remaining = names.length - MAX_VISIBLE_NAMES;
  const thirdInitial = names[MAX_VISIBLE_NAMES].charAt(0);

  return translate('meetings.scheduleModal.participantsSelectedSummaryOverflow', {
    name1: names[0],
    name2: names[1],
    initial: thirdInitial,
    count: remaining,
  });
}
