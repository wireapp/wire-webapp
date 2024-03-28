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

const nonOptionalString = z.string().min(1);
const nonOptionalUrl = z.string().url().min(1);

export const ResponseHeaderNonceSchema = z.object({
  'replay-nonce': nonOptionalString,
});
export type ResponseHeaderNonce = z.infer<typeof ResponseHeaderNonceSchema>;

export const ResponseHeaderLocationSchema = z.object({
  location: nonOptionalUrl,
});
export type ResponseHeaderLocation = z.infer<typeof ResponseHeaderLocationSchema>;

export const DirectoryResponseSchema = z.object({
  newAccount: nonOptionalUrl,
  newNonce: nonOptionalUrl,
  newOrder: nonOptionalUrl,
  revokeCert: nonOptionalUrl,
  keyChange: nonOptionalUrl,
});
export type DirectoryResponseData = z.infer<typeof DirectoryResponseSchema>;

export const LocalCertificateRootResponseSchema = nonOptionalString;
export type LocalCertificateRootResonseData = z.infer<typeof LocalCertificateRootResponseSchema>;

export const CrlResponseSchema = z.instanceof(ArrayBuffer).refine(arr => arr.byteLength > 0, {
  message: 'CRL is empty',
});
export type CrlResponseData = z.infer<typeof CrlResponseSchema>;

export const FederationCrossSignedCertificatesResponseSchema = z.object({crts: z.array(nonOptionalString)});
export type FederationCrossSignedCertificatesResponseData = z.infer<
  typeof FederationCrossSignedCertificatesResponseSchema
>;

export const NewAccountResponseSchema = z.object({
  status: nonOptionalString,
  orders: nonOptionalUrl,
  contact: z.array(z.string().email().min(1)),
});
export type NewAccountResponseData = z.infer<typeof NewAccountResponseSchema>;

export const NewOrderResponseSchema = z.object({
  status: nonOptionalString,
  expires: nonOptionalString,
  notBefore: nonOptionalString,
  notAfter: nonOptionalString,
  identifiers: z.array(
    z.object({
      type: nonOptionalString,
      value: nonOptionalString,
    }),
  ),
  authorizations: z.array(nonOptionalUrl),
  finalize: nonOptionalUrl,
});
export type NewOrderResponseData = z.infer<typeof NewOrderResponseSchema>;

export const AuthorizationResponseSchema = z.object({
  status: nonOptionalString,
  expires: nonOptionalString,
  identifier: z.object({
    type: nonOptionalString,
    value: nonOptionalString,
  }),
  challenges: z.array(
    z.object({
      type: nonOptionalString,
      url: nonOptionalUrl,
      status: nonOptionalString,
      token: nonOptionalString,
      target: nonOptionalUrl,
    }),
  ),
});
export type AuthorizationResponseData = z.infer<typeof AuthorizationResponseSchema>;

export const DpopChallengeResponseSchema = z.object({
  type: nonOptionalString,
  url: nonOptionalUrl,
  status: nonOptionalString,
  token: nonOptionalString,
  target: nonOptionalUrl,
});
export type DpopChallengeResponseData = z.infer<typeof DpopChallengeResponseSchema>;

export const OidcChallengeResponseSchema = z.object({
  type: nonOptionalString,
  status: nonOptionalString,
  token: nonOptionalString,
  validated: z.string().optional(),
  url: nonOptionalUrl,
  target: nonOptionalUrl,
  error: z
    .object({
      type: nonOptionalString,
      detail: nonOptionalString,
    })
    .optional(),
});
export type OidcChallengeResponseData = z.infer<typeof OidcChallengeResponseSchema>;

export const CheckStatusOfOrderResponseSchema = z.object({
  id: nonOptionalString,
  status: nonOptionalString,
  finalize: nonOptionalUrl,
  identifiers: z.array(
    z.object({
      type: nonOptionalString,
      value: nonOptionalString,
    }),
  ),
  authorizations: z.array(nonOptionalUrl),
  expires: nonOptionalString,
  notBefore: nonOptionalString,
  notAfter: nonOptionalString,
});
export type CheckStatusOfOrderResponseData = z.infer<typeof CheckStatusOfOrderResponseSchema>;

export const FinalizeOrderResponseSchema = z.object({
  id: nonOptionalString,
  status: nonOptionalString,
  expires: nonOptionalString,
  identifiers: z.array(
    z.object({
      type: nonOptionalString,
      value: nonOptionalString,
    }),
  ),
  notBefore: nonOptionalString,
  notAfter: nonOptionalString,
  authorizations: z.array(nonOptionalUrl),
  finalize: nonOptionalUrl,
  certificate: nonOptionalUrl,
});
export type FinalizeOrderResponseData = z.infer<typeof FinalizeOrderResponseSchema>;

export const GetCertificateResponseSchema = nonOptionalString;
export type GetCertificateResponseData = z.infer<typeof GetCertificateResponseSchema>;
