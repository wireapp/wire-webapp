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

import {formatLocale} from 'Util/timeUtil';

export const formatMeetingTimeRange = (start: Date, end: Date): string => {
  const sameMeridiem = formatLocale(start, 'a') === formatLocale(end, 'a');

  return sameMeridiem
    ? `${formatLocale(start, 'hh:mm')} - ${formatLocale(end, 'hh:mm a')}`
    : `${formatLocale(start, 'hh:mm a')} - ${formatLocale(end, 'hh:mm a')}`;
};
