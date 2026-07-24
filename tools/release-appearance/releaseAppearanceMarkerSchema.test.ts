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

import assert from 'node:assert';

import {
  parseReleaseAppearanceMarkerState,
  releaseAppearanceMarkerStateSchema,
} from './releaseAppearanceMarkerSchema.ts';

describe('release appearance marker schema', (): void => {
  test('accepts a valid Beta marker state', (): void => {
    const actualResult = parseReleaseAppearanceMarkerState('{"beta":"2026-07-21.3-beta.1"}');

    assert(actualResult.isOk);
    expect(actualResult.value).toStrictEqual({beta: '2026-07-21.3-beta.1'});
  });

  test('accepts a valid Beta and Production marker state', (): void => {
    const actualResult = releaseAppearanceMarkerStateSchema.safeParse({
      beta: '2026-07-21.3-beta.1',
      production: '2026-07-21.3-production',
    });

    assert(actualResult.success);
    expect(actualResult.data).toStrictEqual({
      beta: '2026-07-21.3-beta.1',
      production: '2026-07-21.3-production',
    });
  });

  test('rejects invalid JSON', (): void => {
    const invalidJsonResult = parseReleaseAppearanceMarkerState('{"beta":}');

    assert(invalidJsonResult.isErr);
  });

  test.each([
    '{"beta":null}',
    '{"beta":3}',
    '{"beta":"2026-07-21-beta.1"}',
    '{"production":"2026-07-21-production.1"}',
  ])('rejects invalid marker state %s', (invalidState): void => {
    assert(parseReleaseAppearanceMarkerState(invalidState).isErr);
  });

  test('rejects unknown fields because the marker state schema is strict', (): void => {
    const actualResult = releaseAppearanceMarkerStateSchema.safeParse({
      beta: '2026-07-21.3-beta.1',
      edge: '2026-07-21.3',
    });

    expect(actualResult.success).toBe(false);
  });
});
