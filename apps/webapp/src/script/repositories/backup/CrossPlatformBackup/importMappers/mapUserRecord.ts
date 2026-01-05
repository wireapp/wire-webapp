/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {UserRecord} from 'Repositories/storage';

import {BackupUser} from '../CPB.library';

export const mapUserRecord = ({id: qualifiedId, name, handle}: BackupUser): UserRecord | null => {
  if (!qualifiedId || !name || !handle) {
    return null;
  }
  // We dont get all the "required" fields from the backup, so we need to outsmart the type system.
  // ToDO: Fix the backup to include all required fields or check if we can make them optional without breaking anything.
  const userRecord: UserRecord = {
    id: qualifiedId.id.toString(),
    name: name.toString(),
    handle: handle.toString(),
    qualified_id: {
      domain: qualifiedId.domain.toString(),
      id: qualifiedId.id.toString(),
    },
  } as UserRecord;
  return userRecord;
};
