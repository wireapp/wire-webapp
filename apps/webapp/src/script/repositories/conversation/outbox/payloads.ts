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

import {Confirmation} from '@wireapp/protocol-messaging';

import type {MultiPartContent} from '../../../core/conversation/content';

// A conversation without a domain is valid locally, so the domain may be empty
const conversationIdSchema = z.object({id: z.string().min(1), domain: z.string()});
const messageIdSchema = z.string().min(1);

const mentionSchema = z.object({
  startIndex: z.number(),
  length: z.number(),
  userId: z.string().min(1),
  userQualifiedId: conversationIdSchema,
});

const quoteSchema = z.object({messageId: messageIdSchema, userId: z.string().min(1)});

const attachmentsSchema = z.custom<NonNullable<MultiPartContent['attachments']>>(value => {
  return Array.isArray(value);
});

const mayBeDeliveredSchema = z.literal(true).optional();

const textSchema = z.object({
  type: z.literal('text'),
  conversationId: conversationIdSchema,
  messageId: messageIdSchema,
  text: z.string(),
  mentions: z.array(mentionSchema),
  quote: quoteSchema.optional(),
  attachments: attachmentsSchema.optional(),
  mayBeDelivered: mayBeDeliveredSchema,
});

const assetSchema = z.object({
  type: z.literal('asset'),
  conversationId: conversationIdSchema,
  messageId: messageIdSchema,
  asImage: z.boolean(),
  mayBeDelivered: mayBeDeliveredSchema,
});

const reactionSchema = z.object({
  type: z.literal('reaction'),
  conversationId: conversationIdSchema,
  targetMessageId: messageIdSchema,
  /** The final reactions of the self user, comma separated; empty when all were taken back */
  reactions: z.string(),
});

const editSchema = z.object({
  type: z.literal('edit'),
  conversationId: conversationIdSchema,
  originalMessageId: messageIdSchema,
  messageId: messageIdSchema,
  text: z.string(),
  mentions: z.array(mentionSchema),
  attachments: attachmentsSchema.optional(),
});

const deleteSchema = z.object({
  type: z.literal('delete'),
  conversationId: conversationIdSchema,
  targetMessageId: messageIdSchema,
});

const messagePayloadSchema = z.discriminatedUnion('type', [
  textSchema,
  assetSchema,
  reactionSchema,
  editSchema,
  deleteSchema,
]);

const messageChangePayloadSchema = z.discriminatedUnion('type', [
  reactionSchema,
  editSchema,
  deleteSchema.extend({recipients: z.array(conversationIdSchema).optional()}),
  z.object({type: z.literal('hide'), conversationId: conversationIdSchema, targetMessageId: messageIdSchema}),
]);

const confirmationTypeSchema = z.union([z.literal(Confirmation.Type.DELIVERED), z.literal(Confirmation.Type.READ)]);

const receiptPayloadSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('confirmation'),
    conversationId: conversationIdSchema,
    confirmationType: confirmationTypeSchema,
    messageIds: z.array(messageIdSchema).min(1),
    recipient: conversationIdSchema,
  }),
  z.object({type: z.literal('last-read'), conversationId: conversationIdSchema, timestamp: z.number()}),
  z.object({type: z.literal('cleared'), conversationId: conversationIdSchema, timestamp: z.number()}),
  z.object({type: z.literal('data-transfer'), countlyId: z.string().min(1)}),
]);

const pingPayloadSchema = z.object({conversationId: conversationIdSchema, messageId: messageIdSchema});

export type StoredMention = z.infer<typeof mentionSchema>;

export type MessagePayload = z.infer<typeof messagePayloadSchema>;
export type TextMessagePayload = z.infer<typeof textSchema>;
export type AssetMessagePayload = z.infer<typeof assetSchema>;
export type EditMessagePayload = z.infer<typeof editSchema>;

export type MessageChangePayload = z.infer<typeof messageChangePayloadSchema>;
export type ReceiptPayload = z.infer<typeof receiptPayloadSchema>;
export type PingPayload = z.infer<typeof pingPayloadSchema>;

/** Each of these throws on anything but a payload of its kind */
export function parseMessagePayload(value: unknown): MessagePayload {
  return messagePayloadSchema.parse(value);
}

export function parseMessageChangePayload(value: unknown): MessageChangePayload {
  return messageChangePayloadSchema.parse(value);
}

export function parseReceiptPayload(value: unknown): ReceiptPayload {
  return receiptPayloadSchema.parse(value);
}

export function parsePingPayload(value: unknown): PingPayload {
  return pingPayloadSchema.parse(value);
}
