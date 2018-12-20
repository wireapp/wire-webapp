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

z.util.NumberUtil = {
  capToByte: value => {
    const MAX_VALUE = 255;
    return Math.min(Math.abs(parseInt(value * MAX_VALUE, 10)), MAX_VALUE);
  },

  clamp: (value, min, max) => {
    return Math.max(min, Math.min(max, value));
  },

  getRandomNumber: (minimum, maximum) => Math.floor(Math.random() * (maximum - minimum + 1) + minimum),

  inRange: (value, lowerBound, upperBound) => value >= lowerBound && value <= upperBound,

  rootMeanSquare: floatArray => {
    const pow = floatArray.map(number => Math.pow(number, 2));
    const sum = pow.reduce((power, number) => power + number);
    return Math.sqrt(sum) / floatArray.length;
  },
};
