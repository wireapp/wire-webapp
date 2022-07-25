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

export interface EntropyFrame {
  x: number;
  y: number;
}

// calculate shannon entropy over a set of uint8 values
export function shannonEntropy<T>(entropyData: Uint8Array): number {
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

// calculate the delta of every n-th element
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
        return acc;
      }, []),
    );
  }

  get entropyBits(): number {
    const entropyData = this.entropyData;
    const entropy = shannonEntropy(entropyData);
    const deltaValues = calculateDeltaValues(entropyData, ~~(entropyData.length / this.frames.length));
    const deltaEntropy = shannonEntropy(deltaValues);

    return Math.min(entropy * entropyData.length, deltaEntropy * deltaValues.length);
  }

  addFrame(value: EntropyFrame): void {
    // skip duplicate entries
    if (
      this.frames.length > 0 &&
      this.frames[this.frames.length - 1].x === value.x &&
      this.frames[this.frames.length - 1].y === value.y
    ) {
      return;
    }
    this.frames.push(value);
  }
}
