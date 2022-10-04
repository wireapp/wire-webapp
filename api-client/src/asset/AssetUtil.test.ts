/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {isValidToken, isValidUUID} from './AssetUtil';

describe('"isValidToken"', () => {
  it('should return true if token is valid', () => {
    expect(isValidToken('xA-1TVMs83zq8s4NtfTItQ==')).toBeTruthy();
    expect(isValidToken('xA_1TVMs83zq8s4NtfTItQ==')).toBeTruthy();
  });

  it('should return false if token is not valid', () => {
    expect(isValidToken('xA-1TVMs83zq8s4NtfTItQ==.')).toBeFalsy();
    expect(isValidToken('xA-1TVMs83zq8s4NtfTItQ==!')).toBeFalsy();
    expect(isValidToken('xA-1TVMs83zq8s4NtfTItQ==ö')).toBeFalsy();
  });
});

describe('"isValidKey"', () => {
  it('should return true if key is valid', () => {
    expect(isValidUUID('3-2-1e33cc4b-a003-4fd3-b980-ba077fc189ff')).toBeTruthy();
  });

  it('should return false if key is not valid', () => {
    expect(isValidUUID('3-2-1e33cc4b-a003-4fd3-b980-ba077fc189ff!')).toBeFalsy();
    expect(isValidUUID('3-2-1e33cc4b-a003-4fd3-b980-ba077fc189ff.')).toBeFalsy();
    expect(isValidUUID('3-2-1e33cc4b-a003-4fd3-b980-ba077fc189ffö')).toBeFalsy();
  });
});
