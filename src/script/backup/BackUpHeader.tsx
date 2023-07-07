/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

export class BackUpHeader {
  private readonly userId: string;
  private readonly password: string;

  // Defined by given specs on: https://wearezeta.atlassian.net/wiki/spaces/ENGINEERIN/pages/59867179/Exporting+history+v2
  private readonly format = 'WBUX';
  private readonly version = '03';
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
    const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
    const hashedUserId = this.hashUserId(
      this.userId,
      salt,
      this.OPSLIMIT_INTERACTIVE_VALUE,
      this.MEMLIMIT_INTERACTIVE_VALUE,
    );
    const formatBytes = new TextEncoder().encode(this.format);
    const versionBytes = new TextEncoder().encode(this.version);
    const nonReadableByte = new Uint8Array([0x00]);
    const opslimitBytes = new TextEncoder().encode(this.OPSLIMIT_INTERACTIVE_VALUE.toString());
    const memlimitBytes = new TextEncoder().encode(this.MEMLIMIT_INTERACTIVE_VALUE.toString());

    const headerData = new Uint8Array(
      formatBytes.length +
        1 +
        versionBytes.length +
        salt.length +
        hashedUserId.length +
        opslimitBytes.length +
        memlimitBytes.length,
    );
    let offset = 0;
    offset = this.copyBytes(headerData, formatBytes, offset);
    offset = this.copyBytes(headerData, nonReadableByte, offset);
    offset = this.copyBytes(headerData, versionBytes, offset);
    offset = this.copyBytes(headerData, salt, offset);
    offset = this.copyBytes(headerData, hashedUserId, offset);
    offset = this.copyBytes(headerData, opslimitBytes, offset);
    offset = this.copyBytes(headerData, memlimitBytes, offset);

    return headerData;
  }

  copyBytes(destination, source, offset) {
    destination.set(source, offset);
    const nextPos = offset + source.length;
    return nextPos;
  }

  async decodeHeader(encryptedDataSource) {
    const dataSrc = new Uint8Array(encryptedDataSource);
    const decodedHeader = this.readBackupHeader(dataSrc);

    console.log('decodedHeader', decodedHeader);
    await sodium.ready;
    // Sanity checks
    const expectedHashedUserId = this.hashUserId(
      this.userId,
      decodedHeader.salt,
      this.OPSLIMIT_INTERACTIVE_VALUE,
      this.MEMLIMIT_INTERACTIVE_VALUE,
    );
    const storedHashedUserId = decodedHeader.hashedUserId;
    const decodingError = this.handleHeaderDecodingErrors(decodedHeader, expectedHashedUserId, storedHashedUserId);

    return {decodingError, decodedHeader};
  }

  handleHeaderDecodingErrors(decodedHeader, expectedHashedUserId, storedHashedUserId) {
    const {format, version} = decodedHeader;
    if (!sodium.memcmp(expectedHashedUserId, storedHashedUserId)) {
      console.error('The hashed user id in the backup file header does not match the expected one');
      return 'INVALID_USER_ID';
    } else if (format !== this.format) {
      console.error('The backup format found in the backup file header is not a valid one');
      return 'INVALID_FORMAT';
    } else if (parseInt(version) < parseInt(this.version)) {
      console.error('The backup version found in the backup file header is not a valid one');
      return 'INVALID_VERSION';
    }
    return null;
  }

  async generateChaCha20Key(header) {
    await sodium.ready;
    return sodium.crypto_pwhash(
      this.PWD_HASH_OUTPUT_BYTES,
      this.password,
      header.salt,
      this.OPSLIMIT_INTERACTIVE_VALUE,
      this.MEMLIMIT_INTERACTIVE_VALUE,
      sodium.crypto_pwhash_ALG_DEFAULT,
    );
  }

  hashUserId(userId, salt, opslimit, memlimit) {
    return sodium.crypto_pwhash(
      this.PWD_HASH_OUTPUT_BYTES,
      userId.toString(),
      salt,
      opslimit,
      memlimit,
      sodium.crypto_pwhash_ALG_DEFAULT,
    );
  }

  readBackupHeader(data: Uint8Array) {
    const {
      BACKUP_HEADER_FORMAT_LENGTH,
      BACKUP_HEADER_EXTRA_GAP_LENGTH,
      BACKUP_HEADER_VERSION_LENGTH,
      PWD_HASH_OUTPUT_BYTES,
      UNSIGNED_INT_LENGTH,
    } = this;
    const formatBytes = data.slice(0, BACKUP_HEADER_FORMAT_LENGTH);
    const format = new TextDecoder().decode(formatBytes);

    const extraGapBytes = data.slice(
      BACKUP_HEADER_FORMAT_LENGTH,
      BACKUP_HEADER_FORMAT_LENGTH + BACKUP_HEADER_EXTRA_GAP_LENGTH,
    );

    const versionBytes = data.slice(
      BACKUP_HEADER_FORMAT_LENGTH + BACKUP_HEADER_EXTRA_GAP_LENGTH,
      BACKUP_HEADER_FORMAT_LENGTH + BACKUP_HEADER_EXTRA_GAP_LENGTH + BACKUP_HEADER_VERSION_LENGTH,
    );
    const version = new TextDecoder().decode(versionBytes);

    const salt = data.slice(
      BACKUP_HEADER_FORMAT_LENGTH + BACKUP_HEADER_EXTRA_GAP_LENGTH + BACKUP_HEADER_VERSION_LENGTH,
      BACKUP_HEADER_FORMAT_LENGTH +
        BACKUP_HEADER_EXTRA_GAP_LENGTH +
        BACKUP_HEADER_VERSION_LENGTH +
        sodium.crypto_pwhash_SALTBYTES,
    );

    const hashedUserId = data.slice(
      BACKUP_HEADER_FORMAT_LENGTH +
        BACKUP_HEADER_EXTRA_GAP_LENGTH +
        BACKUP_HEADER_VERSION_LENGTH +
        sodium.crypto_pwhash_SALTBYTES,
      BACKUP_HEADER_FORMAT_LENGTH +
        BACKUP_HEADER_EXTRA_GAP_LENGTH +
        BACKUP_HEADER_VERSION_LENGTH +
        sodium.crypto_pwhash_SALTBYTES +
        PWD_HASH_OUTPUT_BYTES,
    );

    const opslimit = new DataView(data.buffer).getInt32(
      BACKUP_HEADER_FORMAT_LENGTH +
        BACKUP_HEADER_EXTRA_GAP_LENGTH +
        BACKUP_HEADER_VERSION_LENGTH +
        sodium.crypto_pwhash_SALTBYTES +
        PWD_HASH_OUTPUT_BYTES,
    );

    const memlimit = new DataView(data.buffer).getInt32(
      BACKUP_HEADER_FORMAT_LENGTH +
        BACKUP_HEADER_EXTRA_GAP_LENGTH +
        BACKUP_HEADER_VERSION_LENGTH +
        sodium.crypto_pwhash_SALTBYTES +
        PWD_HASH_OUTPUT_BYTES +
        UNSIGNED_INT_LENGTH,
    );

    return {
      format,
      version,
      salt,
      hashedUserId,
      opslimit,
      memlimit,
    };
  }
}
