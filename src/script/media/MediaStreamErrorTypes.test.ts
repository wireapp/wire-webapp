/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {isMediaStreamDeviceError, isMediaStreamReadDeviceError} from './MediaStreamErrorTypes';

describe('MediaStreamErrorTypes', () => {
  describe('isMediaStreamDeviceError', () => {
    it('detects device errors', () => {
      expect(isMediaStreamDeviceError('NotFoundError')).toBeTruthy();
      expect(isMediaStreamDeviceError('AbortError')).toBeTruthy();
      expect(isMediaStreamDeviceError('NotReadableError')).toBeTruthy();
    });

    it('recognizes that an error is not a device error', () => {
      expect(isMediaStreamDeviceError('NotAllowedError')).toBeFalsy();
      expect(isMediaStreamDeviceError('NotSupportedError')).toBeFalsy();
      expect(isMediaStreamDeviceError('OverConstrainedError')).toBeFalsy();
      expect(isMediaStreamDeviceError('SecurityError')).toBeFalsy();
      expect(isMediaStreamDeviceError('TypeError')).toBeFalsy();
      expect(isMediaStreamDeviceError('FooBar')).toBeFalsy();
      expect(isMediaStreamDeviceError('')).toBeFalsy();
    });
  });

  describe('isMediaStreamReadDeviceError', () => {
    it('detects device read errors', () => {
      expect(isMediaStreamReadDeviceError('NotFoundError')).toBeTruthy();
      expect(isMediaStreamReadDeviceError('NotAllowedError')).toBeTruthy();
      expect(isMediaStreamReadDeviceError('NotReadableError')).toBeTruthy();
    });

    it('recognizes that an error is not a device read error', () => {
      expect(isMediaStreamReadDeviceError('AbortError')).toBeFalsy();
      expect(isMediaStreamReadDeviceError('NotSupportedError')).toBeFalsy();
      expect(isMediaStreamReadDeviceError('OverConstrainedError')).toBeFalsy();
      expect(isMediaStreamReadDeviceError('SecurityError')).toBeFalsy();
      expect(isMediaStreamReadDeviceError('TypeError')).toBeFalsy();
      expect(isMediaStreamReadDeviceError('FooBar')).toBeFalsy();
      expect(isMediaStreamReadDeviceError('')).toBeFalsy();
    });
  });
});
