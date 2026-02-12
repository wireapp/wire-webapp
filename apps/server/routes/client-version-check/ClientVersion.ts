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

import {parse, isValid} from 'date-fns';
import {Result} from 'true-myth';
import {z} from 'zod';

const clientVersionSchema = z
  .string()
  .refine(clientVersionString => {
    const parseResult = parse(clientVersionString, 'yyyy.MM.dd.HH.mm.ss', new Date());

    return isValid(parseResult);
  })
  .transform(clientVersionString => {
    const parseResult = parse(clientVersionString, 'yyyy.MM.dd.HH.mm.ss', new Date());

    return parseResult;
  });

export function parseClientVersion(clientVersionDate: string): Result<Error, Date> {
  const parseResult = clientVersionSchema.safeParse(clientVersionDate);

  if (parseResult.success) {
    return Result.ok<Error, Date>(parseResult.data);
  }

  return Result.err<Error, Date>(new Error('foobar', {cause: parseResult.error}));
}
