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

import {QualifiedIdSchema} from './qualifiedId';

describe('QualifiedIdSchema', () => {
  it('parses a valid qualified id', () => {
    const input = {domain: 'wire.com', id: '39b7f597-dfd1-4dff-86f5-fe1b79cb70a0'};
    expect(QualifiedIdSchema.parse(input)).toEqual(input);
  });

  it.each([
    ['an empty domain', {domain: '', id: '39b7f597-dfd1-4dff-86f5-fe1b79cb70a0'}],
    ['an empty id', {domain: 'wire.com', id: ''}],
    ['a missing domain', {id: '39b7f597-dfd1-4dff-86f5-fe1b79cb70a0'}],
    ['a missing id', {domain: 'wire.com'}],
  ])('rejects %s', (_, input) => {
    expect(QualifiedIdSchema.safeParse(input).success).toBe(false);
  });
});
