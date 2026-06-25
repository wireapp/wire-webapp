/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

export const AudioEmptySeekBar = () => {
  return (
    <svg width="100%" height="32" viewBox="0 0 436 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="linePattern" width="2.5" height="32" patternUnits="userSpaceOnUse">
          <line x1="1" y1="18" x2="1" y2="14" stroke="#9FA1A7" strokeWidth="1" strokeLinecap="round" />
        </pattern>
      </defs>
      <rect width="436" height="32" fill="url(#linePattern)" />
    </svg>
  );
};
