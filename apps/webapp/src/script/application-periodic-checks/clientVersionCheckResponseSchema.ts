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

export const successfulClientVersionCheckHttpStatusCode = 200;
export const invalidClientVersionCheckRequestHttpStatusCode = 400;
export const upgradeRequiredHttpStatusCode = 426;
export const reloadClientVersionCheckAction = 'reload';

const successfulClientVersionCheckResponseSchema = z.object({
  httpStatusCode: z.literal(successfulClientVersionCheckHttpStatusCode),
});

const invalidClientVersionCheckRequestResponseSchema = z.object({
  httpStatusCode: z.literal(invalidClientVersionCheckRequestHttpStatusCode),
});

const upgradeRequiredClientVersionCheckResponseSchema = z.object({
  httpStatusCode: z.literal(upgradeRequiredHttpStatusCode),
  responseBody: z.object({
    action: z.literal(reloadClientVersionCheckAction),
  }),
});

export const clientVersionCheckResponseSchema = z.discriminatedUnion('httpStatusCode', [
  successfulClientVersionCheckResponseSchema,
  invalidClientVersionCheckRequestResponseSchema,
  upgradeRequiredClientVersionCheckResponseSchema,
]);

export type ClientVersionCheckResponse = z.infer<typeof clientVersionCheckResponseSchema>;

interface ClientVersionCheckValidationInput {
  readonly httpStatusCode: number;
  readonly responseBody?: unknown;
}

export function validateClientVersionCheckResponse(
  clientVersionCheckValidationInput: ClientVersionCheckValidationInput,
): Result<ClientVersionCheckResponse, Error> {
  const {httpStatusCode, responseBody} = clientVersionCheckValidationInput;
  let validationResult;

  if (httpStatusCode === upgradeRequiredHttpStatusCode) {
    validationResult = clientVersionCheckResponseSchema.safeParse({
      httpStatusCode,
      responseBody,
    });
  } else {
    validationResult = clientVersionCheckResponseSchema.safeParse({
      httpStatusCode,
    });
  }

  if (validationResult.success) {
    return Result.ok(validationResult.data);
  }

  return Result.err(validationResult.error);
}
