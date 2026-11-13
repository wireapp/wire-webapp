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

import {isNonEmptyString, isString} from '@sindresorhus/is';

import type {QualifiedId} from '../apiClient/user/qualifiedId';

type AccountLogIdentifierOptions = {
  readonly account: Readonly<QualifiedId>;
  readonly digest: SubtleCrypto['digest'];
};

const hexadecimalRadix = 16;
const hexadecimalByteLength = 2;

export function isLogAccountIdentifier(value: unknown): value is string {
  return isString(value) && /^[a-f0-9]{64}$/u.test(value);
}

export async function getLogAccountIdentifier(options: AccountLogIdentifierOptions): Promise<string> {
  const {account, digest} = options;
  if (!isNonEmptyString(account.id) || !isNonEmptyString(account.domain)) {
    throw new Error('Missing qualified log account identity');
  }

  // Include the backend domain to distinguish federated identities. This is a filename key, not encryption.
  const identity = JSON.stringify([account.domain.toLowerCase(), account.id.toLowerCase()]);
  const digestBytes = new Uint8Array(await digest('SHA-256', new TextEncoder().encode(identity)));
  const accountIdentifier = Array.from(digestBytes, byte => {
    return byte.toString(hexadecimalRadix).padStart(hexadecimalByteLength, '0');
  }).join('');
  if (!isLogAccountIdentifier(accountIdentifier)) {
    throw new Error('Invalid log account digest');
  }

  return accountIdentifier;
}
