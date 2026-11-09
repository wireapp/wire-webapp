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

/**
 * Ensures a Uint8Array has an ArrayBuffer backing (not SharedArrayBuffer).
 * This is necessary for Web Crypto API compatibility which expects ArrayBuffer.
 *
 * Creates a copy of the data into a new Uint8Array with proper ArrayBuffer backing.
 * This ensures type safety without using type assertions.
 */
export function toBufferSource(array: Uint8Array): Uint8Array<ArrayBuffer> {
  // Create a new Uint8Array from the input, which will have ArrayBuffer backing
  // The Uint8Array constructor copies the data into a new ArrayBuffer
  const result = new Uint8Array(array.length);
  result.set(array);
  return result;
}

/**
 * Converts an ArrayBufferLike to ArrayBuffer by copying the data.
 * Creates a new ArrayBuffer containing a copy of the input data.
 */
export function toArrayBuffer(buffer: ArrayBufferLike): ArrayBuffer {
  const temp = new Uint8Array(buffer);
  const result = new Uint8Array(temp.length);
  result.set(temp);
  return result.buffer;
}
