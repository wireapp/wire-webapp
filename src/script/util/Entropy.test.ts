/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {EntropyData, shannonEntropy, calculateDeltaValues} from './Entropy';

describe('Entropy', () => {
  describe(`Shannon entropy`, () => {
    it.each([
      [1, new Uint8Array([0, 0, 0, 0]), 0, 0],
      [1, new Uint8Array([0, 1, 2, 3]), 2, 0],
      [1, new Uint8Array([0, 3, 1, 2, 2, 1, 3, 0]), 2, 1.950212064914747],
      [2, new Uint8Array([0, 3, 1, 2, 2, 1, 3, 0]), 2, 0],
      [
        1,
        new Uint8Array([
          0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
          30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56,
          57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83,
          84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108,
          109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127,
        ]),
        7,
        0,
      ],
      [
        2,
        new Uint8Array([
          0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
          30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56,
          57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83,
          84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108,
          109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127,
        ]),
        7,
        0,
      ],
      [
        1,
        new Uint8Array([
          73, 111, 63, 65, 109, 6, 25, 21, 0, 11, 119, 93, 47, 108, 12, 98, 113, 6, 36, 101, 53, 37, 119, 90, 70, 127,
          34, 43, 64, 89, 42, 109, 125, 83, 26, 88, 77, 127, 2, 107, 54, 37, 111, 67, 33, 28, 45, 10, 106, 111, 14, 10,
          57, 43, 115, 101, 59, 34, 49, 37, 59, 4, 35, 55, 59, 104, 118, 66, 106, 94, 96, 85, 50, 55, 11, 57, 51, 43,
          30, 16, 91, 126, 35, 4, 37, 67, 90, 85, 127, 122, 9, 117, 14, 83, 68, 55, 84, 37, 72, 112, 99, 51, 118, 45,
          100, 26, 2, 0, 113, 124, 23, 52, 21, 77, 88, 104, 42, 33, 114, 81, 87, 118, 28, 115, 50, 117, 122, 84,
        ]),
        6.15516433212955,
        5.843620293051202,
      ],
      [
        2,
        new Uint8Array([
          73, 111, 63, 65, 109, 6, 25, 21, 0, 11, 119, 93, 47, 108, 12, 98, 113, 6, 36, 101, 53, 37, 119, 90, 70, 127,
          34, 43, 64, 89, 42, 109, 125, 83, 26, 88, 77, 127, 2, 107, 54, 37, 111, 67, 33, 28, 45, 10, 106, 111, 14, 10,
          57, 43, 115, 101, 59, 34, 49, 37, 59, 4, 35, 55, 59, 104, 118, 66, 106, 94, 96, 85, 50, 55, 11, 57, 51, 43,
          30, 16, 91, 126, 35, 4, 37, 67, 90, 85, 127, 122, 9, 117, 14, 83, 68, 55, 84, 37, 72, 112, 99, 51, 118, 45,
          100, 26, 2, 0, 113, 124, 23, 52, 21, 77, 88, 104, 42, 33, 114, 81, 87, 118, 28, 115, 50, 117, 122, 84,
        ]),
        6.15516433212955,
        5.85697424495967,
      ],
    ])('Calculate %d-dimensonial entropy on: %s', (dimension, input, entropy, deltaEntropy) => {
      expect(shannonEntropy(input)).toBe(entropy);
      expect(shannonEntropy(calculateDeltaValues(input, dimension))).toBe(deltaEntropy);
    });

    it.each([
      [1, new Uint8Array([0, 0, 0, 0]), new Uint8Array([0, 0, 0])],
      [1, new Uint8Array([0, 1, 2, 3]), new Uint8Array([1, 1, 1])],
      [2, new Uint8Array([0, 1, 2, 3]), new Uint8Array([2, 2])],
      [1, new Uint8Array([0, 3, 1, 2, 2, 1, 3, 0]), new Uint8Array([3, 2, 1, 0, 1, 2, 3])],
      [2, new Uint8Array([0, 3, 1, 2, 2, 1, 3, 0]), new Uint8Array([1, 1, 1, 1, 1, 1])],
    ])('Calculate %d-dimensonial delta values on: %s', (dimension, input, output) => {
      expect(calculateDeltaValues(input, dimension)).toStrictEqual(output);
    });

    it('returns zero for empty entropyData', () => {
      expect(new EntropyData().entropyBits).toEqual(0);
    });
  });
});
