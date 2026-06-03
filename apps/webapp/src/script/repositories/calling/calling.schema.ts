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

import {z} from 'zod';

import {QUALITY} from '@wireapp/avs';

const stringLiteralUnknown = z.literal('Unknown');

const CandidateSchema = z.union([
  z.literal('Relay'),
  z.literal('Host'),
  z.literal('Srflx'),
  z.literal('Prflx'),
  stringLiteralUnknown,
]);
const ProtocolSchema = z.union([z.literal('UDP'), z.literal('TCP'), stringLiteralUnknown]);
const PeerSchema = z.union([z.literal('Server'), z.literal('User'), stringLiteralUnknown]);

const QualitySchema = z.union([
  z.literal(QUALITY.NORMAL),
  z.literal(QUALITY.MEDIUM),
  z.literal(QUALITY.POOR),
  z.literal(QUALITY.NETWORK_PROBLEM),
  z.literal(QUALITY.RECONNECTING),
]);

const NetworkMetricSchema = z.object({
  tx: z.number(),
  rx: z.number(),
});

export const NetworkQualityInfoSchema = z.object({
  quality: QualitySchema,
  rtt: z.number().optional(),
  loss: NetworkMetricSchema.optional(),
  jitter: z
    .object({
      audio: NetworkMetricSchema,
      video: NetworkMetricSchema,
    })
    .optional(),
  connection: z
    .object({
      candidate: CandidateSchema,
      protocol: ProtocolSchema,
    })
    .optional(),
  peer: PeerSchema.optional(),
});

export type NetworkQualityInfo = z.infer<typeof NetworkQualityInfoSchema>;
