/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

'use strict';

z.util.NumberUtil = {
  cap_to_byte: function(value) {
    const MAX_VALUE = 255;
    return Math.min(Math.abs(parseInt(value * MAX_VALUE, 10)), MAX_VALUE);
  },
  get_random_number: function(minimum, maximum) {
    return Math.floor(Math.random() * (maximum - minimum + 1) + minimum);
  },
  in_range: function(value, lower_bound, upper_bound) {
    return value >= lower_bound && value <= upper_bound;
  },
  root_mean_square: function(float_array) {
    const pow = float_array.map(number => Math.pow(number, 2));
    const sum = pow.reduce((power, number) => power + number);
    return Math.sqrt(sum) / float_array.length;
  },
};
