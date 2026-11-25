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

import {result, type Result} from 'true-myth';
import {z} from 'zod';

import {speechModelIds} from './speechModels';

export const speechDeviceSchema = z.enum(['auto', 'webgpu', 'wasm']);
export const speechLanguageSchema = z.enum(['en', 'de', 'fa', 'fr', 'auto']);
const requestIdentifier = z.number().int().positive();
const runtimeDevice = z.enum(['webgpu', 'wasm']);
export const maxSpeechMessageLength = 4096;
export const fullProgressPercent = 100;
const maxAudioSamples = 192_000;
const messageText = z.string().max(maxSpeechMessageLength);

export const speechProgressSchema = z.discriminatedUnion('phase', [
  z.object({phase: z.literal('download'), file: z.string(), percent: z.number().min(0).max(fullProgressPercent)}),
  z.object({phase: z.enum(['load', 'warmup']), device: runtimeDevice}),
  z.object({phase: z.literal('fallback'), reason: messageText}),
]);
export type SpeechProgress = z.infer<typeof speechProgressSchema>;

const requestSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('load'),
    requestIdentifier,
    model: z.enum(speechModelIds),
    device: speechDeviceSchema,
    language: speechLanguageSchema,
  }),
  z.object({
    type: z.literal('transcribe'),
    requestIdentifier,
    audio: z.instanceof(Float32Array).refine(audio => {
      return audio.length > 0 && audio.length <= maxAudioSamples;
    }),
  }),
]);
const responseSchema = z.discriminatedUnion('type', [
  z.object({type: z.literal('progress'), requestIdentifier, progress: speechProgressSchema}),
  z.object({type: z.literal('ready'), requestIdentifier, device: runtimeDevice}),
  z.object({type: z.literal('result'), requestIdentifier, text: z.string()}),
  z.object({type: z.literal('error'), requestIdentifier: requestIdentifier.optional(), message: messageText}),
]);
export type SpeechWorkerRequest = z.infer<typeof requestSchema>;
export type SpeechWorkerResponse = z.infer<typeof responseSchema>;
export type SpeechDevice = z.infer<typeof speechDeviceSchema>;
export type SpeechLanguage = z.infer<typeof speechLanguageSchema>;
export type SpeechRuntimeDevice = z.infer<typeof runtimeDevice>;

export function parseSpeechWorkerRequest(input: unknown): Result<SpeechWorkerRequest, Error> {
  const parsed = requestSchema.safeParse(input);
  return parsed.success ? result.ok(parsed.data) : result.err(new Error('Invalid speech worker request'));
}

export function parseSpeechWorkerResponse(input: unknown): Result<SpeechWorkerResponse, Error> {
  const parsed = responseSchema.safeParse(input);
  return parsed.success ? result.ok(parsed.data) : result.err(new Error('Invalid speech worker response'));
}
