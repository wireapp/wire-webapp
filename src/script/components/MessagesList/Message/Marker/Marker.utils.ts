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

import {t} from 'Util/LocalizerUtil';
import {formatLocale, isToday, isYesterday} from 'Util/TimeUtil';

/**
 If today: “Today”
 If yesterday: “Yesterday”
 Any other day: <Week day>, <date> (e.g. “Monday, April 12” or “Friday, January 6 2023”)
 */
export const getMessagesGroupLabel = (timestamp: number) => {
  const date = new Date(timestamp);

  if (isToday(date)) {
    return t('conversationToday');
  }

  if (isYesterday(date)) {
    return t('conversationYesterday');
  }

  const today = new Date();
  const isCurrentYear = date.getFullYear() === today.getFullYear();
  const pattern = isCurrentYear ? 'EEEE, MMMM d' : 'EEEE, MMMM d yyyy';

  return formatLocale(date, pattern);
};
