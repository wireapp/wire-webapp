/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {BackUpHeader, ENCRYPTED_BACKUP_FORMAT, ENCRYPTED_BACKUP_VERSION} from './BackUpHeader';

describe('BackUpHeader', () => {
  let backUpHeader: BackUpHeader;

  beforeEach(() => {
    // Initialize the BackUpHeader instance before each test
    backUpHeader = new BackUpHeader('userId', 'password');
  });

  test('encodeHeader returns the expected header data', async () => {
    const headerData = await backUpHeader.encodeHeader();

    // Assert the expected properties of the headerData
    expect(headerData).toHaveLength(63);
  });

  test('decodeHeader returns the expected decoded header', async () => {
    // Create encoded header data
    const encodedHeaderData = await backUpHeader.encodeHeader();

    const {decodedHeader, headerSize} = await backUpHeader.decodeHeader(encodedHeaderData);

    // Assert the expected properties of the decoded header
    expect(decodedHeader.format).toBe(ENCRYPTED_BACKUP_FORMAT);
    expect(decodedHeader.version).toBe(ENCRYPTED_BACKUP_VERSION);
    expect(decodedHeader.salt).toBeInstanceOf(Uint8Array);
    expect(decodedHeader.hashedUserId).toBeInstanceOf(Uint8Array);
    expect(decodedHeader.opslimit).toBe(4);
    expect(decodedHeader.memlimit).toBe(33554432);

    // Assert the headerSize value
    expect(headerSize).toBe(encodedHeaderData.length);
  });
});
