/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {BackendEvent} from '../event';

/**
 * Enum of all possible consumable notification types received via WebSocket.
 * Now fully aligned with backend naming conventions.
 */
export enum ConsumableEvent {
  EVENT = 'event',
  MISSED = 'notifications_missed',
  SYNCHRONIZATION = 'synchronization',
}

/**
 * Notification type for synchronization messages sent by the server
 * to indicate the end of the message queue at the time of connection.
 *
 * This message is **only included** if the client initiated the WebSocket
 * connection using a `sync_marker` query parameter.
 * @TODO when BackendEvent is typed in zod use:
 * export type ConsumableNotificationSynchronization = z.infer<typeof ConsumableNotificationSynchronization>;
 */
export interface ConsumableNotificationSynchronization {
  /**
   * Always set to "synchronization" to distinguish from other message types.
   */
  type: ConsumableEvent.SYNCHRONIZATION;

  data: {
    /**
     * Unique delivery tag assigned by the server for this synchronization message.
     * Must be acknowledged once processed to allow server-side cleanup.
     */
    delivery_tag: number;

    /**
     * Unique identifier (UUID) that matches the `sync_marker` value the client provided
     * during the WebSocket connection initiation. Used to ensure the message
     * corresponds to the current synchronization session.
     */
    marker_id: string;
  };
}

/**
 * Notification type received when the client has missed messages due to being offline too long.
 * Requires a full re-sync before consuming more notifications.
 * @TODO when BackendEvent is typed in zod use:
 * export type ConsumableNotificationMissed = z.infer<typeof ConsumableNotificationMissedSchema>;
 */
export interface ConsumableNotificationMissed {
  type: ConsumableEvent.MISSED;
}

/**
 * Notification type for actual backend events, contains one or more event payloads.
 * Includes a delivery tag for acknowledgment.
 * @TODO when BackendEvent is typed in zod use:
 * export type ConsumableNotificationEvent = z.infer<typeof ConsumableNotificationEventSchema>;
 */
export interface ConsumableNotificationEvent {
  type: ConsumableEvent.EVENT;
  data: {
    delivery_tag: number;
    event: {
      id: string;
      payload: BackendEvent[];
    };
  };
}

/**
 * Union of all valid notification types supported by the WebSocket backend.
 * @TODO when BackendEvent is typed in zod use:
 * export const ConsumableNotificationSchema = z.discriminatedUnion('type', [
 *   ConsumableNotificationMissedSchema,
 *   ConsumableNotificationEventSchema,
 *.  ConsumableNotificationSynchronization
 * ]);
 */
export type ConsumableNotification =
  | ConsumableNotificationMissed
  | ConsumableNotificationEvent
  | ConsumableNotificationSynchronization;

const BackendEventSchema = z.object({
  id: z.string(),
  payload: z.array(z.unknown()), // @TODO Replace `z.unknown()` with BackendEvent schema when available
});

export const ConsumableNotificationSynchronizationSchema = z.object({
  type: z.literal(ConsumableEvent.SYNCHRONIZATION),
  data: z.object({
    delivery_tag: z.number(),
    marker_id: z.string(),
  }),
});

export const ConsumableNotificationMissedSchema = z.object({
  type: z.literal(ConsumableEvent.MISSED),
});

export const ConsumableNotificationEventSchema = z.object({
  type: z.literal(ConsumableEvent.EVENT),
  data: z.object({
    delivery_tag: z.number(),
    event: BackendEventSchema,
  }),
});

export const ConsumableNotificationSchema = z.discriminatedUnion('type', [
  ConsumableNotificationMissedSchema,
  ConsumableNotificationEventSchema,
  ConsumableNotificationSynchronizationSchema,
]);
