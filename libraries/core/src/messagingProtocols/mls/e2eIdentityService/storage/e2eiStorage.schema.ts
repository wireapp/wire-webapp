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

/**
 * An X509 credential acquisition that has been interrupted by an identity provider redirect.
 *
 * Only the serialized acquisition is kept: CoreCrypto owns every other piece of the enrollment
 * state, so there is no need to duplicate it here.
 */
export const PendingEnrollmentDataSchema = z.object({
  acquisitionSnapshot: z.instanceof(Uint8Array),
});
export type PendingEnrollmentData = z.infer<typeof PendingEnrollmentDataSchema>;
