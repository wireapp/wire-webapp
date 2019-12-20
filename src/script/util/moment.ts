/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import moment, {Moment, MomentInput} from 'moment';

export const isToday = (momentDate: Moment): boolean => momentDate.isSame(new Date(), 'd');
export const isCurrentYear = (momentDate: Moment): boolean => momentDate.isSame(new Date(), 'y');
export const isSameDay = (momentDate: Moment, otherDate: MomentInput): boolean => momentDate.isSame(otherDate, 'd');
export const isSameMonth = (momentDate: Moment, otherDate: MomentInput): boolean => momentDate.isSame(otherDate, 'M');

// https://stackoverflow.com/questions/27360102/locale-and-specific-date-format-with-moment-js/29641375#29641375
export const LLDM = moment
  .localeData()
  .longDateFormat('LL')
  .replace(/Y/g, '')
  .replace(/^\W|\W$|\W\W/, '');

export const LDM = moment
  .localeData()
  .longDateFormat('L')
  .replace(/Y/g, '')
  // keep the trailing '.' if locale is 'de'
  .replace(moment.locale() === 'de' ? /\W$|\W\W/ : /^\W|\W$|\W\W/, '');
