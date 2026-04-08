/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {ZodSchema} from 'zod';

import {Nonce} from '../../E2EIService.types';

export type GetDirectoryReturnValue = Promise<Uint8Array | undefined>;

export type GetInitialNonceReturnValue = Promise<string | undefined>;

export interface PostJoseRequestParams<T> {
  url: string;
  payload: Uint8Array;
  schema: ZodSchema<T>;
  shouldGetLocation?: boolean;
}
export type PostJoseRequestReturnValue<T> = {
  data: T;
  nonce: Nonce;
  location?: string;
};
