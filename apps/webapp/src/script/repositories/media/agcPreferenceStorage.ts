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

import {Maybe} from 'true-myth';
import {z} from 'zod';

const storedAgcPreferenceSchema = z.boolean();

export function parseSerializedAgcPreference(serializedStoredAgcPreference: string): Maybe<boolean> {
  try {
    const parsedStoredAgcPreference: unknown = JSON.parse(serializedStoredAgcPreference);
    const validationResult = storedAgcPreferenceSchema.safeParse(parsedStoredAgcPreference);

    if (!validationResult.success) {
      return Maybe.nothing<boolean>();
    }

    return Maybe.just(validationResult.data);
  } catch {
    return Maybe.nothing<boolean>();
  }
}
