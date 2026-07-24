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

import {Result} from 'true-myth';
import {z} from 'zod';

import type {ReleaseAppearanceState} from './releaseAppearance.ts';

const releaseIdentifierPattern = String.raw`\d{4}-\d{2}-\d{2}\.[1-9]\d*`;

export const betaCandidateTagPattern = new RegExp(String.raw`^(${releaseIdentifierPattern})-beta\.([1-9]\d*)$`);
export const productionTagPattern = new RegExp(`^(${releaseIdentifierPattern})-production$`);

export const releaseAppearanceMarkerStateSchema = z
  .object({
    beta: z.string().regex(betaCandidateTagPattern).optional(),
    production: z.string().regex(productionTagPattern).optional(),
  })
  .strict();

export function parseReleaseAppearanceMarkerState(
  serializedMarkerState: string,
): Result<ReleaseAppearanceState, Error> {
  let parsedMarkerState: unknown;

  try {
    parsedMarkerState = JSON.parse(serializedMarkerState) as unknown;
  } catch (error: unknown) {
    return Result.err(new Error('Malformed release-appearance marker state: invalid JSON', {cause: error}));
  }

  const validationResult = releaseAppearanceMarkerStateSchema.safeParse(parsedMarkerState);
  if (!validationResult.success) {
    return Result.err(new Error('Malformed release-appearance marker state', {cause: validationResult.error}));
  }

  return Result.ok<ReleaseAppearanceState, Error>(validationResult.data);
}
