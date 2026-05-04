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

const CandidateEnum = z.enum(['Relay', 'Host', 'Srflx', 'Prflx', 'Unknown']);
const ProtocolEnum = z.enum(['UDP', 'TCP', 'Unknown']);
const PeerEnum = z.enum(['Server', 'User', 'Unknown']);
const QualityEnum = z.nativeEnum(QUALITY);

const NetworkMetricSchema = z.object({
  tx: z.number(),
  rx: z.number(),
});

export const NetworkQualityInfoSchema = z.object({
  quality: QualityEnum,
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
      candidate: CandidateEnum,
      protocol: ProtocolEnum,
    })
    .optional(),
  peer: PeerEnum.optional(),
});

export type NetworkQualityInfo = z.infer<typeof NetworkQualityInfoSchema>;
