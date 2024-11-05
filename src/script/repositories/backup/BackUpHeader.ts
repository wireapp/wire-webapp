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

import sodium from 'libsodium-wrappers';

export interface DecodedHeader {
  format: string;
  version: string;
  salt: Uint8Array;
  hashedUserId: Uint8Array;
  opslimit: number;
  memlimit: number;
}

export const ENCRYPTED_BACKUP_FORMAT = 'WBUX';
export const ENCRYPTED_BACKUP_VERSION = '03';
export const ERROR_TYPES = {
  INVALID_USER_ID: 'INVALID_USER_ID',
  INVALID_VERSION: 'INVALID_VERSION',
  INVALID_FORMAT: 'INVALID_FORMAT',
};

export class BackUpHeader {
  private readonly userId: string;
  private readonly password: string;

  // Defined by given specs on: https://wearezeta.atlassian.net/wiki/spaces/ENGINEERIN/pages/59867179/Exporting+history+v2
  private readonly format = ENCRYPTED_BACKUP_FORMAT;
  private readonly version = ENCRYPTED_BACKUP_VERSION;
  private readonly MEMLIMIT_INTERACTIVE_VALUE = 33554432;
  private readonly OPSLIMIT_INTERACTIVE_VALUE = 4;
  private readonly PWD_HASH_OUTPUT_BYTES = 32;
  private readonly UNSIGNED_INT_LENGTH = 4;
  private readonly BACKUP_HEADER_EXTRA_GAP_LENGTH = 1;
  private readonly BACKUP_HEADER_FORMAT_LENGTH = 4;
  private readonly BACKUP_HEADER_VERSION_LENGTH = 2;

  constructor(userId: string, password: string) {
    this.userId = userId;
    this.password = password;
  }

  async encodeHeader() {
    await sodium.ready;
    const {
      BACKUP_HEADER_FORMAT_LENGTH,
      BACKUP_HEADER_EXTRA_GAP_LENGTH,
      BACKUP_HEADER_VERSION_LENGTH,
      PWD_HASH_OUTPUT_BYTES,
      UNSIGNED_INT_LENGTH,
    } = this;

    const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
    const hashedUserId = this.hashUserId(
      this.userId,
      salt,
      this.OPSLIMIT_INTERACTIVE_VALUE,
      this.MEMLIMIT_INTERACTIVE_VALUE,
    );
    const formatBytes = sodium.from_string(this.format);
    const versionBytes = sodium.from_string(this.version);
    const nonReadableByte = new Uint8Array([0x00]);
    const opslimitBytes = new Uint8Array(UNSIGNED_INT_LENGTH);
    const memlimitBytes = new Uint8Array(UNSIGNED_INT_LENGTH);

    // Set opslimitBytes and memlimitBytes using DataView
    new DataView(opslimitBytes.buffer).setUint32(0, this.OPSLIMIT_INTERACTIVE_VALUE, false);
    new DataView(memlimitBytes.buffer).setUint32(0, this.MEMLIMIT_INTERACTIVE_VALUE, false);

    const headerData = new Uint8Array(
      BACKUP_HEADER_FORMAT_LENGTH +
        BACKUP_HEADER_EXTRA_GAP_LENGTH +
        BACKUP_HEADER_VERSION_LENGTH +
        sodium.crypto_pwhash_SALTBYTES +
        PWD_HASH_OUTPUT_BYTES +
        2 * UNSIGNED_INT_LENGTH,
    );
    let offset = 0;
    offset = this.copyBytes(headerData, formatBytes, offset);
    offset = this.copyBytes(headerData, nonReadableByte, offset);
    offset = this.copyBytes(headerData, versionBytes, offset);
    offset = this.copyBytes(headerData, salt, offset);
    offset = this.copyBytes(headerData, hashedUserId, offset);
    offset = this.copyBytes(headerData, opslimitBytes, offset);
    this.copyBytes(headerData, memlimitBytes, offset);

    return headerData;
  }

  copyBytes(destination: Uint8Array, source: Uint8Array, offset: number): number {
    destination.set(source, offset);
    const nextPos = offset + source.length;
    return nextPos;
  }

