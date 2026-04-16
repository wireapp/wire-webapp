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

interface EntropyFrame {
  x: number;
  y: number;
  t: number;
}

/**
 * calculate shannon entropy over a set of uint8 values
 */
export function shannonEntropy(entropyData: Uint8Array): number {
  const len = entropyData.length;
  const frequencies = entropyData.reduce((freq: Map<number, number>, c: number) => {
    freq.set(c, (freq.get(c) || 0) + 1);
    return freq;
  }, new Map<number, number>());
  let sum = 0;
  for (const f of frequencies.values()) {
    sum -= (f / len) * Math.log2(f / len);
  }
  return sum;
}

/**
 * calculate the difference between every n-th element in a flattened list
 * @param data The list of elements to calculate the differences on, containing a multipe of `n` elements
 * @param n The number of different elements representing one flattened object
 */
export function calculateDeltaValues(data: Uint8Array, n: number): Uint8Array {
  const prev = Array<number | null>(3);
  const result = new Array<number>();

  data.forEach((value, index) => {
    const i = index % n;
    const prevValue = prev[i];
    if (prevValue != null) {
      result.push(Math.abs(value - prevValue));
    }
    prev[i] = value;
  });
  return new Uint8Array(result);
}

export class EntropyData {
  readonly frames: EntropyFrame[];
  constructor() {
    this.frames = [];
  }

  get length(): number {
    return this.frames.length;
  }

  get entropyData(): Uint8Array {
    return new Uint8Array(
      this.frames.reduce((acc: number[], val: EntropyFrame) => {
        acc.push(val.x);
        acc.push(val.y);
        acc.push(val.t);
        return acc;
      }, []),
    );
  }

  get entropyBits(): number {
    const entropyData = this.entropyData;
    const entropy = shannonEntropy(entropyData);
    const valuesPerFrame = ~~(entropyData.length / this.frames.length);
    // 1st derivation
    const deltaValues = calculateDeltaValues(entropyData, valuesPerFrame);
    const deltaEntropy = shannonEntropy(deltaValues);
    // 2nd derivation
    const delta2Values = calculateDeltaValues(deltaValues, valuesPerFrame);
    const delta2Entropy = shannonEntropy(delta2Values);
    // 3rd derivation
    const delta3Values = calculateDeltaValues(delta2Values, valuesPerFrame);
    const delta3Entropy = shannonEntropy(delta3Values);

    return Math.min(entropy, deltaEntropy, delta2Entropy, delta3Entropy) * entropyData.length;
  }

  addFrame(value: EntropyFrame, duplicateCheck = true): void {
    value.x &= 0xff;
    value.y &= 0xff;
    value.t &= 0xff;
    // skip duplicate entries
    if (
      duplicateCheck &&
      this.frames.length > 0 &&
      this.frames[this.frames.length - 1].x === value.x &&
      this.frames[this.frames.length - 1].y === value.y
    ) {
      return;
    }
    this.frames.push(value);
  }
}
