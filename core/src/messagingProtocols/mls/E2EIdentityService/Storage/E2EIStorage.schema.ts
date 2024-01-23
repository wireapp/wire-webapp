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

import {z} from 'zod';

export const InitialDataSchema = z.object({
  discoveryUrl: z.string(),
  clientId: z.string(),
  user: z.object({
    id: z.string(),
    displayName: z.string(),
    handle: z.string(),
    domain: z.string(),
    teamId: z.string(),
  }),
});
export type InitialData = z.infer<typeof InitialDataSchema>;

const Uint8ArraySchema = z.custom<Uint8Array>(value =>
  value instanceof Uint8Array ? {success: true} : {success: false, message: 'Expected Uint8Array'},
);
const AcmeChallengeSchema = z.object({
  delegate: Uint8ArraySchema,
  url: z.string(),
  target: z.string(),
});
export const AuthDataSchema = z.object({
  authorization: z.object({
    identifier: z.string(),
    keyauth: z.string(),
    wireDpopChallenge: AcmeChallengeSchema.optional(),
    wireOidcChallenge: AcmeChallengeSchema.optional(),
  }),
  nonce: z.string(),
});
export type AuthData = z.infer<typeof AuthDataSchema>;

export const OrderDataSchema = z.object({
  orderUrl: z.string().url(),
});
export type OrderData = z.infer<typeof OrderDataSchema>;
