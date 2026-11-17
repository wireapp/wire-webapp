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

import {webcrypto} from 'node:crypto';
import {TextEncoder} from 'node:util';

import {canonicalAccountIdentity, createAccountIdentifier} from './createAccountIdentifier';

import type {QualifiedId} from '../apiClient/user/qualifiedId';

function hashIdentity(qualifiedId: Readonly<QualifiedId>): Promise<string> {
  return createAccountIdentifier({qualifiedId, encoder: new TextEncoder(), crypto: webcrypto.subtle});
}

describe('persistent log account identifiers', () => {
  it('produces the stable SHA-256 digest of the canonical UTF-8 identity', async () => {
    const qualifiedId = {domain: 'example.com', id: 'user-id'};
    const expectedDigest = 'b6e8bc7d63acc23e94367351323e46e31891036a3121795bed53c0d457d2c214';

    expect(await hashIdentity(qualifiedId)).toBe(expectedDigest);
    expect(await hashIdentity({...qualifiedId})).toBe(expectedDigest);
    expect(await hashIdentity(qualifiedId)).toMatch(/^[0-9a-f]{64}$/);
  });

  it.each([
    {domain: 'example.com', id: 'other-id'},
    {domain: 'other.example.com', id: 'user-id'},
    {domain: 'EXAMPLE.COM', id: 'user-id'},
    {domain: 'example.com', id: 'USER-ID'},
  ])('preserves exact identity differences for %j', async qualifiedId => {
    expect(await hashIdentity(qualifiedId)).not.toBe(await hashIdentity({domain: 'example.com', id: 'user-id'}));
  });

  it.each([
    [
      {domain: 'a:b', id: 'c'},
      {domain: 'a', id: 'b:c'},
    ],
    [
      {domain: 'a","b', id: 'c'},
      {domain: 'a', id: 'b","c'},
    ],
    [
      {domain: '\ud800', id: 'c'},
      {domain: '\ufffd', id: 'c'},
    ],
    [
      {domain: 'é', id: 'c'},
      {domain: 'e\u0301', id: 'c'},
    ],
  ])('encodes distinct string pairs without ambiguity', async (firstIdentity, secondIdentity) => {
    expect(canonicalAccountIdentity(firstIdentity)).not.toBe(canonicalAccountIdentity(secondIdentity));
    expect(await hashIdentity(firstIdentity)).not.toBe(await hashIdentity(secondIdentity));
  });

  it('uses SHA-256 and UTF-8 through explicit browser adapter dependencies', async () => {
    const digest = jest.fn(async (): Promise<ArrayBuffer> => {
      return new Uint8Array(32).fill(15).buffer;
    });

    expect(
      await createAccountIdentifier({
        qualifiedId: {domain: 'example.com', id: 'user-id'},
        encoder: new TextEncoder(),
        crypto: {digest},
      }),
    ).toBe('0f'.repeat(32));
    expect(digest).toHaveBeenCalledWith('SHA-256', new TextEncoder().encode('["example.com","user-id"]'));
  });
});
