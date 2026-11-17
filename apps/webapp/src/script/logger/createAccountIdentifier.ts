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

import type {QualifiedId} from '../apiClient/user/qualifiedId';

type AccountIdentifierOptions = {
  readonly qualifiedId: Readonly<QualifiedId>;
  readonly encoder: Pick<TextEncoder, 'encode'>;
  readonly crypto: Pick<SubtleCrypto, 'digest'>;
};

export function canonicalAccountIdentity(qualifiedId: Readonly<QualifiedId>): string {
  // Keep exact identity semantics, including case and Unicode. JSON escapes tuple boundaries unambiguously.
  return JSON.stringify([qualifiedId.domain, qualifiedId.id]);
}

export async function createAccountIdentifier(options: AccountIdentifierOptions): Promise<string> {
  const {qualifiedId, encoder, crypto} = options;
  const input = encoder.encode(canonicalAccountIdentity(qualifiedId));
  const digest = await crypto.digest('SHA-256', input);
  const hexadecimalRadix = 16;
  const hexadecimalCharactersPerByte = 2;

  return Array.from(new Uint8Array(digest), byte => {
    return byte.toString(hexadecimalRadix).padStart(hexadecimalCharactersPerByte, '0');
  }).join('');
}
