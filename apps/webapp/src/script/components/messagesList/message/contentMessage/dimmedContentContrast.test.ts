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

import {readFileSync} from 'node:fs';
import path from 'node:path';

const minimumContrast = 4.5;
const accentColorStyles = readFileSync(path.resolve(__dirname, '../../../../../style/common/accent-color.less'), 'utf8');

function readColor(name: string): string {
  const match = new RegExp(`@${name}:\\s*(#[0-9a-fA-F]{6});`).exec(accentColorStyles);
  if (match === null) {
    throw new Error(`Colour ${name} not found`);
  }
  return match[1];
}

/** The less variable the timestamp colour of the given theme is set from */
function readTimestampColorName(theme: 'light' | 'dark'): string {
  const declaration = theme === 'light' ? '@content-message-timestamp:' : '@content-message-timestamp-dark:';
  const match = new RegExp(`${declaration}\\s*'([a-z0-9-]+)'`).exec(accentColorStyles);
  if (match === null) {
    throw new Error(`Timestamp colour of the ${theme} theme not found`);
  }
  return match[1];
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map(start => {
    const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => {
    return b - a;
  });
  return (lighter + 0.05) / (darker + 0.05);
}

describe('colour of pending and failed content', () => {
  it.each([
    ['light', ['w-white', 'w-gray-10']],
    ['dark', ['w-gray-100', 'w-gray-95']],
  ] as const)('keeps at least 4.5:1 contrast in the %s theme', (theme, backgrounds) => {
    const color = readColor(readTimestampColorName(theme));

    for (const background of backgrounds) {
      expect(contrast(color, readColor(background))).toBeGreaterThanOrEqual(minimumContrast);
    }
  });
});
