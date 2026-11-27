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

export const UNKNOWN_NETWORK_QUALITY = 0;
export type NetworkQuality = QUALITY | typeof UNKNOWN_NETWORK_QUALITY;

const stringLiteralUnknown = z.literal('Unknown');

const CandidateSchema = z.union([
  z.literal('Relay'),
  z.literal('Host'),
  z.literal('Srflx'),
  z.literal('Prflx'),
  z.literal('???'),
  stringLiteralUnknown,
]);
const ProtocolSchema = z.union([z.literal('UDP'), z.literal('TCP'), z.literal('???'), stringLiteralUnknown]);
const PeerSchema = z.union([z.literal('Server'), z.literal('User'), stringLiteralUnknown]);

const QualitySchema = z.union([
  z.literal(UNKNOWN_NETWORK_QUALITY),
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

const AudioMetricsSchema = z.object({
  bitrate: z.number().finite(),
  jitter: z.number().finite(),
  loss: z.number().finite(),
});
const VideoMetricsSchema = AudioMetricsSchema.extend({
  width: z.number().finite(),
  height: z.number().finite(),
  fps: z.number().finite(),
});
const TrackSourceSchema = z.object({
  trackId: z.string(),
  userId: z.string().nullable(),
  clientId: z.string().nullable(),
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
      local_proto: z.union([ProtocolSchema, z.literal('TLS')]).optional(),
      local_cand: CandidateSchema.optional(),
      remote_proto: ProtocolSchema.optional(),
      remote_cand: CandidateSchema.optional(),
    })
    .optional(),
  peer: PeerSchema.optional(),
  tx: z.object({audio: AudioMetricsSchema, video: VideoMetricsSchema}).optional(),
  rx: z
    .object({
      audio: z.array(AudioMetricsSchema.merge(TrackSourceSchema)),
      video: z.array(VideoMetricsSchema.merge(TrackSourceSchema)),
    })
    .optional(),
});

export type NetworkQualityInfo = z.infer<typeof NetworkQualityInfoSchema>;
