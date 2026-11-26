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

const bitsPerByte = 8;
const utf16HighByteMask = 0xff00;
const utf16LowByteMask = 0xff;

/**
 * Converts a string to UTF-16 Big Endian byte array without BOM
 * @param str The string to convert
 * @returns Converted string as byte array
 */
export const stringToUtf16BE = (str = ''): number[] => {
  const bytes: number[] = [];
  str
    .split('')
    .map(char => {
      return char.charCodeAt(0);
    })
    .forEach(charCode => {
      bytes.push((charCode & utf16HighByteMask) >> bitsPerByte);
      bytes.push(charCode & utf16LowByteMask);
    });

  return bytes;
};

/**
 * Adds UTF-16 BOM (Byte Order Mark) to the beginning of a byte array
 * @param bytes The byte array to prepend BOM to
 * @returns Byte array with BOM prepended
 */
export const addBOM = (bytes: number[]): number[] => {
  const BOMChar = '\uFEFF';
  const bomBytes = stringToUtf16BE(BOMChar);
  return bomBytes.concat(bytes);
};

/**
 * @param str The string to convert
 * @returns Converted string as byte array with BOM
 */
export const utf8ToUtf16BE = (str = ''): number[] => {
  return addBOM(stringToUtf16BE(str));
};
