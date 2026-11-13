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

import {createHash, webcrypto} from 'node:crypto';

import {getLogAccountIdentifier, isLogAccountIdentifier} from './logAccountIdentifier';

describe('log account identifiers', () => {
  it('uses a stable qualified identity and distinguishes accounts and backend domains', async () => {
    const account = {id: '00000000-0000-4000-8000-000000000001', domain: 'example.com'};
    const digest = webcrypto.subtle.digest.bind(webcrypto.subtle);
    const identifier = await getLogAccountIdentifier({account, digest});
    const expectedIdentifier = createHash('sha256')
      .update(JSON.stringify([account.domain, account.id]))
      .digest('hex');

    expect(identifier).toBe(expectedIdentifier);
    expect(isLogAccountIdentifier(identifier)).toBe(true);
    expect(await getLogAccountIdentifier({account: {...account, domain: 'EXAMPLE.COM'}, digest})).toBe(identifier);
    expect(await getLogAccountIdentifier({account: {...account, domain: 'other.example.com'}, digest})).not.toBe(
      identifier,
    );
    expect(await getLogAccountIdentifier({account: {...account, id: 'another-account'}, digest})).not.toBe(identifier);
  });

  it.each([
    {id: '', domain: 'example.com'},
    {id: 'account', domain: ''},
  ])('rejects incomplete ownership: %s', async account => {
    await expect(
      getLogAccountIdentifier({account, digest: webcrypto.subtle.digest.bind(webcrypto.subtle)}),
    ).rejects.toThrow('Missing qualified log account identity');
  });
});
