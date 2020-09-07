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

import {inRange, capToByte, clamp, getRandomNumber, rootMeanSquare, roundLogarithmic} from 'Util/NumberUtil';

describe('NumberUtil', () => {
  describe('inRange', () => {
    it('returns true for values inside the specified range', () => {
      expect(inRange(0, 0, 2)).toBeTruthy();
      expect(inRange(1, 0, 2)).toBeTruthy();
      expect(inRange(1, 0, 2)).toBeTruthy();
    });

    it('returns false for values outside the specified range', () => {
      expect(inRange(undefined, 0, 2)).toBeFalsy();
      expect(inRange(-1, 0, 2)).toBeFalsy();
      expect(inRange(3, 0, 2)).toBeFalsy();
    });
  });

  describe('capToByte', () => {
    it('returns a byte sized number for values from 0 - 1', () => {
      expect(capToByte(0)).toBe(0);
      expect(capToByte(0.5)).toBe(127);
      expect(capToByte(1)).toBe(255);
    });

    it('returns a normalized byte sized number for values other than 0 - 1', () => {
      expect(capToByte(-0.5)).toBe(127);
      expect(capToByte(100)).toBe(255);
    });
  });

  describe('clamp', () => {
    it('returns the value clamped to the specified range', () => {
      expect(clamp(-100, 0, 10)).toBe(0);
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(1, 0, 10)).toBe(1);
      expect(clamp(10, 0, 10)).toBe(10);
      expect(clamp(100, 0, 10)).toBe(10);
    });
  });

  describe('getRandomNumber', () => {
    it('returns a random integer in the specified range', () => {
      expect(getRandomNumber(1, 1)).toBe(1);
      const randomNumber = getRandomNumber(1, 10);

      expect(randomNumber).toBeGreaterThanOrEqual(1);
      expect(randomNumber).toBeLessThanOrEqual(10);
    });
  });

  describe('rootMeanSquare', () => {
    it('returns the root mean square of an array of numbers', () => {
      expect(rootMeanSquare([1, 2, 3, 4, 5, 6, 7])).toBeCloseTo(1.69);
    });
  });

  describe('roundLogarithmic', () => {
    it('rounds zero to zero with any factor', () => {
      expect(roundLogarithmic(0, 1)).toBe(0);
      expect(roundLogarithmic(0, 2)).toBe(0);
      expect(roundLogarithmic(0, 3)).toBe(0);
      expect(roundLogarithmic(0, 4)).toBe(0);
      expect(roundLogarithmic(0, 5)).toBe(0);
      expect(roundLogarithmic(0, 6)).toBe(0);
    });

    it('returns correct logarithmic rounded number', () => {
      expect(roundLogarithmic(1, 2)).toBe(1);
      expect(roundLogarithmic(2, 2)).toBe(2);
      expect(roundLogarithmic(3, 2)).toBe(3);
      expect(roundLogarithmic(4, 2)).toBe(4);
      expect(roundLogarithmic(5, 2)).toBe(4);
      expect(roundLogarithmic(6, 2)).toBe(6);
      expect(roundLogarithmic(7, 2)).toBe(6);
      expect(roundLogarithmic(362, 2)).toBe(256);
      expect(roundLogarithmic(500, 2)).toBe(363);
    });
  });
});
