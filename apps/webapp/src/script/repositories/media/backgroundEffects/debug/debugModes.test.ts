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

import {isDebugMode, DebugModeValues} from './debugModes';

describe('DebugModes', () => {
  describe('DebugModeValues', () => {
    it('contains all valid debug mode values', () => {
      expect(DebugModeValues).toEqual(
        expect.arrayContaining(['off', 'maskOverlay', 'maskOnly', 'edgeOnly', 'classOverlay', 'classOnly']),
      );
    });

    it('has exactly 6 debug mode values', () => {
      expect(DebugModeValues.length).toBe(6);
    });
  });

  describe('isDebugMode', () => {
    it('returns true for all valid modes', () => {
      DebugModeValues.forEach(mode => {
        expect(isDebugMode(mode)).toBe(true);
      });
    });

    it.each(['', 'invalid', 'mask', 'OFF', ' off '])('returns false for %p', value => {
      expect(isDebugMode(value)).toBe(false);
    });

    it('works as a type guard in TypeScript', () => {
      const testValue: string = 'maskOverlay';

      if (isDebugMode(testValue)) {
        // TypeScript should narrow the type to DebugMode here
        const debugMode: typeof testValue = testValue;
        expect(debugMode).toBe('maskOverlay');
        // Verify it's one of the valid values
        expect(DebugModeValues).toContain(debugMode);
      } else {
        fail('Type guard should have returned true for valid debug mode');
      }
    });

    it('works as a type guard for invalid values', () => {
      const testValue: string = 'invalid';

      if (isDebugMode(testValue)) {
        fail('Type guard should have returned false for invalid debug mode');
      } else {
        // TypeScript should keep the type as string here
        const stringValue: string = testValue;
        expect(stringValue).toBe('invalid');
      }
    });

    it.each([null, undefined, 0, true, {}, []])('returns false for non-string %p', value => {
      // @ts-expect-error - testing runtime behavior with invalid input
      expect(isDebugMode(value)).toBe(false);
    });
  });
});