  async decodeHeader(
    encryptedDataSource: Uint8Array,
  ): Promise<{decodingError: string | null; decodedHeader: DecodedHeader; headerSize: number}> {
    const dataSrc = new Uint8Array(encryptedDataSource);
    const {decodedHeader, headerSize} = this.readBackupHeader(dataSrc);

    await sodium.ready;
    // Sanity checks
    const expectedHashedUserId = this.hashUserId(
      this.userId,
      decodedHeader.salt,
      decodedHeader.opslimit,
      decodedHeader.memlimit,
    );
    const storedHashedUserId = decodedHeader.hashedUserId;
    const decodingError = this.handleHeaderDecodingErrors(decodedHeader, expectedHashedUserId, storedHashedUserId);

    return {decodingError, decodedHeader, headerSize};
  }

  handleHeaderDecodingErrors(
    decodedHeader: DecodedHeader,
    expectedHashedUserId: Uint8Array,
    storedHashedUserId: Uint8Array,
  ) {
    const {format, version} = decodedHeader;
    if (!sodium.memcmp(expectedHashedUserId, storedHashedUserId)) {
      return ERROR_TYPES.INVALID_USER_ID;
    } else if (format !== this.format) {
      return ERROR_TYPES.INVALID_FORMAT;
    } else if (parseInt(version) < parseInt(this.version)) {
      return ERROR_TYPES.INVALID_VERSION;
    }
    return null;
  }

  async generateChaCha20Key(header: DecodedHeader) {
    await sodium.ready;

    return sodium.crypto_pwhash(
      this.PWD_HASH_OUTPUT_BYTES,
      this.password,
      header.salt,
      header.opslimit,
      header.memlimit,
      sodium.crypto_pwhash_ALG_DEFAULT,
    );
  }

  hashUserId(userId: string, salt: Uint8Array, opslimit: number, memlimit: number): Uint8Array {
    return sodium.crypto_pwhash(
      this.PWD_HASH_OUTPUT_BYTES,
      userId.toString(),
      salt,
      opslimit,
      memlimit,
      sodium.crypto_pwhash_ALG_DEFAULT,
    );
  }

  readBackupHeader(data: Uint8Array): {decodedHeader: DecodedHeader; headerSize: number} {
    const {
      BACKUP_HEADER_FORMAT_LENGTH,
      BACKUP_HEADER_EXTRA_GAP_LENGTH,
      BACKUP_HEADER_VERSION_LENGTH,
      PWD_HASH_OUTPUT_BYTES,
      UNSIGNED_INT_LENGTH,
    } = this;

    const formatBytes = data.slice(0, BACKUP_HEADER_FORMAT_LENGTH);
    const format = new TextDecoder().decode(formatBytes);

    const versionOffset = BACKUP_HEADER_FORMAT_LENGTH + BACKUP_HEADER_EXTRA_GAP_LENGTH;
    const versionLength = BACKUP_HEADER_VERSION_LENGTH;
    const versionBytes = data.slice(versionOffset, versionOffset + versionLength);
    const version = new TextDecoder().decode(versionBytes);

    const saltOffset = versionOffset + versionLength;
    const saltLength = sodium.crypto_pwhash_SALTBYTES;
    const salt = data.slice(saltOffset, saltOffset + saltLength);

    const hashedUserIdOffset = saltOffset + saltLength;
    const hashedUserIdLength = PWD_HASH_OUTPUT_BYTES;
    const hashedUserId = data.slice(hashedUserIdOffset, hashedUserIdOffset + hashedUserIdLength);

    const opslimitOffset = hashedUserIdOffset + hashedUserIdLength;
    const opslimit = new DataView(data.buffer).getUint32(opslimitOffset, false);

    const memlimitOffset = opslimitOffset + UNSIGNED_INT_LENGTH;
    const memlimit = new DataView(data.buffer).getUint32(memlimitOffset, false);

    const headerSize = memlimitOffset + UNSIGNED_INT_LENGTH;

    const decodedHeader = {
      format,
      version,
      salt,
      hashedUserId,
      opslimit,
      memlimit,
    };

    return {decodedHeader, headerSize};
  }
}
