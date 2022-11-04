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

const seedrandom = require('seedrandom');

describe('Entropy', () => {
  describe(`Shannon entropy`, () => {
    describe.each([
      [1, new Uint8Array([0, 0, 0, 0]), 0, 0, 0, 0],
      [1, new Uint8Array([1, 0, 0, 0]), 0.8112781244591328, 0.9182958340544896, 1, 0],
      [1, new Uint8Array([1, 0, 0, 0, 0]), 0.7219280948873623, 0.8112781244591328, 0.9182958340544896, 1],
      [
        1,
        new Uint8Array([1, ...new Uint8Array(300)]),
        0.03213925433855834,
        0.032230355211769486,
        0.03232201166391055,
        0.032414228925827945,
      ],
      [1, new Uint8Array([0, 1, 2, 3]), 2, 0, 0, 0],
      [1, new Uint8Array([0, 3, 1, 2, 2, 1, 3, 0]), 2, 1.950212064914747, 0, 0],
      [2, new Uint8Array([0, 3, 1, 2, 2, 1, 3, 0]), 2, 0, 0, 0],
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
        0,
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
        0,
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
        5.828786792703374,
        5.592466261280107,
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
        5.805779955597288,
        5.560797305209538,
      ],
    ])(
      'Calculate %d-dimensonial entropy on: %s',
      (dimension, input, entropy, deltaEntropy, delta2Entropy, delta3Entropy) => {
        const deltaValues = calculateDeltaValues(input, dimension);
        const delta2Values = calculateDeltaValues(deltaValues, dimension);
        const delta3Values = calculateDeltaValues(delta2Values, dimension);
        it('entropy on base data', () => {
          expect(shannonEntropy(input)).toBe(entropy);
        });
        it('1st derivation', () => {
          expect(shannonEntropy(deltaValues)).toBe(deltaEntropy);
        });
        it('2nd derivation', () => {
          expect(shannonEntropy(delta2Values)).toBe(delta2Entropy);
        });
        it('3rd derivation', () => {
          expect(shannonEntropy(delta3Values)).toBe(delta3Entropy);
        });
      },
    );

    it.each([
      [1, new Uint8Array([0, 0, 0, 0, 0, 0]), new Uint8Array([0, 0, 0, 0, 0])],
      [2, new Uint8Array([0, 0, 0, 0, 0, 0]), new Uint8Array([0, 0, 0, 0])],
      [3, new Uint8Array([0, 0, 0, 0, 0, 0]), new Uint8Array([0, 0, 0])],
      [3, new Uint8Array([0, 1, 2, 0, 1, 2]), new Uint8Array([0, 0, 0])],
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

    it('makes sense with no movement', () => {
      const data = new EntropyData();
      [...Array(300)].forEach((_, i) => {
        data.addFrame({t: 0, x: 0, y: 0});
      });
      expect(data.entropyBits).toBe(0);
    });

    it('makes sense with single toggle', () => {
      const data = new EntropyData();
      [...Array(150)].forEach((_, i) => {
        data.addFrame({t: 0, x: 0, y: 0});
        data.addFrame({t: 0, x: 0, y: 1});
      });
      expect(data.entropyBits / data.entropyData.length).toBe(0);
      expect(data.entropyData.length).toBe(900);
    });

    it('makes sense with single jump', () => {
      const data = new EntropyData();
      [...Array(150)].forEach((_, i) => {
        data.addFrame({t: 0, x: 0, y: 0});
        data.addFrame({t: 0, x: 127, y: 128});
      });
      expect(data.entropyBits / data.entropyData.length).toBe(0);
      expect(data.entropyData.length).toBe(900);
    });

    it('makes sense with a linear growth', () => {
      const data = new EntropyData();
      [...Array(3)].forEach((_, i) => {
        [...Array(100)].forEach((_, j) => {
          data.addFrame({t: 0, x: j + 78, y: j * 2 + 28});
        });
      });
      expect(data.entropyBits / data.entropyData.length).toBe(0.08268771104937347);
      expect(data.entropyData.length).toBe(900);
    });

    it('makes sense with a square', () => {
      const data = new EntropyData();
      [...Array(75)].forEach((_, i) => {
        data.addFrame({t: 0, x: 0, y: 0});
        data.addFrame({t: 0, x: 0, y: 10});
        data.addFrame({t: 0, x: 10, y: 10});
        data.addFrame({t: 0, x: 10, y: 0});
      });
      expect(data.entropyBits / data.entropyData.length).toBe(0);
      expect(data.entropyData.length).toBe(900);
    });

    it('makes sense with a high resolution square', () => {
      const data = new EntropyData();
      [...Array(15)].forEach((_, i) => {
        data.addFrame({t: 0, x: 0, y: 0});
        data.addFrame({t: 0, x: 0, y: 2});
        data.addFrame({t: 0, x: 0, y: 4});
        data.addFrame({t: 0, x: 0, y: 6});
        data.addFrame({t: 0, x: 0, y: 8});
        data.addFrame({t: 0, x: 0, y: 10});
        data.addFrame({t: 0, x: 2, y: 10});
        data.addFrame({t: 0, x: 4, y: 10});
        data.addFrame({t: 0, x: 6, y: 10});
        data.addFrame({t: 0, x: 8, y: 10});
        data.addFrame({t: 0, x: 10, y: 10});
        data.addFrame({t: 0, x: 10, y: 8});
        data.addFrame({t: 0, x: 10, y: 6});
        data.addFrame({t: 0, x: 10, y: 4});
        data.addFrame({t: 0, x: 10, y: 2});
        data.addFrame({t: 0, x: 10, y: 0});
        data.addFrame({t: 0, x: 8, y: 0});
        data.addFrame({t: 0, x: 6, y: 0});
        data.addFrame({t: 0, x: 4, y: 0});
        data.addFrame({t: 0, x: 2, y: 0});
      });
      expect(data.entropyBits / data.entropyData.length).toBe(0.5628734760357693);
      expect(data.entropyData.length).toBe(900);
    });

    it('makes sense with a circle', () => {
      const data = new EntropyData();
      [...Array(300)].forEach((_, i) => {
        data.addFrame({t: 0, x: 128 + 64 * Math.cos((i / 150) * Math.PI), y: 128 + 64 * Math.sin((i / 150) * Math.PI)});
      });
      expect(data.entropyBits / data.entropyData.length).toBe(0.7601265138494917);
      expect(data.entropyData.length).toBe(900);
    });

    describe('makes sense all random data', () => {
      const randGen = seedrandom('Seed This test!');
      const randomdata = new Uint8Array([...Array(900)].map(_ => randGen.int32()));

      it('random data has 900 bytes', () => {
        expect(randomdata.length).toBe(900);
      });
      it('all random data', () => {
        const data = new EntropyData();

        [...Array(300)].forEach((_, i) => {
          data.addFrame({t: randomdata[i * 3 + 2], x: randomdata[i * 3], y: randomdata[i * 3 + 1]});
        });
        expect(data.entropyData.length).toBe(900);
        expect(data.entropyBits / data.entropyData.length).toBe(6.907510027868656);
      });
      it('only one field with random data', () => {
        const data = new EntropyData();
        const data2 = new EntropyData();

        [...Array(300)].forEach((_, i) => {
          data.addFrame({t: 0, x: randomdata[i * 3], y: 0});
          data2.addFrame({t: 0, x: 0, y: randomdata[i * 3]});
        });
        expect(data.entropyData.length).toBe(900);
        expect(data2.entropyData.length).toBe(900);
        expect(data.entropyBits / data.entropyData.length).toBe(3.085568609878797);
        expect(data2.entropyBits / data2.entropyData.length).toBe(3.085568609878797);
      });
      it('only two fields with random data', () => {
        const data = new EntropyData();

        [...Array(300)].forEach((_, i) => {
          data.addFrame({t: 0, x: randomdata[i * 3], y: randomdata[i * 3 + 1]});
        });
        expect(data.entropyData.length).toBe(900);
        expect(data.entropyBits / data.entropyData.length).toBe(5.406143674286019);
      });
    });
    describe('makes sense with real captured data', () => {
      it.each([
        [
          'random movement',
          new Uint8Array([
            89, 153, 244, 89, 156, 251, 88, 158, 3, 88, 160, 10, 88, 164, 19, 88, 170, 49, 88, 173, 60, 88, 175, 61, 88,
            177, 67, 88, 178, 75, 88, 180, 83, 88, 181, 90, 89, 182, 98, 92, 185, 110, 93, 186, 116, 95, 189, 123, 98,
            191, 132, 99, 191, 141, 102, 194, 148, 104, 195, 160, 106, 196, 164, 108, 198, 170, 111, 198, 179, 112, 199,
            186, 113, 200, 195, 115, 200, 203, 116, 200, 211, 117, 200, 219, 119, 200, 227, 121, 200, 235, 122, 200,
            243, 124, 200, 251, 125, 198, 3, 127, 197, 10, 129, 196, 18, 130, 195, 37, 131, 193, 38, 132, 192, 45, 133,
            191, 51, 133, 189, 59, 134, 188, 67, 134, 187, 75, 135, 186, 87, 136, 184, 91, 136, 182, 103, 137, 178, 106,
            137, 174, 118, 138, 170, 123, 139, 164, 131, 140, 158, 139, 140, 150, 150, 141, 143, 155, 141, 140, 163,
            141, 134, 171, 141, 128, 179, 141, 124, 187, 141, 121, 195, 141, 119, 203, 141, 117, 211, 141, 116, 219,
            140, 115, 243, 140, 114, 253, 138, 114, 4, 136, 113, 12, 135, 112, 22, 133, 112, 30, 130, 110, 35, 128, 110,
            46, 122, 107, 51, 119, 107, 59, 115, 105, 75, 110, 104, 76, 106, 103, 83, 100, 103, 91, 95, 103, 99, 93,
            103, 109, 88, 103, 115, 85, 103, 124, 82, 103, 132, 79, 103, 139, 77, 104, 147, 74, 105, 156, 71, 108, 163,
            69, 110, 172, 65, 114, 179, 62, 117, 188, 59, 121, 197, 56, 124, 204, 51, 130, 215, 48, 135, 220, 42, 142,
            228, 39, 148, 236, 35, 154, 244, 34, 156, 252, 31, 165, 8, 29, 170, 14, 28, 175, 26, 27, 181, 27, 27, 186,
            38, 27, 191, 44, 27, 196, 52, 27, 199, 60, 27, 207, 71, 27, 209, 75, 28, 212, 84, 28, 216, 92, 29, 218, 100,
            30, 219, 108, 30, 220, 116, 30, 221, 123, 31, 221, 140, 32, 221, 165, 34, 219, 205, 35, 219, 212, 37, 218,
            224, 41, 216, 228, 42, 216, 241, 44, 215, 243, 50, 214, 252, 52, 213, 4, 55, 212, 15, 61, 211, 20, 64, 209,
            28, 69, 209, 36, 73, 207, 44, 78, 206, 52, 81, 205, 60, 83, 205, 68, 86, 204, 76, 93, 201, 84, 97, 200, 93,
            100, 198, 101, 104, 195, 109, 109, 193, 117, 115, 190, 125, 122, 186, 138, 129, 182, 140, 136, 178, 149,
            143, 173, 156, 150, 168, 169, 151, 167, 172, 160, 161, 185, 161, 159, 190, 164, 156, 198, 167, 152, 204,
            168, 149, 215, 170, 147, 221, 172, 141, 228, 173, 138, 237, 173, 133, 245, 174, 129, 253, 174, 122, 5, 176,
            114, 13, 176, 106, 21, 176, 99, 29, 176, 90, 37, 176, 83, 45, 176, 76, 53, 176, 73, 62, 174, 68, 69, 173,
            64, 80, 172, 61, 85, 171, 59, 94, 169, 57, 101, 167, 54, 109, 161, 52, 117, 154, 51, 126, 150, 51, 138, 141,
            51, 144, 130, 51, 149, 120, 51, 159, 108, 51, 166, 96, 51, 175, 84, 51, 190, 73, 53, 191, 65, 54, 198, 56,
            56, 206, 53, 56, 214, 48, 57, 222, 43, 57, 229, 40, 58, 238, 37, 58, 246, 36, 59, 254, 35, 59, 7, 34, 59,
            14, 34, 58, 87, 36, 58, 110, 37, 57, 117, 43, 54, 125, 50, 51, 134, 61, 47, 142, 67, 43, 149, 78, 40, 157,
            91, 35, 166, 104, 29, 174, 115, 25, 183, 125, 22, 190, 137, 17, 199, 148, 15, 206, 156, 12, 215, 166, 10,
            222, 175, 8, 231, 182, 8, 246, 185, 8, 247, 190, 8, 254, 195, 8, 7, 197, 8, 17, 200, 8, 23, 201, 8, 33, 202,
            8, 37, 203, 11, 64, 204, 14, 70, 204, 18, 78, 204, 25, 86, 204, 34, 97, 204, 42, 101, 204, 53, 110, 204, 65,
            118, 204, 77, 126, 200, 101, 134, 199, 108, 143, 197, 120, 150, 194, 135, 160, 190, 149, 170, 186, 163, 175,
            183, 175, 182, 180, 186, 191, 180, 189, 199, 178, 196, 207, 176, 202, 217, 176, 207, 222, 176, 212, 232,
            176, 216, 238, 176, 222, 247, 176, 225, 254, 176, 228, 9, 176, 230, 19, 178, 233, 22, 180, 235, 30, 183,
            240, 39, 186, 242, 46, 187, 244, 61, 190, 246, 62, 192, 248, 70, 194, 250, 79, 196, 252, 87, 197, 253, 103,
            155, 254, 244, 144, 249, 246, 132, 243, 255, 123, 238, 7, 114, 232, 15, 106, 227, 23, 99, 222, 31, 92, 216,
            39, 79, 204, 58, 75, 200, 58, 67, 191, 63, 52, 173, 75, 43, 161, 81, 41, 155, 87, 33, 142, 96, 27, 131, 105,
            23, 121, 111, 22, 117, 121, 21, 110, 128, 19, 103, 138, 19, 98, 143, 19, 95, 152, 19, 93, 159, 19, 90, 172,
            19, 89, 179, 20, 87, 183, 21, 86, 191, 22, 84, 199, 24, 83, 207, 27, 80, 218, 29, 80, 223, 32, 79, 231, 37,
            78, 240, 41, 77, 247, 47, 77, 0, 54, 77, 15, 63, 77, 16, 70, 77, 23, 72, 77, 31, 78, 77, 40, 83, 77, 50, 85,
            77, 56, 87, 77, 65, 89, 77, 72, 90, 77, 80, 91, 77, 98, 92, 77, 104, 93, 77, 135, 94, 77, 135, 95, 77, 143,
            99, 77, 152, 100, 77, 159, 103, 77, 168, 108, 77, 179, 109, 77, 183, 112, 75, 192, 115, 73, 200, 118, 72,
            208, 120, 70, 216, 122, 68, 224, 125, 66, 232,
          ]),
          2.6729394431599505,
          1.6891177314506391,
          1.7323654966506288,
        ],
        [
          'bad movement',
          new Uint8Array([
            85, 149, 197, 85, 145, 199, 85, 142, 200, 86, 138, 212, 86, 135, 216, 87, 131, 233, 88, 126, 238, 88, 123,
            243, 88, 121, 2, 88, 119, 10, 88, 117, 16, 88, 116, 18, 88, 114, 24, 88, 113, 40, 88, 112, 57, 88, 111, 75,
            88, 110, 84, 88, 109, 107, 87, 109, 120, 86, 107, 129, 86, 106, 147, 85, 105, 160, 85, 104, 164, 84, 103,
            178, 84, 102, 186, 83, 100, 202, 83, 99, 217, 82, 99, 224, 82, 98, 235, 85, 98, 62, 86, 98, 70, 86, 99, 80,
            86, 100, 160, 85, 100, 58, 85, 99, 253, 85, 100, 255, 85, 101, 156, 86, 102, 157, 86, 103, 167, 86, 105,
            175, 86, 107, 184, 86, 109, 198, 86, 110, 231, 86, 111, 248, 86, 112, 249, 86, 111, 26, 86, 110, 72, 86,
            109, 113, 86, 108, 143, 86, 107, 173, 86, 106, 177, 86, 105, 194, 86, 104, 213, 86, 103, 226, 86, 102, 250,
            86, 101, 34, 86, 100, 56, 86, 99, 101, 86, 98, 115, 86, 99, 48, 86, 100, 74, 86, 102, 98, 86, 103, 143, 86,
            104, 144, 86, 105, 146, 86, 106, 169, 86, 107, 171, 86, 108, 227, 87, 109, 231, 87, 108, 136, 87, 107, 167,
            87, 106, 184, 87, 105, 193, 87, 104, 217, 87, 103, 233, 87, 102, 34, 87, 103, 57, 87, 104, 76, 87, 105, 90,
            87, 106, 114, 87, 107, 123, 87, 108, 154, 87, 109, 179, 87, 110, 227, 87, 109, 127, 87, 108, 140, 87, 107,
            168, 87, 106, 203, 87, 105, 219, 87, 104, 3, 87, 103, 44, 87, 102, 85, 87, 101, 157, 87, 102, 41, 87, 103,
            78, 87, 104, 100, 87, 105, 126, 87, 106, 163, 87, 107, 168, 87, 108, 205, 87, 109, 246, 87, 108, 206, 87,
            107, 222, 87, 106, 15, 87, 105, 29, 87, 104, 71, 86, 104, 77, 86, 103, 85, 86, 102, 143, 86, 103, 153, 86,
            104, 174, 86, 105, 182, 86, 106, 190, 86, 107, 199, 86, 109, 205, 86, 110, 215, 86, 111, 223, 86, 112, 234,
            86, 113, 237, 86, 114, 254, 86, 115, 22, 86, 114, 159, 86, 113, 182, 86, 112, 199, 86, 111, 222, 86, 110,
            240, 86, 109, 41, 86, 108, 84, 86, 107, 100, 86, 106, 150, 86, 105, 174, 86, 104, 207, 86, 103, 224, 86,
            102, 255, 86, 101, 23, 86, 100, 38, 86, 99, 80, 86, 98, 111, 87, 98, 192, 87, 99, 57, 87, 100, 64, 87, 101,
            72, 87, 102, 81, 87, 104, 88, 87, 105, 96, 87, 107, 104, 87, 109, 113, 87, 110, 120, 87, 111, 128, 87, 112,
            136, 87, 113, 153, 87, 114, 168, 87, 115, 248, 87, 114, 138, 87, 113, 161, 87, 112, 176, 87, 111, 207, 87,
            110, 218, 86, 110, 1, 86, 109, 16, 86, 108, 41, 86, 107, 57, 86, 106, 80, 86, 105, 97, 86, 104, 131, 86,
            103, 147, 86, 102, 170, 86, 101, 209, 86, 100, 217, 86, 99, 73, 86, 100, 163, 86, 101, 195, 86, 102, 203,
            86, 103, 212, 86, 105, 228, 86, 107, 238, 86, 109, 242, 86, 112, 252, 86, 113, 2, 86, 116, 11, 86, 117, 19,
            86, 119, 26, 86, 120, 38, 86, 121, 43, 86, 122, 50, 86, 123, 67, 86, 122, 187, 86, 121, 202, 86, 120, 226,
            86, 119, 234, 86, 118, 251, 86, 117, 2, 86, 116, 19, 86, 114, 32, 86, 112, 42, 86, 110, 58, 86, 109, 66, 86,
            108, 75, 86, 107, 81, 86, 106, 91, 86, 105, 98, 86, 104, 108, 86, 103, 125, 86, 102, 148, 86, 101, 194, 86,
            100, 234, 86, 99, 35, 86, 98, 69, 86, 99, 227, 86, 100, 243, 86, 101, 20, 86, 102, 27, 86, 103, 60, 86, 104,
            77, 86, 105, 83, 86, 106, 91, 86, 107, 99, 86, 108, 117, 86, 109, 132, 86, 110, 163, 86, 111, 99, 85, 112,
            109, 85, 111, 28, 85, 110, 44, 85, 109, 77, 85, 108, 117, 85, 107, 135, 85, 106, 152, 85, 105, 157, 85, 104,
            166, 85, 103, 197, 85, 102, 212, 85, 101, 22, 85, 100, 53, 85, 99, 138, 85, 100, 37, 85, 101, 66, 85, 102,
            82, 85, 103, 98, 85, 104, 117, 85, 105, 128, 86, 106, 142, 86, 107, 158, 86, 108, 206, 86, 109, 255, 86,
            108, 246, 86, 107, 254, 86, 106, 22, 86, 105, 30, 86, 104, 55, 86, 103, 73, 86, 102, 96, 86, 101, 134, 86,
            100, 160, 86, 101, 74, 86, 102, 87, 86, 103, 103, 86, 104, 120, 86, 105, 129, 86, 106, 143, 86, 107, 152,
            86, 108, 167, 86, 109, 184, 86, 110, 233, 86, 111, 31, 86, 110, 170, 86, 109, 192, 86, 108, 217, 86, 107,
            232, 86, 106, 0, 86, 105, 9, 86, 104, 16, 86, 103, 32, 86, 102, 48, 86, 101, 80, 86, 100, 104, 86, 99, 152,
            86, 100, 97, 86, 101, 125, 86, 102, 128, 86, 103, 146, 86, 104, 169, 86, 105, 186, 86, 107, 218, 86, 108, 0,
            86, 109, 17, 86, 110, 74, 86, 109, 36, 86, 108, 57, 86, 107, 73, 86, 106, 98, 86, 105, 105, 86, 104, 130,
            86, 103, 140, 86, 102, 162, 86, 101, 185, 86, 100, 201, 86, 99, 234, 86, 98, 9, 86, 99, 196, 86, 100, 211,
          ]),
          2.95475648931367,
          0.4125721920209287,
          2.6903719969369715,
        ],
        [
          'low movement',
          new Uint8Array([
            146, 151, 65, 146, 150, 127, 147, 150, 144, 147, 149, 168, 146, 149, 57, 146, 150, 16, 146, 149, 6, 146,
            150, 66, 146, 149, 43, 145, 149, 87, 146, 149, 36, 146, 150, 204, 146, 149, 236, 145, 149, 105, 146, 149,
            127, 145, 149, 200, 146, 149, 76, 145, 149, 112, 146, 149, 127, 145, 149, 3, 146, 149, 73, 145, 149, 3, 146,
            149, 141, 145, 149, 74, 144, 149, 234, 145, 149, 145, 146, 149, 7, 145, 149, 34, 146, 149, 118, 145, 149, 7,
            146, 149, 253, 145, 149, 39, 146, 149, 31, 145, 149, 74, 146, 149, 75, 145, 149, 81, 146, 149, 51, 145, 149,
            25, 144, 149, 105, 145, 149, 44, 144, 149, 81, 145, 149, 187, 144, 149, 85, 145, 149, 251, 146, 149, 203,
            145, 149, 174, 144, 149, 224, 145, 149, 176, 144, 149, 142, 145, 149, 164, 144, 149, 146, 145, 149, 255,
            146, 149, 100, 145, 149, 118, 144, 149, 224, 145, 149, 22, 144, 149, 102, 145, 149, 250, 146, 149, 218, 145,
            149, 118, 146, 149, 146, 145, 149, 205, 144, 149, 79, 145, 149, 248, 144, 149, 121, 145, 149, 60, 144, 149,
            57, 145, 149, 70, 144, 149, 88, 145, 149, 184, 144, 149, 163, 145, 149, 20, 144, 149, 86, 145, 149, 208,
            144, 149, 43, 145, 149, 255, 144, 149, 76, 145, 149, 52, 144, 149, 236, 145, 149, 87, 144, 149, 143, 145,
            149, 118, 144, 149, 135, 145, 149, 154, 144, 149, 128, 145, 149, 218, 144, 149, 4, 145, 149, 180, 144, 149,
            21, 145, 149, 208, 144, 149, 8, 143, 149, 211, 144, 149, 226, 143, 149, 20, 144, 149, 229, 143, 149, 111,
            144, 149, 40, 145, 149, 69, 144, 149, 226, 145, 149, 157, 144, 149, 60, 145, 149, 68, 144, 149, 29, 145,
            149, 117, 144, 149, 114, 145, 149, 254, 146, 149, 60, 145, 149, 228, 144, 149, 177, 145, 149, 161, 144, 149,
            202, 145, 149, 129, 144, 149, 125, 145, 149, 72, 144, 149, 97, 145, 149, 81, 144, 149, 239, 145, 149, 150,
            146, 149, 199, 145, 149, 37, 144, 149, 57, 145, 149, 251, 144, 149, 164, 145, 149, 96, 144, 149, 108, 145,
            149, 145, 144, 149, 10, 145, 149, 11, 146, 149, 202, 145, 149, 165, 144, 149, 185, 145, 149, 167, 144, 149,
            115, 145, 149, 181, 144, 149, 217, 143, 149, 249, 144, 149, 136, 143, 149, 218, 144, 149, 168, 145, 149,
            249, 144, 149, 148, 143, 149, 62, 142, 149, 77, 143, 149, 21, 142, 149, 204, 143, 149, 102, 144, 149, 75,
            143, 149, 0, 144, 149, 4, 143, 149, 222, 144, 149, 101, 143, 149, 205, 144, 149, 224, 145, 149, 124, 144,
            149, 120, 143, 149, 193, 144, 149, 80, 145, 149, 31, 144, 149, 217, 143, 149, 41, 144, 149, 180, 143, 149,
            231, 144, 149, 174, 144, 148, 26, 143, 148, 171, 144, 148, 107, 144, 149, 62, 143, 149, 93, 144, 149, 156,
            143, 149, 117, 144, 149, 50, 143, 149, 212, 142, 149, 14, 141, 149, 29, 142, 149, 210, 143, 149, 230, 144,
            149, 22, 145, 149, 101, 144, 149, 2, 143, 149, 144, 144, 149, 32, 143, 149, 197, 144, 149, 105, 143, 149,
            172, 144, 149, 102, 145, 149, 209, 144, 149, 98, 145, 149, 147, 144, 149, 29, 145, 149, 17, 144, 149, 191,
            143, 149, 217, 144, 149, 117, 145, 149, 35, 144, 149, 130, 143, 149, 87, 144, 149, 222, 143, 149, 0, 144,
            149, 160, 143, 149, 4, 144, 149, 172, 143, 149, 38, 144, 149, 182, 145, 149, 222, 144, 149, 88, 143, 149,
            36, 144, 149, 204, 143, 149, 111, 144, 149, 117, 143, 149, 32, 144, 149, 41, 143, 149, 154, 144, 149, 157,
            143, 149, 62, 142, 149, 42, 143, 149, 61, 144, 149, 58, 143, 149, 3, 144, 149, 143, 143, 149, 11, 142, 149,
            84, 141, 149, 44, 142, 149, 197, 142, 148, 220, 141, 148, 239, 142, 148, 232, 143, 148, 102, 142, 148, 199,
            141, 148, 232, 142, 148, 163, 143, 148, 81, 142, 148, 146, 141, 148, 104, 142, 148, 160, 141, 148, 26, 142,
            148, 212, 141, 148, 212, 142, 147, 45, 143, 147, 58, 142, 147, 161, 143, 147, 196, 142, 147, 206, 143, 147,
            40, 144, 147, 137, 143, 147, 225, 144, 147, 75, 143, 147, 27, 144, 147, 27, 143, 147, 11, 144, 147, 78, 143,
            147, 73, 144, 147, 42, 143, 147, 132, 144, 147, 242, 143, 147, 85, 144, 147, 220, 143, 147, 26, 144, 147,
            185, 143, 147, 249, 144, 147, 155, 143, 147, 236, 144, 147, 20, 143, 147, 80, 142, 147, 116, 143, 147, 221,
            142, 147, 97, 143, 147, 189, 142, 147, 86, 143, 147, 158, 142, 147, 13, 143, 147, 104, 142, 147, 238, 143,
            147, 86, 144, 147, 58, 143, 147, 206, 144, 147, 195, 143, 147, 40, 144, 147, 137, 143, 147, 140, 142, 147,
            217, 143, 147, 68, 142, 147, 203, 143, 147, 110, 142, 147, 227, 143, 147, 99, 142, 147, 210, 143, 147, 25,
            144, 147, 22, 143, 147, 124, 144, 147, 107, 143, 147, 109, 144, 147, 1, 143, 147, 169, 144, 147, 136, 143,
            147, 209, 142, 147, 232, 141, 147, 255, 142, 147, 89, 143, 147, 108, 142, 147, 245,
          ]),
          3.2135786101857895,
          0.20096855835227007,
          3.0467173362642037,
        ],
        [
          'automated movement',
          new Uint8Array([
            95, 124, 66, 96, 123, 85, 98, 122, 117, 98, 121, 122, 99, 121, 128, 99, 120, 140, 100, 120, 145, 100, 119,
            153, 101, 118, 170, 102, 118, 174, 102, 117, 182, 103, 117, 201, 103, 116, 206, 104, 116, 212, 104, 115,
            224, 105, 115, 230, 105, 114, 237, 106, 114, 243, 106, 113, 146, 106, 112, 162, 106, 111, 183, 106, 110,
            188, 106, 109, 214, 106, 108, 231, 106, 107, 243, 106, 106, 13, 106, 105, 19, 106, 104, 43, 106, 103, 57,
            106, 102, 75, 106, 101, 100, 106, 100, 107, 106, 99, 131, 106, 98, 145, 106, 97, 166, 106, 96, 173, 106, 95,
            191, 106, 94, 209, 106, 93, 227, 106, 92, 252, 106, 91, 2, 106, 90, 31, 106, 89, 43, 106, 88, 59, 106, 87,
            73, 106, 86, 92, 106, 85, 117, 106, 84, 129, 106, 83, 146, 106, 82, 159, 106, 81, 177, 106, 80, 191, 106,
            79, 213, 106, 78, 232, 106, 77, 244, 106, 76, 6, 106, 75, 25, 106, 74, 44, 106, 73, 51, 106, 72, 75, 106,
            71, 95, 106, 70, 105, 107, 70, 122, 108, 70, 147, 109, 70, 159, 110, 70, 183, 111, 70, 188, 112, 70, 206,
            113, 70, 225, 114, 70, 242, 115, 70, 255, 116, 70, 17, 117, 70, 41, 118, 70, 53, 119, 70, 73, 120, 70, 87,
            121, 70, 105, 122, 70, 116, 123, 70, 142, 124, 70, 159, 125, 70, 172, 126, 70, 192, 127, 70, 205, 128, 70,
            230, 129, 70, 235, 130, 70, 3, 131, 70, 22, 132, 70, 34, 133, 70, 57, 134, 70, 63, 135, 70, 87, 136, 70,
            100, 137, 70, 118, 138, 70, 140, 139, 70, 145, 140, 70, 170, 141, 70, 182, 142, 70, 202, 143, 70, 215, 144,
            70, 234, 145, 70, 1, 146, 70, 13, 147, 70, 29, 148, 70, 41, 149, 70, 59, 149, 71, 83, 149, 72, 94, 149, 73,
            119, 149, 74, 137, 149, 75, 149, 149, 76, 167, 149, 77, 186, 149, 78, 206, 149, 79, 213, 149, 80, 235, 149,
            81, 254, 149, 82, 16, 149, 83, 36, 149, 84, 42, 149, 85, 67, 149, 86, 78, 149, 87, 104, 149, 88, 125, 149,
            89, 137, 149, 90, 156, 149, 91, 166, 149, 92, 191, 149, 93, 198, 149, 94, 222, 149, 95, 242, 149, 96, 253,
            149, 97, 21, 149, 98, 27, 149, 99, 53, 149, 100, 67, 149, 101, 85, 149, 102, 98, 149, 103, 117, 149, 104,
            139, 149, 105, 154, 149, 106, 172, 149, 107, 185, 149, 108, 203, 149, 109, 216, 149, 110, 240, 149, 111, 2,
            149, 112, 14, 149, 113, 34, 149, 114, 45, 148, 114, 63, 147, 114, 87, 146, 114, 95, 145, 114, 118, 144, 114,
            131, 143, 114, 150, 142, 114, 173, 141, 114, 178, 140, 114, 202, 139, 114, 214, 138, 114, 232, 137, 114,
            244, 136, 114, 6, 135, 114, 31, 134, 114, 43, 133, 114, 63, 132, 114, 74, 131, 114, 92, 130, 114, 110, 129,
            114, 129, 128, 114, 154, 127, 114, 159, 126, 114, 177, 125, 114, 197, 124, 114, 215, 123, 114, 220, 122,
            114, 243, 121, 114, 14, 120, 114, 25, 119, 114, 46, 118, 114, 57, 117, 114, 74, 116, 114, 87, 115, 114, 113,
            114, 114, 135, 113, 114, 143, 112, 114, 164, 111, 114, 174, 110, 114, 199, 109, 114, 204, 108, 114, 229,
            107, 114, 242, 106, 114, 3, 106, 113, 14, 107, 113, 21, 107, 112, 27, 108, 112, 46, 108, 111, 52, 109, 110,
            60, 110, 109, 84, 111, 109, 88, 111, 108, 101, 112, 108, 107, 112, 107, 113, 113, 107, 125, 113, 106, 137,
            114, 105, 144, 115, 105, 157, 115, 104, 168, 116, 104, 175, 116, 103, 180, 117, 102, 198, 118, 102, 210,
            118, 101, 223, 119, 100, 227, 120, 100, 240, 120, 99, 251, 121, 99, 1, 121, 98, 8, 122, 98, 11, 122, 97, 30,
            123, 96, 36, 124, 95, 53, 125, 95, 65, 125, 94, 71, 126, 94, 84, 126, 93, 91, 127, 93, 96, 127, 92, 114,
            128, 91, 121, 129, 91, 127, 129, 90, 146, 130, 90, 152, 130, 89, 158, 131, 89, 171, 131, 88, 177, 132, 88,
            184, 132, 87, 190, 133, 86, 208, 134, 86, 218, 134, 85, 236, 135, 85, 242, 135, 84, 248, 136, 84, 253, 136,
            83, 9, 137, 83, 16, 137, 82, 21, 138, 81, 39, 139, 81, 45, 139, 80, 50, 140, 80, 68, 140, 79, 76, 141, 79,
            82, 141, 78, 95, 142, 78, 101, 142, 77, 109, 143, 77, 115, 143, 76, 129, 144, 76, 134, 144, 75, 140, 145,
            75, 157, 145, 74, 164, 146, 73, 169, 147, 73, 188, 147, 72, 194, 148, 72, 200, 148, 71, 213, 149, 71, 218,
            149, 70, 224, 149, 69, 137, 149, 68, 144, 149, 67, 167, 149, 66, 179, 149, 65, 197, 149, 64, 221, 149, 63,
            227, 149, 62, 250, 149, 61, 6, 149, 60, 26, 149, 59, 37, 149, 58, 56, 149, 57, 78, 149, 56, 91, 149, 55,
            114, 149, 54, 120, 149, 53, 138, 149, 52, 155, 149, 51, 173, 149, 50, 195, 149, 49, 201, 149, 48, 225, 149,
            47, 238, 149, 46, 254, 149, 45, 10, 149, 44, 28, 149, 43, 40, 149, 42, 66, 149, 41, 83, 149, 40, 98, 149,
            39, 115, 149, 38, 127,
          ]),
          2.4080156603419205,
          0.36015925971968366,
          2.1966890259747025,
        ],
      ])('capture - %s', (title, inputdata, entropy, entropyNoTime, entropyOnlyTime) => {
        expect(inputdata.length % 3).toBe(0);
        expect(inputdata.length).toBeGreaterThanOrEqual(900);
        const data = new EntropyData();
        const dataNoTime = new EntropyData();
        const dataOnlyTime = new EntropyData();
        for (let i = 0; i < inputdata.length; i += 3) {
          const x = inputdata[i];
          const y = inputdata[i + 1];
          const t = inputdata[i + 2];
          data.addFrame({x, y, t});
          dataNoTime.addFrame({x: x, y: y, t: 0});
          dataOnlyTime.addFrame({x: 0, y: 0, t: t}, false);
        }
        expect(data.entropyData.length).toBe(inputdata.length);
        expect(dataNoTime.entropyData.length).toBe(inputdata.length);
        expect(dataOnlyTime.entropyData.length).toBe(inputdata.length);
        expect(data.entropyBits / data.entropyData.length).toBe(entropy);
        expect(dataNoTime.entropyBits / data.entropyData.length).toBe(entropyNoTime);
        expect(dataOnlyTime.entropyBits / data.entropyData.length).toBe(entropyOnlyTime);
      });
    });
  });
});
