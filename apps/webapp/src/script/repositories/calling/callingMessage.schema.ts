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

import {Result, result} from 'true-myth';
import {z} from 'zod';

import {CALL_MESSAGE_TYPE} from './enum/CallMessageType';

const MAX_IDENTIFIER_LENGTH = 127;
const MAX_DOMAIN_LENGTH = 253;
const MAX_SERIALIZED_MESSAGE_BYTES = 1_048_576;
const SUPPORTED_PROTOCOL_VERSION = '3.0';
const MAX_URL_LENGTH = 255;
const MAX_SDP_LENGTH = 65_536;
const MAX_PROPERTY_KEY_LENGTH = 128;
const MAX_PROPERTY_VALUE_LENGTH = 1024;
const MAX_KEYS = 256;
const MAX_SFTS = 64;
const MAX_VERSION_LENGTH = 16;
const MAX_TIMESTAMP_LENGTH = 32;
const MAX_SEQUENCE_NUMBER_LENGTH = 16;
const MAX_PROPERTIES = 256;
const MAX_TARGET_DOMAINS = 256;
const MAX_TARGET_USERS = 256;

const identifier = z.string().max(MAX_IDENTIFIER_LENGTH);
const common = {
  version: z.literal(SUPPORTED_PROTOCOL_VERSION),
  sessid: identifier,
  resp: z.boolean(),
  src_userid: identifier.optional(),
  src_clientid: identifier.optional(),
  dest_userid: identifier.optional(),
  dest_clientid: identifier.optional(),
};

const props = z
  .record(z.string().max(MAX_PROPERTY_KEY_LENGTH), z.string().max(MAX_PROPERTY_VALUE_LENGTH))
  .refine(value => {
    return Object.keys(value).length <= MAX_PROPERTIES;
  });
const optionalProps = props.optional();
const boundedSfts = z.array(z.string().max(MAX_URL_LENGTH)).max(MAX_SFTS);
const qualifiedTargets = z
  .record(
    z.string().max(MAX_DOMAIN_LENGTH),
    z.record(z.string().max(MAX_IDENTIFIER_LENGTH), z.array(identifier).max(MAX_KEYS)).refine(value => {
      return Object.keys(value).length <= MAX_TARGET_USERS;
    }),
  )
  .refine(value => {
    return Object.keys(value).length <= MAX_TARGET_DOMAINS;
  });

const base = <Type extends CALL_MESSAGE_TYPE, Shape extends z.ZodRawShape>(
  type: Type,
  shape: Shape,
): z.ZodObject<typeof common & {type: z.ZodLiteral<Type>} & Shape, 'strict'> => {
  return z.object({...common, type: z.literal(type), ...shape}).strict();
};

const setupShape = {
  sdp: z.string().max(MAX_SDP_LENGTH),
  props: optionalProps,
  url: z.string().max(MAX_URL_LENGTH).optional(),
  sft_tuple: identifier.optional(),
};

const setup = <Type extends CALL_MESSAGE_TYPE.SETUP | CALL_MESSAGE_TYPE.GROUP_SETUP | CALL_MESSAGE_TYPE.UPDATE>(
  type: Type,
): z.ZodObject<typeof common & {type: z.ZodLiteral<Type>} & typeof setupShape, 'strict'> => {
  return base(type, setupShape);
};

const conferenceShape = {
  sft_url: z.string().max(MAX_URL_LENGTH),
  sft_tuple: identifier.optional(),
  secret: z.string().max(MAX_SDP_LENGTH),
  timestamp: z.string().max(MAX_TIMESTAMP_LENGTH),
  seqno: z.string().max(MAX_SEQUENCE_NUMBER_LENGTH),
  sfts: boundedSfts.optional(),
};

const avsMessageSchema = z.discriminatedUnion('type', [
  base(CALL_MESSAGE_TYPE.CANCEL, {}),
  base(CALL_MESSAGE_TYPE.HANGUP, {}),
  base(CALL_MESSAGE_TYPE.REJECT, {}),
  base(CALL_MESSAGE_TYPE.GROUP_LEAVE, {}),
  base(CALL_MESSAGE_TYPE.GROUP_CHECK, {}),
  setup(CALL_MESSAGE_TYPE.SETUP),
  setup(CALL_MESSAGE_TYPE.GROUP_SETUP),
  setup(CALL_MESSAGE_TYPE.UPDATE),
  base(CALL_MESSAGE_TYPE.PROP_SYNC, {props}),
  base(CALL_MESSAGE_TYPE.GROUP_START, {props: optionalProps}),
  base(CALL_MESSAGE_TYPE.CONF_START, {...conferenceShape, props: optionalProps}),
  base(CALL_MESSAGE_TYPE.CONF_CHECK, conferenceShape),
  base(CALL_MESSAGE_TYPE.CONF_END, {}),
  base(CALL_MESSAGE_TYPE.CONFKEY, {
    keys: z
      .array(z.object({idx: z.number().int().nonnegative(), data: z.string().max(MAX_SDP_LENGTH)}).strict())
      .max(MAX_KEYS),
  }),
]);

const moderatorMessageSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal(CALL_MESSAGE_TYPE.REMOTE_MUTE),
      version: z.string().max(MAX_VERSION_LENGTH).optional(),
      data: z.object({targets: qualifiedTargets}).strict(),
      emojis: z.object({}).strict().optional(),
      isHandUp: z.boolean().optional(),
    })
    .strict(),
  z
    .object({type: z.literal(CALL_MESSAGE_TYPE.REMOTE_KICK), version: z.string().max(MAX_VERSION_LENGTH).optional()})
    .strict(),
]);

// Other protocol versions may add or change fields. AVS decides compatibility;
// the serialized size limit still bounds everything passed through this envelope.
const otherVersionMessageSchema = z
  .object({
    type: z.enum([
      CALL_MESSAGE_TYPE.CANCEL,
      CALL_MESSAGE_TYPE.HANGUP,
      CALL_MESSAGE_TYPE.REJECT,
      CALL_MESSAGE_TYPE.GROUP_LEAVE,
      CALL_MESSAGE_TYPE.GROUP_CHECK,
      CALL_MESSAGE_TYPE.SETUP,
      CALL_MESSAGE_TYPE.GROUP_SETUP,
      CALL_MESSAGE_TYPE.UPDATE,
      CALL_MESSAGE_TYPE.PROP_SYNC,
      CALL_MESSAGE_TYPE.GROUP_START,
      CALL_MESSAGE_TYPE.CONF_START,
      CALL_MESSAGE_TYPE.CONF_CHECK,
      CALL_MESSAGE_TYPE.CONF_END,
      CALL_MESSAGE_TYPE.CONFKEY,
    ]),
    version: z
      .string()
      .max(MAX_VERSION_LENGTH)
      .refine(version => {
        return version !== SUPPORTED_PROTOCOL_VERSION;
      }),
  })
  .passthrough();

const callingMessageSchema = z.union([avsMessageSchema, moderatorMessageSchema, otherVersionMessageSchema]);

export type IncomingCallingMessage = z.infer<typeof callingMessageSchema>;

type CallingMessageValidationError = {
  reason: 'oversized_message' | 'invalid_json' | 'invalid_message';
  type: CALL_MESSAGE_TYPE | 'unknown';
  version: string;
  issueCodes: z.ZodIssueCode[];
};

// Never log arbitrary values or paths from an untrusted payload.
const diagnosticMetadataSchema = z.object({
  type: z.union([z.nativeEnum(CALL_MESSAGE_TYPE), z.literal('unknown')]).catch('unknown'),
  version: z
    .string()
    .max(MAX_VERSION_LENGTH)
    .regex(/^\d+(?:\.\d+)*$/)
    .catch('unknown'),
});

const issueCodes = (issues: z.ZodIssue[]): z.ZodIssueCode[] => {
  return issues.flatMap(issue => {
    return issue.code === 'invalid_union'
      ? issue.unionErrors.flatMap(error => {
          return issueCodes(error.issues);
        })
      : [issue.code];
  });
};

const validationError = (
  reason: CallingMessageValidationError['reason'],
  input: unknown,
  issues: z.ZodIssue[] = [],
): CallingMessageValidationError => {
  const metadata = diagnosticMetadataSchema.safeParse(input);
  return {
    reason,
    type: metadata.success ? metadata.data.type : 'unknown',
    version: metadata.success ? metadata.data.version : 'unknown',
    issueCodes: [...new Set(issueCodes(issues))],
  };
};

export function parseSerializedCallingMessage(
  serialized: string,
): Result<IncomingCallingMessage, CallingMessageValidationError> {
  if (
    serialized.length > MAX_SERIALIZED_MESSAGE_BYTES ||
    new TextEncoder().encode(serialized).byteLength > MAX_SERIALIZED_MESSAGE_BYTES
  ) {
    return result.err(validationError('oversized_message', {}));
  }

  const parsed = result.tryOr(validationError('invalid_json', {}), (): unknown => {
    return JSON.parse(serialized);
  });
  if (parsed.isErr) {
    return result.err(parsed.error);
  }

  const validated = callingMessageSchema.safeParse(parsed.value);
  return validated.success
    ? result.ok(validated.data)
    : result.err(validationError('invalid_message', parsed.value, validated.error.issues));
}
