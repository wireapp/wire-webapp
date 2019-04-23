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

export function capToByte(value: number): number {
  const MAX_VALUE = 255;
  return Math.min(Math.abs(value * MAX_VALUE), MAX_VALUE);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getRandomNumber(minimum: number, maximum: number): number {
  return Math.floor(Math.random() * (maximum - minimum + 1) + minimum);
}

export function inRange(value: number, lowerBound: number, upperBound: number): boolean {
  return value >= lowerBound && value <= upperBound;
}

export function rootMeanSquare(floatArray: number[]): number {
  const sum = floatArray.reduce((power, number) => power + number ** 2, 0);
  return Math.sqrt(sum) / floatArray.length;
}
