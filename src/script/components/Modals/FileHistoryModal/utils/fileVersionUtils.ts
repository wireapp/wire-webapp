/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {RestVersion} from 'cells-sdk-ts';

import {calculateDaysDifference, formatDateKey, formatTime, getDayPrefix, TIME_IN_MILLIS} from 'Util/TimeUtil';
import {formatBytes} from 'Util/util';

import {FileVersion} from '../types';

/**
 * Transform a RestVersion to FileVersion
 */
export const transformRestVersionToFileVersion = (version: RestVersion, timestamp: number): FileVersion => {
  return {
    versionId: version.VersionId || '',
    time: formatTime(timestamp),
    ownerName: version.OwnerName || '',
    size: formatBytes(Number(version.Size) || 0),
    downloadUrl: version.PreSignedGET?.Url || '',
  };
};

/**
 * Group file versions by date
 */
export const groupVersionsByDate = (versions: RestVersion[]): Record<string, FileVersion[]> => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return versions.reduce(
    (acc, version) => {
      // Skip versions with missing critical data
      if (!version.VersionId || !version.MTime) {
        return acc;
      }

      const timestamp = Number(version.MTime || 0) * TIME_IN_MILLIS.SECOND;
      const versionDate = new Date(timestamp);

      const daysDiff = calculateDaysDifference(today, versionDate);
      const dayPrefix = getDayPrefix(daysDiff, timestamp);
      const dateKey = formatDateKey(timestamp, dayPrefix);

      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }

      acc[dateKey].push(transformRestVersionToFileVersion(version, timestamp));
      return acc;
    },
    {} as Record<string, FileVersion[]>,
  );
};
