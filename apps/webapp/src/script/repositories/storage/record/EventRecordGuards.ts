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

import {EventRecord} from './EventRecord';

import {MessageAddEvent, MultipartMessageAddEvent} from '../../conversation/EventBuilder';
import {ClientEvent} from '../../event/Client';

/**
 * Type guard to check if an event is a MessageAddEvent (type MESSAGE_ADD).
 */
export const isMessageAddEvent = (event: EventRecord): event is EventRecord & MessageAddEvent => {
  return event.type === ClientEvent.CONVERSATION.MESSAGE_ADD;
};

/**
 * Type guard to check if an event is a MultipartMessageAddEvent (type MULTIPART_MESSAGE_ADD).
 */
export const isMultipartMessageAddEvent = (event: EventRecord): event is EventRecord & MultipartMessageAddEvent => {
  return event.type === ClientEvent.CONVERSATION.MULTIPART_MESSAGE_ADD;
};

/**
 * Check if an event contains a quote referencing a specific message ID.
 * Handles both normal message quotes and multipart message quotes.
 */
export const hasQuoteForMessage = (event: EventRecord, quotedMessageId: string): boolean => {
  // Check normal message quote (MessageAddEvent)
  if (
    isMessageAddEvent(event) &&
    event.data.quote &&
    typeof event.data.quote === 'object' &&
    'message_id' in event.data.quote
  ) {
    return event.data.quote.message_id === quotedMessageId;
  }
  // Check multipart message quote (MultipartMessageAddEvent)
  if (
    isMultipartMessageAddEvent(event) &&
    event.data.text &&
    event.data.text.quote &&
    typeof event.data.text.quote === 'object' &&
    'message_id' in event.data.text.quote
  ) {
    return event.data.text.quote.message_id === quotedMessageId;
  }
  return false;
};
