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

import {CrlResponseSchema, NewAccountResponseSchema} from './schema';

describe('MLS ACME response schemas', () => {
  it('validates identity enrollment response fields', () => {
    const response = {
      contact: ['admin@example.com'],
      orders: 'https://acme.example.com/orders/1',
      status: 'valid',
    };

    expect(NewAccountResponseSchema.parse(response)).toStrictEqual(response);
  });

  it('accepts non-empty certificate revocation lists and rejects empty ones', () => {
    expect(CrlResponseSchema.safeParse(new Uint8Array([1]).buffer).success).toBe(true);
    expect(CrlResponseSchema.safeParse(new ArrayBuffer(0)).success).toBe(false);
  });
});
