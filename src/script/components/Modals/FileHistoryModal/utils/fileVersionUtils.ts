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

import {t} from 'Util/LocalizerUtil';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {formatBytes} from 'Util/util';

import {FileVersion} from '../types';

/**
 * Calculate the number of days between two dates
 */
export const calculateDaysDifference = (date1: Date, date2: Date): number => {
  const day1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const day2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.floor((day1.getTime() - day2.getTime()) / TIME_IN_MILLIS.DAY);
};

/**
 * Get the day prefix for a version based on days difference
 */
export const getDayPrefix = (daysDiff: number, timestamp: number): string => {
  if (daysDiff === 0) {
    return t('fileHistoryModal.today');
  }
  if (daysDiff === 1) {
    return t('fileHistoryModal.yesterday');
  }
  return new Intl.DateTimeFormat(navigator.language, {
    weekday: 'long',
  }).format(timestamp);
};

/**
 * Format a date key for grouping file versions
 */
export const formatDateKey = (timestamp: number, dayPrefix: string): string => {
  const formattedDate = new Intl.DateTimeFormat(navigator.language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(timestamp);
  return `${dayPrefix}, ${formattedDate}`;
};

/**
 * Format time from timestamp
 */
export const formatTime = (timestamp: number): string => {
  return new Intl.DateTimeFormat(navigator.language, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
};

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
